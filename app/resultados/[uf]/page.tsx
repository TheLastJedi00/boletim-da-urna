import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList } from "@/app/_components/charts/bar-list";
import { Figure } from "@/app/_components/charts/figure";
import { Legend } from "@/app/_components/charts/legend";
import { PageHeader } from "@/app/_components/page-header";
import { TurnoTabs } from "@/app/_components/turno-tabs";
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

  const painel = (t: 1 | 2) => {
    const tr = turnos[t];
    const uf = tr.ufs[sigla];
    const cands = tr.br.candidatos;
    const r = ranking(uf.calculado, cands).filter((c) => c.validos >= 0.01);
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Figure title={`Votos válidos em ${info.nome}`} source="Soma dos boletins de urna (TSE), idêntica ao total oficial da UF.">
            <BarList
              data={r.map((c) => ({ key: String(c.numero), label: nomeCandidato(c.numero, c.nome), note: c.partido, value: c.votos, color: colorForParty(c.partido) }))}
              total={Object.values(uf.calculado.votos).reduce((a, b) => a + b, 0)}
            />
            <p className="mt-4 text-sm">
              {formatInt(uf.calculado.secoes)} seções · comparecimento {formatPct(uf.calculado.comparecimento / uf.calculado.aptos)}
            </p>
          </Figure>
          {geo ? (
            <Figure
              title="Vencedor por município"
              description="Cor do mais votado; quanto mais forte, maior a vantagem."
              source="Soma dos boletins de urna por município (TSE). Malha: IBGE."
            >
              <Legend
                items={[...new Map(municipios.flatMap((m) => (m.turnos[t] ? [vencedor(m.turnos[t]!, cands).primeiro] : [])).map((c) => [c.numero, c])).values()].map(
                  (c) => ({ label: nomeCandidato(c.numero), color: colorForParty(c.partido) }),
                )}
              />
              <div className="mt-4">
                <Choropleth geo={geo} areas={areasMunicipios(municipios, t, cands)} label={`Mapa de ${info.nome}: vencedor por município no ${t}º turno`} />
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
        <TabelaMunicipios municipios={municipios} turno={t} cands={cands} exterior={exterior} />
      </div>
    );
  };

  return (
    <>
      <Link href="/resultados" className="text-sm text-accent hover:text-accent-soft">
        ← Todos os estados
      </Link>
      <div className="mt-4">
        <PageHeader eyebrow="Resultados por UF" title={info.nome} />
      </div>
      <section className="mt-10">
        <TurnoTabs primeiro={painel(1)} segundo={painel(2)} />
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

function TabelaMunicipios({ municipios, turno, cands, exterior }: { municipios: MunicipioSnapshot[]; turno: 1 | 2; cands: CandidatoOficial[]; exterior: boolean }) {
  const linhas = municipios
    .filter((m) => m.turnos[turno])
    .map((m) => ({ m, t: m.turnos[turno]!, v: vencedor(m.turnos[turno]!, cands) }))
    .sort((a, b) => b.t.aptos - a.t.aptos);
  const tabela = (rows: typeof linhas) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-faint">
            <th className="px-3 py-2">{exterior ? "Cidade" : "Município"}</th>
            <th className="px-3 py-2 text-right">Aptos</th>
            <th className="px-3 py-2 text-right">Comparecimento</th>
            <th className="px-3 py-2">Mais votado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, t, v }) => (
            <tr key={m.codigo} className="border-t border-line/60">
              <td className="px-3 py-2 text-paper">{m.nome}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatInt(t.aptos)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPct1(t.comparecimento / t.aptos)}</td>
              <td className="px-3 py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForParty(v.primeiro.partido) }} aria-hidden />
                {nomeCandidato(v.primeiro.numero)} <span className="font-mono text-faint">{formatPct1(v.primeiro.validos)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <Figure title={`Maiores ${exterior ? "cidades" : "municípios"} por eleitorado`} source="Soma dos boletins de urna (TSE).">
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
