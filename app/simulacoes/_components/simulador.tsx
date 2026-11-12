"use client";

import { useMemo, useState } from "react";
import { SimBadge } from "@/app/_components/charts/figure";
import type { SectionRecord } from "@/lib/data-types";
import { decodeSections, type EncodedSections } from "@/lib/section-codec";
import { CENARIOS, simular, type Cenario } from "@/lib/simulation/engine";

export type CandidatoSim = { numero: number; nome: string; cor: string };

const pct = (v: number) => `${(v * 100).toFixed(2).replace(".", ",")}%`;
const int = (v: number) => v.toLocaleString("pt-BR");

export function Simulador({
  amostra,
  candidatos,
}: {
  amostra: EncodedSections & { ufs: string[] };
  candidatos: CandidatoSim[];
}) {
  const secoes: SectionRecord[] = useMemo(
    () => decodeSections(amostra).map((s, i) => ({ ...s, uf: amostra.ufs[i] })),
    [amostra],
  );
  const totalVotos = useMemo(
    () => secoes.reduce((s, x) => s + Object.values(x.votos).reduce((a, b) => a + b, 0), 0),
    [secoes],
  );

  const [id, setId] = useState<(typeof CENARIOS)[number]["id"]>("encher-urna");
  const [favorecido, setFavorecido] = useState(candidatos[0].numero);
  const [params, setParams] = useState<Record<string, number>>({});
  const cat = CENARIOS.find((c) => c.id === id)!;

  const limites = (campo: string, max: number) =>
    id === "trocar-na-totalizacao" && campo === "votos" ? Math.round(totalVotos * 0.1) : max;
  const valor = (campo: string) =>
    params[`${id}.${campo}`] ??
    Math.min((cat.padrao as unknown as Record<string, number>)[campo], limites(campo, Number.POSITIVE_INFINITY));

  const cenario: Cenario = useMemo(() => {
    const base = { ...cat.padrao } as Record<string, unknown>;
    for (const p of cat.parametros) base[p.campo] = valor(p.campo);
    if ("candidato" in base) base.candidato = favorecido;
    if (id === "trocar-na-totalizacao") {
      base.para = favorecido;
      base.de = candidatos.find((c) => c.numero !== favorecido)!.numero;
    }
    return base as Cenario;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, favorecido, params]);

  const r = useMemo(() => simular(secoes, cenario, { seed: 2026, dia: amostra.dia }), [secoes, cenario, amostra.dia]);

  const validos = (t: typeof r.resultadoReal, n: number) => {
    const tot = candidatos.reduce((s, c) => s + (t.votos[c.numero] ?? 0), 0);
    return tot ? (t.votos[n] ?? 0) / tot : 0;
  };
  const lider = (t: typeof r.resultadoReal) =>
    [...candidatos].sort((a, b) => (t.votos[b.numero] ?? 0) - (t.votos[a.numero] ?? 0))[0].numero;
  const virou = lider(r.resultadoReal) !== lider(r.resultadoDivulgado);
  // Com seções alteradas: sinais que pegam ao menos 1/4 delas. Sem seção alterada (fraude no total):
  // só os controles globais — os outliers naturais da amostra não têm relação com a fraude simulada.
  const relevantes = r.deteccoes.filter((d) =>
    r.alvos.length ? d.alvosDetectados / r.alvos.length >= 0.25 : d.detectado && d.secoesApontadas === 0,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="card p-5 sm:p-6">
        <fieldset>
          <legend className="text-sm font-medium text-paper">1. Escolha a fraude hipotética</legend>
          <div className="mt-3 space-y-2">
            {CENARIOS.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${id === c.id ? "bg-raised text-paper shadow-raised" : "hover:bg-raised/60"}`}
              >
                <input type="radio" name="cenario" value={c.id} checked={id === c.id} onChange={() => setId(c.id)} className="accent-[var(--color-sim)]" />
                {c.titulo}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6 space-y-4">
          <legend className="text-sm font-medium text-paper">2. Ajuste a intensidade</legend>
          {("candidato" in cat.padrao || id === "trocar-na-totalizacao") && (
            <label className="block text-sm">
              A favor de
              <select
                value={favorecido}
                onChange={(e) => setFavorecido(Number(e.target.value))}
                className="well mt-1 block w-full rounded-lg bg-ink px-3 py-2 text-paper"
              >
                {candidatos.map((c) => (
                  <option key={c.numero} value={c.numero}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          {cat.parametros.map((p) => {
            const max = limites(p.campo, p.max);
            return (
              <label key={p.campo} className="block text-sm">
                <span className="flex justify-between">
                  {p.rotulo}
                  <span className="font-mono text-paper">{int(valor(p.campo))}</span>
                </span>
                <input
                  type="range"
                  min={p.min}
                  max={max}
                  step={id === "trocar-na-totalizacao" ? Math.max(1, Math.round(max / 100)) : p.passo}
                  value={valor(p.campo)}
                  onChange={(e) => setParams((s) => ({ ...s, [`${id}.${p.campo}`]: Number(e.target.value) }))}
                  className="mt-2 w-full accent-[var(--color-sim)]"
                />
              </label>
            );
          })}
          <p className="text-xs leading-relaxed text-faint">
            A simulação roda no seu navegador sobre {int(secoes.length)} seções reais do 2º turno, sorteadas de todo o
            país. Os dados originais não são alterados.
          </p>
        </fieldset>
      </div>

      <div className="card space-y-6 p-5 ring-1 ring-sim/40 sm:p-6" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-medium">{cat.titulo}</h3>
          <SimBadge />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Como seria feito</p>
          <p className="mt-1 leading-relaxed">{cat.comoSeria}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Efeito no resultado da amostra (votos válidos)</p>
          <ul className="mt-2 space-y-2">
            {candidatos.map((c) => {
              const a = validos(r.resultadoReal, c.numero);
              const b = validos(r.resultadoDivulgado, c.numero);
              return (
                <li key={c.numero} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-paper">{c.nome}</span>
                    <span className="font-mono">
                      {pct(a)} → <span className="text-sim">{pct(b)}</span>
                    </span>
                  </div>
                  <div className="well relative mt-1 h-2.5 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-xl opacity-40" style={{ width: `${a * 100}%`, backgroundColor: c.cor }} />
                    <div className="sim-hatch absolute inset-y-0 left-0 rounded-xl border-r-2" style={{ width: `${b * 100}%`, borderColor: c.cor }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {virou && <p className="mt-2 text-sm text-sim">Nesta amostra, a fraude simulada inverteria o vencedor.</p>}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-faint">O que denunciaria a fraude</p>
          <ul className="mt-2 space-y-3">
            {relevantes.length === 0 && <li className="text-sm">Nenhum sinal disparado.</li>}
            {relevantes.map((d) => (
              <li key={d.sinal} className="well p-3 text-sm">
                <p className="flex items-center gap-2 text-paper">
                  <span aria-hidden className={d.detectado ? "text-sim" : "text-faint"}>
                    {d.detectado ? "●" : "○"}
                  </span>
                  {d.titulo}
                </p>
                <p className="mt-1 text-xs text-faint">
                  {r.alvos.length
                    ? `${int(d.alvosDetectados)} de ${int(r.alvos.length)} seções alteradas apontadas · ${int(d.falsosAlarmes)} seções normais também apontadas`
                    : d.detectado
                      ? "Divergência detectada no total"
                      : ""}
                </p>
                <p className="mt-1 text-xs">Controle: {d.controle}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Controles do sistema que barram esse caminho</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {cat.controles.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
