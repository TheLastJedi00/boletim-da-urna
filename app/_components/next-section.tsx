import Link from "next/link";
import { nextSection, type SectionHref } from "@/lib/sections";

/** Card de "próxima seção" no fim de cada página, para manter o fluxo de leitura. */
export function NextSection({ current }: { current: SectionHref }) {
  const next = nextSection(current);
  if (!next) return null;
  return (
    <Link
      href={next.href}
      className="card group mt-16 flex items-center justify-between gap-4 p-6 transition-shadow hover:shadow-raised-lg"
    >
      <span>
        <span className="block text-xs uppercase tracking-wider text-faint">Próxima seção</span>
        <span className="font-display text-xl text-paper">{next.label}</span>
      </span>
      <span aria-hidden className="text-2xl text-accent transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}
