import type { Metadata } from "next";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Boletim da Urna", template: "%s · Boletim da Urna" },
  description: "Estudo de caso sobre a eleição presidencial de 2026 com dados da Justiça Eleitoral.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
