/** Modelo de pesquisas: votos válidos, margem de erro, projeção ponderada e avaliação × urna. */

import { margemTeorica, type Pesquisa } from "./types";

export { margemTeorica, type Pesquisa };

const isCandidato = (k: string) => /^\d+$/.test(k);

export type Validos = { valores: Record<number, number>; margem: Record<number, number> };

/**
 * Converte para votos válidos (exclui indecisos, brancos e nulos) e recalcula a margem por candidato
 * com a amostra efetiva, preservando o efeito de desenho declarado pelo instituto.
 */
export function toValidos(p: Pesquisa): Validos {
  const cands = Object.keys(p.valores).filter(isCandidato);
  // efeito de desenho declarado; nunca abaixo de 1 (margem menor que a teórica não é estatisticamente possível)
  const k = Math.max(1, p.margemErro / margemTeorica(p.amostra));
  const somaValidos =
    p.base === "validos" ? 100 : cands.reduce((s, c) => s + p.valores[c], 0) + (p.valores.outros ?? 0);
  const nEf = (p.amostra * somaValidos) / 100;
  const valores: Record<number, number> = {};
  const margem: Record<number, number> = {};
  for (const c of cands) {
    const v = p.base === "validos" ? p.valores[c] : (p.valores[c] / somaValidos) * 100;
    valores[+c] = v;
    const q = v / 100;
    margem[+c] = 1.96 * Math.sqrt((q * (1 - q)) / nEf) * 100 * k;
  }
  return { valores, margem };
}

const dias = (a: string, b: string) => (Date.parse(a) - Date.parse(b)) / 86_400_000;

export type Projecao = {
  dataReferencia: string;
  valores: Record<number, number>;
  intervalo: Record<number, [number, number]>;
  pesquisasUsadas: number;
  pesos: { id: string; instituto: string; peso: number }[];
};

/**
 * Média ponderada das pesquisas (última de cada instituto até a data de referência).
 * Peso = 0,5^(idade/meiaVida) × √(amostra/1000). Intervalo combina o erro amostral
 * e a dispersão entre institutos (±1,96·√(se² + τ²)).
 */
export function projetar(pesquisas: Pesquisa[], { dataReferencia, meiaVida = 7 }: { dataReferencia: string; meiaVida?: number }): Projecao {
  const ultimas = new Map<string, Pesquisa>();
  for (const p of pesquisas) {
    if (p.campoFim > dataReferencia) continue;
    const atual = ultimas.get(p.instituto);
    if (!atual || p.campoFim > atual.campoFim) ultimas.set(p.instituto, p);
  }
  const usadas = [...ultimas.values()];
  const pesos = usadas.map((p) => ({
    p,
    v: toValidos(p),
    w: 0.5 ** (dias(dataReferencia, p.campoFim) / meiaVida) * Math.sqrt(p.amostra / 1000),
  }));
  const cands = [...new Set(pesos.flatMap((x) => Object.keys(x.v.valores).map(Number)))];
  const valores: Record<number, number> = {};
  const intervalo: Record<number, [number, number]> = {};
  for (const c of cands) {
    const com = pesos.filter((x) => c in x.v.valores);
    const W = com.reduce((s, x) => s + x.w, 0);
    if (!W) continue;
    const media = com.reduce((s, x) => s + x.w * x.v.valores[c], 0) / W;
    const se = Math.sqrt(com.reduce((s, x) => s + (x.w * (x.v.margem[c] / 1.96)) ** 2, 0)) / W;
    const tau2 = com.reduce((s, x) => s + x.w * (x.v.valores[c] - media) ** 2, 0) / W;
    const meia = 1.96 * Math.sqrt(se ** 2 + tau2);
    valores[c] = media;
    intervalo[c] = [media - meia, media + meia];
  }
  return {
    dataReferencia,
    valores,
    intervalo,
    pesquisasUsadas: usadas.length,
    pesos: pesos.map((x) => ({ id: x.p.id, instituto: x.p.instituto, peso: x.w })),
  };
}

export type Avaliacao = {
  id: string;
  instituto: string;
  campoFim: string;
  valores: Record<number, number>;
  margem: Record<number, number>;
  erro: Record<number, number>;
  acertou: boolean;
  vencedorCorreto: boolean;
};

const lider = (v: Record<number, number>) => +Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];

/** Compara cada pesquisa (em votos válidos) com o resultado oficial. */
export function avaliarPesquisas(pesquisas: Pesquisa[], real: Record<number, number>): Avaliacao[] {
  return pesquisas.map((p) => {
    const v = toValidos(p);
    const erro: Record<number, number> = {};
    let acertou = true;
    for (const c of Object.keys(real).map(Number)) {
      if (!(c in v.valores)) continue;
      erro[c] = v.valores[c] - real[c];
      if (Math.abs(erro[c]) > v.margem[c]) acertou = false;
    }
    return {
      id: p.id,
      instituto: p.instituto,
      campoFim: p.campoFim,
      valores: v.valores,
      margem: v.margem,
      erro,
      acertou,
      vencedorCorreto: lider(v.valores) === lider(real),
    };
  });
}
