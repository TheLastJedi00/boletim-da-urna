import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export const metadata: Metadata = { title: "Metodologia e fontes" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Transparência" title="Metodologia e fontes" />
      <NextSection current="/metodologia" />
    </>
  );
}
