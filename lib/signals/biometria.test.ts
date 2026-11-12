import { describe, expect, it } from "vitest";
import type { SectionRecord } from "../data-types";
import { biometriaOutliers, biometriaPorRegiao, taxaSemBiometria } from "./biometria";

const sec = (over: Partial<SectionRecord>): SectionRecord => ({
  uf: "BA", cdMunicipio: 1, zona: 1, secao: 1, localVotacao: 1, aptos: 300, comparecimento: 200, abstencoes: 100,
  votos: {}, brancos: 0, nulos: 0, tipoUrna: "Apurada", nrUrna: 1, dtCarga: null, dtAbertura: null,
  dtEncerramento: null, dtEmissaoBu: null, dtBuRecebido: null, eleitoresSemBiometria: 6, secoesAgregadas: [],
  ...over,
});

describe("taxaSemBiometria", () => {
  it("é liberados sem biometria / comparecimento", () => {
    expect(taxaSemBiometria(sec({ comparecimento: 200, eleitoresSemBiometria: 10 }))).toBe(0.05);
    expect(taxaSemBiometria(sec({ comparecimento: 0, eleitoresSemBiometria: 0 }))).toBe(0);
  });
});

describe("biometriaOutliers", () => {
  const normais = Array.from({ length: 50 }, (_, i) => sec({ secao: i, eleitoresSemBiometria: 4 + (i % 5) }));

  it("aponta seção com liberação em massa sem biometria", () => {
    const massa = sec({ secao: 999, eleitoresSemBiometria: 120 });
    const r = biometriaOutliers([...normais, massa]);
    expect(r.map((o) => o.item.secao)).toEqual([999]);
    expect(r[0].z).toBeGreaterThan(3.5);
  });

  it("não aponta taxas baixas (só o excesso interessa)", () => {
    const zero = sec({ secao: 998, eleitoresSemBiometria: 0 });
    expect(biometriaOutliers([...normais, zero])).toEqual([]);
  });

  it("ignora seções minúsculas (comparecimento abaixo do mínimo) para evitar falso alarme", () => {
    const pequena = sec({ secao: 997, comparecimento: 5, aptos: 10, abstencoes: 5, eleitoresSemBiometria: 4 });
    expect(biometriaOutliers([...normais, pequena], { minComparecimento: 20 })).toEqual([]);
  });
});

describe("biometriaPorRegiao", () => {
  it("agrega taxa ponderada por município e aponta o município fora do padrão", () => {
    const municipios = Array.from({ length: 30 }, (_, m) =>
      Array.from({ length: 5 }, (_, i) => sec({ cdMunicipio: m, secao: i, eleitoresSemBiometria: 5 + (m % 3) })),
    ).flat();
    const anomalo = Array.from({ length: 5 }, (_, i) => sec({ cdMunicipio: 99, secao: i, eleitoresSemBiometria: 60 }));
    const r = biometriaPorRegiao([...municipios, ...anomalo], (s) => String(s.cdMunicipio));
    const m99 = r.find((x) => x.regiao === "99")!;
    expect(m99.taxa).toBeCloseTo(60 / 200, 5);
    expect(m99.foraDoPadrao).toBe(true);
    expect(r.filter((x) => x.foraDoPadrao)).toHaveLength(1);
  });
});
