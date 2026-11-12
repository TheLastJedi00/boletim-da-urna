/**
 * Motor de simulação de fraudes HIPOTÉTICAS.
 * Aplica um cenário sobre uma cópia dos dados e roda os mesmos sinais usados nos dados reais,
 * mostrando como cada fraude seria detectada. Nada aqui afirma que uma fraude ocorreu.
 * Roda no navegador (sem dependências de Node).
 */
import type { SectionRecord, Totals } from "../data-types";
import { biometriaOutliers } from "../signals/biometria";
import { timingAnomalies, timingOutliers } from "../signals/timing";
import { impossibleSections, robustOutliers, turnoutRate } from "../signals/turnout";

export type Cenario =
  | { tipo: "nenhuma" }
  | { tipo: "encher-urna"; candidato: number; secoes: number; votosPorSecao: number }
  | { tipo: "trocar-na-totalizacao"; de: number; para: number; votos: number }
  | { tipo: "adulterar-bu"; candidato: number; secoes: number; votos: number }
  | { tipo: "horario-irregular"; secoes: number }
  | { tipo: "biometria-em-massa"; secoes: number; liberados: number };

export type Sinal =
  | "comparecimento-fora-do-padrao"
  | "comparecimento-acima-dos-aptos"
  | "biometria-fora-do-padrao"
  | "horario-irregular"
  | "assinatura-invalida"
  | "totalizacao-diverge-dos-bus";

export type Deteccao = {
  sinal: Sinal;
  titulo: string;
  controle: string;
  detectado: boolean;
  secoesApontadas: number;
  alvosDetectados: number;
  falsosAlarmes: number;
};

export type ResultadoSimulacao = {
  cenario: Cenario;
  secoes: SectionRecord[];
  alvos: string[];
  resultadoReal: Totals;
  resultadoDivulgado: Totals;
  deteccoes: Deteccao[];
};

// ---------- utilitários ----------

/** PRNG determinístico (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (s: SectionRecord) => `${s.uf}-${s.cdMunicipio}-${s.zona}-${s.secao}`;
const clone = (s: SectionRecord): SectionRecord => ({ ...s, votos: { ...s.votos }, secoesAgregadas: [...s.secoesAgregadas] });

function sample<T>(items: T[], n: number, rand: () => number): T[] {
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, Math.min(n, items.length)).map((i) => items[i]);
}

function somar(secoes: SectionRecord[]): Totals {
  const t: Totals = { secoes: 0, aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, nulosTecnicos: 0, votos: {} };
  for (const s of secoes) {
    t.secoes++;
    t.aptos += s.aptos;
    t.comparecimento += s.comparecimento;
    t.abstencoes += s.abstencoes;
    t.brancos += s.brancos;
    t.nulos += s.nulos;
    for (const [n, v] of Object.entries(s.votos)) t.votos[+n] = (t.votos[+n] ?? 0) + v;
  }
  return t;
}

// ---------- assinatura (modelo didático) ----------

/**
 * Modelo didático da assinatura digital do BU: um resumo (FNV-1a) do conteúdo da seção.
 * Na urna real, o BU é assinado com chave criptográfica; qualquer alteração invalida a assinatura.
 */
