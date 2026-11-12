import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";
import { getManifest, getPesquisas, getResultados } from "@/lib/data/snapshots";
import { formatInt } from "@/lib/format";
import { UFS } from "@/lib/ufs";

export const metadata: Metadata = {
  title: "Metodologia e fontes",
  description: "Fontes oficiais, hashes, processamento, reconciliação com o TSE, limitações e uso de IA neste estudo.",
};

const PASSOS = [
  "Consulta ao catálogo do Portal de Dados Abertos do TSE (API CKAN) para listar os arquivos de boletim de urna de cada UF e turno.",
  "Download de cada arquivo e verificação do hash SHA-512 publicado pelo TSE; arquivo com hash divergente é descartado.",
  "Leitura em streaming dos CSVs (codificação latin1), mantendo apenas o cargo de Presidente.",
  "Consolidação em uma linha por seção eleitoral, com checagem de consistência entre as linhas de cada seção.",
  "Soma por município, UF e Brasil e comparação campo a campo com os totais oficiais divulgados pelo TSE (reconciliação).",
  "Cálculo dos sinais estatísticos (comparecimento, horários, liberações sem biometria) comparando cada seção com as demais do mesmo estado.",
  "Geração de arquivos compactos; cada arquivo gerado tem hash SHA-256 registrado no manifesto do repositório.",
];

const LIMITACOES = [
  "Os sinais estatísticos apontam seções fora do padrão, não fraudes. Um valor atípico é um ponto para checar — e quase sempre tem explicação (seções em presídios, urnas de contingência, filas, falhas de leitor biométrico).",
  "As simulações de fraude são hipotéticas e usam um modelo didático da assinatura digital; a criptografia real da urna é mais robusta do que o modelo exibido.",
  "Os resultados das pesquisas foram compilados a partir de tabelas públicas (Wikipédia), com o link da fonte original de cada pesquisa. Parte delas não traz o número de registro no TSE na fonte compilada. A curadoria está em revisão pelo autor.",
  "Os horários dos boletins estão no horário local de cada estado; por isso as comparações de horário são feitas sempre dentro da mesma UF.",
  "No exterior (ZZ), o total oficial inclui seções que não tiveram boletim (não instaladas ou agregadas a outras). Os votos batem; só a contagem de seções difere.",
];

