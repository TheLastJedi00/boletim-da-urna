import { notFound } from "next/navigation";
import { PageHeader } from "@/app/_components/page-header";
import { UFS, isUf } from "@/lib/ufs";

export function generateStaticParams() {
  return UFS.map((u) => ({ uf: u.sigla.toLowerCase() }));
}

export default async function Page({ params }: PageProps<"/resultados/[uf]">) {
  const { uf } = await params;
  if (!isUf(uf)) notFound();
  const info = UFS.find((u) => u.sigla.toLowerCase() === uf)!;
  return <PageHeader eyebrow="Resultados por UF" title={info.nome} />;
}
