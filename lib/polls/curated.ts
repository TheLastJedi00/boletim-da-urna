/** Leitura e validação dos CSVs de curadoria (data/curated/pesquisas.csv e noticias.csv). */
import { margemTeorica, type Pesquisa } from "./types";

export type PesquisaRow = Record<
  | "id" | "turno" | "instituto" | "contratante" | "registro_tse" | "campo_inicio" | "campo_fim" | "amostra"
  | "margem_erro" | "confianca" | "metodologia" | "base" | "cenario" | "votavel" | "percentual" | "url",
  string
>;
export type NoticiaRow = Record<"data" | "turno" | "categoria" | "titulo" | "veiculo" | "url" | "resumo", string>;

export type Noticia = { data: string; turno: 1 | 2; categoria: string; titulo: string; veiculo: string; url: string; resumo: string };

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseCuratedCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const [head, ...rest] = lines;
  const cols = splitLine(head);
  return rest.map((l) => {
    const v = splitLine(l);
    return Object.fromEntries(cols.map((c, i) => [c, (v[i] ?? "").trim()]));
  });
}

export const JANELA_PESQUISAS: Record<1 | 2, [string, string]> = {
  1: ["2026-08-16", "2026-10-03"],
  2: ["2026-10-05", "2026-10-24"],
};
export const JANELA_NOTICIAS: [string, string] = ["2026-08-16", "2026-10-26"];
export const VEICULOS = [
  "Folha de S.Paulo", "G1", "Estadão", "O Globo", "UOL", "CNN Brasil", "Poder360", "BBC News Brasil", "Veja",
] as const;
const METODOLOGIAS = ["presencial", "telefone", "online", "misto"];
const URL_OK = /^https?:\/\/\S+$/;
const DATA_OK = /^\d{4}-\d{2}-\d{2}$/;

const POLL_FIELDS = ["turno", "instituto", "contratante", "registro_tse", "campo_inicio", "campo_fim", "amostra", "margem_erro", "confianca", "metodologia", "base", "cenario", "url"] as const;

export function validatePesquisas(rows: PesquisaRow[]): { pesquisas: Pesquisa[]; erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  const grupos = new Map<string, PesquisaRow[]>();
  for (const r of rows) grupos.set(r.id, [...(grupos.get(r.id) ?? []), r]);

  const pesquisas: Pesquisa[] = [];
  for (const [id, linhas] of grupos) {
    const r = linhas[0];
    const e = (msg: string) => erros.push(`${id}: ${msg}`);
    for (const f of POLL_FIELDS) {
      if (linhas.some((l) => l[f] !== r[f])) e(`campo "${f}" divergente entre linhas`);
    }
    const turno = Number(r.turno) as 1 | 2;
    const amostra = Number(r.amostra);
    let margem = Number(r.margem_erro);
    if (turno !== 1 && turno !== 2) e("turno deve ser 1 ou 2");
    if (!r.instituto) e("instituto obrigatório");
    if (!(Number.isInteger(amostra) && amostra > 0)) e("amostra deve ser inteiro positivo");
    if (!r.margem_erro && amostra > 0) {
      margem = +margemTeorica(amostra).toFixed(2);
      avisos.push(`${id}: margem não informada na fonte compilada; usando a teórica (${margem} p.p.)`);
    } else if (!(margem > 0)) e("margem_erro deve ser positiva");
    else if (amostra > 0 && margem < 0.9 * margemTeorica(amostra)) {
      avisos.push(
        `${id}: margem declarada ${margem} p.p. abaixo do mínimo estatístico para n=${amostra} (${margemTeorica(amostra).toFixed(2)} p.p.); os cálculos usam a teórica`,
      );
    }
    if (!URL_OK.test(r.url)) e("url da fonte obrigatória (http/https)");
    if (!DATA_OK.test(r.campo_inicio) || !DATA_OK.test(r.campo_fim) || r.campo_inicio > r.campo_fim) e("datas de campo inválidas");
    const jan = JANELA_PESQUISAS[turno];
    if (jan && (r.campo_fim < jan[0] || r.campo_fim > jan[1])) e(`campo_fim ${r.campo_fim} fora da janela do ${turno}º turno (${jan[0]} a ${jan[1]})`);
    if (!r.registro_tse) avisos.push(`${id}: sem número de registro no TSE na fonte compilada`);
    else if (!/^BR-\d{5}\/2026$/.test(r.registro_tse)) e(`registro_tse inválido: ${r.registro_tse}`);
    if (!METODOLOGIAS.includes(r.metodologia)) e(`metodologia inválida: ${r.metodologia}`);
    if (r.base !== "totais" && r.base !== "validos") e(`base deve ser "totais" ou "validos"`);

    const valores: Record<string, number> = {};
    for (const l of linhas) {
      const v = Number(l.percentual);
      if (!(v >= 0 && v <= 100)) e(`percentual inválido para ${l.votavel}`);
      valores[l.votavel] = v;
    }
    const soma = Object.values(valores).reduce((a, b) => a + b, 0);
    const limite = 100 + 0.5 * linhas.length; // cada valor arredondado pode somar até 0,5 p.p.
    if (soma > limite) e(`soma dos percentuais ${soma.toFixed(1)}% acima do limite de arredondamento (${limite}%)`);
    if (soma < 90) avisos.push(`${id}: soma dos percentuais ${soma.toFixed(1)}% (abaixo de 90%)`);

    pesquisas.push({
      id,
      turno,
      instituto: r.instituto,
      contratante: r.contratante,
      registroTse: r.registro_tse || null,
      campoInicio: r.campo_inicio,
      campoFim: r.campo_fim,
      amostra,
      margemErro: margem,
      confianca: r.confianca ? Number(r.confianca) : null,
      metodologia: r.metodologia,
      base: r.base as "totais" | "validos",
      cenario: r.cenario,
      url: r.url,
      valores,
    });
  }
  pesquisas.sort((a, b) => a.turno - b.turno || a.campoFim.localeCompare(b.campoFim) || a.instituto.localeCompare(b.instituto));
  return { pesquisas, erros, avisos };
}

/** Semana ISO (segunda a domingo) como "AAAA-Www". */
function isoWeek(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((dt.getTime() - firstThu.getTime()) / 86_400_000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function validateNoticias(rows: NoticiaRow[]): { noticias: Noticia[]; erros: string[] } {
  const erros: string[] = [];
  const porSemana = new Map<string, number>();
  const noticias: Noticia[] = [];
  rows.forEach((r, i) => {
    const e = (m: string) => erros.push(`notícia ${i + 1} (${r.data}): ${m}`);
    const errosAntes = erros.length;
    if (!DATA_OK.test(r.data) || r.data < JANELA_NOTICIAS[0] || r.data > JANELA_NOTICIAS[1]) e("data fora da janela");
    if (!(VEICULOS as readonly string[]).includes(r.veiculo)) e(`veículo fora da lista: ${r.veiculo}`);
    if (!URL_OK.test(r.url)) e("url inválida");
    if (!r.titulo || !r.resumo) e("título e resumo obrigatórios");
    if (erros.length === errosAntes) {
      const w = isoWeek(r.data);
      porSemana.set(w, (porSemana.get(w) ?? 0) + 1);
      noticias.push({ ...r, turno: Number(r.turno) as 1 | 2 });
    }
  });
  for (const [w, n] of porSemana) if (n > 3) erros.push(`semana ${w}: ${n} notícias (máximo 3)`);
  return { noticias: noticias.sort((a, b) => a.data.localeCompare(b.data)), erros };
}
