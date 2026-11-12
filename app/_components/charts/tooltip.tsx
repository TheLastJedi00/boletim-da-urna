"use client";

/** Tooltip posicionado sobre um gráfico; o pai controla `x`, `y` e o conteúdo. */
export function Tooltip({ x, y, children }: { x: number | string; y: number | string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-line bg-raised px-3 py-2 text-xs text-paper shadow-raised"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}
