import { describe, expect, it } from "vitest";
import type { SectionRecord } from "../data-types";
import { assinarBu, CENARIOS, simular, syntheticDataset, verificarAssinatura, type Cenario } from "./engine";

const dados = syntheticDataset({ secoes: 400, seed: 7, candidatos: [13, 22] });

describe("syntheticDataset (base para testes e demonstração)", () => {
  it("é determinístico pela seed e aritmeticamente íntegro", () => {
    expect(syntheticDataset({ secoes: 400, seed: 7, candidatos: [13, 22] })).toEqual(dados);
    for (const s of dados) {
      const total = Object.values(s.votos).reduce((a, b) => a + b, 0) + s.brancos + s.nulos;
      expect(total).toBe(s.comparecimento);
      expect(s.aptos - s.comparecimento).toBe(s.abstencoes);
    }
  });
});

describe("assinatura do BU (modelo didático da assinatura digital)", () => {
  it("BU íntegro tem assinatura válida; qualquer alteração a invalida", () => {
    const s = dados[0];
    const assinatura = assinarBu(s);
    expect(verificarAssinatura(s, assinatura)).toBe(true);
    const alterado: SectionRecord = { ...s, votos: { ...s.votos, 13: s.votos[13] + 1 }, nulos: s.nulos - 1 };
    expect(verificarAssinatura(alterado, assinatura)).toBe(false);
  });
});

describe("simular — sem fraude", () => {
  it("cenário de controle não dispara alertas de integridade", () => {
    const r = simular(dados, { tipo: "nenhuma" }, { seed: 1 });
    const integridade = r.deteccoes.filter((d) => ["assinatura-invalida", "totalizacao-diverge-dos-bus"].includes(d.sinal));
    expect(integridade.every((d) => !d.detectado)).toBe(true);
    expect(r.alvos).toEqual([]);
  });
});

const casos: [Cenario, string][] = [
  [{ tipo: "encher-urna", candidato: 13, secoes: 20, votosPorSecao: 60 }, "comparecimento-fora-do-padrao"],
  [{ tipo: "encher-urna", candidato: 13, secoes: 20, votosPorSecao: 60 }, "biometria-fora-do-padrao"],
  [{ tipo: "trocar-na-totalizacao", de: 22, para: 13, votos: 5000 }, "totalizacao-diverge-dos-bus"],
  [{ tipo: "adulterar-bu", candidato: 13, secoes: 10, votos: 30 }, "assinatura-invalida"],
  [{ tipo: "horario-irregular", secoes: 10 }, "horario-irregular"],
  [{ tipo: "biometria-em-massa", secoes: 15, liberados: 80 }, "biometria-fora-do-padrao"],
];

describe("simular — cada fraude hipotética é detectada pelo seu sinal", () => {
  it.each(casos)("%o → %s", (cenario, sinal) => {
    const r = simular(dados, cenario, { seed: 3 });
    const d = r.deteccoes.find((x) => x.sinal === sinal)!;
    expect(d).toBeDefined();
    expect(d.detectado).toBe(true);
    expect(d.controle.length).toBeGreaterThan(10);
    if (r.alvos.length) expect(d.alvosDetectados / r.alvos.length).toBeGreaterThanOrEqual(0.8);
  });

  it("não altera os dados de entrada (imutável)", () => {
    const antes = JSON.stringify(dados);
    simular(dados, casos[0][0], { seed: 3 });
    expect(JSON.stringify(dados)).toBe(antes);
  });

  it("calcula o impacto no resultado (antes × depois)", () => {
    const r = simular(dados, { tipo: "trocar-na-totalizacao", de: 22, para: 13, votos: 5000 }, { seed: 3 });
    expect(r.resultadoDivulgado.votos[13] - r.resultadoReal.votos[13]).toBe(5000);
    expect(r.resultadoReal.votos[22] - r.resultadoDivulgado.votos[22]).toBe(5000);
  });

  it("encher urna nunca ultrapassa os aptos sem ser apontado como impossível", () => {
    const r = simular(dados, { tipo: "encher-urna", candidato: 22, secoes: 30, votosPorSecao: 999 }, { seed: 5 });
    const imp = r.deteccoes.find((x) => x.sinal === "comparecimento-acima-dos-aptos")!;
    expect(imp.detectado).toBe(true);
  });
});

describe("simetria entre candidatos", () => {
  it.each(CENARIOS.filter((c) => "candidato" in c.padrao))("$id detecta igual para 13 e para 22", (c) => {
    const a = simular(dados, { ...c.padrao, candidato: 13 } as Cenario, { seed: 11 });
    const b = simular(dados, { ...c.padrao, candidato: 22 } as Cenario, { seed: 11 });
    const resumo = (r: typeof a) => r.deteccoes.map((d) => [d.sinal, d.detectado, d.alvosDetectados]);
    expect(resumo(a)).toEqual(resumo(b));
  });

  it("trocar na totalização é simétrico (de/para invertidos)", () => {
    const a = simular(dados, { tipo: "trocar-na-totalizacao", de: 22, para: 13, votos: 100 }, { seed: 2 });
    const b = simular(dados, { tipo: "trocar-na-totalizacao", de: 13, para: 22, votos: 100 }, { seed: 2 });
    expect(a.deteccoes.map((d) => d.detectado)).toEqual(b.deteccoes.map((d) => d.detectado));
  });
});

describe("CENARIOS (catálogo exibido na página)", () => {
  it("todo cenário tem título, como seria feito, sinal e controle", () => {
    expect(CENARIOS.length).toBeGreaterThanOrEqual(5);
    for (const c of CENARIOS) {
      expect(c.titulo).toBeTruthy();
      expect(c.comoSeria.length).toBeGreaterThan(20);
      expect(c.sinais.length).toBeGreaterThan(0);
      expect(c.controles.length).toBeGreaterThan(0);
    }
  });
});
