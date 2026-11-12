/**
 * Malhas do IBGE (qualidade mínima) para os mapas: UFs do Brasil e municípios por UF.
 *   npm run geo   → public/geo/br-uf.json e public/geo/mun/<UF>.json
 */
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import { join } from "node:path";
import { writeJson } from "../ingest/writer";

export const IBGE_UF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

type Pos = number[];
type Geometry = { type: string; coordinates: unknown };
type FC = { type: string; features: { type: string; properties: Record<string, unknown>; geometry: Geometry }[] };

export function roundCoords(ring: Pos[], digits = 3): Pos[] {
  const f = 10 ** digits;
  const out: Pos[] = [];
  for (const [x, y] of ring) {
    const p = [Math.round(x * f) / f, Math.round(y * f) / f];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}

/** Arredonda um anel; se ele colapsar (ilha minúscula), usa mais casas decimais. */
function roundRing(r: Pos[], digits: number): Pos[] {
  for (let d = digits; d <= 6; d++) {
    const out = roundCoords(r, d);
    if (out.length >= 4) return out;
  }
  return r;
}

function roundGeometry(g: Geometry, digits: number): Geometry {
  if (g.type === "Polygon") return { type: g.type, coordinates: (g.coordinates as Pos[][]).map((r) => roundRing(r, digits)) };
  if (g.type === "MultiPolygon")
    return { type: g.type, coordinates: (g.coordinates as Pos[][][]).map((p) => p.map((r) => roundRing(r, digits))) };
  return g;
}

/**
 * O d3-geo trabalha na esfera e espera o anel externo no sentido horário; a malha do IBGE segue a
 * RFC 7946 (anti-horário). Se a área ficar maior que um hemisfério, inverte os anéis.
 */
function orientar(g: Geometry): Geometry {
  const reverse = (rings: Pos[][]) => rings.map((r) => [...r].reverse());
  if (g.type === "Polygon") {
    const area = geoArea({ type: "Polygon", coordinates: g.coordinates } as never);
    return area > 2 * Math.PI ? { type: g.type, coordinates: reverse(g.coordinates as Pos[][]) } : g;
  }
  if (g.type === "MultiPolygon") {
    return {
      type: g.type,
      coordinates: (g.coordinates as Pos[][][]).map((p) =>
        geoArea({ type: "Polygon", coordinates: p } as never) > 2 * Math.PI ? reverse(p) : p,
      ),
    };
  }
  return g;
}

export function normalizeCollection(fc: FC, id: (codarea: string) => string, digits = 3) {
  return {
    type: "FeatureCollection" as const,
    features: fc.features.map((f) => ({
      type: "Feature" as const,
      properties: { id: id(String(f.properties.codarea)) },
      geometry: orientar(roundGeometry(f.geometry, digits)) as { type: string; coordinates: Pos[][] },
    })),
  };
}

/**
 * Simplifica a malha preservando as fronteiras compartilhadas (TopoJSON / Visvalingam).
 * `manter` = fração dos pontos mais relevantes que permanece.
 */
export function simplificar(fc: FC, manter = 0.35): FC {
  const topo = presimplify(topology({ m: fc as never }) as never);
  const simples = simplify(topo, quantile(topo, 1 - manter));
  const out = feature(simples, simples.objects.m as never) as unknown as FC;
  // áreas minúsculas (ilhas) podem sumir na simplificação: mantém a geometria original
  out.features = out.features.map((f, i) => (f.geometry ? f : { ...f, geometry: fc.features[i].geometry }));
  return out;
}

const API = "https://servicodados.ibge.gov.br/api/v3/malhas";
const QS = "formato=application/vnd.geo%2Bjson&qualidade=minima";

async function get(url: string): Promise<FC> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return (await res.json()) as FC;
}

async function main() {
  const out = "public/geo";
  const br = await get(`${API}/paises/BR?${QS}&intrarregiao=UF`);
  await writeJson(join(out, "br-uf.json"), normalizeCollection(br, (c) => IBGE_UF[c]));
  for (const uf of Object.values(IBGE_UF)) {
    const fc = await get(`${API}/estados/${uf}?${QS}&intrarregiao=municipio`);
    const r = await writeJson(join(out, "mun", `${uf}.json`), normalizeCollection(simplificar(fc), (c) => c, 2));
    console.log(uf, fc.features.length, "municípios", (r.bytes / 1024).toFixed(0), "KB");
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/geo/geo.ts")) main();
