import Link from "next/link";
import { Figure } from "@/app/_components/charts/figure";
import { Legend } from "@/app/_components/charts/legend";
import { nomeCandidato } from "@/lib/candidatos";
import type { Resultados } from "@/lib/data/snapshots";
import { formatPct1 } from "@/lib/format";
import { NEUTRAL_COLORS, colorForParty } from "@/lib/party-colors";
import { validos } from "@/lib/results";

/**
 * Para cada UF: votos válidos dos dois finalistas no 1º turno (círculo vazio) e no 2º (círculo cheio),
 * e a variação da abstenção. Mostra para onde foram os votos dos demais candidatos.
 */
export function ComparacaoTurnos({ turnos }: { turnos: Resultados["turnos"] }) {
  const finalistas = turnos["2"].br.candidatos.slice(0, 2);
  const ufs = Object.keys(turnos["2"].ufs)
    .filter((u) => u !== "ZZ")
    .map((uf) => {
      const a = turnos["1"].ufs[uf].calculado;
      const b = turnos["2"].ufs[uf].calculado;
      const va = validos(a);
      const vb = validos(b);
      return {
        uf,
        cands: finalistas.map((c) => ({ ...c, t1: va[c.numero] ?? 0, t2: vb[c.numero] ?? 0 })),
        abst1: a.abstencoes / a.aptos,
        abst2: b.abstencoes / b.aptos,
      };
    })
    .sort((x, y) => y.cands[0].t2 - y.cands[0].t1 - (x.cands[0].t2 - x.cands[0].t1));

  const W = 260;
  const x = (v: number) => 8 + v * (W - 16);

  return (
    <Figure
      title="Do 1º para o 2º turno, estado por estado"
      description="Votos válidos dos finalistas: círculo vazado = 1º turno, cheio = 2º turno. Ordenado pelo quanto o 1º colocado nacional cresceu."
      source="Soma dos boletins de urna dos dois turnos (TSE)."
    >
      <Legend
        items={[
          ...finalistas.map((c) => ({ label: nomeCandidato(c.numero), color: colorForParty(c.partido) })),
          { label: "Abstenção (1º → 2º)", color: NEUTRAL_COLORS.abstencao },
        ]}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-faint">
              <th className="px-2 py-2">UF</th>
              <th className="px-2 py-2">
                Votos válidos <span className="font-normal normal-case">(0% a 100%)</span>
              </th>
              {finalistas.map((c) => (
                <th key={c.numero} className="px-2 py-2 text-right">
                  {nomeCandidato(c.numero)}
                </th>
              ))}
              <th className="px-2 py-2 text-right">Abstenção</th>
            </tr>
          </thead>
          <tbody>
            {ufs.map((r) => (
              <tr key={r.uf} className="border-t border-line/40">
                <td className="px-2 py-1.5 font-mono">
                  <Link href={`/resultados/${r.uf.toLowerCase()}`} className="text-paper hover:text-accent">
                    {r.uf}
                  </Link>
                </td>
                <td className="px-2 py-1.5">
                  <svg viewBox={`0 0 ${W} 18`} className="h-5 w-full min-w-48" aria-hidden>
                    <line x1={x(0.5)} x2={x(0.5)} y1={0} y2={18} stroke="var(--color-line)" strokeDasharray="2 3" />
                    {r.cands.map((c) => (
                      <g key={c.numero} stroke={colorForParty(c.partido)} fill={colorForParty(c.partido)}>
                        <line x1={x(c.t1)} x2={x(c.t2)} y1={9} y2={9} strokeWidth={2} strokeOpacity={0.5} />
                        <circle cx={x(c.t1)} cy={9} r={4} fill="var(--color-surface)" strokeWidth={1.5} />
                        <circle cx={x(c.t2)} cy={9} r={4.5} />
                      </g>
                    ))}
                  </svg>
                </td>
                {r.cands.map((c) => (
                  <td key={c.numero} className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">
                    {formatPct1(c.t1)} → <span className="text-paper">{formatPct1(c.t2)}</span>
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">
                  {formatPct1(r.abst1)} → <span className="text-paper">{formatPct1(r.abst2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-relaxed">
        No 1º turno, os votos se dividiam entre 12 candidatos; no 2º, entre dois. A soma dos finalistas sobe em todos os
        estados porque recebe os eleitores dos candidatos eliminados — a comparação mostra para qual lado cada estado
        pendeu.
      </p>
    </Figure>
  );
}
