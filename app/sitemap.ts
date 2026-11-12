import type { MetadataRoute } from "next";
import { SECTIONS, SITE_URL } from "@/lib/sections";
import { UFS } from "@/lib/ufs";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...SECTIONS.map((s) => ({ url: `${SITE_URL}${s.href === "/" ? "" : s.href}`, changeFrequency: "yearly" as const, priority: s.href === "/" ? 1 : 0.8 })),
    ...UFS.map((u) => ({ url: `${SITE_URL}/resultados/${u.sigla.toLowerCase()}`, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
