import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export type Area = { fill: string; opacity?: number; title: string; href?: string };

/**
 * Mapa coroplético renderizado no servidor (SVG estático, sem JS no cliente).
 * Cada área tem <title> como dica e, opcionalmente, link.
 */
export function Choropleth({
  geo,
  areas,
  width = 600,
  height = 560,
  label,
}: {
  geo: FeatureCollection<Geometry, { id: string }>;
  areas: Map<string, Area>;
  width?: number;
  height?: number;
  label: string;
}) {
  const projection = geoMercator().fitSize([width, height], geo);
  const path = geoPath(projection);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {geo.features.map((f: Feature<Geometry, { id: string }>) => {
        const a = areas.get(f.properties.id);
        const d = path(f) ?? undefined;
        const shape = (
          <path
            d={d}
            fill={a?.fill ?? "var(--color-raised)"}
            fillOpacity={a?.opacity ?? 1}
            stroke="var(--color-ink)"
            strokeWidth={0.6}
            className="transition-[fill-opacity] hover:fill-opacity-100"
          >
            <title>{a?.title ?? f.properties.id}</title>
          </path>
        );
        return a?.href ? (
          <Link key={f.properties.id} href={a.href} aria-label={a.title}>
            {shape}
          </Link>
        ) : (
          <g key={f.properties.id}>{shape}</g>
        );
      })}
    </svg>
  );
}
