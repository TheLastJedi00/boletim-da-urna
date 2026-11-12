import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export const metadata: Metadata = { title: "Pesquisas × urna" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Projeções e margens de erro" title="Pesquisas × urna" />
      <NextSection current="/pesquisas" />
    </>
  );
}
