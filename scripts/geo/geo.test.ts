import { describe, expect, it } from "vitest";
import { IBGE_UF, normalizeCollection, roundCoords } from "./geo";

describe("geo", () => {
  it("mapeia código IBGE da UF para sigla (27 UFs)", () => {
    expect(Object.keys(IBGE_UF)).toHaveLength(27);
    expect(IBGE_UF["12"]).toBe("AC");
    expect(IBGE_UF["35"]).toBe("SP");
    expect(IBGE_UF["53"]).toBe("DF");
  });

  it("arredonda coordenadas e remove pontos repetidos consecutivos", () => {
    expect(
      roundCoords([
        [-67.12471, -9.96991],
        [-67.12474, -9.96989],
        [-67.1, -10.1],
      ], 3),
    ).toEqual([
      [-67.125, -9.97],
      [-67.1, -10.1],
    ]);
  });

  it("normaliza a coleção: id vindo de codarea e geometria arredondada", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { codarea: "12" }, geometry: { type: "Polygon", coordinates: [[[0.12345, 1.98765], [1, 1], [0, 0], [0.12345, 1.98765]]] } },
      ],
    };
    const out = normalizeCollection(fc, (c) => IBGE_UF[c]);
    expect(out.features[0].properties).toEqual({ id: "AC" });
    expect(out.features[0].geometry.coordinates[0][0]).toEqual([0.123, 1.988]);
  });
});
