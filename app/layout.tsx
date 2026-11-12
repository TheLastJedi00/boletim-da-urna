import type { Metadata } from "next";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { AUTHOR, SITE_URL } from "@/lib/sections";
import { fontVariables } from "./fonts";
import "./globals.css";

const DESCRICAO =
  "Estudo de caso sobre a eleição presidencial de 2026: boletins de urna, pesquisas e sinais de fraude explicados com dados oficiais da Justiça Eleitoral. Por Leno Borges.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Boletim da Urna · Estudo de caso de Leno Borges", template: "%s · Boletim da Urna" },
  description: DESCRICAO,
  authors: [{ name: AUTHOR.name, url: AUTHOR.portfolio }],
  creator: AUTHOR.name,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Boletim da Urna",
    title: "Boletim da Urna · Estudo de caso de Leno Borges",
    description: DESCRICAO,
  },
  twitter: { card: "summary_large_image", title: "Boletim da Urna", description: DESCRICAO },
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
