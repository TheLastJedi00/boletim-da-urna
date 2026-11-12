import { createReadStream } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBuCsv, type BuRow } from "./parse-bu";
import { groupSections, sectionKey } from "./sections";

const FX = join(__dirname, "__fixtures__");
const load = (f: string) => groupSections(parseBuCsv(createReadStream(join(FX, f))));

const base: BuRow = {
  turno: 2, cdEleicao: 6258, cdPleito: 3221, uf: "AC", cdMunicipio: 1, nmMunicipio: "X", zona: 1, secao: 1,
  localVotacao: 10, cargo: 1, aptos: 100, comparecimento: 80, abstencoes: 20, tipoUrna: "Apurada",
  tipoVotavel: "Nominal", nrVotavel: 13, nmVotavel: "A", sgPartido: "PT", votos: 40, nrUrna: 1,
  dtCarga: "2026-09-23T20:00:00", dtAbertura: "2026-10-25T07:00:00", dtEncerramento: "2026-10-25T17:00:00",
  dtEmissaoBu: "2026-10-25T17:02:00", dtBuRecebido: "2026-10-25T18:00:00", eleitoresSemBiometria: 3, secoesAgregadas: [],
};
async function* iter(rows: BuRow[]) {
  yield* rows;
}

describe("groupSections — dados reais (Santa Rosa do Purus, 2º turno)", () => {
  it("gera uma linha por seção", async () => {
    const { sections } = await load("bweb_2t_AC_santa_rosa.csv");
    expect(sections).toHaveLength(16);
  });

  it("comparecimento total bate com o oficial (2820)", async () => {
    const { sections } = await load("bweb_2t_AC_santa_rosa.csv");
    expect(sections.reduce((s, x) => s + x.comparecimento, 0)).toBe(2820);
  });

  it("em cada seção, votos nominais + brancos + nulos = comparecimento", async () => {
    const { sections } = await load("bweb_2t_AC_santa_rosa.csv");
    for (const s of sections) {
      const nominais = Object.values(s.votos).reduce((a, b) => a + b, 0);
      expect(nominais + s.brancos + s.nulos).toBe(s.comparecimento);
    }
  });

  it("registra os candidatos com número, nome e partido", async () => {
    const { candidatos } = await load("bweb_2t_AC_santa_rosa.csv");
    expect(candidatos).toEqual(
      expect.arrayContaining([
        { numero: 13, nome: "LULA", partido: "PT" },
        { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL" },
      ]),
    );
    expect(candidatos).toHaveLength(2);
  });

  it("preserva horários, carga, biometria e seções agregadas", async () => {
    const { sections } = await load("bweb_2t_AC_santa_rosa.csv");
    const s95 = sections.find((s) => s.zona === 3 && s.secao === 95)!;
    expect(s95).toMatchObject({
      aptos: 337,
      comparecimento: 228,
      abstencoes: 109,
      dtAbertura: "2026-10-25T06:00:01",
      dtEncerramento: "2026-10-25T15:01:37",
      dtEmissaoBu: "2026-10-25T15:03:44",
      dtCarga: "2026-09-23T20:03:00",
      eleitoresSemBiometria: 13,
      secoesAgregadas: [140],
      nrUrna: 2047850,
    });
  });
});

describe("groupSections — regras", () => {
  it("separa brancos e nulos dos votos nominais", async () => {
    const { sections } = await groupSections(
      iter([
        base,
        { ...base, nrVotavel: 22, nmVotavel: "B", sgPartido: "PL", votos: 30 },
        { ...base, tipoVotavel: "Branco", nrVotavel: 95, nmVotavel: "Branco", sgPartido: null, votos: 4 },
        { ...base, tipoVotavel: "Nulo", nrVotavel: 96, nmVotavel: "Nulo", sgPartido: null, votos: 6 },
      ]),
    );
    expect(sections[0]).toMatchObject({ votos: { 13: 40, 22: 30 }, brancos: 4, nulos: 6 });
  });

  it("falha se uma mesma seção vier com aptos diferentes em linhas distintas", async () => {
    await expect(groupSections(iter([base, { ...base, nrVotavel: 22, aptos: 99 }]))).rejects.toThrow(/inconsistente/i);
  });

  it("falha se misturar turnos no mesmo arquivo", async () => {
    await expect(groupSections(iter([base, { ...base, turno: 1, secao: 2 }]))).rejects.toThrow(/turno/i);
  });

  it("sectionKey identifica UF, município, zona e seção", () => {
    expect(sectionKey({ uf: "AC", cdMunicipio: 1031, zona: 3, secao: 95 })).toBe("AC-1031-3-95");
  });
});
