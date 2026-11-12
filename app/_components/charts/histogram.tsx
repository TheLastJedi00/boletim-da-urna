import { scaleLinear } from "d3-scale";
import type { Bin } from "@/lib/signals/turnout";

/** Histograma em SVG (servidor). `marcar` destaca faixas (ex.: caudas fora do padrão). */
export function Histogram({
  bins,
  formatX,
  label,
  color = "var(--color-accent-soft)",
  marcar,
  ticks = 5,
  height = 180,
}: {
  bins: Bin[];
  formatX: (v: number) => string;
  label: string;
  color?: string;
  marcar?: (b: Bin) => boolean;
  ticks?: number;
  height?: number;
}) {
  const W = 640;
  const H = height;
  const m = { top: 8, right: 8, bottom: 24, left: 8 };
  const x = scaleLinear().domain([bins[0].x0, bins[bins.length - 1].x1]).range([m.left, W - m.right]);
  const max = Math.max(...bins.map((b) => b.count), 1);
  // raiz quadrada: mantém visíveis as caudas pequenas sem esconder o pico
  const y = scaleLinear().domain([0, Math.sqrt(max)]).range([H - m.bottom, m.top]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {bins.map((b, i) => (
        <rect
          key={i}
          x={x(b.x0) + 0.5}
          width={Math.max(0, x(b.x1) - x(b.x0) - 1)}
          y={y(Math.sqrt(b.count))}
          height={H - m.bottom - y(Math.sqrt(b.count))}
          fill={marcar?.(b) ? "var(--color-sim)" : color}
          fillOpacity={0.85}
          rx={1.5}
        >
          <title>{`${formatX(b.x0)} a ${formatX(b.x1)}: ${b.count.toLocaleString("pt-BR")} seções`}</title>
        </rect>
      ))}
      <line x1={m.left} x2={W - m.right} y1={H - m.bottom} y2={H - m.bottom} stroke="var(--color-line)" />
      {x.ticks(ticks).map((t) => (
        <text key={t} x={x(t)} y={H - 6} textAnchor="middle" className="fill-faint text-[11px]">
          {formatX(t)}
        </text>
      ))}
    </svg>
  );
}
