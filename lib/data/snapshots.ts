/**
 * Leitura dos snapshots gerados pela ingestão (data/snapshots). Só no servidor, no build.
 * Os dados são de uma eleição encerrada: cache máximo.
 */
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import type { CandidatoOficial, Totals } from "../data-types";
import type { Avaliacao, Projecao, Validos } from "../polls/model";
import type { Pesquisa } from "../polls/types";
import type { Noticia } from "../polls/curated";
import type { Bin } from "../signals/turnout";
import type { EncodedSections } from "../section-codec";

const DIR = join(process.cwd(), "data", "snapshots");

async function load<T>(file: string): Promise<T> {
  "use cache";
  cacheLife("max");
  return JSON.parse(await readFile(join(DIR, file), "utf8")) as T;
}

type Diff = { campo: string; calculado: number; oficial: number };
export type UfResultado = { calculado: Totals; oficial: Totals; reconciliacao: { ok: boolean; diffs: Diff[]; avisos: Diff[] } };
export type TurnoResultado = {
  dia: string;
  br: { abrangencia: string; turno: 1 | 2; geradoEm: string | null; totals: Totals; candidatos: CandidatoOficial[] };
  ufs: Record<string, UfResultado>;
};
export type Resultados = { turnos: Record<"1" | "2", TurnoResultado> };

export type MunicipioSnapshot = {
  uf: string;
  codigo: number;
  ibge: string;
  nome: string;
  capital: boolean;
  turnos: Record<"1" | "2", Totals | null>;
};

export type Destaque = { uf: string; cdMunicipio: number; municipio: string; zona: number; secao: number; valor: number; z: number };
export type SinaisTurno = {
  turno: 1 | 2;
  dia: string;
  secoes: number;
  comparecimento: { histograma: Bin[]; porUf: { uf: string; secoes: number; mediana: number; p05: number; p95: number; outliers: number }[]; top: Destaque[]; outliers: number };
  biometria: { histograma: Bin[]; outliers: number; top: Destaque[]; municipiosForaDoPadrao: { uf: string; cdMunicipio: number; municipio: string; taxa: number; z: number }[]; totalMunicipiosForaDoPadrao: number };
  horario: { histogramaEncerramento: Bin[]; porMotivo: Record<string, number>; exemplos: (Destaque & { motivo: string })[]; outliersEncerramento: number };
  impossiveis: { total: number; porMotivo: Record<string, number> };
  amostra: EncodedSections & { ufs: string[] };
};

export type PesquisasTurno = {
  real: Record<string, number>;
  candidatos: CandidatoOficial[];
  pesquisas: (Pesquisa & { validos: Validos })[];
  serie: { data: string; valores: Record<string, number>; intervalo: Record<string, [number, number]>; pesquisas: number }[];
  projecaoFinal: Projecao;
  avaliacoes: Avaliacao[];
  resumo: { institutos: number; acertaramDentroDaMargem: number; indicaramVencedorCorreto: number };
};

export type Manifest = {
  coletadoEm: string;
  fontes: { url: string; sha512?: string; tipo: string }[];
  saidas: { path: string; bytes: number; sha256: string; gzBytes?: number }[];
  totalBytes: number;
};

export const getResultados = () => load<Resultados>("resultados.json");
export const getSinais = () => load<{ turnos: Record<"1" | "2", SinaisTurno> }>("sinais.json");
export const getPesquisas = () =>
  load<{ geradoEm: string; metodo: Record<string, string>; turnos: Record<"1" | "2", PesquisasTurno>; noticias: Noticia[] }>("pesquisas.json");
export const getManifest = () => load<Manifest>("manifest.json");
export const getMunicipios = (uf: string) => load<{ uf: string; municipios: MunicipioSnapshot[] }>(`municipios/${uf.toUpperCase()}.json`);
