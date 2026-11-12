import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";
import { TurnoTabs } from "@/app/_components/turno-tabs";
import { getSinais } from "@/lib/data/snapshots";
import { nomeCandidato } from "@/lib/candidatos";
import { colorForParty } from "@/lib/party-colors";
import { SinaisReais } from "./_components/sinais-reais";
import { Simulador } from "./_components/simulador";

export const metadata: Metadata = {
  title: "Sinais de fraude: simulações hipotéticas",
  description:
    "Como uma fraude apareceria nos dados da eleição, quais sinais a denunciariam e o que os dados reais de 2026 mostram.",
};

export default async function Page() {
  const { turnos } = await getSinais();
  return (
    <>
      <PageHeader eyebrow="Simulação hipotética" title="Sinais de fraude">
        <p>
          Se alguém tentasse fraudar a eleição, que rastro deixaria? Primeiro, veja o que os sinais mostram nos dados
          reais de 2026. Depois, aplique fraudes hipotéticas e veja quais controles as pegariam.
        </p>
      </PageHeader>

      <section className="mt-12" aria-labelledby="dados-reais">
        <h2 id="dados-reais" className="mb-6 text-3xl font-semibold">
          O que os dados reais mostram
        </h2>
        <TurnoTabs
          primeiro={<SinaisReais s={turnos["1"]} turno={1} />}
          segundo={<SinaisReais s={turnos["2"]} turno={2} />}
        />
      </section>

      <section className="mt-20" aria-labelledby="simulador">
        <h2 id="simulador" className="text-3xl font-semibold">
          Simule uma fraude hipotética
        </h2>
        <p className="mt-3 mb-8 max-w-3xl leading-relaxed">
          Escolha um tipo de fraude e a intensidade. O simulador aplica a alteração a uma cópia dos dados e roda os
          mesmos sinais usados acima. Os cenários funcionam igual para qualquer candidato.
        </p>
        <Simulador
          amostra={turnos["2"].amostra}
          candidatos={turnos["2"].amostra.candidatos.map((c) => ({
            numero: c.numero,
            nome: nomeCandidato(c.numero, c.nome),
            cor: colorForParty(c.partido),
          }))}
        />
      </section>

      <NextSection current="/simulacoes" />
    </>
  );
}
