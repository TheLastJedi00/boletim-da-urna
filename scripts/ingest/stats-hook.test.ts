import { describe, expect, it } from "vitest";
import { syntheticDataset } from "../../lib/simulation/engine";
import type { SectionRecord } from "../../lib/data-types";
import { SignalsAccumulator } from "./stats-hook";

const uf = (sigla: string, seed: number, n = 300): SectionRecord[] =>
  syntheticDataset({ secoes: n, seed, candidatos: [13, 22] }).map((s) => ({ ...s, uf: sigla }));

describe("SignalsAccumulator", () => {
  it("histogramas somam o total de seções e não há seções impossíveis em dados íntegros", () => {
    const acc = new SignalsAccumulator({ turno: 2, dia: "2026-10-25", amostra: 50, seed: 1 });
    acc.add("AA", uf("AA", 1), new Map());
    acc.add("BB", uf("BB", 2), new Map());
    const r = acc.result();
    expect(r.secoes).toBe(600);
    expect(r.comparecimento.histograma.reduce((s, b) => s + b.count, 0)).toBe(600);
    expect(r.biometria.histograma.reduce((s, b) => s + b.count, 0)).toBe(600);
    expect(r.impossiveis.total).toBe(0);
    expect(r.comparecimento.porUf.map((u) => u.uf)).toEqual(["AA", "BB"]);
  });

  it("aponta outliers comparando cada seção com a própria UF e lista os maiores primeiro", () => {
    const dados = uf("AA", 3);
    dados[5] = { ...dados[5], comparecimento: dados[5].aptos, abstencoes: 0, votos: { 13: dados[5].aptos - dados[5].brancos - dados[5].nulos, 22: 0 } };
    dados[9] = { ...dados[9], eleitoresSemBiometria: dados[9].comparecimento };
    const acc = new SignalsAccumulator({ turno: 2, dia: "2026-10-25", amostra: 10, seed: 1, top: 5 });
    acc.add("AA", dados, new Map([[dados[5].cdMunicipio, "MUN X"]]));
    const r = acc.result();
    expect(r.comparecimento.top[0]).toMatchObject({ secao: dados[5].secao, municipio: "MUN X" });
    expect(r.biometria.top[0].secao).toBe(dados[9].secao);
    expect(r.comparecimento.top.length).toBeLessThanOrEqual(5);
    const zs = r.comparecimento.top.map((x) => Math.abs(x.z));
    expect([...zs].sort((a, b) => b - a)).toEqual(zs);
  });

  it("conta anomalias de horário por motivo (ex.: carga depois da abertura)", () => {
    const dados = uf("AA", 4);
    dados[0] = { ...dados[0], dtCarga: "2026-10-25T10:00:00" };
    const acc = new SignalsAccumulator({ turno: 2, dia: "2026-10-25", amostra: 10, seed: 1 });
    acc.add("AA", dados, new Map());
    expect(acc.result().horario.porMotivo["carga-depois-da-abertura"]).toBe(1);
  });

  it("guarda uma amostra determinística de seções reais para o simulador", () => {
    const run = () => {
      const acc = new SignalsAccumulator({ turno: 2, dia: "2026-10-25", amostra: 40, seed: 9 });
      acc.add("AA", uf("AA", 1), new Map());
      acc.add("BB", uf("BB", 2), new Map());
      return acc.result().amostra;
    };
    const a = run();
    expect(a.rows).toHaveLength(40);
    expect(run()).toEqual(a);
  });
});
