/** Tipos e constantes das pesquisas, compartilhados por curadoria e modelo. */

export type Pesquisa = {
  id: string;
  turno: 1 | 2;
  instituto: string;
  contratante: string;
  registroTse: string | null;
  campoInicio: string;
  campoFim: string;
  amostra: number;
  /** margem declarada, em pontos percentuais (sobre o total da amostra) */
  margemErro: number;
  confianca: number | null;
  metodologia: string;
  base: "totais" | "validos";
  cenario: string;
  url: string;
  /** chave numérica = número do candidato; demais chaves: "indecisos_brancos_nulos", "outros" */
  valores: Record<string, number>;
};

/** Margem de erro teórica (95%, p = 0,5, amostra aleatória simples), em p.p. */
export const margemTeorica = (n: number) => 1.96 * Math.sqrt(0.25 / n) * 100;

