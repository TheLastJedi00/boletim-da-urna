"use client";

import { BarList } from "@/app/_components/charts/bar-list";
import { nomeCandidato } from "@/lib/candidatos";
import type { SectionRecord } from "@/lib/data-types";
import { NEUTRAL_COLORS } from "@/lib/party-colors";
import { auxUrl } from "@/lib/secao-links";

export type CandidatoInfo = { numero: number; nome: string; partido: string; cor?: string };

const hora = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 19)}` : "—");
const int = (n: number) => n.toLocaleString("pt-BR");

/** O boletim de urna de uma seção, no formato de um BU impresso, com links para os arquivos oficiais. */
export function BoletimSecao({
  secao: s,
  turno,
  municipio,
  candidatos,
}: {
  secao: SectionRecord;
  turno: 1 | 2;
  municipio: string;
  candidatos: CandidatoInfo[];
}) {
  const nominais = candidatos
    .filter((c) => c.numero in s.votos)
    .map((c) => ({ ...c, votos: s.votos[c.numero] }))
    .sort((a, b) => b.votos - a.votos);
  const totalNominais = nominais.reduce((a, c) => a + c.votos, 0);
  const confere = totalNominais + s.brancos + s.nulos === s.comparecimento && s.aptos - s.comparecimento === s.abstencoes;
  const aux = auxUrl(turno, s.uf, s.cdMunicipio, s.zona, s.secao);

  return (
    <article className="grid gap-6 lg:grid-cols-[1.3fr_1fr]" aria-label="Boletim de urna da seção">
      <div className="card p-5 sm:p-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-faint">Boletim de urna · Presidente · {turno}º turno</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {municipio} ({s.uf})
            </h2>
          </div>
          <p className="font-mono text-sm">
            Zona {s.zona} · Seção {s.secao}
          </p>
        </header>

        <div className="mt-5">
          <BarList
            total={s.comparecimento}
            data={[
              ...nominais.map((c) => ({
                key: String(c.numero),
                label: nomeCandidato(c.numero, c.nome),
                note: `${c.partido} · ${c.numero}`,
                value: c.votos,
                color: c.cor ?? NEUTRAL_COLORS.outros,
              })),
              { key: "b", label: "Brancos", value: s.brancos, color: NEUTRAL_COLORS.brancos },
              { key: "n", label: "Nulos", value: s.nulos, color: NEUTRAL_COLORS.nulos },
            ]}
          />
          <p className="mt-3 text-xs text-faint">Percentuais sobre os votos registrados na seção (comparecimento).</p>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            ["Aptos", s.aptos],
            ["Compareceram", s.comparecimento],
            ["Faltaram", s.abstencoes],
          ].map(([k, v]) => (
            <div key={k} className="well p-3">
              <dt className="text-xs text-faint">{k}</dt>
              <dd className="font-mono text-lg text-paper">{int(v as number)}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-4 text-sm ${confere ? "text-paper" : "text-sim"}`}>
          {confere
            ? "✓ As contas fecham: votos + brancos + nulos = comparecimento, e aptos − comparecimento = faltas."
            : "As contas desta seção não fecham — este é exatamente o tipo de caso que deve ser checado."}
        </p>
      </div>

      <div className="space-y-6">
        <div className="card p-5 sm:p-6">
          <h3 className="font-medium">Registro da urna</h3>
          <dl className="mt-3 space-y-2 font-mono text-sm">
            <Linha k="Urna nº" v={s.nrUrna ? String(s.nrUrna) : "—"} />
            <Linha k="Carga" v={hora(s.dtCarga)} />
            <Linha k="Abertura" v={hora(s.dtAbertura)} />
            <Linha k="Encerramento" v={hora(s.dtEncerramento)} />
            <Linha k="Emissão do BU" v={hora(s.dtEmissaoBu)} />
            <Linha k="BU recebido pelo TSE" v={hora(s.dtBuRecebido)} />
            <Linha k="Liberados sem biometria" v={int(s.eleitoresSemBiometria)} />
            {s.secoesAgregadas.length > 0 && <Linha k="Seções agregadas" v={s.secoesAgregadas.join(", ")} />}
          </dl>
          <p className="mt-3 text-xs text-faint">Horários locais. {s.tipoUrna === "Apurada" ? "Urna apurada normalmente." : `Situação: ${s.tipoUrna}.`}</p>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-medium">Confira na fonte oficial</h3>
          <p className="mt-2 text-sm leading-relaxed">
            O TSE publica, para cada seção, um índice com o hash e os arquivos originais assinados pela urna: o boletim
            (<span className="font-mono">-bu.dat</span>), o registro digital do voto (
            <span className="font-mono">-rdv.dat</span>) e o log (<span className="font-mono">-log.jez</span>).
          </p>
          <a
            href={aux}
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-raised hover:bg-accent-deep"
          >
            Abrir o índice oficial desta seção <span aria-hidden>↗</span>
          </a>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Para baixar um arquivo, acrescente ao endereço da pasta o <span className="font-mono">hash</span> e o nome
            do arquivo listados no índice. Os números desta página vêm do arquivo de boletins publicado no Portal de
            Dados Abertos do TSE.
          </p>
        </div>
      </div>
    </article>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/40 pb-1.5">
      <dt className="font-sans text-faint">{k}</dt>
      <dd className="text-right text-paper">{v}</dd>
    </div>
  );
}
