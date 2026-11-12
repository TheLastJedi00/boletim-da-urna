"use client";

import { createContext, useContext, useState } from "react";

/**
 * Estado de turno compartilhado: um único seletor controla painéis (<PorTurno>) e mapas
 * (<MapaTurno>) sem duplicar o SVG pesado no HTML.
 */
const Ctx = createContext<{ turno: 1 | 2; setTurno: (t: 1 | 2) => void } | null>(null);

export function TurnoProvider({ inicial = 2, children }: { inicial?: 1 | 2; children: React.ReactNode }) {
  const [turno, setTurno] = useState<1 | 2>(inicial);
  return <Ctx.Provider value={{ turno, setTurno }}>{children}</Ctx.Provider>;
}

const useTurno = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("Use dentro de <TurnoProvider>");
  return c;
};

export function TurnoSeletor() {
  const { turno, setTurno } = useTurno();
  return (
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
  );
}

export function PorTurno({ turno, children }: { turno: 1 | 2; children: React.ReactNode }) {
  return <div hidden={useTurno().turno !== turno}>{children}</div>;
}

/** Envolve um mapa cujas áreas trazem as cores dos dois turnos em variáveis CSS (--f1/--f2). */
export function MapaTurno({ children }: { children: React.ReactNode }) {
  return (
    <div className="mapa-turno" data-turno={useTurno().turno}>
      {children}
    </div>
  );
}
