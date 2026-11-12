/**
 * Parser em streaming do CSV de Boletim de Urna do TSE (latin1, ";" como separador, CRLF).
 * Emite uma linha por (seção × votável) apenas para o cargo Presidente.
 */
import { StringDecoder } from "node:string_decoder";
import type { Readable } from "node:stream";
import yauzl from "yauzl";

export type TipoVotavel = "Nominal" | "Branco" | "Nulo" | "Legenda";

export type BuRow = {
  turno: number;
  cdEleicao: number;
  cdPleito: number;
  uf: string;
  cdMunicipio: number;
  nmMunicipio: string;
  zona: number;
  secao: number;
  localVotacao: number;
  cargo: number;
  aptos: number;
  comparecimento: number;
  abstencoes: number;
  tipoUrna: string;
  tipoVotavel: TipoVotavel;
  nrVotavel: number;
  nmVotavel: string;
  sgPartido: string | null;
  votos: number;
  nrUrna: number | null;
  dtCarga: string | null;
  dtAbertura: string | null;
  dtEncerramento: string | null;
  dtEmissaoBu: string | null;
  dtBuRecebido: string | null;
  eleitoresSemBiometria: number;
  secoesAgregadas: number[];
};

const CARGO_PRESIDENTE = "Presidente";
const NULO = "#NULO#";

/** Divide uma linha CSV respeitando aspas ("" = aspa literal). */
export function splitCsvLine(line: string, sep = ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Lê linhas de um stream latin1 (CRLF ou LF). */
async function* lines(stream: Readable): AsyncGenerator<string> {
  const decoder = new StringDecoder("latin1");
  let buf = "";
  for await (const chunk of stream) {
    buf += decoder.write(chunk as Buffer);
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      yield buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
    }
  }
  buf += decoder.end();
  if (buf.replace(/\r$/, "").length > 0) yield buf.replace(/\r$/, "");
}

const str = (v: string | undefined) => (v === undefined || v === NULO || v === "" ? null : v);
const int = (v: string | undefined) => {
  const s = str(v);
  return s === null ? null : Number.parseInt(s, 10);
};
const date = (v: string | undefined) => {
  const s = str(v);
  return s === null ? null : s.replace(" ", "T");
};

export async function* parseBuCsv(stream: Readable): AsyncGenerator<BuRow> {
  let idx: Map<string, number> | null = null;
  for await (const line of lines(stream)) {
    if (!line) continue;
    // Atalho: os CSVs do 1º turno têm todos os cargos; descarta sem fazer o split.
    if (idx && !line.includes(CARGO_PRESIDENTE)) continue;
    const cols = splitCsvLine(line);
    if (!idx) {
      idx = new Map(cols.map((c, i) => [c.trim(), i]));
      if (!idx.has("DS_CARGO_PERGUNTA")) {
        throw new Error("CSV de BU sem a coluna DS_CARGO_PERGUNTA — formato inesperado");
      }
      continue;
    }
    const get = (name: string) => {
      const i = idx!.get(name);
      return i === undefined ? undefined : cols[i];
    };
    if (get("DS_CARGO_PERGUNTA") !== CARGO_PRESIDENTE) continue;

    const agregadas = str(get("DS_SECOES_AGREGADAS"));
    yield {
      turno: int(get("NR_TURNO")) ?? 0,
      cdEleicao: int(get("CD_ELEICAO")) ?? 0,
      cdPleito: int(get("CD_PLEITO")) ?? 0,
      uf: str(get("SG_UF")) ?? "",
      cdMunicipio: int(get("CD_MUNICIPIO")) ?? 0,
      nmMunicipio: str(get("NM_MUNICIPIO")) ?? "",
      zona: int(get("NR_ZONA")) ?? 0,
      secao: int(get("NR_SECAO")) ?? 0,
      localVotacao: int(get("NR_LOCAL_VOTACAO")) ?? 0,
      cargo: int(get("CD_CARGO_PERGUNTA")) ?? 0,
      aptos: int(get("QT_APTOS")) ?? 0,
      comparecimento: int(get("QT_COMPARECIMENTO")) ?? 0,
      abstencoes: int(get("QT_ABSTENCOES")) ?? 0,
      tipoUrna: str(get("DS_TIPO_URNA")) ?? "",
      tipoVotavel: (str(get("DS_TIPO_VOTAVEL")) ?? "Nominal") as TipoVotavel,
      nrVotavel: int(get("NR_VOTAVEL")) ?? 0,
      nmVotavel: str(get("NM_VOTAVEL")) ?? "",
      sgPartido: str(get("SG_PARTIDO")),
      votos: int(get("QT_VOTOS")) ?? 0,
      nrUrna: int(get("NR_URNA_EFETIVADA")),
      dtCarga: date(get("DT_CARGA_URNA_EFETIVADA")),
      dtAbertura: date(get("DT_ABERTURA")),
      dtEncerramento: date(get("DT_ENCERRAMENTO")),
      dtEmissaoBu: date(get("DT_EMISSAO_BU")),
      dtBuRecebido: date(get("DT_BU_RECEBIDO")),
      eleitoresSemBiometria: int(get("QT_ELEI_BIOM_SEM_HABILITACAO")) ?? 0,
      secoesAgregadas: agregadas ? agregadas.split(/\D+/).filter(Boolean).map(Number) : [],
    };
  }
}

/** Abre em streaming o primeiro .csv de dentro de um zip do TSE. */
export function openCsvFromZip(zipPath: string): Promise<{ entryName: string; stream: Readable }> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error(`Não foi possível abrir ${zipPath}`));
      let found = false;
      zip.on("entry", (entry: yauzl.Entry) => {
        if (!entry.fileName.toLowerCase().endsWith(".csv")) return zip.readEntry();
        found = true;
        zip.openReadStream(entry, (e, stream) => {
          if (e || !stream) return reject(e ?? new Error("Falha ao ler entrada do zip"));
          resolve({ entryName: entry.fileName, stream });
        });
      });
      zip.on("end", () => {
        if (!found) reject(new Error(`Nenhum CSV encontrado em ${zipPath}`));
      });
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}
