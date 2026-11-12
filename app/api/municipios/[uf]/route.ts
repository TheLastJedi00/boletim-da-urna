import { UFS, isUf } from "@/lib/ufs";
import { getMunicipios } from "@/lib/data/snapshots";

export function generateStaticParams() {
  return UFS.map((u) => ({ uf: u.sigla.toLowerCase() }));
}

async function lista(uf: string) {
  "use cache";
  const { municipios } = await getMunicipios(uf);
  return municipios
    .filter((m) => m.turnos["1"] || m.turnos["2"])
    .map((m) => ({ codigo: m.codigo, nome: m.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Lista de municípios (código TSE e nome) de uma UF — gerada estaticamente no build. */
export async function GET(_req: Request, ctx: RouteContext<"/api/municipios/[uf]">) {
  const { uf } = await ctx.params;
  if (!isUf(uf)) return new Response("UF inválida", { status: 404 });
  return Response.json(await lista(uf));
}
