/**
 * Cores dos partidos, de forma sutil: versões dessaturadas (OKLCH com croma ≤ 0.14),
 * ajustadas para o tema escuro e afastadas do azul de acento da marca (#3986ff).
 * Usar SOMENTE em elementos de dados (barras, linhas, mapa). A interface usa o acento.
 *
 * Valores gerados a partir de OKLCH [L, C, H] e validados em party-colors.test.ts.
 */
import { contrastRatio, oklabDistance, oklch, simulateDeuteranopia } from "./color";

export { contrastRatio, oklabDistance, oklch, simulateDeuteranopia };

export const PARTY_COLORS: Record<string, string> = {
  PT: "#d67069", //        vermelho  [0.66, 0.13, 25]
  PL: "#72bed1", //        azul aço  [0.76, 0.08, 215] — deslocado do acento da marca
  PSD: "#d7bb70", //       amarelo   [0.80, 0.10, 90]
  AVANTE: "#e09865", //    laranja   [0.74, 0.11, 55]
  MISSÃO: "#77c4a3", //    verde     [0.76, 0.09, 165]
  NOVO: "#e28b63", //      laranja   [0.72, 0.12, 45]
  UP: "#c97e9b", //        vinho     [0.68, 0.10, 355]
  PSTU: "#cf8792", //      rosado    [0.70, 0.09, 10]
  DC: "#75b9b4", //        turquesa  [0.74, 0.07, 190]
  PCB: "#bf6b5e", //       tijolo    [0.62, 0.11, 30]
  DEMOCRATA: "#aaa3da", // lavanda   [0.74, 0.08, 290]
  PCO: "#be7e82", //       rosa seco [0.66, 0.08, 15]
};

/** Tons de cinza (croma 0) para o que não é candidato. */
export const NEUTRAL_COLORS = {
  brancos: "#b7b7b7",
  nulos: "#989898",
  abstencao: "#808080",
  outros: "#a4a4a4",
} as const;

export function colorForParty(sigla: string): string {
  return PARTY_COLORS[sigla.trim().toUpperCase()] ?? NEUTRAL_COLORS.outros;
}
