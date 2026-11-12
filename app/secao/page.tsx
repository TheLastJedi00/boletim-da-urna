import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export const metadata: Metadata = { title: "Confira uma seção" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Boletim de urna" title="Confira uma seção" />
      <NextSection current="/secao" />
    </>
  );
}
