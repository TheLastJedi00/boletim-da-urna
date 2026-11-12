/** Links para os arquivos oficiais de uma seção no site de resultados do TSE. */
const PLEITO: Record<1 | 2, number> = { 1: 3220, 2: 3221 };
const pad = (n: number, w: number) => String(n).padStart(w, "0");

export function auxUrl(turno: 1 | 2, uf: string, mun: number, zona: number, secao: number): string {
  const p = PLEITO[turno];
  const u = uf.toLowerCase();
  return (
    `https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/${p}/dados/${u}/${pad(mun, 5)}/${pad(zona, 4)}/${pad(secao, 4)}/` +
    `p${pad(p, 6)}-${u}-m${pad(mun, 5)}-z${pad(zona, 4)}-s${pad(secao, 4)}-aux.json`
  );
}

export const secoesUrl = (turno: 1 | 2, uf: string, mun: number) => `/data/secoes/${turno}/${uf.toUpperCase()}/${mun}.json.gz`;
