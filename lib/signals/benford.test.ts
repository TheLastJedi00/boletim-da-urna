import { describe, expect, it } from "vitest";
import { benfordEsperado, primeirosDigitos } from "./benford";

describe("Benford", () => {
  it("distribuição esperada do 1º dígito soma 1 e começa em log10(2)", () => {
    const e = benfordEsperado();
    expect(e).toHaveLength(9);
    expect(e[0]).toBeCloseTo(Math.log10(2), 10);
    expect(e.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("conta a proporção do 1º dígito ignorando zeros", () => {
    const p = primeirosDigitos([1, 12, 150, 2, 0, 9, 95]);
    expect(p[0]).toBeCloseTo(3 / 6, 10); // 1, 12, 150
    expect(p[1]).toBeCloseTo(1 / 6, 10); // 2
    expect(p[8]).toBeCloseTo(2 / 6, 10); // 9, 95
  });
});
