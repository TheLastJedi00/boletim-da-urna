import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";
import { PorTurno, TurnoProvider, TurnoSeletor } from "@/app/_components/turno-context";
import { getResultados } from "@/lib/data/snapshots";
import { nomeCandidato } from "@/lib/candidatos";
import { formatPct } from "@/lib/format";
import { vencedor } from "@/lib/results";
import { getGeoUfs } from "@/lib/data/geo";
import { ComparacaoTurnos } from "./_components/comparacao-turnos";
import { MapaUfs } from "./_components/mapa-ufs";
import { ResultadoNacional } from "./_components/resultado-nacional";

export const metadata: Metadata = {
  title: "Resultados oficiais",
  description: "Resultado oficial da eleição presidencial de 2026, 1º e 2º turnos, por estado e município.",
};

export default async function Page() {
  const [{ turnos }, geo] = await Promise.all([getResultados(), getGeoUfs()]);
  const v2 = vencedor(turnos["2"].br.totals, turnos["2"].br.candidatos);

  return (
    <>
      <PageHeader eyebrow="Presidente 2026" title="Resultados oficiais">
        <p>
          {nomeCandidato(v2.primeiro.numero)} foi eleito no 2º turno com {formatPct(v2.primeiro.validos)} dos votos
          válidos, contra {formatPct(v2.segundo.validos)} de {nomeCandidato(v2.segundo.numero)} — uma diferença de{" "}
          {formatPct(v2.margem)}. No 1º turno, a ordem tinha sido inversa.
        </p>
      </PageHeader>

      <section className="mt-12" aria-label="Resultado nacional">
        <TurnoProvider>
          <TurnoSeletor />
          <div className="mt-6 space-y-6">
            <PorTurno turno={1}>
              <ResultadoNacional t={turnos["1"]} turno={1} />
            </PorTurno>
            <PorTurno turno={2}>
              <ResultadoNacional t={turnos["2"]} turno={2} />
            </PorTurno>
            <MapaUfs geo={geo} turnos={turnos} />
          </div>
        </TurnoProvider>
      </section>

      <section className="mt-12" aria-label="Comparação entre turnos">
        <ComparacaoTurnos turnos={turnos} />
      </section>

      <NextSection current="/resultados" />
    </>
  );
}
