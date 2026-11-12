"use client";

import type { SectionRecord } from "@/lib/data-types";

export type CandidatoInfo = { numero: number; nome: string; partido: string; cor?: string };

/** Placeholder até a tarefa 9.2. */
export function BoletimSecao({ secao, turno }: { secao: SectionRecord; turno: 1 | 2; municipio: string; candidatos: CandidatoInfo[] }) {
  return (
    <p className="card p-6">
      Seção {secao.zona}/{secao.secao} ({turno}º turno) carregada.
    </p>
  );
}
