import { NextSection } from "@/app/_components/next-section";
import { PageHeader } from "@/app/_components/page-header";

export default function Home() {
  return (
    <>
      <PageHeader eyebrow="Estudo de caso · Eleição presidencial 2026" title="Boletim da Urna" />
      <NextSection current="/" />
    </>
  );
}
