import Link from "next/link";
import { NextSection } from "@/app/_components/next-section";
import { getResultados } from "@/lib/data/snapshots";
import { formatInt, formatPct } from "@/lib/format";
import { AUTHOR, SECTIONS } from "@/lib/sections";

const DESCRICOES: Record<string, string> = {
  "/sistema": "Do voto na urna ao resultado na TV: cada etapa e cada controle que existe no caminho.",
  "/resultados": "O resultado oficial do 1º e do 2º turno, no mapa, por estado e por município.",
  "/pesquisas": "O que as pesquisas diziam, com margem de erro — e o quanto erraram.",
  "/simulacoes": "Simule fraudes hipotéticas e veja quais sinais as denunciariam nos dados.",
  "/secao": "Encontre a sua seção e veja o boletim de urna dela, com link para o arquivo oficial.",
  "/metodologia": "Fontes, hashes, como os dados foram processados e o papel da IA.",
};

export default async function Home() {
  const { turnos } = await getResultados();
  const t2 = turnos["2"];
  const ufs = Object.entries(t2.ufs).filter(([uf]) => uf !== "ZZ");
  const todasBatem = Object.values(turnos).every((t) => Object.values(t.ufs).every((u) => u.reconciliacao.ok));
  const somaComparecimento = Object.values(t2.ufs).reduce((s, u) => s + u.calculado.comparecimento, 0);

  return (
    <>
      <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">
            Estudo de caso · Eleição presidencial 2026
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">
            Como funciona a eleição, <span className="text-accent-soft">contada pelos próprios boletins de urna.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed">
            Este estudo baixou os {formatInt(t2.br.totals.secoes)} boletins de urna publicados pelo Tribunal Superior
            Eleitoral, somou um por um e comparou com o resultado oficial. Depois, cruzou tudo com as pesquisas de
            intenção de voto e simulou como fraudes hipotéticas apareceriam nos dados — para que qualquer pessoa entenda
            o sistema sem precisar abrir uma planilha.
          </p>
        </div>

        <aside className="card p-6" aria-label="Autoria">
          <p className="text-xs uppercase tracking-wider text-faint">Autoria</p>
          <p className="mt-2 font-display text-xl text-paper">{AUTHOR.credit}.</p>
          <p className="mt-3 text-sm leading-relaxed">
            Todos os números vêm de arquivos oficiais e podem ser conferidos. A inteligência artificial foi usada como
            apoio para processar e interpretar os dados; as conclusões foram verificadas contra as fontes.
          </p>
          <a
            href={AUTHOR.portfolio}
            rel="author"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-raised transition-colors hover:bg-accent-deep"
          >
            Conheça o portfólio de {AUTHOR.name} <span aria-hidden>↗</span>
          </a>
        </aside>
      </section>

      <section aria-label="Números do estudo" className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero valor={formatInt(t2.br.totals.secoes)} rotulo="seções eleitorais (um boletim cada)" />
        <Numero valor={formatInt(t2.br.totals.aptos)} rotulo="eleitores aptos" />
        <Numero valor={formatPct(t2.br.totals.comparecimento / t2.br.totals.aptos)} rotulo="compareceram no 2º turno" />
        <Numero
          valor={todasBatem ? "100%" : "—"}
          rotulo={`dos votos conferidos: a soma dos boletins bate com o total oficial nas ${ufs.length} UFs e no exterior`}
          destaque
        />
      </section>
      <p className="mt-3 text-xs text-faint">
        Soma do comparecimento nos boletins do 2º turno: {formatInt(somaComparecimento)} · total oficial:{" "}
        {formatInt(t2.br.totals.comparecimento)}. Fonte: TSE.
      </p>

      <section className="mt-20" aria-labelledby="secoes">
        <h2 id="secoes" className="text-3xl font-semibold">
          O estudo em seis partes
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.slice(1).map((s, i) => (
            <li key={s.href}>
              <Link href={s.href} className="card group flex h-full flex-col p-6 transition-shadow hover:shadow-raised-lg">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-2 font-display text-xl text-paper">{s.label}</span>
                <span className="mt-2 text-sm leading-relaxed">{DESCRICOES[s.href]}</span>
                <span aria-hidden className="mt-auto pt-4 text-accent transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <NextSection current="/" />
    </>
  );
}

function Numero({ valor, rotulo, destaque = false }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`card p-5 ${destaque ? "ring-1 ring-accent/40" : ""}`}>
      <p className={`font-mono text-3xl tabular-nums ${destaque ? "text-accent-soft" : "text-paper"}`}>{valor}</p>
      <p className="mt-2 text-sm leading-snug">{rotulo}</p>
    </div>
  );
}
