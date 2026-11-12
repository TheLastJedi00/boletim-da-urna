/** Agregação de seções em totais e reconciliação com os totais oficiais do TSE. */
import type { CandidatoOficial, SectionRecord, Totals } from "../../lib/data-types";

export function emptyTotals(): Totals {
  return { secoes: 0, aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, nulosTecnicos: 0, votos: {} };
}

/**
 * Soma seções. Se `validos` for informado, votos em números fora da lista de candidaturas
 * válidas vão para `nulosTecnicos` (é assim que o TSE os totaliza).
 */
export function sumTotals(sections: Iterable<SectionRecord>, validos?: CandidatoOficial[]): Totals {
  const ok = validos ? new Set(validos.map((c) => c.numero)) : null;
  const t = emptyTotals();
  for (const s of sections) addSection(t, s, ok);
  return t;
}

function addSection(t: Totals, s: SectionRecord, ok: Set<number> | null) {
  t.secoes += 1;
  t.aptos += s.aptos;
  t.comparecimento += s.comparecimento;
  t.abstencoes += s.abstencoes;
  t.brancos += s.brancos;
  t.nulos += s.nulos;
  for (const [k, v] of Object.entries(s.votos)) {
    const n = Number(k);
    if (ok && !ok.has(n)) t.nulosTecnicos += v;
    else t.votos[n] = (t.votos[n] ?? 0) + v;
  }
}

export function aggregateBy(
  sections: Iterable<SectionRecord>,
  key: (s: SectionRecord) => string,
  validos?: CandidatoOficial[],
): Map<string, Totals> {
  const ok = validos ? new Set(validos.map((c) => c.numero)) : null;
  const out = new Map<string, Totals>();
  for (const s of sections) {
    const k = key(s);
    let t = out.get(k);
    if (!t) out.set(k, (t = emptyTotals()));
    addSection(t, s, ok);
  }
  return out;
}

export type Diff = { campo: string; calculado: number; oficial: number };

/**
 * Compara a soma dos BUs com o total oficial, campo a campo.
 * Votos e comparecimento precisam bater; a contagem de seções só gera aviso, porque o total
 * oficial inclui seções sem BU (não instaladas ou agregadas, comuns no exterior).
 */
export function reconcile(calculado: Totals, oficial: Totals): { ok: boolean; diffs: Diff[]; avisos: Diff[] } {
  const diffs: Diff[] = [];
  const avisos: Diff[] =
    calculado.secoes !== oficial.secoes ? [{ campo: "secoes", calculado: calculado.secoes, oficial: oficial.secoes }] : [];
  const fields = ["comparecimento", "brancos", "nulos", "nulosTecnicos"] as const;
  for (const f of fields) {
    if (calculado[f] !== oficial[f]) diffs.push({ campo: f, calculado: calculado[f], oficial: oficial[f] });
  }
  const nums = new Set([...Object.keys(calculado.votos), ...Object.keys(oficial.votos)].map(Number));
  for (const n of [...nums].sort((a, b) => a - b)) {
    const c = calculado.votos[n] ?? 0;
    const o = oficial.votos[n] ?? 0;
    if (c !== o) diffs.push({ campo: `votos[${n}]`, calculado: c, oficial: o });
  }
  return { ok: diffs.length === 0, diffs, avisos };
}
