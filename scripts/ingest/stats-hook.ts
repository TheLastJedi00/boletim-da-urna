/**
 * Fase 3.9 — pré-calcula os sinais sobre os dados reais durante a ingestão.
 * Processa UF por UF (sem manter o país inteiro em memória) e grava `sinais.json`.
 */
import type { Candidato, SectionRecord, Turno } from "../../lib/data-types";
import { encodeSections, type EncodedSections } from "../../lib/section-codec";
import { biometriaOutliers, biometriaPorRegiao, taxaSemBiometria } from "../../lib/signals/biometria";
import { secondsOfDay, timingAnomalies, timingOutliers } from "../../lib/signals/timing";
import { histogram, impossibleSections, median, quantiles, robustOutliers, turnoutRate, type Bin } from "../../lib/signals/turnout";
import { rng } from "../../lib/simulation/engine";
import type { IngestHook } from "./run";

export type Destaque = { uf: string; cdMunicipio: number; municipio: string; zona: number; secao: number; valor: number; z: number };

const addBins = (a: Bin[], b: Bin[]) => a.forEach((x, i) => (x.count += b[i].count));

export class SignalsAccumulator {
  private secoes = 0;
  private hComp: Bin[] = histogram([], { min: 0, max: 1, bins: 50 });
  private hBio: Bin[] = histogram([], { min: 0, max: 0.5, bins: 50 });
  // encerramento em minutos desde as 14h (até 24h), em faixas de 10 minutos
  private hEnc: Bin[] = histogram([], { min: 14 * 60, max: 24 * 60, bins: 60 });
  private porUf: { uf: string; secoes: number; mediana: number; p05: number; p95: number; outliers: number }[] = [];
  private topComp: Destaque[] = [];
  private topBio: Destaque[] = [];
  private topHorario: (Destaque & { motivo: string })[] = [];
  private municipiosBio: { uf: string; cdMunicipio: number; municipio: string; taxa: number; z: number }[] = [];
  private impossiveis: Record<string, number> = {};
  private horarioMotivos: Record<string, number> = {};
  private outliersEncerramento = 0;
  private outliersBio = 0;
  private reservoir: SectionRecord[] = [];
  private visto = 0;
  private rand: () => number;
  private candidatos: Candidato[] = [];

  constructor(private opts: { turno: Turno; dia: string; amostra: number; seed: number; top?: number }) {
    this.rand = rng(opts.seed);
  }

  setCandidatos(c: Candidato[]) {
    this.candidatos = c;
  }

  add(uf: string, sections: SectionRecord[], nomes: Map<number, string>) {
    const top = this.opts.top ?? 30;
    const destaque = (s: SectionRecord, valor: number, z: number): Destaque => ({
      uf,
      cdMunicipio: s.cdMunicipio,
      municipio: nomes.get(s.cdMunicipio) ?? "",
      zona: s.zona,
      secao: s.secao,
      valor,
      z,
    });
    const keepTop = <T extends { z: number }>(arr: T[], add: T[]) =>
      [...arr, ...add].sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, top);

    this.secoes += sections.length;
    const taxas = sections.map(turnoutRate);
    addBins(this.hComp, histogram(taxas, { min: 0, max: 1, bins: 50 }));
    addBins(this.hBio, histogram(sections.map(taxaSemBiometria), { min: 0, max: 0.5, bins: 50 }));
    addBins(
      this.hEnc,
      histogram(
        sections.map((s) => secondsOfDay(s.dtEncerramento)).filter((x): x is number => x !== null).map((x) => x / 60),
        { min: 14 * 60, max: 24 * 60, bins: 60 },
      ),
    );

    const outC = robustOutliers(sections, turnoutRate);
    const [p05, p95] = quantiles(taxas, [0.05, 0.95]);
    this.porUf.push({ uf, secoes: sections.length, mediana: median(taxas), p05, p95, outliers: outC.length });
    this.topComp = keepTop(this.topComp, outC.map((o) => destaque(o.item, o.value, o.z)));

    const outB = biometriaOutliers(sections);
    this.outliersBio += outB.length;
    this.topBio = keepTop(this.topBio, outB.map((o) => destaque(o.item, o.value, o.z)));

