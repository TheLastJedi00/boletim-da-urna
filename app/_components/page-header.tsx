export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="max-w-3xl">
      {eyebrow && <p className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</p>}
      <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
      {children && <div className="mt-5 text-lg leading-relaxed">{children}</div>}
    </header>
  );
}
