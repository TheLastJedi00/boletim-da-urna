import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SectionRecord } from "../../lib/data-types";
import { aggregateBy, reconcile, sumTotals } from "./aggregate";
import { parseOfficialTotals } from "./official";
import { parseBuCsv } from "./parse-bu";
import { groupSections } from "./sections";

const FX = join(__dirname, "__fixtures__");
const sections = async (f: string) =>
  (await groupSections(parseBuCsv(createReadStream(join(FX, f))))).sections;
const official = async (f: string) => parseOfficialTotals(JSON.parse(await readFile(join(FX, f), "utf8")));

describe("parseOfficialTotals", () => {
  it("lê o JSON de totalização municipal do TSE", async () => {
    const o = await official("mun_ac01031_c0001_e006257.json");
    expect(o).toMatchObject({
      abrangencia: "mu",
      codigo: "01031",
      turno: 1,
      totals: { secoes: 16, aptos: 3927, comparecimento: 2884, abstencoes: 1043, brancos: 12, nulos: 130, nulosTecnicos: 0 },
    });
    expect(o.totals.votos[13]).toBe(1384);
    expect(o.totals.votos[22]).toBe(1258);
    expect(o.candidatos).toContainEqual({ numero: 13, nome: "LULA", partido: "PT", situacao: "2º turno" });
    expect(o.candidatos).toHaveLength(12);
  });
});

describe("aggregateBy / sumTotals", () => {
  it("soma seções em totais", async () => {
    const t = sumTotals(await sections("bweb_1t_AC_santa_rosa.csv"));
    expect(t).toMatchObject({ secoes: 16, comparecimento: 2884, brancos: 12, nulos: 130 });
  });

  it("agrupa por chave (ex.: município)", async () => {
    const s = await sections("bweb_2t_AC_santa_rosa.csv");
    const m = aggregateBy(s, (x) => String(x.cdMunicipio));
    expect([...m.keys()]).toEqual(["1031"]);
    expect(m.get("1031")!.comparecimento).toBe(2820);
  });
});

describe("reconcile — soma dos BUs × total oficial", () => {
  it.each([
    ["bweb_1t_AC_santa_rosa.csv", "mun_ac01031_c0001_e006257.json"],
    ["bweb_2t_AC_santa_rosa.csv", "mun_ac01031_c0001_e006258.json"],
  ])("%s bate com %s", async (csv, json) => {
    const o = await official(json);
    const r = reconcile(sumTotals(await sections(csv), o.candidatos), o.totals);
    expect(r.diffs).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("aponta a diferença quando um BU é alterado", async () => {
    const s = await sections("bweb_2t_AC_santa_rosa.csv");
    const o = await official("mun_ac01031_c0001_e006258.json");
    const adulterado: SectionRecord[] = s.map((x, i) => (i === 0 ? { ...x, votos: { ...x.votos, 13: x.votos[13] + 5 } } : x));
    const r = reconcile(sumTotals(adulterado, o.candidatos), o.totals);
    expect(r.ok).toBe(false);
    expect(r.diffs).toContainEqual({ campo: "votos[13]", calculado: o.totals.votos[13] + 5, oficial: o.totals.votos[13] });
  });

  it("votos em número que não é candidatura válida contam como nulos técnicos", () => {
    const sec = { votos: { 13: 10, 28: 3 }, brancos: 1, nulos: 2 } as unknown as SectionRecord;
    const t = sumTotals([{ ...sec, aptos: 20, comparecimento: 16, abstencoes: 4 }], [
      { numero: 13, nome: "A", partido: "PT", situacao: "Eleito" },
    ]);
    expect(t.votos).toEqual({ 13: 10 });
    expect(t.nulosTecnicos).toBe(3);
    expect(t.nulos).toBe(2);
  });
});