export function assinarBu(s: SectionRecord): string {
  const votos = Object.entries(s.votos)
    .sort(([a], [b]) => +a - +b)
    .map(([n, v]) => `${n}:${v}`)
    .join(",");
  const conteudo = [key(s), s.nrUrna, s.aptos, s.comparecimento, s.brancos, s.nulos, votos].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < conteudo.length; i++) {
    h ^= conteudo.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const verificarAssinatura = (s: SectionRecord, assinatura: string) => assinarBu(s) === assinatura;

// ---------- dados sintéticos ----------

export function syntheticDataset({ secoes, seed, candidatos, dia = "2026-10-25" }: { secoes: number; seed: number; candidatos: number[]; dia?: string }): SectionRecord[] {
  const r = rng(seed);
  const pad = (n: number) => String(n).padStart(2, "0");
  return Array.from({ length: secoes }, (_, i) => {
    const aptos = 200 + Math.floor(r() * 200);
    const taxa = Math.min(0.95, Math.max(0.6, 0.8 + (r() + r() + r() - 1.5) * 0.05));
    const comparecimento = Math.round(aptos * taxa);
    const brancos = Math.round(comparecimento * (0.01 + r() * 0.01));
    const nulos = Math.round(comparecimento * (0.02 + r() * 0.01));
    let restante = comparecimento - brancos - nulos;
    const votos: Record<number, number> = {};
    candidatos.forEach((c, k) => {
      const v = k === candidatos.length - 1 ? restante : Math.round(restante * (0.5 + (r() - 0.5) * 0.16));
      votos[c] = v;
      restante -= v;
    });
    const fim = Math.floor(r() * 20);
    return {
      uf: "XX",
      cdMunicipio: i % 20,
      zona: 1,
      secao: i + 1,
      localVotacao: 1000 + (i % 40),
      aptos,
      comparecimento,
      abstencoes: aptos - comparecimento,
      votos,
      brancos,
      nulos,
      tipoUrna: "Apurada",
      nrUrna: 2_000_000 + i,
      dtCarga: `2026-09-${pad(20 + Math.floor(r() * 5))}T${pad(9 + Math.floor(r() * 8))}:00:00`,
      dtAbertura: `${dia}T08:00:${pad(1 + Math.floor(r() * 5))}`,
      dtEncerramento: `${dia}T17:${pad(fim)}:00`,
      dtEmissaoBu: `${dia}T17:${pad(fim + 2)}:00`,
      dtBuRecebido: `${dia}T17:${pad(fim + 30)}:00`,
      eleitoresSemBiometria: Math.round(comparecimento * (0.02 + r() * 0.03)),
      secoesAgregadas: [],
    };
  });
}

// ---------- catálogo de cenários ----------

export type ParametroCenario = { campo: string; rotulo: string; min: number; max: number; passo: number };

export const CENARIOS: {
  id: Exclude<Cenario["tipo"], "nenhuma">;
  titulo: string;
  padrao: Cenario;
  parametros: ParametroCenario[];
  comoSeria: string;
  sinais: string[];
  controles: string[];
}[] = [
  {
    id: "encher-urna",
    titulo: "Encher urnas",
    padrao: { tipo: "encher-urna", candidato: 13, secoes: 20, votosPorSecao: 60 },
    parametros: [
      { campo: "secoes", rotulo: "Seções alteradas", min: 1, max: 100, passo: 1 },
      { campo: "votosPorSecao", rotulo: "Votos inseridos por seção", min: 5, max: 200, passo: 5 },
    ],
    comoSeria:
      "Alguém com acesso à urna digitaria votos em nome de eleitores que não compareceram, liberando a votação sem a digital deles.",
    sinais: [
      "Comparecimento muito acima do padrão das seções vizinhas",
      "Pico de eleitores liberados sem biometria",
      "Comparecimento maior que o número de eleitores aptos (impossível)",
    ],
    controles: [
      "Fiscais de partido e mesários acompanham a votação e assinam a ata",
      "Registro de cada liberação sem biometria no BU e no log da urna",
      "BU impresso afixado na porta da seção, conferível por qualquer pessoa",
    ],
  },
  {
    id: "trocar-na-totalizacao",
    titulo: "Trocar votos na totalização",
    padrao: { tipo: "trocar-na-totalizacao", de: 22, para: 13, votos: 50000 },
    parametros: [{ campo: "votos", rotulo: "Votos transferidos no total", min: 1000, max: 500000, passo: 1000 }],
    comoSeria:
      "Os BUs das seções ficariam corretos, mas o sistema que soma os resultados divulgaria números diferentes da soma dos boletins.",
    sinais: ["A soma dos BUs publicados não bate com o total divulgado"],
    controles: [
      "Todos os BUs são publicados na internet, assinados digitalmente",
      "Qualquer pessoa pode somar os BUs e comparar com o total (é o que este estudo faz)",
      "Partidos recebem os arquivos e fazem totalização paralela",
    ],
  },
  {
    id: "adulterar-bu",
    titulo: "Adulterar um boletim de urna",
    padrao: { tipo: "adulterar-bu", candidato: 13, secoes: 10, votos: 30 },
    parametros: [
      { campo: "secoes", rotulo: "BUs adulterados", min: 1, max: 100, passo: 1 },
      { campo: "votos", rotulo: "Votos movidos por BU", min: 1, max: 100, passo: 1 },
    ],
    comoSeria:
      "Alguém alteraria o arquivo do BU depois de emitido pela urna, movendo votos de um candidato para outro sem mudar o total.",
    sinais: ["A assinatura digital do BU deixa de conferir", "O BU publicado difere do BU impresso afixado na seção"],
    controles: [
      "Assinatura digital gerada pela própria urna",
      "Hash de cada arquivo publicado pelo TSE",
      "Cópias impressas do BU entregues aos fiscais",
    ],
  },
  {
    id: "horario-irregular",
    titulo: "Urna com horário ou carga irregular",
    padrao: { tipo: "horario-irregular", secoes: 10 },
    parametros: [{ campo: "secoes", rotulo: "Urnas afetadas", min: 1, max: 100, passo: 1 }],
    comoSeria:
      "Uma urna seria preparada (carregada) fora do processo oficial ou encerrada antes da hora, para votar sem fiscalização.",
    sinais: ["Carga da urna registrada depois da abertura da votação", "Encerramento muito fora do horário das demais seções"],
    controles: [
      "Cerimônia pública de carga e lacração das urnas",
      "Zerésima impressa na abertura, provando que a urna começa vazia",
      "Log da urna com todos os eventos e horários",
    ],
  },
  {
    id: "biometria-em-massa",
    titulo: "Liberar votos sem biometria em massa",
    padrao: { tipo: "biometria-em-massa", secoes: 15, liberados: 80 },
    parametros: [
      { campo: "secoes", rotulo: "Seções afetadas", min: 1, max: 100, passo: 1 },
      { campo: "liberados", rotulo: "Liberações extras por seção", min: 5, max: 200, passo: 5 },
    ],
    comoSeria:
      "Mesários liberariam muitos eleitores sem conferir a digital, abrindo espaço para alguém votar no lugar de outra pessoa.",
    sinais: ["Taxa de liberação sem biometria muito acima do padrão"],
    controles: [
      "Cada liberação fica registrada no BU",
      "Fiscais podem exigir a identificação do eleitor",
      "A Justiça Eleitoral audita seções com taxas atípicas",
    ],
  },
];

// ---------- simulação ----------

const TITULO: Record<Sinal, [string, string]> = {
  "comparecimento-fora-do-padrao": ["Comparecimento fora do padrão", "Comparação estatística entre seções"],
  "comparecimento-acima-dos-aptos": ["Comparecimento acima dos aptos", "Regra aritmética do BU: impossível ter mais votantes que eleitores"],
  "biometria-fora-do-padrao": ["Liberações sem biometria fora do padrão", "Registro de liberações no BU e auditoria da Justiça Eleitoral"],
  "horario-irregular": ["Horário ou carga irregular", "Log da urna, cerimônia de carga e zerésima"],
  "assinatura-invalida": ["Assinatura digital do BU inválida", "Assinatura digital da urna e BU impresso na seção"],
  "totalizacao-diverge-dos-bus": ["Total divulgado ≠ soma dos BUs", "Publicação de todos os BUs e totalização paralela"],
};

export function simular(
  dados: SectionRecord[],
  cenario: Cenario,
  { seed = 1, dia }: { seed?: number; dia?: string } = {},
): ResultadoSimulacao {
  const rand = rng(seed);
  const assinaturas = new Map(dados.map((s) => [key(s), assinarBu(s)]));
  const secoes = dados.map(clone);
  const resultadoReal = somar(dados);
  const diaEleicao = dia ?? dados[0]?.dtAbertura?.slice(0, 10) ?? "2026-10-25";
  let alvos: SectionRecord[] = [];
  let divulgado: Totals | null = null;

  switch (cenario.tipo) {
    case "nenhuma":
      break;
    case "encher-urna":
      alvos = sample(secoes, cenario.secoes, rand);
      for (const s of alvos) {
        s.votos[cenario.candidato] = (s.votos[cenario.candidato] ?? 0) + cenario.votosPorSecao;
        s.comparecimento += cenario.votosPorSecao;
        s.abstencoes = Math.max(0, s.aptos - s.comparecimento);
        s.eleitoresSemBiometria += cenario.votosPorSecao;
        assinaturas.set(key(s), assinarBu(s)); // a urna assina o que registrou
      }
      break;
    case "trocar-na-totalizacao": {
      divulgado = somar(secoes);
      divulgado.votos[cenario.de] = (divulgado.votos[cenario.de] ?? 0) - cenario.votos;
      divulgado.votos[cenario.para] = (divulgado.votos[cenario.para] ?? 0) + cenario.votos;
      break;
    }
    case "adulterar-bu":
      alvos = sample(secoes, cenario.secoes, rand);
      for (const s of alvos) {
        let falta = cenario.votos;
        for (const n of Object.keys(s.votos).map(Number).sort((a, b) => a - b)) {
          if (n === cenario.candidato || falta <= 0) continue;
          const tirar = Math.min(falta, s.votos[n]);
          s.votos[n] -= tirar;
          falta -= tirar;
        }
        const movidos = cenario.votos - falta;
        s.votos[cenario.candidato] = (s.votos[cenario.candidato] ?? 0) + movidos;
        if (movidos === 0) {
          // sem votos de outros candidatos para mover: altera brancos para nulos (ainda invalida a assinatura)
          s.nulos += s.brancos;
          s.brancos = 0;
        }
      }
      break;
    case "horario-irregular":
      alvos = sample(secoes, cenario.secoes, rand);
      alvos.forEach((s, i) => {
        if (i % 2 === 0) s.dtCarga = `${diaEleicao}T09:30:00`;
        else {
          s.dtEncerramento = `${diaEleicao}T12:00:00`;
          s.dtEmissaoBu = `${diaEleicao}T12:02:00`;
        }
      });
      break;
    case "biometria-em-massa":
      alvos = sample(secoes, cenario.secoes, rand);
      for (const s of alvos) s.eleitoresSemBiometria = Math.min(s.comparecimento, s.eleitoresSemBiometria + cenario.liberados);
      break;
  }

  const somaBus = somar(secoes);
  const resultadoDivulgado = divulgado ?? somaBus;
  const alvosKeys = new Set(alvos.map(key));

  const det = (sinal: Sinal, apontadas: SectionRecord[] | null, detectadoGlobal?: boolean): Deteccao => {
    const ks = new Set((apontadas ?? []).map(key));
    const alvosDetectados = [...alvosKeys].filter((k) => ks.has(k)).length;
    return {
      sinal,
      titulo: TITULO[sinal][0],
      controle: TITULO[sinal][1],
      detectado: detectadoGlobal ?? (alvosKeys.size ? alvosDetectados > 0 : ks.size > 0),
      secoesApontadas: ks.size,
      alvosDetectados,
      falsosAlarmes: [...ks].filter((k) => !alvosKeys.has(k)).length,
    };
  };

  const janela = { cargaInicio: "2026-08-01T00:00:00", cargaFim: `${diaEleicao}T00:00:00` };
  const horario = [
    ...timingAnomalies(secoes, janela).map((a) => a.secao),
    ...timingOutliers(secoes, "dtEncerramento").map((o) => o.item),
  ];
  const diverge = (["comparecimento", "brancos", "nulos"] as const).some((f) => somaBus[f] !== resultadoDivulgado[f]) ||
    Object.keys({ ...somaBus.votos, ...resultadoDivulgado.votos }).some((n) => (somaBus.votos[+n] ?? 0) !== (resultadoDivulgado.votos[+n] ?? 0));

  const deteccoes: Deteccao[] = [
    det("comparecimento-fora-do-padrao", robustOutliers(secoes, turnoutRate).filter((o) => o.z > 0).map((o) => o.item)),
    det(
      "comparecimento-acima-dos-aptos",
      impossibleSections(secoes).filter((i) => i.motivo === "comparecimento-acima-dos-aptos").map((i) => i.secao),
    ),
    det("biometria-fora-do-padrao", biometriaOutliers(secoes).map((o) => o.item)),
    det("horario-irregular", horario),
    det("assinatura-invalida", secoes.filter((s) => !verificarAssinatura(s, assinaturas.get(key(s))!))),
    det("totalizacao-diverge-dos-bus", null, diverge),
  ];

  return { cenario, secoes, alvos: [...alvosKeys], resultadoReal, resultadoDivulgado, deteccoes };
}
