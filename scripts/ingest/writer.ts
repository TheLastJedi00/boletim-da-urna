/** Gravação dos snapshots e do manifesto de rastreabilidade. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type Output = { path: string; bytes: number; sha256: string };
export type Fonte = { url: string; sha512?: string; tipo: string };

export async function writeJson(path: string, data: unknown): Promise<Output> {
  const raw = JSON.stringify(data);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, raw, "utf8");
  return { path, bytes: Buffer.byteLength(raw), sha256: createHash("sha256").update(raw).digest("hex") };
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
