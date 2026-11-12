import type { ScaleLinear, ScaleTime } from "d3-scale";

type Scale = ScaleLinear<number, number> | ScaleTime<number, number>;

/** Eixo horizontal em SVG. */
export function AxisBottom({ scale, y, ticks = 5, format }: { scale: Scale; y: number; ticks?: number; format?: (v: never) => string }) {
  const values = scale.ticks(ticks) as (number | Date)[];
  const [x0, x1] = scale.range();
  return (
    <g transform={`translate(0,${y})`} className="text-[11px]" fill="currentColor">
      <line x1={x0} x2={x1} stroke="var(--color-line)" />
      {values.map((v, i) => {
        const x = scale(v as never);
        return (
          <g key={i} transform={`translate(${x},0)`}>
            <line y2={4} stroke="var(--color-line)" />
            <text y={16} textAnchor="middle" className="fill-faint">
              {format ? format(v as never) : String(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Eixo vertical em SVG, com linhas de grade discretas. */
export function AxisLeft({ scale, x, width, ticks = 5, format }: { scale: ScaleLinear<number, number>; x: number; width: number; ticks?: number; format?: (v: number) => string }) {
  return (
    <g className="text-[11px]">
      {scale.ticks(ticks).map((v) => (
        <g key={v} transform={`translate(0,${scale(v)})`}>
          <line x1={x} x2={x + width} stroke="var(--color-line)" strokeOpacity={0.5} strokeDasharray="2 4" />
          <text x={x - 6} dy="0.32em" textAnchor="end" className="fill-faint">
            {format ? format(v) : v}
          </text>
        </g>
      ))}
    </g>
  );
}