    this.municipiosBio.push(
      ...biometriaPorRegiao(sections, (s) => String(s.cdMunicipio))
        .filter((r) => r.foraDoPadrao)
        .map((r) => ({ uf, cdMunicipio: +r.regiao, municipio: nomes.get(+r.regiao) ?? "", taxa: r.taxa, z: r.z })),
    );

    for (const i of impossibleSections(sections)) this.impossiveis[i.motivo] = (this.impossiveis[i.motivo] ?? 0) + 1;

    const janela = { cargaInicio: "2026-09-01T00:00:00", cargaFim: `${this.opts.dia}T23:59:59` };
    const anomalias = timingAnomalies(sections, janela);
    for (const a of anomalias) this.horarioMotivos[a.motivo] = (this.horarioMotivos[a.motivo] ?? 0) + 1;
    this.topHorario = [...this.topHorario, ...anomalias.map((a) => ({ ...destaque(a.secao, 0, 0), motivo: a.motivo }))].slice(0, top);
    this.outliersEncerramento += timingOutliers(sections, "dtEncerramento").length;

    // amostragem por reservatório (determinística) para o simulador
    for (const s of sections) {
      this.visto++;
      if (this.reservoir.length < this.opts.amostra) this.reservoir.push(s);
      else {
        const j = Math.floor(this.rand() * this.visto);
        if (j < this.opts.amostra) this.reservoir[j] = s;
      }
    }
  }

  result() {
    const amostra: EncodedSections = encodeSections(
      [...this.reservoir].sort((a, b) => a.uf.localeCompare(b.uf) || a.cdMunicipio - b.cdMunicipio || a.zona - b.zona || a.secao - b.secao),
      this.candidatos,
      this.opts.dia,
    );
    // a amostra mistura UFs; o codec guarda uma UF por arquivo, então mantemos a UF de cada linha à parte
    const ufs = [...this.reservoir]
      .sort((a, b) => a.uf.localeCompare(b.uf) || a.cdMunicipio - b.cdMunicipio || a.zona - b.zona || a.secao - b.secao)
      .map((s) => s.uf);
    return {
      turno: this.opts.turno,
      dia: this.opts.dia,
      secoes: this.secoes,
      comparecimento: { histograma: this.hComp, porUf: [...this.porUf].sort((a, b) => a.uf.localeCompare(b.uf)), top: this.topComp, outliers: this.porUf.reduce((s, u) => s + u.outliers, 0) },
      biometria: {
        histograma: this.hBio,
        outliers: this.outliersBio,
        top: this.topBio,
        municipiosForaDoPadrao: this.municipiosBio.sort((a, b) => b.z - a.z).slice(0, this.opts.top ?? 30),
        totalMunicipiosForaDoPadrao: this.municipiosBio.length,
      },
      horario: {
        histogramaEncerramento: this.hEnc,
        porMotivo: this.horarioMotivos,
        exemplos: this.topHorario,
        outliersEncerramento: this.outliersEncerramento,
      },
      impossiveis: { total: Object.values(this.impossiveis).reduce((a, b) => a + b, 0), porMotivo: this.impossiveis },
      amostra: { ...amostra, ufs },
    };
  }
}

/** Hook usado pelo `npm run ingest`. */
export function statsHook(): IngestHook {
  const accs = new Map<number, SignalsAccumulator>();
  const DIA: Record<number, string> = { 1: "2026-10-04", 2: "2026-10-25" };
  return {
    onUfTurno(r) {
      if (r.uf === "ZZ") return; // exterior: fusos e seções muito diferentes; fica fora das comparações
      let acc = accs.get(r.turno);
      if (!acc) accs.set(r.turno, (acc = new SignalsAccumulator({ turno: r.turno, dia: DIA[r.turno], amostra: 1000, seed: 2026 })));
      if (r.candidatos) acc.setCandidatos(r.candidatos);
      acc.add(r.uf, r.sections, r.nomes ?? new Map());
    },
    async finish({ write }) {
      await write("sinais.json", { turnos: Object.fromEntries([...accs].map(([t, a]) => [t, a.result()])) });
    },
  };
}
