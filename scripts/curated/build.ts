/**
 * npm run pesquisas — valida data/curated/*.csv e gera data/snapshots/pesquisas.json:
 * pesquisas em votos válidos, série da projeção (média ponderada) dia a dia, avaliação × urna e notícias.
 * Falha se houver erro de validação; avisos são impressos.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCuratedCsv, validateNoticias, validatePesquisas, JANELA_PESQUISAS, type NoticiaRow, type PesquisaRow } from "../../lib/polls/curated";
import { avaliarPesquisas, projetar, toValidos, type Pesquisa } from "../../lib/polls/model";
import { writeJson } from "../ingest/writer";

type OfficialBr = { totals: { votos: Record<string, number> }; candidatos: { numero: number; nome: string; partido: string }[] };

function validosReais(br: OfficialBr): Record<number, number> {
  const total = Object.values(br.totals.votos).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(br.totals.votos).map(([n, v]) => [+n, (v / total) * 100]));
}

function diasEntre(a: string, b: string): string[] {
  const out: string[] = [];
  for (let d = Date.parse(a); d <= Date.parse(b); d += 86_400_000) out.push(new Date(d).toISOString().slice(0, 10));
  return out;
}

export async function buildPesquisas(root = ".") {
  const pRows = parseCuratedCsv(await readFile(join(root, "data/curated/pesquisas.csv"), "utf8")) as PesquisaRow[];
  const nRows = parseCuratedCsv(await readFile(join(root, "data/curated/noticias.csv"), "utf8")) as NoticiaRow[];
  const vp = validatePesquisas(pRows);
  const vn = validateNoticias(nRows);
  const erros = [...vp.erros, ...vn.erros];
  if (erros.length) throw new Error(`Curadoria inválida:\n- ${erros.join("\n- ")}`);

  const resultados = JSON.parse(await readFile(join(root, "data/snapshots/resultados.json"), "utf8"));
  const turnos: Record<string, unknown> = {};
  for (const t of [1, 2] as const) {
    const br: OfficialBr = resultados.turnos[t].br;
    const real = validosReais(br);
    const doTurno = vp.pesquisas.filter((p) => p.turno === t);
    const [ini, fim] = JANELA_PESQUISAS[t];
    const serie = diasEntre(ini, fim)
      .map((d) => projetar(doTurno, { dataReferencia: d }))
      .filter((p) => p.pesquisasUsadas > 0)
      .map((p) => ({ data: p.dataReferencia, valores: p.valores, intervalo: p.intervalo, pesquisas: p.pesquisasUsadas }));
    const final = projetar(doTurno, { dataReferencia: fim });
    const avaliacoes = avaliarPesquisas(ultimaPorInstituto(doTurno), real);
    turnos[t] = {
      real,
      candidatos: br.candidatos,
      pesquisas: doTurno.map((p) => ({ ...p, validos: toValidos(p) })),
      serie,
      projecaoFinal: final,
      avaliacoes,
      resumo: {
        institutos: avaliacoes.length,
        acertaramDentroDaMargem: avaliacoes.filter((a) => a.acertou).length,
        indicaramVencedorCorreto: avaliacoes.filter((a) => a.vencedorCorreto).length,
      },
    };
  }
  const out = await writeJson(join(root, "data/snapshots/pesquisas.json"), {
    geradoEm: new Date().toISOString(),
    metodo: {
      pesos: "0,5^(idade em dias / 7) × √(amostra / 1000), última pesquisa de cada instituto",
      intervalo: "±1,96 · √(erro amostral² + dispersão entre institutos²)",
      validos: "percentuais redistribuídos excluindo indecisos, brancos e nulos; margem recalculada pela amostra efetiva",
    },
    turnos,
    noticias: vn.noticias,
  });
  return { out, avisos: vp.avisos };
}

function ultimaPorInstituto(ps: Pesquisa[]): Pesquisa[] {
  const m = new Map<string, Pesquisa>();
  for (const p of ps) if (!m.has(p.instituto) || p.campoFim > m.get(p.instituto)!.campoFim) m.set(p.instituto, p);
  return [...m.values()].sort((a, b) => a.instituto.localeCompare(b.instituto));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/curated/build.ts")) {
  buildPesquisas()
    .then(({ out, avisos }) => {
      if (avisos.length) console.log(`${avisos.length} aviso(s):\n- ${avisos.slice(0, 10).join("\n- ")}${avisos.length > 10 ? "\n- …" : ""}`);
      console.log(`OK: ${out.path} (${(out.bytes / 1024).toFixed(0)} KB)`);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
