import { formatInt, formatPct } from "@/lib/format";

export type BarDatum = { key: string; label: string; value: number; color: string; note?: string; simulated?: boolean };

/**
 * Barras horizontais em HTML (responsivas e acessíveis): cada linha tem rótulo, barra e valor.
 * `total` define a base do percentual; por padrão, a soma dos valores.
 */
export function BarList({ data, total, showVotes = true }: { data: BarDatum[]; total?: number; showVotes?: boolean }) {
  const base = total ?? data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-paper">
              {d.label}
              {d.note && <span className="ml-2 text-xs text-faint">{d.note}</span>}
            </span>
            <span className="font-mono tabular-nums text-paper">
              {formatPct(d.value / base)}
              {showVotes && <span className="ml-2 text-xs text-faint">{formatInt(d.value)}</span>}
            </span>
          </div>
          <div className="well h-3 overflow-hidden">
            <div
              className={`h-full rounded-xl ${d.simulated ? "sim-hatch" : ""}`}
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
