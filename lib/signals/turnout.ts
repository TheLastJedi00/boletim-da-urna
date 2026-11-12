/** Estatística robusta e sinais de comparecimento por seção. */
import type { SectionRecord } from "../data-types";

export function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Quantis com interpolação linear (mesmo método do R tipo 7 / numpy padrão). */
export function quantiles(values: number[], ps: number[]): number[] {
  const s = [...values].sort((a, b) => a - b);
  return ps.map((p) => {
    if (!s.length) return NaN;
    const h = (s.length - 1) * p;
    const lo = Math.floor(h);
    return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]) - s[lo]);
  });
}

export type Bin = { x0: number; x1: number; count: number };

export function histogram(values: number[], { min, max, bins }: { min: number; max: number; bins: number }): Bin[] {
  const w = (max - min) / bins;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({
    x0: +(min + i * w).toFixed(10),
    x1: +(min + (i + 1) * w).toFixed(10),
    count: 0,
  }));
  for (const v of values) {
    if (!(v >= min && v <= max)) continue;
    const i = Math.min(bins - 1, Math.floor(+((v - min) / w).toFixed(10)));
    out[i].count++;
  }
  return out;
}

export const turnoutRate = (s: Pick<SectionRecord, "aptos" | "comparecimento">) =>
  s.aptos > 0 ? s.comparecimento / s.aptos : 0;

export type Outlier<T> = { item: T; value: number; z: number };

/**
 * Outliers pelo z robusto (Iglewicz & Hoaglin): z = (x − mediana) / (1,4826 · MAD).
 * Se MAD = 0, usa o desvio médio absoluto (× 1,2533) como escala.
 */
export function robustOutliers<T>(items: T[], value: (t: T) => number, { threshold = 3.5 } = {}): Outlier<T>[] {
  const vals = items.map(value);
  const med = median(vals);
  const dev = vals.map((v) => Math.abs(v - med));
  let scale = 1.4826 * median(dev);
  if (!(scale > 0)) scale = 1.253314 * (dev.reduce((a, b) => a + b, 0) / (dev.length || 1));
  if (!(scale > 0)) return [];
  const out: Outlier<T>[] = [];
  items.forEach((item, i) => {
    const z = (vals[i] - med) / scale;
    if (Math.abs(z) > threshold) out.push({ item, value: vals[i], z });
  });
  return out;
}

export type Impossivel = {
  secao: SectionRecord;
  motivo: "comparecimento-acima-dos-aptos" | "votos-diferentes-do-comparecimento" | "abstencoes-inconsistentes";
};

/** Regras aritméticas que um BU íntegro sempre cumpre. */
export function impossibleSections(sections: SectionRecord[]): Impossivel[] {
  const out: Impossivel[] = [];
  for (const s of sections) {
    const total = Object.values(s.votos).reduce((a, b) => a + b, 0) + s.brancos + s.nulos;
    if (s.comparecimento > s.aptos) out.push({ secao: s, motivo: "comparecimento-acima-dos-aptos" });
    else if (total !== s.comparecimento) out.push({ secao: s, motivo: "votos-diferentes-do-comparecimento" });
    else if (s.aptos - s.comparecimento !== s.abstencoes) out.push({ secao: s, motivo: "abstencoes-inconsistentes" });
  }
  return out;
}
