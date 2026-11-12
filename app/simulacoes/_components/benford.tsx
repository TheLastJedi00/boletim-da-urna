import { Figure } from "@/app/_components/charts/figure";
import { Legend } from "@/app/_components/charts/legend";
import type { SinaisTurno } from "@/lib/data/snapshots";
import { decodeSections } from "@/lib/section-codec";
import { benfordEsperado, primeirosDigitos } from "@/lib/signals/benford";

/** Mostra, com dados reais, por que a Lei de Benford não serve para votos por seção. */
export function Benford({ amostra }: { amostra: SinaisTurno["amostra"] }) {
  const secoes = decodeSections(amostra);
  const valores = secoes.flatMap((s) => Object.values(s.votos));
  const obs = primeirosDigitos(valores);
  const esp = benfordEsperado();
  const W = 560;
  const H = 200;
  const m = { top: 10, bottom: 26, left: 10, right: 10 };
  const bw = (W - m.left - m.right) / 9;
  const y = (v: number) => H - m.bottom - (v / 0.6) * (H - m.top - m.bottom);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Figure
        title="Primeiro dígito dos votos por seção × Lei de Benford"
        description={`${valores.length.toLocaleString("pt-BR")} contagens de votos (cada candidato em cada seção) de ${secoes.length.toLocaleString("pt-BR")} seções reais do 2º turno.`}
        source="Boletins de urna (TSE); cálculo deste estudo."
      >
        <Legend
          items={[
            { label: "Dados reais (íntegros)", color: "var(--color-accent-soft)" },
            { label: "Esperado pela Lei de Benford", color: "var(--color-paper)", dashed: true },
          ]}
        />
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Comparação entre a distribuição do primeiro dígito nos dados reais e a esperada pela Lei de Benford">
          {obs.map((v, i) => (
            <g key={i} transform={`translate(${m.left + i * bw},0)`}>
              <rect x={bw * 0.15} width={bw * 0.7} y={y(v)} height={H - m.bottom - y(v)} rx={2} fill="var(--color-accent-soft)" fillOpacity={0.85}>
                <title>{`Dígito ${i + 1}: ${(v * 100).toFixed(1)}% (Benford: ${(esp[i] * 100).toFixed(1)}%)`}</title>
              </rect>
              <text x={bw / 2} y={H - 8} textAnchor="middle" className="fill-faint text-[11px]">
                {i + 1}
              </text>
            </g>
          ))}
          <polyline
            points={esp.map((v, i) => `${m.left + i * bw + bw / 2},${y(v)}`).join(" ")}
            fill="none"
            stroke="var(--color-paper)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {esp.map((v, i) => (
            <circle key={i} cx={m.left + i * bw + bw / 2} cy={y(v)} r={3} fill="var(--color-paper)" />
          ))}
        </svg>
      </Figure>

      <div className="card p-6">
        <h3 className="text-xl font-medium">Por que a Lei de Benford não serve para eleições</h3>
        <div className="mt-3 space-y-3 leading-relaxed">
          <p>
            A Lei de Benford descreve números que variam por várias ordens de grandeza, como populações de cidades ou
            valores de faturas: neles, o dígito 1 aparece na frente em cerca de 30% das vezes.
          </p>
          <p>
            Votos por seção não são assim. Uma seção tem algumas centenas de eleitores, então a contagem de cada
            candidato fica quase sempre numa faixa estreita, de dois ou três dígitos. O primeiro dígito depende só de
            onde essa faixa cai, e não de qualquer manipulação.
          </p>
          <p>
            O gráfico mostra dados reais e íntegros “reprovando” no teste. É por isso que pesquisadores (por exemplo,
            Deckert, Myagkov e Ordeshook, <em>Political Analysis</em>, 2011) concluem que Benford não é um bom detector
            de fraude eleitoral, e alegações baseadas nele devem ser vistas com cautela.
          </p>
        </div>
      </div>
    </div>
  );
}
