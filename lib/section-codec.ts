/**
 * Formato colunar compacto para os snapshots por seção.
 * Horários viram segundos relativos à meia-noite do dia da eleição (`dia`).
 * Usado pela ingestão (encode) e pela aplicação (decode).
 */
import type { Candidato, SectionRecord } from "./data-types";

type Cell = number | string | number[] | null;

export type EncodedSections = {
  v: 1;
  uf: string;
  dia: string;
  candidatos: Candidato[];
  tiposUrna: string[];
  cols: string[];
  rows: Cell[][];
};

const FIXED = ["cdMunicipio", "zona", "secao", "localVotacao", "aptos", "comparecimento", "abstencoes", "brancos", "nulos"] as const;
const TIMES = ["carga", "abertura", "encerramento", "emissao", "recebido"] as const;
const TIME_FIELD: Record<(typeof TIMES)[number], keyof SectionRecord> = {
  carga: "dtCarga",
  abertura: "dtAbertura",
  encerramento: "dtEncerramento",
  emissao: "dtEmissaoBu",
  recebido: "dtBuRecebido",
};

const dayStart = (dia: string) => Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10));

function toOffset(iso: string | null, base: number): number | null {
  if (!iso) return null;
  const [d, t] = iso.split("T");
  const [h, m, s] = t.split(":").map(Number);
  return (dayStart(d) - base) / 1000 + h * 3600 + m * 60 + (s || 0);
}

function fromOffset(sec: number | null, base: number): string | null {
  if (sec === null) return null;
  return new Date(base + sec * 1000).toISOString().slice(0, 19);
}

export function encodeSections(sections: SectionRecord[], candidatos: Candidato[], dia: string): EncodedSections {
  const base = dayStart(dia);
  const nums = candidatos.map((c) => c.numero);
  const tiposUrna = [...new Set(sections.map((s) => s.tipoUrna))].sort();
  const cols = [...FIXED, ...nums.map((n) => `v${n}`), "nrUrna", ...TIMES, "semBiometria", "agregadas", "tipoUrna"];
  const rows = sections.map((s) => [
    ...FIXED.map((f) => s[f] as number),
    ...nums.map((n) => (n in s.votos ? s.votos[n] : null)),
    s.nrUrna,
    ...TIMES.map((t) => toOffset(s[TIME_FIELD[t]] as string | null, base)),
    s.eleitoresSemBiometria,
    s.secoesAgregadas.length ? s.secoesAgregadas : null,
    tiposUrna.indexOf(s.tipoUrna),
  ]);
  return { v: 1, uf: sections[0]?.uf ?? "", dia, candidatos, tiposUrna, cols, rows };
}

export function decodeSections(enc: EncodedSections): SectionRecord[] {
  const base = dayStart(enc.dia);
  const at = (name: string) => enc.cols.indexOf(name);
  const fixed = FIXED.map(at);
  const votes = enc.candidatos.map((c) => [c.numero, at(`v${c.numero}`)] as const);
  const times = TIMES.map(at);
  const [iUrna, iBio, iAgr, iTipo] = ["nrUrna", "semBiometria", "agregadas", "tipoUrna"].map(at);

  return enc.rows.map((r) => {
    const votos: Record<number, number> = {};
    for (const [n, i] of votes) if (r[i] !== null) votos[n] = r[i] as number;
    const [cdMunicipio, zona, secao, localVotacao, aptos, comparecimento, abstencoes, brancos, nulos] = fixed.map(
      (i) => r[i] as number,
    );
    const [dtCarga, dtAbertura, dtEncerramento, dtEmissaoBu, dtBuRecebido] = times.map((i) =>
      fromOffset(r[i] as number | null, base),
    );
    return {
      uf: enc.uf,
      cdMunicipio,
      zona,
      secao,
      localVotacao,
      aptos,
      comparecimento,
      abstencoes,
      votos,
      brancos,
      nulos,
      tipoUrna: enc.tiposUrna[r[iTipo] as number],
      nrUrna: r[iUrna] as number | null,
      dtCarga,
      dtAbertura,
      dtEncerramento,
      dtEmissaoBu,
      dtBuRecebido,
      eleitoresSemBiometria: r[iBio] as number,
      secoesAgregadas: (r[iAgr] as number[] | null) ?? [],
    };
  });
}
