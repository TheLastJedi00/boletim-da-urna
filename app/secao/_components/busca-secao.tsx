"use client";

import { useEffect, useMemo, useState } from "react";
import type { SectionRecord } from "@/lib/data-types";
import { decodeSections, type EncodedSections } from "@/lib/section-codec";
import { secoesUrl } from "@/lib/secao-links";
import { UFS } from "@/lib/ufs";
import { BoletimSecao, type CandidatoInfo } from "./boletim-secao";

type Municipio = { codigo: number; nome: string };

async function carregarSecoes(turno: 1 | 2, uf: string, mun: number): Promise<{ secoes: SectionRecord[]; candidatos: EncodedSections["candidatos"] }> {
  const res = await fetch(secoesUrl(turno, uf, mun));
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const json = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
  return { secoes: decodeSections(json as EncodedSections), candidatos: (json as EncodedSections).candidatos };
}

/** Busca encadeada UF → município → zona → seção; só baixa o arquivo do município escolhido. */
export function BuscaSecao({ cores }: { cores: Record<number, string> }) {
  const [turno, setTurno] = useState<1 | 2>(2);
  const [uf, setUf] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [mun, setMun] = useState<number | "">("");
  const [carregado, setCarregado] = useState<{ chave: string; secoes: SectionRecord[]; candidatos: EncodedSections["candidatos"] } | null>(null);
  const [zona, setZona] = useState<number | "">("");
  const [secao, setSecao] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const chave = uf && mun !== "" ? `${turno}-${uf}-${mun}` : "";
  const dados = carregado && carregado.chave === chave ? carregado : null;
  const estado = erro === chave && chave ? "erro" : chave && !dados ? "carregando" : "ocioso";

  useEffect(() => {
    if (!uf) return;
    let vivo = true;
    fetch(`/api/municipios/${uf.toLowerCase()}`)
      .then((r) => r.json())
      .then((l: Municipio[]) => vivo && setMunicipios(l))
      .catch(() => vivo && setErro(`mun-${uf}`));
    return () => {
      vivo = false;
    };
  }, [uf]);

  useEffect(() => {
    if (!uf || mun === "") return;
    let vivo = true;
    const k = `${turno}-${uf}-${mun}`;
    carregarSecoes(turno, uf, mun)
      .then((d) => vivo && setCarregado({ chave: k, ...d }))
      .catch(() => vivo && setErro(k));
    return () => {
      vivo = false;
    };
  }, [turno, uf, mun]);

  const zonas = useMemo(() => [...new Set(dados?.secoes.map((s) => s.zona))].sort((a, b) => a - b), [dados]);
  const secoesDaZona = useMemo(
    () => (dados?.secoes.filter((s) => s.zona === zona).map((s) => s.secao) ?? []).sort((a, b) => a - b),
    [dados, zona],
  );
  const escolhida = dados?.secoes.find((s) => s.zona === zona && s.secao === secao) ?? null;
  const candidatos: CandidatoInfo[] = (dados?.candidatos ?? []).map((c) => ({ ...c, cor: cores[c.numero] }));

  const select = "well mt-1 block w-full rounded-lg bg-ink px-3 py-2 text-paper disabled:opacity-40";

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
        <label className="text-sm">
          Turno
          <select
            className={select}
            value={turno}
            onChange={(e) => {
              setTurno(Number(e.target.value) as 1 | 2);
              setSecao("");
            }}
          >
            <option value={1}>1º turno</option>
            <option value={2}>2º turno</option>
          </select>
        </label>
        <label className="text-sm">
          Estado
          <select
            className={select}
            value={uf}
            onChange={(e) => {
              setUf(e.target.value);
              setMunicipios([]);
              setMun("");
              setZona("");
              setSecao("");
            }}
          >
            <option value="">Escolha…</option>
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {uf === "ZZ" ? "Cidade" : "Município"}
          <select
            className={select}
            value={mun}
            disabled={!municipios.length}
            onChange={(e) => {
              setMun(Number(e.target.value));
              setZona("");
              setSecao("");
            }}
          >
            <option value="">Escolha…</option>
            {municipios.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Zona
          <select
            className={select}
            value={zona}
            disabled={!zonas.length}
            onChange={(e) => {
              setZona(Number(e.target.value));
              setSecao("");
            }}
          >
            <option value="">Escolha…</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Seção
          <select className={select} value={secao} disabled={!secoesDaZona.length} onChange={(e) => setSecao(Number(e.target.value))}>
            <option value="">Escolha…</option>
            {secoesDaZona.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-faint" aria-live="polite">
        {estado === "carregando" && "Carregando as seções do município…"}
        {estado === "erro" && "Não foi possível carregar os dados. Tente novamente."}
        {estado === "ocioso" && !escolhida && "Zona e seção estão no seu título de eleitor ou no app e-Título."}
      </p>

      {escolhida && (
        <BoletimSecao
          secao={escolhida}
          turno={turno}
          municipio={municipios.find((m) => m.codigo === mun)?.nome ?? ""}
          candidatos={candidatos}
        />
      )}
    </div>
  );
}
