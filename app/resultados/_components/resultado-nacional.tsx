import { BarList } from "@/app/_components/charts/bar-list";
import { Figure } from "@/app/_components/charts/figure";
import { nomeCandidato } from "@/lib/candidatos";
import type { TurnoResultado } from "@/lib/data/snapshots";
import { formatInt, formatPct } from "@/lib/format";
import { NEUTRAL_COLORS, colorForParty } from "@/lib/party-colors";
import { ranking } from "@/lib/results";

export function ResultadoNacional({ t, turno }: { t: TurnoResultado; turno: 1 | 2 }) {
  const tot = t.br.totals;
  const r = ranking(tot, t.br.candidatos);
  const principais = r.filter((c) => c.validos >= 0.01);
  const outros = r.filter((c) => c.validos < 0.01);
  const somaOutros = outros.reduce((s, c) => s + c.votos, 0);
  const validosTotal = r.reduce((s, c) => s + c.votos, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Figure
        title={`Votos válidos — ${turno}º turno`}
        description={`${formatInt(validosTotal)} votos válidos (excluídos brancos e nulos), como o TSE calcula o resultado.`}
        source="TSE, totalização oficial (resultados.tse.jus.br), conferida com a soma dos boletins de urna."
      >
        <BarList
          total={validosTotal}
          data={[
            ...principais.map((c) => ({
              key: String(c.numero),
              label: nomeCandidato(c.numero, c.nome),
              note: `${c.partido} · ${c.numero}${c.situacao === "Eleito" ? " · eleito" : ""}`,
              value: c.votos,
              color: colorForParty(c.partido),
            })),
            ...(somaOutros
              ? [{ key: "outros", label: `Outros ${outros.length} candidatos`, value: somaOutros, color: NEUTRAL_COLORS.outros }]
              : []),
          ]}
        />
      </Figure>

      <Figure title="Quem foi votar" source="TSE, totalização oficial.">
        <BarList
          total={tot.aptos}
          data={[
            { key: "validos", label: "Votos válidos", value: validosTotal, color: "var(--color-paper)" },
            { key: "brancos", label: "Brancos", value: tot.brancos, color: NEUTRAL_COLORS.brancos },
            { key: "nulos", label: "Nulos", value: tot.nulos + tot.nulosTecnicos, color: NEUTRAL_COLORS.nulos, note: tot.nulosTecnicos ? `inclui ${formatInt(tot.nulosTecnicos)} anulados` : undefined },
            { key: "abstencao", label: "Abstenção", value: tot.abstencoes, color: NEUTRAL_COLORS.abstencao },
          ]}
        />
        <p className="mt-4 text-sm">
          Percentuais sobre os {formatInt(tot.aptos)} eleitores aptos. Comparecimento: {formatPct(tot.comparecimento / tot.aptos)}.
        </p>
      </Figure>
    </div>
  );
}
