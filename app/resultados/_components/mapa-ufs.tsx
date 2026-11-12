import { Figure } from "@/app/_components/charts/figure";
import { Legend } from "@/app/_components/charts/legend";
import { nomeCandidato } from "@/lib/candidatos";
import type { TurnoResultado } from "@/lib/data/snapshots";
import type { Geo } from "@/lib/data/geo";
import { formatPct1 } from "@/lib/format";
import { colorForParty } from "@/lib/party-colors";
import { vencedor } from "@/lib/results";
import { UFS } from "@/lib/ufs";
import { Choropleth, type Area } from "./choropleth";

/** Opacidade proporcional à margem: vitória apertada = cor mais clara. */
export const opacidadeMargem = (margem: number) => 0.5 + (Math.min(margem, 0.3) / 0.3) * 0.5;

export function MapaUfs({ geo, t, turno }: { geo: Geo; t: TurnoResultado; turno: 1 | 2 }) {
  const areas = new Map<string, Area>();
  const vencedores = new Map<number, { partido: string }>();
  for (const [uf, r] of Object.entries(t.ufs)) {
    if (uf === "ZZ") continue;
    const v = vencedor(r.calculado, t.br.candidatos);
    vencedores.set(v.primeiro.numero, v.primeiro);
    const nome = UFS.find((u) => u.sigla === uf)?.nome ?? uf;
    areas.set(uf, {
      fill: colorForParty(v.primeiro.partido),
      opacity: opacidadeMargem(v.margem),
      title: `${nome}: ${nomeCandidato(v.primeiro.numero)} ${formatPct1(v.primeiro.validos)} × ${nomeCandidato(v.segundo.numero)} ${formatPct1(v.segundo.validos)}`,
      href: `/resultados/${uf.toLowerCase()}`,
    });
  }
  return (
    <Figure
      title={`Quem venceu em cada estado — ${turno}º turno`}
      description="Cor do candidato mais votado; quanto mais forte a cor, maior a vantagem. Toque num estado para ver os municípios."
      source="TSE, soma dos boletins de urna por UF (idêntica ao total oficial). Malha: IBGE."
    >
      <Legend
        items={[...vencedores].map(([n, c]) => ({ label: nomeCandidato(n), color: colorForParty(c.partido) }))}
      />
      <div className="mx-auto mt-4 max-w-xl">
        <Choropleth geo={geo} areas={areas} label={`Mapa do Brasil: vencedor por estado no ${turno}º turno`} />
      </div>
    </Figure>
  );
}
