import { describe, expect, it } from "vitest";
import {
  NEUTRAL_COLORS,
  PARTY_COLORS,
  colorForParty,
  contrastRatio,
  oklabDistance,
  oklch,
  simulateDeuteranopia,
} from "./party-colors";

const SURFACE = "#232326";
const ACCENT = "#3986ff";

// Partidos com candidato a Presidente em 2026 (JSON oficial do TSE, 1º turno).
const PARTIDOS_2026 = ["PL", "PT", "PSD", "AVANTE", "MISSÃO", "NOVO", "UP", "PSTU", "DC", "PCB", "DEMOCRATA", "PCO"];

describe("helpers de cor", () => {
  it("contraste segue WCAG (branco × preto = 21)", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("distância OKLab é zero para cores iguais e positiva para diferentes", () => {
    expect(oklabDistance("#3986ff", "#3986ff")).toBe(0);
    expect(oklabDistance("#ff0000", "#00ff00")).toBeGreaterThan(0.3);
  });
});

describe("PARTY_COLORS", () => {
  it.each(PARTIDOS_2026)("%s tem cor definida", (sigla) => {
    expect(PARTY_COLORS[sigla]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(Object.entries(PARTY_COLORS))("%s tem contraste ≥ 3:1 contra a superfície", (_, hex) => {
    expect(contrastRatio(hex, SURFACE)).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.entries(PARTY_COLORS))("%s é sutil (croma OKLCH ≤ 0.14)", (_, hex) => {
    expect(oklch(hex).c).toBeLessThanOrEqual(0.14);
  });

  it.each(Object.entries(PARTY_COLORS))("%s não se confunde com o acento da marca", (_, hex) => {
    expect(oklabDistance(hex, ACCENT)).toBeGreaterThanOrEqual(0.12);
  });

  it("os finalistas (PT × PL) são distintos, inclusive para deuteranopia", () => {
    expect(oklabDistance(PARTY_COLORS.PT, PARTY_COLORS.PL)).toBeGreaterThanOrEqual(0.2);
    expect(
      oklabDistance(simulateDeuteranopia(PARTY_COLORS.PT), simulateDeuteranopia(PARTY_COLORS.PL)),
    ).toBeGreaterThanOrEqual(0.12);
  });
});

describe("colorForParty", () => {
  it("normaliza a sigla (caixa e espaços)", () => {
    expect(colorForParty(" pt ")).toBe(PARTY_COLORS.PT);
  });

  it("usa cinza neutro para partido desconhecido", () => {
    expect(colorForParty("XYZ")).toBe(NEUTRAL_COLORS.outros);
  });
});

describe("NEUTRAL_COLORS", () => {
  it("define brancos, nulos, abstenção e outros em cinza (croma ≈ 0)", () => {
    for (const key of ["brancos", "nulos", "abstencao", "outros"] as const) {
      expect(oklch(NEUTRAL_COLORS[key]).c).toBeLessThan(0.02);
      expect(contrastRatio(NEUTRAL_COLORS[key], SURFACE)).toBeGreaterThanOrEqual(3);
    }
  });
});
