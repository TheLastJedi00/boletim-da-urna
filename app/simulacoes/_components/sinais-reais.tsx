import { Figure } from "@/app/_components/charts/figure";
import { Histogram } from "@/app/_components/charts/histogram";
import type { SinaisTurno } from "@/lib/data/snapshots";
import { formatInt, formatPct1 } from "@/lib/format";

const hora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}h${String(Math.round(min % 60)).padStart(2, "0")}`;

const MOTIVOS: Record<string, string> = {
  "carga-depois-da-abertura": "carga da urna registrada depois da abertura",
  "carga-fora-da-janela": "carga fora da janela oficial",
  "encerramento-antes-da-abertura": "encerramento antes da abertura",
  "bu-emitido-antes-do-encerramento": "BU emitido antes do encerramento",
};

export function SinaisReais({ s, turno }: { s: SinaisTurno; turno: 1 | 2 }) {
  const p = (n: number) => formatPct1(n / s.secoes);
  const baixo = s.comparecimento.top.filter((d) => d.z < 0).length;
  const motivos = Object.entries(s.horario.porMotivo);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Numero
          valor={formatInt(s.impossiveis.total)}
          rotulo="seções aritmeticamente impossíveis (mais votos que eleitores ou contas que não fecham)"
          destaque
        />
        <Numero
          valor={formatInt(s.comparecimento.outliers)}
          rotulo={`seções com comparecimento fora do padrão do estado (${p(s.comparecimento.outliers)})`}
        />
        <Numero
          valor={formatInt(s.biometria.outliers)}
          rotulo={`seções com muitas liberações sem biometria (${p(s.biometria.outliers)})`}
        />
      </div>

      <Figure
        title="Comparecimento por seção"
        description={`Distribuição das ${formatInt(s.secoes)} seções do ${turno}º turno (fora o exterior). Em âmbar, as faixas extremas.`}
        source="Boletins de urna (TSE); cálculo deste estudo."
      >
        <Histogram
          bins={s.comparecimento.histograma}
          formatX={(v) => `${Math.round(v * 100)}%`}
          label="Histograma do comparecimento por seção"
          marcar={(b) => b.x1 <= 0.4 || b.x0 >= 0.98}
        />
        <p className="mt-4 text-sm leading-relaxed">
          A maioria das seções fica perto da média do seu estado. Entre os casos mais extremos, {baixo} de{" "}
          {s.comparecimento.top.length} são de comparecimento <em>baixo</em>, o oposto do que uma urna “enchida”
          mostraria. Seções em presídios, hospitais e unidades de internação, ou com muitos eleitores que mudaram de
          cidade, costumam explicar esses casos.
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent">Ver as seções mais fora do padrão</summary>
          <TabelaDestaques
            linhas={s.comparecimento.top.slice(0, 12).map((d) => ({ ...d, valorFmt: formatPct1(d.valor) }))}
            rotulo="Comparecimento"
          />
        </details>
      </Figure>

      <Figure
        title="Eleitores liberados sem biometria"
        description="Proporção, em cada seção, de eleitores com digital cadastrada que votaram sem a confirmação biométrica, após o mesário conferir o documento."
        source="Campo QT_ELEI_BIOM_SEM_HABILITACAO dos boletins de urna (TSE); cálculo deste estudo."
      >
        <Histogram
          bins={s.biometria.histograma}
          formatX={(v) => `${Math.round(v * 100)}%`}
          label="Histograma da taxa de liberação sem biometria"
          marcar={(b) => b.x0 >= 0.3}
        />
        <p className="mt-4 text-sm leading-relaxed">
          Leitor com defeito, digitais desgastadas (comum entre idosos e trabalhadores braçais) e falhas de cadastro
          explicam a maior parte das liberações. Os {s.biometria.totalMunicipiosForaDoPadrao} municípios com taxa muito
          acima dos demais são justamente os que uma auditoria deveria olhar primeiro, e é isso que este sinal permite.
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent">Ver as seções com mais liberações</summary>
          <TabelaDestaques
            linhas={s.biometria.top.slice(0, 12).map((d) => ({ ...d, valorFmt: formatPct1(d.valor) }))}
            rotulo="Sem biometria"
          />
        </details>
      </Figure>

      <Figure
        title="Horário de encerramento das urnas"
        description="Horário local em que cada urna encerrou a votação. A votação termina às 17h de Brasília, mas quem já está na fila tem direito de votar."
        source="Campo DT_ENCERRAMENTO dos boletins de urna (TSE)."
      >
        <Histogram
          bins={s.horario.histogramaEncerramento}
          formatX={hora}
          label="Histograma do horário de encerramento"
          ticks={10}
        />
        <p className="mt-4 text-sm leading-relaxed">
          Os fusos explicam picos em horários diferentes, e as filas explicam a cauda à direita.
          {turno === 2 &&
            " No 2º turno, a votação foi prorrogada nas seções ainda abertas às 17h por decisão do STF (veja as notícias em Pesquisas × urna); menos de 35 mil votos foram registrados depois do horário."}
        </p>
        {motivos.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {motivos.map(([m, n]) => (
              <li key={m}>
                <span className="font-mono text-paper">{n}</span> seção(ões) com {MOTIVOS[m] ?? m}: são urnas de
                contingência, que substituem urnas com defeito durante o dia e por isso são carregadas na hora.
              </li>
            ))}
          </ul>
        )}
      </Figure>

      <aside className="card border-l-4 border-sim p-6">
        <h3 className="text-xl font-medium">Fora do padrão não é prova de fraude</h3>
        <p className="mt-2 leading-relaxed">
          Em quase 500 mil seções sempre haverá casos extremos, por acaso ou por motivos conhecidos. Um sinal
          estatístico diz <em>onde olhar</em>; a resposta vem da verificação: o boletim impresso, a ata da seção, o log
          da urna. O que não aparece em nenhum dos turnos é a marca de uma fraude grosseira: nenhuma seção tem mais
          votos que eleitores, e a soma dos boletins bate com o total oficial.
        </p>
      </aside>
    </div>
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

function TabelaDestaques({
  linhas,
  rotulo,
}: {
  linhas: { uf: string; municipio: string; zona: number; secao: number; valorFmt: string; z: number }[];
  rotulo: string;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[30rem]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-faint">
            <th className="px-2 py-1">UF</th>
            <th className="px-2 py-1">Município</th>
            <th className="px-2 py-1">Zona/Seção</th>
            <th className="px-2 py-1 text-right">{rotulo}</th>
            <th className="px-2 py-1 text-right">z robusto</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={`${l.uf}-${l.municipio}-${l.zona}-${l.secao}`} className="border-t border-line/40">
              <td className="px-2 py-1 font-mono">{l.uf}</td>
              <td className="px-2 py-1">{l.municipio}</td>
              <td className="px-2 py-1 font-mono">
                {l.zona}/{l.secao}
              </td>
              <td className="px-2 py-1 text-right font-mono">{l.valorFmt}</td>
              <td className="px-2 py-1 text-right font-mono">{l.z.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
