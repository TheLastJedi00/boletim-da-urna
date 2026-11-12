/**
 * Ingestão de ponta a ponta:  npm run ingest [-- --uf AC,SP --turno 2 --out data/snapshots --public public/data]
 *
 * 1. Catálogo CKAN → download dos zips de BU (SHA-512 verificado, cache em data/raw/)
 * 2. Parser em streaming → uma linha por seção (só Presidente)
 * 3. Agregados por município/UF + reconciliação com o JSON oficial do TSE
 * 4. Agregados + manifesto em --out (lidos no build); seções por município em --public
 *    como .json.gz (baixadas sob demanda e descomprimidas no navegador)
 * Idempotente: rodar de novo reaproveita o cache e regrava os mesmos arquivos.
 */
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import type { CandidatoOficial, SectionRecord, Totals, Turno } from "../../lib/data-types";
import { encodeSections } from "../../lib/section-codec";
import { aggregateBy, reconcile, sumTotals, type Diff } from "./aggregate";
import { downloadVerified, fetchCatalog, type BuResource } from "./download";
import {
  fetchJson,
  municipiosConfigUrl,
  parseMunicipiosConfig,
  parseOfficialTotals,
  totalsUrl,
  type Municipio,
  type OfficialTotals,
} from "./official";
import { openCsvFromZip, parseBuCsv } from "./parse-bu";
import { groupSections } from "./sections";
import { buildManifest, writeJson, writeJsonGz, type Fonte, type Output } from "./writer";

export const DIA_ELEICAO: Record<Turno, string> = { 1: "2026-10-04", 2: "2026-10-25" };

export type UfTurnoResult = {
  uf: string;
  turno: Turno;
  sections: SectionRecord[];
  totals: Totals;
  municipios: Map<string, Totals>;
  reconciliacao: { ok: boolean; diffs: Diff[]; avisos: Diff[] };
};

/** Gancho para etapas extras (ex.: estatísticas da fase 3) que precisam ver todas as seções. */
export type IngestHook = {
  onUfTurno?(r: UfTurnoResult): void | Promise<void>;
  finish?(ctx: { out: string; write: (rel: string, data: unknown) => Promise<Output> }): Promise<void>;
};

