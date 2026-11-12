import { describe, expect, it } from "vitest";
import type { SectionRecord } from "../data-types";
import { secondsOfDay, timingAnomalies, timingOutliers } from "./timing";

const sec = (over: Partial<SectionRecord>): SectionRecord => ({
  uf: "SP", cdMunicipio: 1, zona: 1, secao: 1, localVotacao: 1, aptos: 100, comparecimento: 80, abstencoes: 20,
  votos: {}, brancos: 0, nulos: 0, tipoUrna: "Apurada", nrUrna: 1,
  dtCarga: "2026-09-20T10:00:00", dtAbertura: "2026-10-04T08:00:01", dtEncerramento: "2026-10-04T17:02:00",
  dtEmissaoBu: "2026-10-04T17:04:00", dtBuRecebido: "2026-10-04T17:30:00", eleitoresSemBiometria: 0, secoesAgregadas: [],
  ...over,
});

const janela = { cargaInicio: "2026-09-01T00:00:00", cargaFim: "2026-10-03T23:59:59" };

describe("secondsOfDay", () => {
  it("converte horário ISO em segundos desde a meia-noite", () => {
    expect(secondsOfDay("2026-10-04T08:00:01")).toBe(8 * 3600 + 1);
    expect(secondsOfDay(null)).toBeNull();
  });
});

describe("timingAnomalies (regras de ordem e janela)", () => {
  it("seção normal não gera alerta", () => {
    expect(timingAnomalies([sec({})], janela)).toEqual([]);
  });

  it("encerramento antes da abertura", () => {
    const r = timingAnomalies([sec({ dtEncerramento: "2026-10-04T07:00:00" })], janela);
    expect(r.map((x) => x.motivo)).toContain("encerramento-antes-da-abertura");
  });

  it("BU emitido antes do encerramento", () => {
    const r = timingAnomalies([sec({ dtEmissaoBu: "2026-10-04T16:00:00" })], janela);
    expect(r.map((x) => x.motivo)).toContain("bu-emitido-antes-do-encerramento");
  });

  it("carga da urna fora da janela oficial", () => {
    const r = timingAnomalies([sec({ dtCarga: "2026-10-04T07:30:00" })], janela);
    expect(r.map((x) => x.motivo)).toContain("carga-fora-da-janela");
  });

  it("carga depois da abertura é impossível", () => {
    const r = timingAnomalies([sec({ dtCarga: "2026-10-04T09:00:00" })], janela);
    expect(r.map((x) => x.motivo)).toContain("carga-depois-da-abertura");
  });

  it("ignora campos nulos (seção sem horário registrado)", () => {
    expect(timingAnomalies([sec({ dtAbertura: null, dtEncerramento: null, dtEmissaoBu: null, dtCarga: null })], janela)).toEqual([]);
  });
});

describe("timingOutliers (comparação com as seções da mesma UF)", () => {
  const normais = Array.from({ length: 40 }, (_, i) =>
    sec({ secao: i, dtEncerramento: `2026-10-04T17:${String(i % 20).padStart(2, "0")}:00` }),
  );

  it("aponta encerramento muito fora do padrão da UF", () => {
    const fora = sec({ secao: 999, dtEncerramento: "2026-10-04T13:00:00" });
    const r = timingOutliers([...normais, fora], "dtEncerramento");
    expect(r.map((o) => o.item.secao)).toEqual([999]);
  });

  it("compara cada UF só com ela mesma (fusos diferentes)", () => {
    const ac = normais.map((s) => ({ ...s, uf: "AC", dtEncerramento: s.dtEncerramento!.replace("T17", "T15") }));
    expect(timingOutliers([...normais, ...ac], "dtEncerramento")).toEqual([]);
  });
});
