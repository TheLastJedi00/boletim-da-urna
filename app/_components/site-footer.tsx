import Link from "next/link";
import { AUTHOR } from "@/lib/sections";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          {AUTHOR.credit}.{" "}
          <a href={AUTHOR.portfolio} className="text-accent hover:text-accent-soft" rel="author">
            lenoborges.com.br
          </a>
        </p>
        <p className="text-faint">
          Fonte oficial: Tribunal Superior Eleitoral (TSE).{" "}
          <Link href="/metodologia" className="underline decoration-line underline-offset-4 hover:text-paper">
            Metodologia
          </Link>
        </p>
      </div>
    </footer>
  );
}
