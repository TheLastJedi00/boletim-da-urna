/** Moldura de qualquer gráfico: título, descrição curta e fonte obrigatória. */
export function Figure({
  title,
  description,
  source,
  simulated = false,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  source: React.ReactNode;
  simulated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className={`card min-w-0 p-5 sm:p-6 ${simulated ? "ring-1 ring-sim/50" : ""}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {description && <p className="mt-1 text-sm">{description}</p>}
        </div>
        {simulated && <SimBadge />}
      </div>
      {children}
      <figcaption className="mt-4 text-xs text-faint">Fonte: {source}</figcaption>
    </figure>
  );
}

/** Rótulo fixo de toda simulação. Nunca remover de dados simulados. */
export function SimBadge() {
  return (
    <span className="sim-hatch inline-flex items-center gap-1.5 rounded-full border border-sim/60 px-3 py-1 text-xs font-medium text-sim">
      <span aria-hidden>⚠</span> Simulação hipotética
    </span>
  );
}
