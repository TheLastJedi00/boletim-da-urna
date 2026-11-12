/** Sinal: eleitores liberados para votar sem biometria (QT_ELEI_BIOM_SEM_HABILITACAO). */
import type { SectionRecord } from "../data-types";
import { robustOutliers, type Outlier } from "./turnout";

export const taxaSemBiometria = (s: Pick<SectionRecord, "comparecimento" | "eleitoresSemBiometria">) =>
  s.comparecimento > 0 ? s.eleitoresSemBiometria / s.comparecimento : 0;

/** Seções com taxa de liberação sem biometria muito ACIMA do padrão (só o excesso é sinal). */
export function biometriaOutliers(
  sections: SectionRecord[],
  { threshold = 3.5, minComparecimento = 20 } = {},
): Outlier<SectionRecord>[] {
  const elegiveis = sections.filter((s) => s.comparecimento >= minComparecimento);
  return robustOutliers(elegiveis, taxaSemBiometria, { threshold }).filter((o) => o.z > 0);
}

export type BiometriaRegiao = { regiao: string; secoes: number; comparecimento: number; semBiometria: number; taxa: number; z: number; foraDoPadrao: boolean };

/** Taxa ponderada por região (ex.: município) e comparação robusta entre regiões. */
export function biometriaPorRegiao(
  sections: SectionRecord[],
  regiao: (s: SectionRecord) => string,
  { threshold = 3.5 } = {},
): BiometriaRegiao[] {
  const acc = new Map<string, { secoes: number; comparecimento: number; semBiometria: number }>();
  for (const s of sections) {
    const k = regiao(s);
    const a = acc.get(k) ?? { secoes: 0, comparecimento: 0, semBiometria: 0 };
    a.secoes++;
    a.comparecimento += s.comparecimento;
    a.semBiometria += s.eleitoresSemBiometria;
    acc.set(k, a);
  }
  const lista = [...acc].map(([k, a]) => ({ regiao: k, ...a, taxa: a.comparecimento ? a.semBiometria / a.comparecimento : 0 }));
  const zs = new Map(robustOutliers(lista, (r) => r.taxa, { threshold: 0 }).map((o) => [o.item.regiao, o.z]));
  return lista.map((r) => {
    const z = zs.get(r.regiao) ?? 0;
    return { ...r, z, foraDoPadrao: z > threshold };
  });
}
