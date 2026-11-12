import type { Metadata } from "next";
import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export const metadata: Metadata = { title: "Como funciona o sistema eleitoral" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Do voto ao resultado" title="Como funciona o sistema eleitoral" />
      <NextSection current="/sistema" />
    </>
  );
}
