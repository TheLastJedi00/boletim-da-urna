/**
 * Cliente dos arquivos JSON de resultados do TSE (resultados.tse.jus.br).
 * Não é uma API formal: são arquivos estáticos — por isso só rodam na ingestão, nunca em runtime.
 */
import type { CandidatoOficial, Totals, Turno } from "../../lib/data-types";

export const RESULTADOS_BASE = "https://resultados.tse.jus.br/oficial/ele2026";
export const ELEICAO: Record<Turno, number> = { 1: 6257, 2: 6258 };

const pad = (n: number | string, w: number) => String(n).padStart(w, "0");
const num = (v: unknown) => Number.parseInt(String(v ?? "0"), 10) || 0;

export function totalsUrl(turno: Turno, uf?: string, cdMunicipio?: number): string {
  const e = ELEICAO[turno];
  const ee = `e${pad(e, 6)}`;
  if (!uf) return `${RESULTADOS_BASE}/${e}/dados/br/br-c0001-${ee}-u.json`;
  const u = uf.toLowerCase();
  if (cdMunicipio === undefined) return `${RESULTADOS_BASE}/${e}/dados/${u}/${u}-c0001-${ee}-u.json`;
  return `${RESULTADOS_BASE}/${e}/dados/${u}/${u}${pad(cdMunicipio, 5)}-c0001-${ee}-u.json`;
}

export const municipiosConfigUrl = (turno: Turno) =>
  `${RESULTADOS_BASE}/${ELEICAO[turno]}/config/mun-e${pad(ELEICAO[turno], 6)}-cm.json`;

type RawCand = { n: string; nmu: string; st?: string; vap?: string; dvt?: string };
type RawJson = {
  tpabr: string;
  cdabr: string;
  t: string;
  dg?: string;
  hg?: string;
  carg: { agr: { par: { sg: string; cand: RawCand[] }[] }[] }[];
  s: { ts: string };
  e: { te: string; c: string; a: string };
  v: { vb: string; vn: string; vnt: string };
};

export type OfficialTotals = {
  abrangencia: string;
  codigo: string;
  turno: Turno;
  geradoEm: string | null;
  totals: Totals;
  candidatos: CandidatoOficial[];
};

export function parseOfficialTotals(json: unknown): OfficialTotals {
  const d = json as RawJson;
  if (!d?.carg?.[0]) throw new Error("JSON de totalização sem cargo");
  const votos: Record<number, number> = {};
  const candidatos: CandidatoOficial[] = [];
  for (const agr of d.carg[0].agr) {
    for (const par of agr.par) {
      for (const c of par.cand) {
        if (c.dvt && !/^v[áa]lido$/i.test(c.dvt)) continue;
        const numero = num(c.n);
        votos[numero] = num(c.vap);
        candidatos.push({ numero, nome: c.nmu, partido: par.sg, situacao: c.st ?? "" });
      }
    }
  }
  candidatos.sort((a, b) => (votos[b.numero] ?? 0) - (votos[a.numero] ?? 0));
  return {
    abrangencia: d.tpabr,
    codigo: d.cdabr,
    turno: num(d.t) as Turno,
    geradoEm: d.dg && d.hg ? `${d.dg} ${d.hg}` : null,
    totals: {
      secoes: num(d.s.ts),
      aptos: num(d.e.te),
      comparecimento: num(d.e.c),
      abstencoes: num(d.e.a),
      brancos: num(d.v.vb),
      nulos: num(d.v.vn),
      nulosTecnicos: num(d.v.vnt),
      votos,
    },
    candidatos,
  };
}

export type Municipio = { uf: string; codigo: number; ibge: string; nome: string; capital: boolean };

export function parseMunicipiosConfig(json: unknown): Municipio[] {
  const d = json as { abr: { cd: string; mu: { cd: string; cdi: string; nm: string; c: string }[] }[] };
  return d.abr.flatMap((a) =>
    a.mu.map((m) => ({ uf: a.cd.toUpperCase(), codigo: num(m.cd), ibge: m.cdi, nome: m.nm, capital: m.c === "s" })),
  );
}

export async function fetchJson(url: string, fetchImpl: typeof fetch = fetch, tries = 3): Promise<unknown> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetchImpl(url, { headers: { "user-agent": "boletim-da-urna-ingest" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return JSON.parse(Buffer.from(await res.arrayBuffer()).toString("utf8"));
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}