export default async function Page() {
  const [{ turnos }, manifest, pesquisas] = await Promise.all([getResultados(), getManifest(), getPesquisas()]);
  const csvs = manifest.fontes.filter((f) => f.tipo === "csv-boletim-de-urna");
  const jsons = manifest.fontes.filter((f) => f.tipo !== "csv-boletim-de-urna");
  const coleta = new Date(manifest.coletadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const ufsOrdenadas = [...UFS].map((u) => u.sigla);

  return (
    <>
      <PageHeader eyebrow="Transparência" title="Metodologia e fontes">
        <p>
          Tudo o que aparece neste estudo pode ser refeito a partir de arquivos públicos. Aqui estão as fontes, o passo a
          passo do processamento, a conferência com o resultado oficial e as limitações.
        </p>
      </PageHeader>

      <section className="mt-14 grid gap-4 md:grid-cols-3" aria-label="Fontes">
        <Fonte titulo="Boletins de urna" orgao="TSE · Portal de Dados Abertos">
          {csvs.length} arquivos (27 UFs + exterior, 2 turnos), com hash SHA-512 verificado. Coletados em {coleta}.
        </Fonte>
        <Fonte titulo="Resultados oficiais" orgao="TSE · resultados.tse.jus.br">
          {jsons.length} arquivos JSON de totalização (Brasil e UFs) e cadastro de municípios com código IBGE.
        </Fonte>
        <Fonte titulo="Pesquisas e notícias" orgao="Curadoria do autor · em revisão">
          {pesquisas.turnos["1"].pesquisas.length + pesquisas.turnos["2"].pesquisas.length} pesquisas nacionais e{" "}
          {pesquisas.noticias.length} notícias de veículos de grande circulação, cada uma com link para a fonte.
        </Fonte>
      </section>

      <section className="mt-16" aria-labelledby="processamento">
        <h2 id="processamento" className="text-3xl font-semibold">
          Processamento
        </h2>
        <ol className="mt-6 space-y-3">
          {PASSOS.map((p, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="reconciliacao">
        <h2 id="reconciliacao" className="text-3xl font-semibold">
          Reconciliação: soma dos boletins × total oficial
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed">
          Para cada estado e turno, a soma dos boletins de urna foi comparada com o total divulgado pelo TSE em
          comparecimento, votos de cada candidato, brancos, nulos e nulos técnicos.
        </p>
        <div className="card mt-6 overflow-x-auto p-2">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Reconciliação por UF e turno</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-faint">
                <th className="px-3 py-2">UF</th>
                <th className="px-3 py-2 text-right">Seções com BU (1º / 2º)</th>
                <th className="px-3 py-2 text-right">Comparecimento 2º turno</th>
                <th className="px-3 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {ufsOrdenadas.map((uf) => {
                const a = turnos["1"].ufs[uf];
                const b = turnos["2"].ufs[uf];
                if (!a || !b) return null;
                const ok = a.reconciliacao.ok && b.reconciliacao.ok;
                const aviso = [...a.reconciliacao.avisos, ...b.reconciliacao.avisos].length > 0;
                return (
                  <tr key={uf} className="border-t border-line/60">
                    <td className="px-3 py-2 font-mono text-paper">{uf}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatInt(a.calculado.secoes)} / {formatInt(b.calculado.secoes)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{formatInt(b.calculado.comparecimento)}</td>
                    <td className="px-3 py-2">
                      {ok ? <span className="text-paper">✓ bate</span> : <span className="text-sim">diverge</span>}
                      {aviso && <span className="ml-2 text-xs text-faint">(seções sem BU no total oficial)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="hashes">
        <h2 id="hashes" className="text-3xl font-semibold">
          Arquivos e hashes
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed">
          O hash é uma “impressão digital” do arquivo: se um único byte mudar, o hash muda. Compare com o arquivo{" "}
          <span className="font-mono text-sm">.sha512</span> publicado pelo TSE ao lado de cada boletim.
        </p>
        <details className="card mt-6 p-5">
          <summary className="cursor-pointer text-paper">Ver os {csvs.length} arquivos de boletim de urna</summary>
          <ul className="mt-4 space-y-2 font-mono text-xs">
            {csvs.map((f) => (
              <li key={f.url} className="break-all">
                <a href={f.url} className="text-accent hover:text-accent-soft">
                  {f.url.split("/").pop()}
                </a>{" "}
                <span className="text-faint">sha512 {f.sha512?.slice(0, 32)}…</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="mt-16" aria-labelledby="pesquisas-metodo">
        <h2 id="pesquisas-metodo" className="text-3xl font-semibold">
          Como as pesquisas foram tratadas
        </h2>
        <dl className="mt-6 grid gap-4 md:grid-cols-3">
          {Object.entries({
            "Votos válidos": pesquisas.metodo.validos,
            "Peso de cada pesquisa": pesquisas.metodo.pesos,
            "Faixa de incerteza": pesquisas.metodo.intervalo,
          }).map(([k, v]) => (
            <div key={k} className="card p-5">
              <dt className="font-medium text-paper">{k}</dt>
              <dd className="mt-2 text-sm leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold">Limitações</h2>
          <ul className="mt-6 space-y-3">
            {LIMITACOES.map((l) => (
              <li key={l} className="flex gap-3 leading-relaxed">
                <span aria-hidden className="text-accent">•</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">O papel da IA</h2>
          <p className="mt-3 leading-relaxed">
            Este estudo foi desenvolvido por Leno Borges com apoio de inteligência artificial (Claude, da Anthropic) para
            escrever os programas de processamento, os testes automatizados e a primeira versão dos textos explicativos.
          </p>
          <p className="mt-3 leading-relaxed">
            A IA não “opina” sobre os números: todos são calculados por código a partir dos arquivos oficiais, e o
            código é verificado por testes — inclusive o que compara a soma dos boletins com o total do TSE. A curadoria
            de pesquisas e notícias e o texto final passam pela revisão do autor.
          </p>
        </div>
      </section>

      <NextSection current="/metodologia" />
    </>
  );
}

function Fonte({ titulo, orgao, children }: { titulo: string; orgao: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-faint">{orgao}</p>
      <h2 className="mt-2 text-lg font-medium">{titulo}</h2>
      <p className="mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
