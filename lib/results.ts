/** Derivações de exibição a partir dos totais (votos válidos, vencedor, margem). */
import type { CandidatoOficial, Totals } from "./data-types";

export function validos(t: Totals): Record<number, number> {
  const total = Object.values(t.votos).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(t.votos).map(([n, v]) => [+n, total ? v / total : 0]));
}

/** Candidatos ordenados por votos, com fração de votos válidos. */
export function ranking(t: Totals, candidatos: CandidatoOficial[]) {
  const v = validos(t);
  return candidatos
    .map((c) => ({ ...c, votos: t.votos[c.numero] ?? 0, validos: v[c.numero] ?? 0 }))
    .sort((a, b) => b.votos - a.votos);
}

/** Vencedor e margem (diferença em pontos de votos válidos entre 1º e 2º). */
export function vencedor(t: Totals, candidatos: CandidatoOficial[]) {
  const [a, b] = ranking(t, candidatos);
  return { primeiro: a, segundo: b, margem: a.validos - (b?.validos ?? 0) };
}
