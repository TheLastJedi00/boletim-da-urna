/** Gravação dos snapshots e do manifesto de rastreabilidade. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";

/** `bytes`/`sha256` referem-se sempre ao JSON descomprimido; `gzBytes` ao arquivo .gz, se houver. */
export type Output = { path: string; bytes: number; sha256: string; gzBytes?: number };
export type Fonte = { url: string; sha512?: string; tipo: string };

export async function writeJson(path: string, data: unknown): Promise<Output> {
  const raw = JSON.stringify(data);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, raw, "utf8");
  return { path, bytes: Buffer.byteLength(raw), sha256: createHash("sha256").update(raw).digest("hex") };
}

/** Grava JSON comprimido (gzip nível 9, sem timestamp → determinístico). */
export async function writeJsonGz(path: string, data: unknown): Promise<Output> {
  const raw = JSON.stringify(data);
  const gz = gzipSync(raw, { level: 9 });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, gz);
  return {
    path,
    bytes: Buffer.byteLength(raw),
    sha256: createHash("sha256").update(raw).digest("hex"),
    gzBytes: gz.length,
  };
}

export type Manifest = {
  coletadoEm: string;
  fontes: Fonte[];
  saidas: Output[];
  totalBytes: number;
};

export function buildManifest(input: { coletadoEm: string; fontes: Fonte[]; saidas: Output[] }): Manifest {
  const byString = <T>(k: (x: T) => string) => (a: T, b: T) => k(a).localeCompare(k(b));
  const saidas = [...input.saidas].sort(byString((s) => s.path));
  return {
    coletadoEm: input.coletadoEm,
    fontes: [...input.fontes].sort(byString((f) => f.url)),
    saidas,
    totalBytes: saidas.reduce((s, o) => s + o.bytes, 0),
  };
}
