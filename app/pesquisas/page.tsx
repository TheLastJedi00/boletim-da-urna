import type { Metadata } from "next";
import { Figure } from "@/app/_components/charts/figure";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";
import { TurnoTabs } from "@/app/_components/turno-tabs";
import { nomeCandidato } from "@/lib/candidatos";
import { getPesquisas, getResultados, type PesquisasTurno } from "@/lib/data/snapshots";
import { formatDate } from "@/lib/format";
import { colorForParty } from "@/lib/party-colors";
import { LinhaDoTempo, type MarcoNoticia } from "./_components/linha-do-tempo";

export const metadata: Metadata = {
  title: "Pesquisas × urna",
  description: "As pesquisas de intenção de voto de 2026, com margem de erro e projeção, comparadas com o resultado oficial.",
};

export default async function Page() {
  const [{ turnos, noticias }, resultados] = await Promise.all([getPesquisas(), getResultados()]);

  const painel = (t: 1 | 2) => {
    const tr: PesquisasTurno = turnos[t];
    const candidatos = Object.entries(tr.real)
      .sort((a, b) => b[1] - a[1])
      .slice(0, t === 1 ? 5 : 2)
      .map(([n]) => {
        const c = tr.candidatos.find((x) => x.numero === +n)!;
        return { numero: +n, nome: nomeCandidato(+n), cor: colorForParty(c.partido) };
      });
    const marcos: MarcoNoticia[] = noticias
      .map((n, i) => ({ n: i + 1, data: n.data, titulo: n.titulo, turno: n.turno }))
      .filter((n) => n.turno === t && n.data <= resultados.turnos[t].dia);
    return (
      <Figure
        title={`Intenção de voto em votos válidos — ${t}º turno`}
        description="Cada ponto é uma pesquisa (a barra vertical é a margem de erro). A linha é a média ponderada das pesquisas, com a faixa de incerteza. À direita, o resultado oficial."
        source="Institutos de pesquisa (via curadoria do autor, em revisão; link de cada pesquisa na tabela abaixo). Resultado: TSE."
      >
        <LinhaDoTempo
          pesquisas={tr.pesquisas.map((p) => ({
            id: p.id,
            instituto: p.instituto,
            data: p.campoFim,
            amostra: p.amostra,
            url: p.url,
            valores: p.validos.valores,
            margem: p.validos.margem,
          }))}
          serie={tr.serie}
          candidatos={candidatos}
          real={tr.real}
          noticias={marcos}
          dominio={t === 1 ? [0, 55] : [40, 60]}
          diaEleicao={resultados.turnos[t].dia}
        />
      </Figure>
    );
  };

  return (
    <>
      <PageHeader eyebrow="Projeções e margens de erro" title="Pesquisas × urna">
        <p>
          Pesquisa não é previsão: é uma fotografia, com margem de erro, de um momento da campanha. Aqui estão as
          pesquisas dos principais institutos, a média entre elas e o que as urnas mostraram.
        </p>
      </PageHeader>

      <section className="mt-12" aria-label="Linha do tempo das pesquisas">
        <TurnoTabs primeiro={painel(1)} segundo={painel(2)} />
      </section>

      <section className="mt-12" aria-labelledby="noticias">
        <h2 id="noticias" className="text-3xl font-semibold">
          O que aconteceu na campanha
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed">
          Os números no gráfico marcam fatos da campanha e do processo eleitoral. Eles ajudam a ler as pesquisas no
          contexto — sem afirmar que um fato causou uma mudança.
        </p>
        <ol className="mt-6 grid gap-3 md:grid-cols-2">
          {noticias.map((n, i) => (
            <li key={n.url} className="card flex gap-4 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-xs text-paper">
                {i + 1}
              </span>
              <div>
                <p className="text-xs text-faint">
                  {formatDate(n.data)} · {n.veiculo}
                </p>
                <a href={n.url} className="mt-1 block font-medium text-paper hover:text-accent" rel="noopener noreferrer">
                  {n.titulo}
                </a>
                <p className="mt-1 text-sm leading-relaxed">{n.resumo}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <NextSection current="/pesquisas" />
    </>
  );
}
