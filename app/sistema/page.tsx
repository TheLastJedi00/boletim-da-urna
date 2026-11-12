import type { Metadata } from "next";
import Link from "next/link";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";
import { getResultados } from "@/lib/data/snapshots";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Como funciona o sistema eleitoral",
  description: "Do voto na urna eletrônica ao resultado divulgado: as etapas e os controles do sistema eleitoral brasileiro.",
};

const ETAPAS = [
  {
    titulo: "Preparação e carga",
    texto:
      "Semanas antes, em cerimônia pública, cada urna recebe o software oficial e os dados da sua seção. Depois é lacrada. Partidos, Ministério Público e OAB podem acompanhar.",
    dado: "Nos dados: a data de carga de cada urna (DT_CARGA_URNA_EFETIVADA).",
  },
  {
    titulo: "Abertura e zerésima",
    texto:
      "No dia da eleição, antes do primeiro voto, a urna imprime a zerésima: um relatório que prova que ela começa com zero votos para todos.",
    dado: "Nos dados: o horário de abertura da urna (DT_ABERTURA).",
  },
  {
    titulo: "Votação",
    texto:
      "O eleitor se identifica, de preferência pela digital. Quando a biometria falha, o mesário pode liberar o voto após conferir o documento — e isso fica registrado.",
    dado: "Nos dados: quantos eleitores com biometria foram liberados sem ela (QT_ELEI_BIOM_SEM_HABILITACAO).",
  },
  {
    titulo: "Boletim de urna (BU)",
    texto:
      "Ao fim da votação, a urna emite o BU: o placar daquela seção. Ele é impresso em várias vias, assinado pelos mesários, afixado na porta da seção e entregue aos fiscais. A versão digital é assinada criptograficamente pela própria urna.",
    dado: "Nos dados: horário de encerramento e de emissão do BU, votos de cada candidato, brancos e nulos.",
  },
  {
    titulo: "Transmissão",
    texto:
      "O arquivo do BU é gravado numa mídia e transmitido por rede segura (ou satélite, em áreas remotas) até a Justiça Eleitoral. A assinatura digital garante que o arquivo não foi alterado no caminho.",
    dado: "Nos dados: o horário em que o BU foi recebido (DT_BU_RECEBIDO).",
  },
  {
    titulo: "Totalização e divulgação",
    texto:
      "O TSE soma os BUs e divulga o resultado. Todos os BUs ficam públicos na internet — então qualquer pessoa pode refazer a soma. É exatamente o que este estudo fez.",
    dado: "Nos dados: o arquivo completo de BUs por estado, com hash SHA-512 publicado.",
  },
] as const;

const CONTROLES = [
  ["Zerésima", "Relatório impresso antes da votação provando que a urna começa vazia."],
  ["BU impresso na seção", "Qualquer eleitor pode fotografar o placar da seção e comparar com o arquivo publicado."],
  ["Assinatura digital e hash", "Cada BU é assinado pela urna; o TSE publica o hash de cada arquivo. Uma alteração qualquer invalida a assinatura."],
  ["Teste Público de Segurança", "Antes da eleição, investigadores independentes tentam atacar o sistema e o TSE corrige o que for encontrado."],
  ["Teste de integridade", "No dia da eleição, urnas sorteadas votam em paralelo, com votos conhecidos e filmados, para conferir que registram exatamente o que foi digitado."],
  ["Publicação de todos os BUs", "Os arquivos de todas as seções ficam disponíveis para download, permitindo totalizações independentes."],
  ["Fiscalização", "Partidos, OAB, Ministério Público e observadores acompanham as etapas e recebem cópias dos arquivos."],
] as const;

export default async function Page() {
  const { turnos } = await getResultados();
  const secoes = turnos["2"].br.totals.secoes;

  return (
    <>
      <PageHeader eyebrow="Do voto ao resultado" title="Como funciona o sistema eleitoral">
        <p>
          Entre o dedo no botão “confirma” e o resultado na TV existem seis etapas. Cada uma deixa um rastro nos dados
          públicos — e é esse rastro que permite conferir a eleição de fora.
        </p>
      </PageHeader>

      <ol className="relative mt-14 space-y-6 before:absolute before:bottom-4 before:left-[1.15rem] before:top-4 before:w-px before:bg-line sm:before:left-[1.4rem]">
        {ETAPAS.map((e, i) => (
          <li key={e.titulo} className="relative flex gap-4 sm:gap-6">
            <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-sm text-accent shadow-raised sm:h-12 sm:w-12">
              {i + 1}
            </span>
            <div className="card flex-1 p-5 sm:p-6">
              <h2 className="text-xl font-medium">{e.titulo}</h2>
              <p className="mt-2 leading-relaxed">{e.texto}</p>
              <p className="well mt-4 px-4 py-3 font-mono text-xs leading-relaxed text-faint">{e.dado}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-20" aria-labelledby="controles">
        <h2 id="controles" className="text-3xl font-semibold">
          Os controles do caminho
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed">
          Nenhum controle sozinho garante a eleição. A segurança vem da combinação: para uma fraude passar, ela teria de
          enganar várias camadas independentes ao mesmo tempo, à vista de fiscais de partidos adversários.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTROLES.map(([t, d]) => (
            <li key={t} className="card p-5">
              <h3 className="font-medium">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-16 p-6 sm:p-8" aria-labelledby="confira">
        <h2 id="confira" className="text-2xl font-semibold">
          Conferido neste estudo
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed">
          Os {formatInt(secoes)} boletins de urna de cada turno foram baixados do Portal de Dados Abertos do TSE, com o
          hash SHA-512 de cada arquivo verificado, e somados seção por seção. O resultado bate com o total divulgado em
          todos os estados.{" "}
          <Link href="/metodologia" className="text-accent hover:text-accent-soft">
            Veja como foi feito
          </Link>
          .
        </p>
      </section>

      <NextSection current="/sistema" />
    </>
  );
}
