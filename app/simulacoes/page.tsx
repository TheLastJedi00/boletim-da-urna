import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export const metadata: Metadata = { title: "Sinais de fraude: simulações hipotéticas" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Simulação hipotética" title="Sinais de fraude: simulações hipotéticas" />
      <NextSection current="/simulacoes" />
    </>
  );
}
