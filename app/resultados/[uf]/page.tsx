import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList } from "@/app/_components/charts/bar-list";
import { Figure } from "@/app/_components/charts/figure";
import { Legend } from "@/app/_components/charts/legend";
import { PageHeader } from "@/app/_components/page-header";
import { MapaTurno, PorTurno, TurnoProvider, TurnoSeletor } from "@/app/_components/turno-context";
import { nomeCandidato } from "@/lib/candidatos";
import type { CandidatoOficial } from "@/lib/data-types";
import { getGeoMunicipios } from "@/lib/data/geo";
import { getMunicipios, getResultados, type MunicipioSnapshot } from "@/lib/data/snapshots";
import { formatInt, formatPct, formatPct1 } from "@/lib/format";
import { colorForParty } from "@/lib/party-colors";
import { ranking, vencedor } from "@/lib/results";
import { UFS, isUf } from "@/lib/ufs";
import { Choropleth, type Area } from "../_components/choropleth";
import { opacidadeMargem } from "../_components/mapa-ufs";

export function generateStaticParams() {
  return UFS.map((u) => ({ uf: u.sigla.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<"/resultados/[uf]">): Promise<Metadata> {
  const { uf } = await params;
  const nome = UFS.find((u) => u.sigla.toLowerCase() === uf)?.nome ?? uf.toUpperCase();
  return { title: `Resultados em ${nome}`, description: `Resultado da eleição presidencial de 2026 em ${nome}, por município.` };
}

export default async function Page({ params }: PageProps<"/resultados/[uf]">) {
  const { uf: param } = await params;
  if (!isUf(param)) notFound();
  const sigla = param.toUpperCase();
  const info = UFS.find((u) => u.sigla === sigla)!;
  const exterior = sigla === "ZZ";
  const [{ turnos }, { municipios }, geo] = await Promise.all([
    getResultados(),
    getMunicipios(sigla),
    exterior ? Promise.resolve(null) : getGeoMunicipios(sigla),
  ]);

  const resumo = (t: 1 | 2) => {
    const tr = turnos[t];
    const uf = tr.ufs[sigla];
    const r = ranking(uf.calculado, tr.br.candidatos).filter((c) => c.validos >= 0.01);
    return (
      <Figure title={`Votos válidos em ${info.nome} — ${t}º turno`} source="Soma dos boletins de urna (TSE), idêntica ao total oficial da UF.">
        <BarList
          data={r.map((c) => ({ key: String(c.numero), label: nomeCandidato(c.numero, c.nome), note: c.partido, value: c.votos, color: colorForParty(c.partido) }))}
          total={Object.values(uf.calculado.votos).reduce((a, b) => a + b, 0)}
        />
        <p className="mt-4 text-sm">
          {formatInt(uf.calculado.secoes)} seções · comparecimento {formatPct(uf.calculado.comparecimento / uf.calculado.aptos)}
        </p>
      </Figure>
    );
  };

  const legenda = new Map<number, string>();
  for (const t of [1, 2] as const) {
    for (const m of municipios) {
      if (!m.turnos[t]) continue;
      const v = vencedor(m.turnos[t]!, turnos[t].br.candidatos).primeiro;
      legenda.set(v.numero, v.partido);
    }
  }

  return (
    <>
      <Link href="/resultados" className="text-sm text-accent hover:text-accent-soft">
        ← Todos os estados
      </Link>
      <div className="mt-4">
        <PageHeader eyebrow="Resultados por UF" title={info.nome} />
      </div>
      <section className="mt-10">
        <TurnoProvider>
          <TurnoSeletor />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <PorTurno turno={1}>{resumo(1)}</PorTurno>
              <PorTurno turno={2}>{resumo(2)}</PorTurno>
            </div>
            {geo ? (
              <Figure
                title="Vencedor por município"
                description="Cor do mais votado; quanto mais forte, maior a vantagem."
                source="Soma dos boletins de urna por município (TSE). Malha: IBGE."
              >
                <Legend items={[...legenda].map(([n, p]) => ({ label: nomeCandidato(n), color: colorForParty(p) }))} />
                <div className="mt-4">
                  <MapaTurno>
                    <Choropleth
                      geo={geo}
                      turnos={[areasMunicipios(municipios, 1, turnos["1"].br.candidatos), areasMunicipios(municipios, 2, turnos["2"].br.candidatos)]}
                      label={`Mapa de ${info.nome}: vencedor por município`}
                    />
                  </MapaTurno>
                </div>
              </Figure>
            ) : (
              <Figure title="Votos no exterior" source="TSE.">
                <p className="text-sm leading-relaxed">
                  Brasileiros que vivem fora votam em seções instaladas em embaixadas e consulados. A lista abaixo mostra
                  as cidades com seções.
                </p>
              </Figure>
            )}
          </div>
          <div className="mt-6">
            <TabelaMunicipios municipios={municipios} cands={[turnos["1"].br.candidatos, turnos["2"].br.candidatos]} exterior={exterior} />
          </div>
        </TurnoProvider>
      </section>
    </>
  );
}

function areasMunicipios(municipios: MunicipioSnapshot[], t: 1 | 2, cands: CandidatoOficial[]) {
  const areas = new Map<string, Area>();
  for (const m of municipios) {
    const tot = m.turnos[t];
    if (!tot || !m.ibge) continue;
    const v = vencedor(tot, cands);
    areas.set(m.ibge, {
      fill: colorForParty(v.primeiro.partido),
      opacity: opacidadeMargem(v.margem),
      title: `${m.nome}: ${nomeCandidato(v.primeiro.numero)} ${formatPct1(v.primeiro.validos)} × ${nomeCandidato(v.segundo.numero)} ${formatPct1(v.segundo.validos)}`,
    });
  }
  return areas;
}

/** Uma tabela só, com o mais votado nos dois turnos (renderizada uma vez, fora das abas). */
function TabelaMunicipios({ municipios, cands, exterior }: { municipios: MunicipioSnapshot[]; cands: [CandidatoOficial[], CandidatoOficial[]]; exterior: boolean }) {
  const linhas = municipios
    .filter((m) => m.turnos["1"] || m.turnos["2"])
    .map((m) => ({
      m,
      aptos: (m.turnos["2"] ?? m.turnos["1"])!.aptos,
      v: ([1, 2] as const).map((t) => (m.turnos[t] ? vencedor(m.turnos[t]!, cands[t - 1]).primeiro : null)),
    }))
    .sort((a, b) => b.aptos - a.aptos);
  const celula = (c: (typeof linhas)[number]["v"][number]) =>
    c ? (
      <>
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorForParty(c.partido) }} aria-hidden />
        {nomeCandidato(c.numero)} <span className="font-mono text-faint">{formatPct1(c.validos)}</span>
      </>
    ) : (
      "—"
    );
  const tabela = (rows: typeof linhas) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-faint">
            <th className="px-3 py-2">{exterior ? "Cidade" : "Município"}</th>
            <th className="px-3 py-2 text-right">Aptos</th>
            <th className="px-3 py-2">Mais votado · 1º turno</th>
            <th className="px-3 py-2">Mais votado · 2º turno</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, aptos, v }) => (
            <tr key={m.codigo} className="border-t border-line/60">
              <td className="px-3 py-1.5 text-paper">{m.nome}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatInt(aptos)}</td>
              <td className="px-3 py-1.5">{celula(v[0])}</td>
              <td className="px-3 py-1.5">{celula(v[1])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <Figure title={`${exterior ? "Cidades" : "Municípios"} por eleitorado`} source="Soma dos boletins de urna (TSE). Percentual de votos válidos do mais votado.">
      {tabela(linhas.slice(0, 10))}
      {linhas.length > 10 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-accent">Ver todos os {linhas.length}</summary>
          <div className="mt-3">{tabela(linhas.slice(10))}</div>
        </details>
      )}
    </Figure>
  );
}
