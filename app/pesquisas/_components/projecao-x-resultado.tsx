import Link from "next/link";
import { Figure } from "@/app/_components/charts/figure";
import { nomeCandidato } from "@/lib/candidatos";
import type { PesquisasTurno } from "@/lib/data/snapshots";
import { formatDate } from "@/lib/format";
import { colorForParty } from "@/lib/party-colors";

const pp = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;
const sinal = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")}`;

export function ProjecaoXResultado({ tr, turno }: { tr: PesquisasTurno; turno: 1 | 2 }) {
  const top = Object.entries(tr.real)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([n]) => +n);
  const partido = (n: number) => tr.candidatos.find((c) => c.numero === n)?.partido ?? "";
  const urlDe = new Map(tr.pesquisas.map((p) => [p.id, p.url]));
  const { projecaoFinal: pf, resumo } = tr;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <Figure
        title="Projeção na véspera × urna"
        description={`Média ponderada das ${pf.pesquisasUsadas} últimas pesquisas de cada instituto, em votos válidos.`}
        source="Cálculo deste estudo sobre as pesquisas curadas; resultado oficial do TSE."
      >
        <ul className="space-y-5">
          {top.map((n) => {
            const [lo, hi] = pf.intervalo[n];
            const real = tr.real[n];
            const dentro = real >= lo && real <= hi;
            const x = (v: number) => `${((v - 35) / 25) * 100}%`;
            return (
              <li key={n}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-paper">{nomeCandidato(n)}</span>
                  <span className="font-mono text-xs">
                    projeção {pp(pf.valores[n])} · urna <span className="text-paper">{pp(real)}</span>
                  </span>
                </div>
                <div className="well relative mt-2 h-6">
                  <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                    style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})`, backgroundColor: colorForParty(partido(n)), opacity: 0.45 }}
                    title={`Faixa de incerteza: ${pp(lo)} a ${pp(hi)}`}
                  />
                  <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2" style={{ left: x(pf.valores[n]), backgroundColor: colorForParty(partido(n)) }} />
                  <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink" style={{ left: x(real) }} title={`Resultado: ${pp(real)}`} />
                </div>
                <p className="mt-1 text-xs text-faint">
                  Faixa {pp(lo)} a {pp(hi)} — o resultado ficou {dentro ? "dentro" : "fora"} da faixa.
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-xs text-faint">Escala de 35% a 60%. Círculo branco = resultado oficial.</p>
      </Figure>

      <Figure
        title={`Última pesquisa de cada instituto — ${turno}º turno`}
        description={`${resumo.acertaramDentroDaMargem} de ${resumo.institutos} ficaram dentro da própria margem de erro para todos os candidatos; ${resumo.indicaramVencedorCorreto} de ${resumo.institutos} apontaram o mais votado.`}
        source="Pesquisas: links na coluna Fonte. Margem recalculada em votos válidos (ver metodologia)."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-faint">
                <th className="px-2 py-2">Instituto</th>
                {top.map((n) => (
                  <th key={n} className="px-2 py-2 text-right">
                    {nomeCandidato(n)} <span className="normal-case">(erro)</span>
                  </th>
                ))}
                <th className="px-2 py-2">Na margem?</th>
                <th className="px-2 py-2">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {tr.avaliacoes.map((a) => (
                <tr key={a.id} className="border-t border-line/60">
                  <td className="px-2 py-2">
                    <span className="text-paper">{a.instituto}</span>
                    <span className="block text-xs text-faint">{formatDate(a.campoFim)}</span>
                  </td>
                  {top.map((n) => (
                    <td key={n} className="px-2 py-2 text-right font-mono tabular-nums">
                      {pp(a.valores[n])} <span className="text-xs text-faint">({sinal(a.erro[n])})</span>
                    </td>
                  ))}
                  <td className="px-2 py-2">{a.acertou ? <span className="text-paper">✓ sim</span> : <span className="text-faint">✗ não</span>}</td>
                  <td className="px-2 py-2">
                    <a href={urlDe.get(a.id)} className="text-accent hover:text-accent-soft" rel="noopener noreferrer">
                      ver ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Figure>

      <aside className="card p-6 lg:col-span-2">
        <h3 className="text-xl font-medium">Por que pesquisas erram — e por que isso não é sinal de fraude</h3>
        <div className="mt-3 grid gap-4 text-sm leading-relaxed md:grid-cols-3">
          <p>
            <span className="text-paper">Quem vai votar?</span> Os institutos precisam estimar quais entrevistados
            realmente vão comparecer. Se o modelo de comparecimento erra para um lado, o resultado inteiro desloca.
          </p>
          <p>
            <span className="text-paper">Amostra e recusas.</span> Parte dos eleitores não responde pesquisas, e isso
            pode variar entre grupos. A margem de erro só cobre o acaso da amostra, não esses vieses.
          </p>
          <p>
            <span className="text-paper">A urna é outra medida.</span> Pesquisa estima intenção; a urna conta votos. Aqui,
            a soma de cada boletim de urna bate com o total oficial —{" "}
            <Link href="/metodologia#reconciliacao" className="text-accent hover:text-accent-soft">
              veja a conferência
            </Link>
            . Um erro de pesquisa diz algo sobre a pesquisa, não sobre a contagem.
          </p>
        </div>
      </aside>
    </div>
  );
}
