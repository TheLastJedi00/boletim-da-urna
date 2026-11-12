import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";
import { getResultados } from "@/lib/data/snapshots";
import { colorForParty } from "@/lib/party-colors";
import { BuscaSecao } from "./_components/busca-secao";

export const metadata: Metadata = {
  title: "Confira uma seção",
  description: "Encontre a sua seção eleitoral e veja o boletim de urna dela, com link para os arquivos oficiais do TSE.",
};

export default async function Page() {
  const { turnos } = await getResultados();
  const cores = Object.fromEntries(turnos["1"].br.candidatos.map((c) => [c.numero, colorForParty(c.partido)]));
  return (
    <>
      <PageHeader eyebrow="Boletim de urna" title="Confira uma seção">
        <p>
          Cada seção eleitoral tem o seu boletim de urna, impresso no fim da votação e publicado na internet. Escolha a
          sua (ou qualquer outra) e confira o que a urna registrou.
        </p>
      </PageHeader>
      <section className="mt-10">
        <BuscaSecao cores={cores} />
      </section>
      <NextSection current="/secao" />
    </>
  );
}
