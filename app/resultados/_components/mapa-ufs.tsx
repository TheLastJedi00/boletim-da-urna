import { Figure } from "@/app/_components/charts/figure";
import { Legend } from "@/app/_components/charts/legend";
import { MapaTurno } from "@/app/_components/turno-context";
import { nomeCandidato } from "@/lib/candidatos";
import type { Resultados, TurnoResultado } from "@/lib/data/snapshots";
import type { Geo } from "@/lib/data/geo";
import { formatPct1 } from "@/lib/format";
import { colorForParty } from "@/lib/party-colors";
import { vencedor } from "@/lib/results";
import { UFS } from "@/lib/ufs";
import { Choropleth, type Area } from "./choropleth";

/** Opacidade proporcional à margem: vitória apertada = cor mais clara. */
export const opacidadeMargem = (margem: number) => 0.5 + (Math.min(margem, 0.3) / 0.3) * 0.5;

function areasUf(t: TurnoResultado) {
  const areas = new Map<string, Area>();
  for (const [uf, r] of Object.entries(t.ufs)) {
    if (uf === "ZZ") continue;
    const v = vencedor(r.calculado, t.br.candidatos);
    const nome = UFS.find((u) => u.sigla === uf)?.nome ?? uf;
    areas.set(uf, {
      fill: colorForParty(v.primeiro.partido),
      opacity: opacidadeMargem(v.margem),
      title: `${nome}: ${nomeCandidato(v.primeiro.numero)} ${formatPct1(v.primeiro.validos)} × ${nomeCandidato(v.segundo.numero)} ${formatPct1(v.segundo.validos)}`,
      href: `/resultados/${uf.toLowerCase()}`,
    });
  }
  return areas;
}

/** Mapa do Brasil com o vencedor por UF; o turno vem do <TurnoProvider>. */
export function MapaUfs({ geo, turnos }: { geo: Geo; turnos: Resultados["turnos"] }) {
  const vencedores = new Map<number, string>();
  for (const t of [turnos["1"], turnos["2"]]) {
    for (const [uf, r] of Object.entries(t.ufs)) {
      if (uf === "ZZ") continue;
      const v = vencedor(r.calculado, t.br.candidatos).primeiro;
      vencedores.set(v.numero, v.partido);
    }
  }
  return (
    <Figure
      title="Quem venceu em cada estado"
      description="Cor do candidato mais votado; quanto mais forte a cor, maior a vantagem. Toque num estado para ver os municípios."
      source="TSE, soma dos boletins de urna por UF (idêntica ao total oficial). Malha: IBGE."
    >
      <Legend items={[...vencedores].map(([n, p]) => ({ label: nomeCandidato(n), color: colorForParty(p) }))} />
      <div className="mx-auto mt-4 max-w-xl">
        <MapaTurno>
          <Choropleth geo={geo} turnos={[areasUf(turnos["1"]), areasUf(turnos["2"])]} label="Mapa do Brasil: vencedor por estado" />
        </MapaTurno>
      </div>
    </Figure>
  );
}
