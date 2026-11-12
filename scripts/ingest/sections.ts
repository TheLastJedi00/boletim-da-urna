/** Agrupa as linhas do CSV (seção × votável) em uma linha por seção. */
import type { Candidato, SectionRecord } from "../../lib/data-types";
import type { BuRow } from "./parse-bu";

export function sectionKey(s: Pick<SectionRecord, "uf" | "cdMunicipio" | "zona" | "secao">): string {
  return `${s.uf}-${s.cdMunicipio}-${s.zona}-${s.secao}`;
}

/** Atributos que descrevem a seção e devem ser idênticos em todas as suas linhas. */
const SECTION_ATTRS = [
  "aptos",
  "comparecimento",
  "abstencoes",
  "localVotacao",
  "tipoUrna",
  "nrUrna",
  "dtCarga",
  "dtAbertura",
  "dtEncerramento",
  "dtEmissaoBu",
  "eleitoresSemBiometria",
] as const;

export async function groupSections(
  rows: AsyncIterable<BuRow>,
): Promise<{ turno: number | null; sections: SectionRecord[]; candidatos: Candidato[]; municipios: Map<number, string> }> {
  const byKey = new Map<string, SectionRecord>();
  const candidatos = new Map<number, Candidato>();
  const municipios = new Map<number, string>();
  let turno: number | null = null;

  for await (const r of rows) {
    if (turno === null) turno = r.turno;
    else if (r.turno !== turno) throw new Error(`Arquivo mistura turnos (${turno} e ${r.turno})`);

    municipios.set(r.cdMunicipio, r.nmMunicipio);
    const key = sectionKey(r);
    let s = byKey.get(key);
    if (!s) {
      s = {
        uf: r.uf,
        cdMunicipio: r.cdMunicipio,
        zona: r.zona,
        secao: r.secao,
        localVotacao: r.localVotacao,
        aptos: r.aptos,
        comparecimento: r.comparecimento,
        abstencoes: r.abstencoes,
        votos: {},
        brancos: 0,
        nulos: 0,
        tipoUrna: r.tipoUrna,
        nrUrna: r.nrUrna,
        dtCarga: r.dtCarga,
        dtAbertura: r.dtAbertura,
        dtEncerramento: r.dtEncerramento,
        dtEmissaoBu: r.dtEmissaoBu,
        dtBuRecebido: r.dtBuRecebido,
        eleitoresSemBiometria: r.eleitoresSemBiometria,
        secoesAgregadas: r.secoesAgregadas,
      };
      byKey.set(key, s);
    } else {
      for (const a of SECTION_ATTRS) {
        if (s[a] !== r[a]) {
          throw new Error(`Seção ${key} inconsistente: ${a} = ${String(s[a])} e ${String(r[a])}`);
        }
      }
    }

    switch (r.tipoVotavel) {
      case "Branco":
        s.brancos += r.votos;
        break;
      case "Nulo":
        s.nulos += r.votos;
        break;
      default:
        s.votos[r.nrVotavel] = (s.votos[r.nrVotavel] ?? 0) + r.votos;
        if (!candidatos.has(r.nrVotavel)) {
          candidatos.set(r.nrVotavel, { numero: r.nrVotavel, nome: r.nmVotavel, partido: r.sgPartido ?? "" });
        }
    }
  }

  const sections = [...byKey.values()].sort(
    (a, b) => a.cdMunicipio - b.cdMunicipio || a.zona - b.zona || a.secao - b.secao,
  );
  return { turno, sections, candidatos: [...candidatos.values()].sort((a, b) => a.numero - b.numero), municipios };
}
