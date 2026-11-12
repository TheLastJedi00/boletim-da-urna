/** Tipos compartilhados entre a ingestão (scripts/) e a aplicação (app/). */

export type Turno = 1 | 2;

export type Candidato = { numero: number; nome: string; partido: string };

/** Uma seção eleitoral (um BU), só para o cargo Presidente. */
export type SectionRecord = {
  uf: string;
  cdMunicipio: number;
  zona: number;
  secao: number;
  localVotacao: number;
  aptos: number;
  comparecimento: number;
  abstencoes: number;
  /** votos nominais por número do candidato */
  votos: Record<number, number>;
  brancos: number;
  nulos: number;
  tipoUrna: string;
  nrUrna: number | null;
  dtCarga: string | null;
  dtAbertura: string | null;
  dtEncerramento: string | null;
  dtEmissaoBu: string | null;
  dtBuRecebido: string | null;
  eleitoresSemBiometria: number;
  secoesAgregadas: number[];
};

/** Totais de uma abrangência (Brasil, UF ou município). */
export type Totals = {
  secoes: number;
  aptos: number;
  comparecimento: number;
  abstencoes: number;
  brancos: number;
  nulos: number;
  /** votos em números sem candidatura válida (anulados pelo TSE) */
  nulosTecnicos: number;
  /** votos nominais válidos por número do candidato */
  votos: Record<number, number>;
};

export type CandidatoOficial = Candidato & { situacao: string };
