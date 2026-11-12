import { describe, expect, it } from "vitest";
import { auxUrl, secoesUrl } from "./secao-links";

describe("secao-links", () => {
  it("monta a URL oficial do índice da seção (verificada no site do TSE)", () => {
    expect(auxUrl(2, "AC", 1031, 3, 95)).toBe(
      "https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/dados/ac/01031/0003/0095/p003221-ac-m01031-z0003-s0095-aux.json",
    );
  });

  it("aponta para o snapshot comprimido do município", () => {
    expect(secoesUrl(1, "sp", 71072)).toBe("/data/secoes/1/SP/71072.json.gz");
  });
});
