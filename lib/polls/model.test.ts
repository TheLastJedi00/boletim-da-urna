import { describe, expect, it } from "vitest";
import { avaliarPesquisas, margemTeorica, projetar, toValidos, type Pesquisa } from "./model";

const p = (o: Partial<Pesquisa>): Pesquisa => ({
  id: "x", turno: 2, instituto: "A", contratante: "", registroTse: null, campoInicio: "2026-10-20", campoFim: "2026-10-21",
  amostra: 2000, margemErro: 2.2, confianca: 95, metodologia: "telefone", base: "totais", cenario: "estimulado",
  url: "https://x", valores: { 13: 45, 22: 45, indecisos_brancos_nulos: 10 }, ...o,
});

describe("margemTeorica", () => {
  it("é 1,96·√(0,25/n) em pontos percentuais", () => {
    expect(margemTeorica(2000)).toBeCloseTo(2.191, 3);
    expect(margemTeorica(1000)).toBeCloseTo(3.099, 3);
  });
});

describe("toValidos", () => {
  it("redistribui excluindo indecisos/brancos/nulos (votos válidos)", () => {
    const v = toValidos(p({ valores: { 13: 45, 22: 45, indecisos_brancos_nulos: 10 } }));
    expect(v.valores[13]).toBeCloseTo(50, 6);
    expect(v.valores[22]).toBeCloseTo(50, 6);
  });

  it("amplia a margem: menos entrevistados com voto válido → mais incerteza", () => {
    const v = toValidos(p({}));
    expect(v.margem[13]).toBeGreaterThan(2.2);
  });

  it("nunca usa margem menor que a teórica, mesmo se o instituto declarar menos", () => {
    const declaradaBaixa = toValidos(p({ margemErro: 1.0, base: "validos", valores: { 13: 50, 22: 50 } }));
    expect(declaradaBaixa.margem[13]).toBeCloseTo(2.19, 2);
  });

  it("mantém pesquisa já em votos válidos", () => {
    const v = toValidos(p({ base: "validos", valores: { 13: 51, 22: 49 } }));
    expect(v.valores).toEqual({ 13: 51, 22: 49 });
  });
});

describe("projetar (média ponderada)", () => {
  it("pesquisas iguais → projeção igual a elas", () => {
    const r = projetar([p({ instituto: "A" }), p({ instituto: "B" })], { dataReferencia: "2026-10-24" });
    expect(r.valores[13]).toBeCloseTo(50, 6);
    expect(r.intervalo[13][0]).toBeLessThan(50);
    expect(r.intervalo[13][1]).toBeGreaterThan(50);
  });

  it("dá mais peso à pesquisa mais recente", () => {
    const antiga = p({ instituto: "A", campoFim: "2026-10-06", valores: { 13: 40, 22: 60 } , base: "validos"});
    const recente = p({ instituto: "B", campoFim: "2026-10-23", valores: { 13: 60, 22: 40 }, base: "validos" });
    expect(projetar([antiga, recente], { dataReferencia: "2026-10-24" }).valores[13]).toBeGreaterThan(55);
  });

  it("dá mais peso à amostra maior", () => {
    const pequena = p({ instituto: "A", amostra: 500, margemErro: 4.5, valores: { 13: 40, 22: 60 }, base: "validos" });
    const grande = p({ instituto: "B", amostra: 5000, margemErro: 1.4, valores: { 13: 60, 22: 40 }, base: "validos" });
    expect(projetar([pequena, grande], { dataReferencia: "2026-10-24" }).valores[13]).toBeGreaterThan(50);
  });

  it("usa só a pesquisa mais recente de cada instituto", () => {
    const r = projetar(
      [p({ instituto: "A", campoFim: "2026-10-10", valores: { 13: 30, 22: 70 }, base: "validos" }), p({ instituto: "A", campoFim: "2026-10-23", valores: { 13: 50, 22: 50 }, base: "validos" })],
      { dataReferencia: "2026-10-24" },
    );
    expect(r.valores[13]).toBeCloseTo(50, 6);
    expect(r.pesquisasUsadas).toBe(1);
  });

  it("ignora pesquisas posteriores à data de referência", () => {
    const r = projetar([p({ campoFim: "2026-10-25" })], { dataReferencia: "2026-10-24" });
    expect(r.pesquisasUsadas).toBe(0);
  });
});

describe("avaliarPesquisas (pesquisa × urna)", () => {
  it("acertou se o resultado real ficou dentro da margem em votos válidos", () => {
    const real = { 13: 51.79, 22: 48.21 };
    const [a, b] = avaliarPesquisas([p({ id: "a", valores: { 13: 51, 22: 49 }, base: "validos" }), p({ id: "b", valores: { 13: 45, 22: 55 }, base: "validos" })], real);
    expect(a.acertou).toBe(true);
    expect(b.acertou).toBe(false);
    expect(b.erro[13]).toBeCloseTo(-6.79, 2);
  });

  it("aponta se a pesquisa indicou o vencedor correto", () => {
    const [a] = avaliarPesquisas([p({ valores: { 13: 49, 22: 51 }, base: "validos" })], { 13: 51.79, 22: 48.21 });
    expect(a.vencedorCorreto).toBe(false);
  });
});
