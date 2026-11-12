"use client";

import { useState } from "react";

/** Alterna entre o conteúdo do 1º e do 2º turno (ambos já renderizados no servidor). */
export function TurnoTabs({ primeiro, segundo, inicial = 2 }: { primeiro: React.ReactNode; segundo: React.ReactNode; inicial?: 1 | 2 }) {
  const [turno, setTurno] = useState<1 | 2>(inicial);
  return (
    <div>
      <div role="tablist" aria-label="Turno" className="well inline-flex gap-1 p-1">
        {([1, 2] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={turno === t}
            onClick={() => setTurno(t)}
            className="rounded-lg px-4 py-1.5 text-sm transition-colors aria-selected:bg-surface aria-selected:text-paper aria-selected:shadow-raised"
          >
            {t}º turno
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6">
        <div hidden={turno !== 1}>{primeiro}</div>
        <div hidden={turno !== 2}>{segundo}</div>
      </div>
    </div>
  );
}
