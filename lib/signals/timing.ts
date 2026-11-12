/** Sinais de horário (abertura, encerramento, emissão do BU) e de carga da urna. */
import type { SectionRecord } from "../data-types";
import { robustOutliers, type Outlier } from "./turnout";

export function secondsOfDay(iso: string | null): number | null {
  if (!iso) return null;
  const [h, m, s] = iso.slice(11, 19).split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

export type MotivoHorario =
  | "encerramento-antes-da-abertura"
  | "bu-emitido-antes-do-encerramento"
  | "carga-fora-da-janela"
  | "carga-depois-da-abertura";

export type AnomaliaHorario = { secao: SectionRecord; motivo: MotivoHorario };

/** Datas em ISO local (AAAA-MM-DDTHH:mm:ss) são comparáveis como texto. */
const before = (a: string | null, b: string | null) => a !== null && b !== null && a < b;

export function timingAnomalies(
  sections: SectionRecord[],
  janela: { cargaInicio: string; cargaFim: string },
): AnomaliaHorario[] {
  const out: AnomaliaHorario[] = [];
  for (const s of sections) {
    const add = (motivo: MotivoHorario) => out.push({ secao: s, motivo });
    if (before(s.dtEncerramento, s.dtAbertura)) add("encerramento-antes-da-abertura");
    if (before(s.dtEmissaoBu, s.dtEncerramento)) add("bu-emitido-antes-do-encerramento");
    if (s.dtCarga) {
      if (before(s.dtAbertura, s.dtCarga)) add("carga-depois-da-abertura");
      else if (s.dtCarga < janela.cargaInicio || s.dtCarga > janela.cargaFim) add("carga-fora-da-janela");
    }
  }
  return out;
}

type CampoHorario = "dtAbertura" | "dtEncerramento" | "dtEmissaoBu";

/** Outliers de horário comparando cada seção com as demais da mesma UF (fusos diferentes). */
export function timingOutliers(
  sections: SectionRecord[],
  campo: CampoHorario,
  { threshold = 3.5 } = {},
): Outlier<SectionRecord>[] {
  const porUf = new Map<string, SectionRecord[]>();
  for (const s of sections) {
    if (!s[campo]) continue;
    const l = porUf.get(s.uf) ?? [];
    l.push(s);
    porUf.set(s.uf, l);
  }
  return [...porUf.values()].flatMap((l) => robustOutliers(l, (s) => secondsOfDay(s[campo])!, { threshold }));
}
