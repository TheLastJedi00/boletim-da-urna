import { describe, expect, it } from "vitest";
import type { SectionRecord } from "../data-types";
import { histogram, impossibleSections, median, quantiles, robustOutliers, turnoutRate } from "./turnout";

const sec = (over: Partial<SectionRecord>): SectionRecord => ({
  uf: "AC", cdMunicipio: 1, zona: 1, secao: 1, localVotacao: 1, aptos: 100, comparecimento: 80, abstencoes: 20,
  votos: { 13: 40, 22: 36 }, brancos: 2, nulos: 2, tipoUrna: "Apurada", nrUrna: 1, dtCarga: null, dtAbertura: null,
  dtEncerramento: null, dtEmissaoBu: null, dtBuRecebido: null, eleitoresSemBiometria: 0, secoesAgregadas: [],
  ...over,
});

describe("estatística básica", () => {
  it("mediana de pares e ímpares", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it("quantis por interpolação linear", () => {
    expect(quantiles([0, 10, 20, 30, 40], [0, 0.25, 0.5, 1])).toEqual([0, 10, 20, 40]);
  });

  it("histograma com faixas fixas e contagem total preservada", () => {
    const h = histogram([0.1, 0.15, 0.55, 0.99, 1], { min: 0, max: 1, bins: 10 });
    expect(h).toHaveLength(10);
    expect(h.reduce((s, b) => s + b.count, 0)).toBe(5);
    expect(h[1]).toEqual({ x0: 0.1, x1: 0.2, count: 2 });
    expect(h[9].count).toBe(2); // 0.99 e 1 (o máximo entra na última faixa)
  });
});

describe("turnoutRate", () => {
  it("é comparecimento / aptos (0 se não há aptos)", () => {
    expect(turnoutRate(sec({ aptos: 200, comparecimento: 150 }))).toBe(0.75);
    expect(turnoutRate(sec({ aptos: 0, comparecimento: 0 }))).toBe(0);
  });
});

describe("robustOutliers (mediana/MAD)", () => {
  const base = [0.78, 0.79, 0.8, 0.8, 0.81, 0.82, 0.8, 0.79, 0.81, 0.8];

  it("não aponta nada numa distribuição homogênea", () => {
    expect(robustOutliers(base, (x) => x)).toEqual([]);
  });

  it("aponta valores muito acima e muito abaixo, com o z robusto", () => {
    const out = robustOutliers([...base, 0.99, 0.4], (x) => x);
    expect(out.map((o) => o.item)).toEqual([0.99, 0.4]);
    expect(out[0].z).toBeGreaterThan(3.5);
    expect(out[1].z).toBeLessThan(-3.5);
  });

  it("aceita limiar configurável", () => {
    expect(robustOutliers([...base, 0.86], (x) => x, { threshold: 3.5 })).toEqual([]);
    expect(robustOutliers([...base, 0.86], (x) => x, { threshold: 2 })).toHaveLength(1);
  });

  it("MAD zero (todos iguais) não divide por zero; só aponta quem difere", () => {
    const out = robustOutliers([1, 1, 1, 1, 2], (x) => x);
    expect(out.map((o) => o.item)).toEqual([2]);
    expect(Number.isFinite(out[0].z)).toBe(true);
  });
});

describe("impossibleSections", () => {
  it("aponta comparecimento acima dos aptos", () => {
    const r = impossibleSections([sec({}), sec({ secao: 2, aptos: 100, comparecimento: 101, votos: { 13: 97 } })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ secao: { secao: 2 }, motivo: "comparecimento-acima-dos-aptos" });
  });

  it("aponta votos que não fecham com o comparecimento", () => {
    const r = impossibleSections([sec({ votos: { 13: 40, 22: 37 } })]);
    expect(r[0].motivo).toBe("votos-diferentes-do-comparecimento");
  });

  it("aponta aptos − comparecimento ≠ abstenções", () => {
    const r = impossibleSections([sec({ abstencoes: 25 })]);
    expect(r[0].motivo).toBe("abstencoes-inconsistentes");
  });
});
