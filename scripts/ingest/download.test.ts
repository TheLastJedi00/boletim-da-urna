import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadVerified, parseCkanResources, parseSha512File, sha512OfFile } from "./download";

const FX = join(__dirname, "__fixtures__");
const ZIP = join(FX, "bweb_2t_AC_fixture.zip");
const SHA = join(FX, "bweb_2t_AC_fixture.zip.sha512");

describe("parseCkanResources", () => {
  it("extrai UF, turno, URL do zip e URL do hash a partir do package_show", async () => {
    const pkg = JSON.parse(await readFile(join(FX, "ckan-package.json"), "utf8"));
    const res = parseCkanResources(pkg);
    expect(res).toHaveLength(4); // AC e SP × 2 turnos
    expect(res).toContainEqual({
      uf: "AC",
      turno: 2,
      url: "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/buweb/bweb_2t_AC_261020260742.zip",
      shaUrl: "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/buweb/bweb_2t_AC_261020260742.zip.sha512",
      fileName: "bweb_2t_AC_261020260742.zip",
    });
  });

  it("falha se a resposta do CKAN não for sucesso", () => {
    expect(() => parseCkanResources({ success: false })).toThrow(/CKAN/);
  });
});

describe("parseSha512File", () => {
  it("aceita o formato 'hash  arquivo' e 'hash *arquivo'", () => {
    const h = "a".repeat(128);
    expect(parseSha512File(`${h}  x.zip\n`)).toBe(h);
    expect(parseSha512File(`${h.toUpperCase()} *x.zip`)).toBe(h);
  });

  it("rejeita conteúdo sem hash SHA-512 válido", () => {
    expect(() => parseSha512File("not a hash")).toThrow(/SHA-512/);
  });
});

describe("sha512OfFile", () => {
  it("calcula o hash em streaming igual ao publicado", async () => {
    expect(await sha512OfFile(ZIP)).toBe(parseSha512File(await readFile(SHA, "utf8")));
  });
});

describe("downloadVerified", () => {
  let dir: string;
  let zipBytes: Buffer;
  let shaText: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bu-dl-"));
    zipBytes = await readFile(ZIP);
    shaText = await readFile(SHA, "utf8");
  });

  const fakeFetch = (zip: Buffer) =>
    vi.fn(async (url: string) =>
      url.endsWith(".sha512") ? new Response(shaText) : new Response(new Uint8Array(zip)),
    );

  const target = { url: "https://cdn.example/x.zip", shaUrl: "https://cdn.example/x.zip.sha512", fileName: "x.zip" };

  it("baixa, verifica o SHA-512 e grava no cache", async () => {
    const fetchImpl = fakeFetch(zipBytes);
    const r = await downloadVerified({ ...target, destDir: dir, fetchImpl });
    expect(r.cached).toBe(false);
    expect(r.sha512).toBe(parseSha512File(shaText));
    expect(await readFile(r.path)).toEqual(zipBytes);
  });

  it("rejeita arquivo corrompido e não deixa lixo no diretório", async () => {
    const corrupted = Buffer.from(zipBytes);
    corrupted[100] ^= 0xff;
    await expect(downloadVerified({ ...target, destDir: dir, fetchImpl: fakeFetch(corrupted) })).rejects.toThrow(
      /SHA-512/,
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it("não baixa de novo arquivo já em cache com hash válido", async () => {
    await writeFile(join(dir, "x.zip"), zipBytes);
    const fetchImpl = fakeFetch(zipBytes);
    const r = await downloadVerified({ ...target, destDir: dir, fetchImpl });
    expect(r.cached).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // só o .sha512
  });

  it("baixa de novo se o cache estiver corrompido", async () => {
    await writeFile(join(dir, "x.zip"), Buffer.from("lixo"));
    const r = await downloadVerified({ ...target, destDir: dir, fetchImpl: fakeFetch(zipBytes) });
    expect(r.cached).toBe(false);
    expect(await readFile(r.path)).toEqual(zipBytes);
  });

  it("propaga erro HTTP com a URL", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    await expect(downloadVerified({ ...target, destDir: dir, fetchImpl })).rejects.toThrow(/404.*x\.zip/);
  });
});
