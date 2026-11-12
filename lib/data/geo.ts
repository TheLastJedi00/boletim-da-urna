import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import type { FeatureCollection, Geometry } from "geojson";

export type Geo = FeatureCollection<Geometry, { id: string }>;

async function load(rel: string): Promise<Geo> {
  "use cache";
  cacheLife("max");
  return JSON.parse(await readFile(join(process.cwd(), "public", "geo", rel), "utf8")) as Geo;
}

export const getGeoUfs = () => load("br-uf.json");
export const getGeoMunicipios = (uf: string) => load(`mun/${uf.toUpperCase()}.json`);
