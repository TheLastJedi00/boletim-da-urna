"use client";

import { scaleLinear, scaleTime } from "d3-scale";
import { line as d3line, area as d3area } from "d3-shape";
import { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@/app/_components/charts/axes";
import { Legend } from "@/app/_components/charts/legend";
import { Tooltip } from "@/app/_components/charts/tooltip";

export type PontoPesquisa = {
  id: string;
  instituto: string;
  data: string;
  amostra: number;
  url: string;
  valores: Record<number, number>;
  margem: Record<number, number>;
};
export type SerieDia = { data: string; valores: Record<number, number>; intervalo: Record<number, [number, number]> };
export type MarcoNoticia = { n: number; data: string; titulo: string };
export type CandidatoSerie = { numero: number; nome: string; cor: string };

const W = 760;
const H = 360;
const M = { top: 16, right: 16, bottom: 32, left: 40 };
const d = (s: string) => new Date(`${s}T12:00:00`);
const fmtDia = (v: Date) => v.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/**
 * Pontos = pesquisas (votos válidos) com barra de margem de erro; linha = projeção ponderada com
 * faixa de incerteza; tracejado = resultado oficial; marcadores numerados = notícias.
 */
export function LinhaDoTempo({
  pesquisas,
  serie,
  candidatos,
  real,
  noticias,
  dominio,
  diaEleicao,
}: {
  pesquisas: PontoPesquisa[];
  serie: SerieDia[];
  candidatos: CandidatoSerie[];
  real: Record<number, number>;
  noticias: MarcoNoticia[];
  dominio: [number, number];
  diaEleicao: string;
}) {
  const institutos = useMemo(() => [...new Set(pesquisas.map((p) => p.instituto))].sort(), [pesquisas]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [hover, setHover] = useState<{ x: number; y: number; p: PontoPesquisa } | null>(null);

  const datas = [...pesquisas.map((p) => p.data), ...serie.map((s) => s.data), diaEleicao];
  const x = scaleTime()
    .domain([d(datas.reduce((a, b) => (a < b ? a : b))), d(diaEleicao)])
    .range([M.left, W - M.right]);
  const y = scaleLinear().domain(dominio).range([H - M.bottom, M.top]).nice();
  const visiveis = filtro === "todos" ? pesquisas : pesquisas.filter((p) => p.instituto === filtro);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend
          items={[
            ...candidatos.map((c) => ({ label: c.nome, color: c.cor })),
            { label: "Resultado oficial", color: "var(--color-paper)", dashed: true },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          Instituto
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="well rounded-lg bg-ink px-3 py-1.5 text-paper"
          >
            <option value="todos">Todos</option>
            {institutos.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Linha do tempo das pesquisas de intenção de voto em votos válidos, com projeção e resultado oficial">
          <AxisLeft scale={y} x={M.left} width={W - M.left - M.right} format={(v) => `${v}%`} />
          <AxisBottom scale={x} y={H - M.bottom} ticks={6} format={(v: Date) => fmtDia(v)} />

          {noticias.map((n) => (
            <g key={n.n} transform={`translate(${x(d(n.data))},0)`}>
              <line y1={M.top} y2={H - M.bottom} stroke="var(--color-line)" strokeDasharray="1 3" />
              <circle cy={M.top + 6} r={7} fill="var(--color-raised)" stroke="var(--color-line)" />
              <text y={M.top + 9.5} textAnchor="middle" className="fill-paper text-[9px]">
                {n.n}
              </text>
              <title>{n.titulo}</title>
            </g>
          ))}

          {candidatos.map((c) => {
            const pts = serie.filter((s) => c.numero in s.valores);
            const banda = d3area<SerieDia>()
              .x((s) => x(d(s.data)))
              .y0((s) => y(s.intervalo[c.numero][0]))
              .y1((s) => y(s.intervalo[c.numero][1]));
            const linha = d3line<SerieDia>()
              .x((s) => x(d(s.data)))
              .y((s) => y(s.valores[c.numero]));
            return (
              <g key={c.numero}>
                {filtro === "todos" && (
                  <>
                    <path d={banda(pts) ?? undefined} fill={c.cor} fillOpacity={0.12} />
                    <path d={linha(pts) ?? undefined} fill="none" stroke={c.cor} strokeWidth={2} />
                  </>
                )}
                <line
                  x1={x(d(diaEleicao)) - 26}
                  x2={x(d(diaEleicao))}
                  y1={y(real[c.numero])}
                  y2={y(real[c.numero])}
                  stroke="var(--color-paper)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                <circle cx={x(d(diaEleicao))} cy={y(real[c.numero])} r={4} fill="var(--color-paper)" stroke={c.cor} strokeWidth={2} />
              </g>
            );
          })}

          {visiveis.map((p) =>
            candidatos.map((c) =>
              c.numero in p.valores ? (
                <g key={`${p.id}-${c.numero}`} transform={`translate(${x(d(p.data))},0)`}>
                  <line
                    y1={y(p.valores[c.numero] - p.margem[c.numero])}
                    y2={y(p.valores[c.numero] + p.margem[c.numero])}
                    stroke={c.cor}
                    strokeOpacity={0.35}
                  />
                  <circle
                    cy={y(p.valores[c.numero])}
                    r={3.5}
                    fill={c.cor}
                    fillOpacity={0.85}
                    stroke="var(--color-surface)"
                    tabIndex={0}
                    onMouseEnter={() => setHover({ x: x(d(p.data)), y: y(p.valores[c.numero]), p })}
                    onFocus={() => setHover({ x: x(d(p.data)), y: y(p.valores[c.numero]), p })}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              ) : null,
            ),
          )}
        </svg>
        {hover && (
          <Tooltip x={`${(hover.x / W) * 100}%`} y={`${(hover.y / H) * 100}%`}>
            <p className="font-medium">{hover.p.instituto}</p>
            <p className="text-faint">
              campo até {fmtDia(d(hover.p.data))} · {hover.p.amostra.toLocaleString("pt-BR")} entrevistas
            </p>
            {candidatos.map((c) =>
              c.numero in hover.p.valores ? (
                <p key={c.numero} className="font-mono">
                  {c.nome}: {hover.p.valores[c.numero].toFixed(1).replace(".", ",")}% ± {hover.p.margem[c.numero].toFixed(1).replace(".", ",")}
                </p>
              ) : null,
            )}
          </Tooltip>
        )}
      </div>
    </div>
  );
}
