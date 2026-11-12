/**
 * Download dos boletins de urna do Portal de Dados Abertos do TSE, com verificação SHA-512 e cache local.
 */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const CKAN_PACKAGE_URL =
  "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2026-boletim-de-urna";

export type BuResource = { uf: string; turno: 1 | 2; url: string; shaUrl: string; fileName: string };

type FetchLike = (url: string) => Promise<Response>;

const BU_ZIP = /\/(bweb_([12])t_([A-Z]{2})_\d+\.zip)$/;

export function parseCkanResources(pkg: unknown): BuResource[] {
  const p = pkg as { success?: boolean; result?: { resources?: { url: string }[] } };
  if (!p?.success || !p.result?.resources) throw new Error("Resposta inválida do CKAN (package_show)");
  const urls = new Set(p.result.resources.map((r) => r.url));
  const out: BuResource[] = [];
  for (const url of urls) {
    const m = BU_ZIP.exec(url);
    if (!m) continue;
    const shaUrl = `${url}.sha512`;
    if (!urls.has(shaUrl)) throw new Error(`Recurso sem hash SHA-512 publicado: ${url}`);
    out.push({ uf: m[3], turno: Number(m[2]) as 1 | 2, url, shaUrl, fileName: m[1] });
  }
  return out.sort((a, b) => a.uf.localeCompare(b.uf) || a.turno - b.turno);
}

export async function fetchCatalog(fetchImpl: FetchLike = fetch): Promise<BuResource[]> {
  const res = await fetchImpl(CKAN_PACKAGE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${CKAN_PACKAGE_URL}`);
  return parseCkanResources(await res.json());
}

export function parseSha512File(text: string): string {
  const m = /^\s*([0-9a-fA-F]{128})\b/.exec(text);
  if (!m) throw new Error("Arquivo .sha512 sem hash SHA-512 válido");
  return m[1].toLowerCase();
}

export async function sha512OfFile(path: string): Promise<string> {
  const hash = createHash("sha512");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

const exists = (p: string) => stat(p).then(() => true, () => false);

async function get(fetchImpl: FetchLike, url: string): Promise<Response> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${url}`);
  return res;
}

export async function downloadVerified(opts: {
  url: string;
  shaUrl: string;
  fileName: string;
  destDir: string;
  fetchImpl?: FetchLike;
}): Promise<{ path: string; sha512: string; cached: boolean }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const expected = parseSha512File(await (await get(fetchImpl, opts.shaUrl)).text());
  const path = join(opts.destDir, opts.fileName);
  await mkdir(opts.destDir, { recursive: true });

  if ((await exists(path)) && (await sha512OfFile(path)) === expected) {
    return { path, sha512: expected, cached: true };
  }

  const tmp = `${path}.part`;
  try {
    const res = await get(fetchImpl, opts.url);
    if (!res.body) throw new Error(`Resposta vazia em ${opts.url}`);
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
    const actual = await sha512OfFile(tmp);
    if (actual !== expected) {
      throw new Error(`SHA-512 não confere para ${opts.fileName}: esperado ${expected.slice(0, 16)}…, obtido ${actual.slice(0, 16)}…`);
    }
    await rm(path, { force: true });
    await rename(tmp, path);
    return { path, sha512: expected, cached: false };
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}