export async function ingest(opts: {
  ufs?: string[];
  turnos?: Turno[];
  out: string;
  publicDir: string;
  raw: string;
  hooks?: IngestHook[];
  log?: (msg: string) => void;
}) {
  const log = opts.log ?? console.log;
  const turnos = opts.turnos ?? [1, 2];
  const outputs: Output[] = [];
  const fontes: Fonte[] = [];
  const record = (o: Output, base: string, prefix: string) => {
    const out = { ...o, path: prefix + relative(base, o.path).replaceAll("\\", "/") };
    outputs.push(out);
    return out;
  };
  const write = async (rel: string, data: unknown) => record(await writeJson(join(opts.out, rel), data), opts.out, "");
  const writePublicGz = async (rel: string, data: unknown) =>
    record(await writeJsonGz(join(opts.publicDir, rel), data), opts.publicDir, "public:");

  log("Catálogo CKAN…");
  const catalog = (await fetchCatalog()).filter(
    (r) => turnos.includes(r.turno) && (!opts.ufs || opts.ufs.includes(r.uf)),
  );
  const ufs = [...new Set(catalog.map((r) => r.uf))].sort();

  // Municípios (nome, código IBGE) — mesma configuração nos dois turnos.
  const munUrl = municipiosConfigUrl(1);
  const municipios = parseMunicipiosConfig(await fetchJson(munUrl));
  fontes.push({ url: munUrl, tipo: "json-config-municipios" });

  const oficial: Record<string, OfficialTotals> = {};
  const getOficial = async (t: Turno, uf?: string) => {
    const url = totalsUrl(t, uf);
    const key = `${t}-${uf ?? "BR"}`;
    if (!oficial[key]) {
      oficial[key] = parseOfficialTotals(await fetchJson(url));
      fontes.push({ url, tipo: "json-totalizacao" });
    }
    return oficial[key];
  };

  const resultados: Record<number, { br: OfficialTotals; ufs: Record<string, { calculado: Totals; oficial: Totals; reconciliacao: { ok: boolean; diffs: Diff[] } }> }> = {};
  const munTotals: Record<string, Record<number, Record<string, Totals>>> = {};

  for (const t of turnos) {
    const br = await getOficial(t);
    resultados[t] = { br, ufs: {} };
    for (const uf of ufs) {
      const res = catalog.find((r) => r.uf === uf && r.turno === t);
      if (!res) continue;
      const r = await processUfTurno(res, t, br.candidatos, opts.raw, log);
      fontes.push({ url: res.url, sha512: r.sha512, tipo: "csv-boletim-de-urna" });

      const ofUf = await getOficial(t, uf);
      const rec = reconcile(r.totals, ofUf.totals);
      const aviso = rec.avisos.length ? ` (aviso: ${rec.avisos.map((a) => `${a.campo} ${a.calculado}/${a.oficial}`).join(", ")})` : "";
      log(`  ${uf} ${t}º turno: ${r.sections.length} seções — reconciliação ${rec.ok ? "OK" : `DIVERGE (${rec.diffs.length})`}${aviso}`);
      resultados[t].ufs[uf] = { calculado: r.totals, oficial: ofUf.totals, reconciliacao: rec };

      // Seções, um arquivo por município (carregado sob demanda na página /secao).
      const byMun = new Map<number, SectionRecord[]>();
      for (const s of r.sections) {
        const list = byMun.get(s.cdMunicipio) ?? [];
        list.push(s);
        byMun.set(s.cdMunicipio, list);
      }
      for (const [mun, list] of byMun) {
        await writePublicGz(`secoes/${t}/${uf}/${mun}.json.gz`, encodeSections(list, br.candidatos, DIA_ELEICAO[t]));
      }
      (munTotals[uf] ??= {})[t] = Object.fromEntries(r.municipios);

      for (const h of opts.hooks ?? []) await h.onUfTurno?.({ uf, turno: t, ...r, reconciliacao: rec });
    }
  }

  // Municípios por UF, com totais dos dois turnos.
  for (const uf of ufs) {
    const lista = municipios
      .filter((m) => m.uf === uf)
      .map((m: Municipio) => ({
        ...m,
        turnos: Object.fromEntries(turnos.map((t) => [t, munTotals[uf]?.[t]?.[String(m.codigo)] ?? null])),
      }));
    await write(`municipios/${uf}.json`, { uf, municipios: lista });
  }

  await write("resultados.json", {
    turnos: Object.fromEntries(
      Object.entries(resultados).map(([t, r]) => [
        t,
        { dia: DIA_ELEICAO[Number(t) as Turno], br: r.br, ufs: r.ufs },
      ]),
    ),
  });

  for (const h of opts.hooks ?? []) await h.finish?.({ out: opts.out, write });

  const manifest = buildManifest({ coletadoEm: new Date().toISOString(), fontes, saidas: outputs });
  await writeJson(join(opts.out, "manifest.json"), manifest);
  const divergentes = Object.values(resultados).flatMap((r) => Object.entries(r.ufs).filter(([, u]) => !u.reconciliacao.ok));
  log(`Pronto: ${outputs.length} arquivos, ${(manifest.totalBytes / 1e6).toFixed(1)} MB (JSON) em ${opts.out} e ${opts.publicDir}`);
  if (divergentes.length) log(`ATENÇÃO: ${divergentes.length} UF(s) com divergência na reconciliação — veja resultados.json`);
  return { manifest, resultados };
}

async function processUfTurno(res: BuResource, turno: Turno, validos: CandidatoOficial[], rawDir: string, log: (m: string) => void) {
  const dl = await downloadVerified({ ...res, destDir: rawDir });
  log(`${res.uf} ${turno}º turno: ${dl.cached ? "cache" : "baixado"} (${res.fileName})`);
  const { stream } = await openCsvFromZip(dl.path);
  const g = await groupSections(parseBuCsv(stream));
  if (g.turno !== null && g.turno !== turno) throw new Error(`${res.fileName}: turno ${g.turno}, esperado ${turno}`);
  return {
    sha512: dl.sha512,
    sections: g.sections,
    totals: sumTotals(g.sections, validos),
    municipios: aggregateBy(g.sections, (s) => String(s.cdMunicipio), validos),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      uf: { type: "string" },
      turno: { type: "string" },
      out: { type: "string", default: "data/snapshots" },
      public: { type: "string", default: "public/data" },
      raw: { type: "string", default: "data/raw" },
    },
  });
  await ingest({
    ufs: values.uf?.toUpperCase().split(","),
    turnos: values.turno ? (values.turno.split(",").map(Number) as Turno[]) : undefined,
    out: values.out!,
    publicDir: values.public!,
    raw: values.raw!,
    hooks: [],
  });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/ingest/run.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
