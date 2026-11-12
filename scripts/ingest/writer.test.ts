import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeSections, encodeSections } from "../../lib/section-codec";
import { parseBuCsv } from "./parse-bu";
import { groupSections } from "./sections";
import { gunzipSync } from "node:zlib";
import { buildManifest, writeJson, writeJsonGz } from "./writer";

const FX = join(__dirname, "__fixtures__");
const load = async (f: string) => groupSections(parseBuCsv(createReadStream(join(FX, f))));

describe("section-codec", () => {
  it("ida e volta preserva todas as seções (1º turno, 13 candidatos)", async () => {
    const { sections, candidatos } = await load("bweb_1t_AC_santa_rosa.csv");
    const enc = encodeSections(sections, candidatos, "2026-10-04");
    expect(decodeSections(enc)).toEqual(sections);
  });

  it("ida e volta preserva todas as seções (2º turno)", async () => {
    const { sections, candidatos } = await load("bweb_2t_AC_santa_rosa.csv");
    expect(decodeSections(encodeSections(sections, candidatos, "2026-10-25"))).toEqual(sections);
  });

  it("é compacto: formato colunar, sem repetir nomes de campo por seção", async () => {
    const { sections, candidatos } = await load("bweb_2t_AC_santa_rosa.csv");
    const enc = encodeSections(sections, candidatos, "2026-10-25");
    expect(enc.rows).toHaveLength(16);
    expect(Array.isArray(enc.rows[0])).toBe(true);
    const bytesPorSecao = JSON.stringify(enc).length / sections.length;
    expect(bytesPorSecao).toBeLessThan(160);
  });

  it("horários do dia da eleição viram segundos desde a meia-noite", async () => {
    const { sections, candidatos } = await load("bweb_2t_AC_santa_rosa.csv");
    const enc = encodeSections(sections, candidatos, "2026-10-25");
    const i = enc.cols.indexOf("abertura");
    const s95 = enc.rows.find((r) => r[enc.cols.indexOf("secao")] === 95)!;
    expect(s95[i]).toBe(6 * 3600 + 1); // 06:00:01
  });
});

describe("writeJson", () => {
  it("cria diretórios, grava JSON minificado e devolve bytes e sha256", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bu-w-"));
    const r = await writeJson(join(dir, "a", "b.json"), { x: 1, y: [1, 2] });
    const raw = await readFile(r.path, "utf8");
    expect(raw).toBe('{"x":1,"y":[1,2]}');
    expect(r.bytes).toBe(raw.length);
    expect(r.sha256).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("é determinístico (mesma entrada → mesmo hash)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bu-w-"));
    const a = await writeJson(join(dir, "1.json"), { b: 2, a: 1 });
    const b = await writeJson(join(dir, "2.json"), { b: 2, a: 1 });
    expect(a.sha256).toBe(b.sha256);
  });
});

describe("writeJsonGz", () => {
  it("grava gzip determinístico; sha256 e bytes referem-se ao JSON descomprimido", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bu-w-"));
    const a = await writeJsonGz(join(dir, "a.json.gz"), { x: [1, 2, 3] });
    const b = await writeJsonGz(join(dir, "b.json.gz"), { x: [1, 2, 3] });
    const raw = gunzipSync(await readFile(a.path)).toString("utf8");
    expect(raw).toBe('{"x":[1,2,3]}');
    expect(a.sha256).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(await readFile(a.path)).toEqual(await readFile(b.path));
    expect(a.gzBytes).toBeGreaterThan(0);
  });
});

describe("buildManifest", () => {
  it("lista fontes (com SHA-512) e saídas ordenadas, com data de coleta", () => {
    const m = buildManifest({
      coletadoEm: "2026-11-12T10:00:00.000Z",
      fontes: [
        { url: "https://cdn.tse.jus.br/z.zip", sha512: "b".repeat(128), tipo: "csv-bu" },
        { url: "https://cdn.tse.jus.br/a.zip", sha512: "a".repeat(128), tipo: "csv-bu" },
      ],
      saidas: [
        { path: "secoes/2/SP/71072.json", bytes: 10, sha256: "x" },
        { path: "resultados.json", bytes: 5, sha256: "y" },
      ],
    });
    expect(m.coletadoEm).toBe("2026-11-12T10:00:00.000Z");
    expect(m.fontes.map((f) => f.url)).toEqual(["https://cdn.tse.jus.br/a.zip", "https://cdn.tse.jus.br/z.zip"]);
    expect(m.saidas.map((s) => s.path)).toEqual(["resultados.json", "secoes/2/SP/71072.json"]);
    expect(m.totalBytes).toBe(15);
  });
});
