import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export type Area = { fill: string; opacity?: number; title: string; href?: string };

/**
 * Mapa coroplético renderizado no servidor (SVG estático). Recebe as áreas dos dois turnos e grava as
 * cores em variáveis CSS (--f1/--o1, --f2/--o2): o SVG aparece uma vez só no HTML e o <MapaTurno>
 * escolhe qual turno pintar.
 */
export function Choropleth({
  geo,
  turnos,
  width = 600,
  height = 560,
  label,
}: {
  geo: FeatureCollection<Geometry, { id: string }>;
  turnos: [Map<string, Area>, Map<string, Area>];
  width?: number;
  height?: number;
  label: string;
}) {
  const projection = geoMercator().fitSize([width, height], geo);
  const path = geoPath(projection).digits(1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {geo.features.map((f: Feature<Geometry, { id: string }>) => {
        const [a, b] = turnos.map((t) => t.get(f.properties.id));
        const style = {
          "--f1": a?.fill ?? "var(--color-raised)",
          "--o1": a?.opacity ?? 1,
          "--f2": b?.fill ?? "var(--color-raised)",
          "--o2": b?.opacity ?? 1,
        } as React.CSSProperties;
        const title = a && b ? `1º turno — ${a.title}\n2º turno — ${b.title}` : ((a ?? b)?.title ?? f.properties.id);
        const shape = (
          <path d={path(f) ?? undefined} style={style} stroke="var(--color-ink)" strokeWidth={0.6}>
            <title>{title}</title>
          </path>
        );
        const href = a?.href ?? b?.href;
        return href ? (
          <Link key={f.properties.id} href={href} aria-label={title}>
            {shape}
          </Link>
        ) : (
          <g key={f.properties.id}>{shape}</g>
        );
      })}
    </svg>
  );
}
