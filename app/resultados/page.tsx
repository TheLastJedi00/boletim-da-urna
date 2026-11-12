import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export const metadata: Metadata = { title: "Resultados oficiais" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Presidente 2026" title="Resultados oficiais" />
      <NextSection current="/resultados" />
    </>
  );
}
