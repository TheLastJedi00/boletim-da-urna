"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SECTIONS } from "@/lib/sections";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-display text-lg font-semibold text-paper">
          Boletim<span className="text-accent"> da Urna</span>
        </Link>

        <nav aria-label="Seções do estudo" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {SECTIONS.slice(1).map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={isActive(s.href) ? "page" : undefined}
                  className="rounded-xl px-3 py-2 transition-colors hover:text-paper aria-[current=page]:bg-surface aria-[current=page]:text-paper aria-[current=page]:shadow-raised"
                >
                  {s.short}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm text-paper shadow-raised lg:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Fechar" : "Seções"}
        </button>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Seções do estudo" className="border-t border-line/60 lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(s.href) ? "page" : undefined}
                  className="block rounded-xl px-3 py-3 hover:text-paper aria-[current=page]:text-accent"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
