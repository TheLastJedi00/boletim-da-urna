import { colorForParty } from "./party-colors";

/** Nomes de exibição (com acentos) a partir do número na urna; o TSE publica em caixa alta e sem acento. */
const NOMES: Record<number, string> = {
  13: "Lula",
  22: "Flávio Bolsonaro",
  55: "Ronaldo Caiado",
  14: "Renan Santos",
  70: "Augusto Cury",
  30: "Romeu Zema",
  80: "Samara",
  16: "Hertz Dias",
  21: "Edmilson Costa",
  27: "Clariana Barão",
  35: "Wilson Grassi",
  29: "Rui Costa Pimenta",
  28: "Leonardo Avalanche",
};

export function nomeCandidato(numero: number, fallback?: string): string {
  if (NOMES[numero]) return NOMES[numero];
  return (fallback ?? String(numero)).toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export function corCandidato(c: { partido: string }): string {
  return colorForParty(c.partido);
}
