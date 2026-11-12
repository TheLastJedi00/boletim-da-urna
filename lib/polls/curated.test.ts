import { describe, expect, it } from "vitest";
import { parseCuratedCsv, validateNoticias, validatePesquisas, type NoticiaRow, type PesquisaRow } from "./curated";

const header = "id;turno;instituto;contratante;registro_tse;campo_inicio;campo_fim;amostra;margem_erro;confianca;metodologia;base;cenario;votavel;percentual;url";
const linha = (o: Partial<Record<string, string>> = {}) => {
  const base: Record<string, string> = {
    id: "t2-x-2026-10-24", turno: "2", instituto: "X", contratante: "", registro_tse: "BR-01234/2026",
    campo_inicio: "2026-10-23", campo_fim: "2026-10-24", amostra: "2000", margem_erro: "2.2", confianca: "95",
    metodologia: "telefone", base: "totais", cenario: "estimulado", votavel: "13", percentual: "47", url: "https://exemplo.com/p",
  };
  return header.split(";").map((k) => o[k] ?? base[k]).join(";");
};
const csv = (...linhas: string[]) => [header, ...linhas].join("\n");

describe("parseCuratedCsv", () => {
  it("lê CSV com ; e campos entre aspas contendo ;", () => {
    const rows = parseCuratedCsv('a;b\n"x;y";2\n');
    expect(rows).toEqual([{ a: "x;y", b: "2" }]);
  });
});

describe("validatePesquisas", () => {
  const ok = csv(linha(), linha({ votavel: "22", percentual: "48" }), linha({ votavel: "indecisos_brancos_nulos", percentual: "5" }));

  it("aceita pesquisa válida e agrupa por id", () => {
    const r = validatePesquisas(parseCuratedCsv(ok) as PesquisaRow[]);
    expect(r.erros).toEqual([]);
    expect(r.pesquisas).toHaveLength(1);
    expect(r.pesquisas[0]).toMatchObject({ instituto: "X", amostra: 2000, margemErro: 2.2, turno: 2 });
    expect(r.pesquisas[0].valores).toEqual({ 13: 47, 22: 48, indecisos_brancos_nulos: 5 });
  });

  it("exige amostra positiva e URL da fonte", () => {
    const r = validatePesquisas(parseCuratedCsv(csv(linha({ amostra: "0" }), linha({ votavel: "22", url: "" }))) as PesquisaRow[]);
    expect(r.erros.join(" ")).toMatch(/amostra/);
    expect(r.erros.join(" ")).toMatch(/url/i);
  });

  it("rejeita data fora da janela do turno", () => {
    const r = validatePesquisas(parseCuratedCsv(csv(linha({ campo_inicio: "2026-10-24", campo_fim: "2026-10-26" }))) as PesquisaRow[]);
    expect(r.erros.join(" ")).toMatch(/janela/);
  });

  it("margem declarada abaixo do mínimo estatístico gera aviso (o valor publicado é mantido)", () => {
    // n = 2000 → margem mínima ≈ 2,19 p.p. (95%, p = 0,5, amostra aleatória simples)
    const r = validatePesquisas(parseCuratedCsv(csv(linha({ margem_erro: "1.0" }))) as PesquisaRow[]);
    expect(r.erros).toEqual([]);
    expect(r.avisos.join(" ")).toMatch(/margem/);
    expect(r.pesquisas[0].margemErro).toBe(1);
  });

  it("margem ausente gera aviso e usa a margem teórica da amostra", () => {
    const r = validatePesquisas(parseCuratedCsv(csv(linha({ margem_erro: "" }))) as PesquisaRow[]);
    expect(r.erros).toEqual([]);
    expect(r.avisos.join(" ")).toMatch(/margem/);
    expect(r.pesquisas[0].margemErro).toBeCloseTo(2.19, 2);
  });

  it("tolera arredondamento: soma até 100 + 0,5 por valor informado", () => {
    const linhas = [linha({ percentual: "40" }), ...[22, 70, 55, 14, 30].map((v, i) => linha({ votavel: String(v), percentual: i === 0 ? "50" : "3" }))];
    const r = validatePesquisas(parseCuratedCsv(csv(...linhas)) as PesquisaRow[]); // soma 102 com 6 valores (máx. 103)
    expect(r.erros).toEqual([]);
  });

  it("registro no TSE ausente gera aviso (não erro); formato inválido gera erro", () => {
    const sem = validatePesquisas(parseCuratedCsv(csv(linha({ registro_tse: "" }))) as PesquisaRow[]);
    expect(sem.erros).toEqual([]);
    expect(sem.avisos.join(" ")).toMatch(/registro/);
    const inval = validatePesquisas(parseCuratedCsv(csv(linha({ registro_tse: "XYZ" }))) as PesquisaRow[]);
    expect(inval.erros.join(" ")).toMatch(/registro/);
  });

  it("rejeita campos de pesquisa divergentes entre linhas do mesmo id", () => {
    const r = validatePesquisas(parseCuratedCsv(csv(linha(), linha({ votavel: "22", amostra: "2100" }))) as PesquisaRow[]);
    expect(r.erros.join(" ")).toMatch(/divergente/);
  });

  it("rejeita soma de percentuais acima do limite de arredondamento", () => {
    const r = validatePesquisas(parseCuratedCsv(csv(linha({ percentual: "60" }), linha({ votavel: "22", percentual: "48" }))) as PesquisaRow[]);
    expect(r.erros.join(" ")).toMatch(/soma/);
  });
});

describe("validateNoticias", () => {
  const nh = "data;turno;categoria;titulo;veiculo;url;resumo";
  const n = (o: Partial<NoticiaRow> = {}) =>
    ({ data: "2026-10-01", turno: "1", categoria: "campanha", titulo: "T", veiculo: "UOL", url: "https://uol.com.br/x", resumo: "R", ...o }) as NoticiaRow;

  it("aceita notícia válida", () => {
    expect(validateNoticias([n()]).erros).toEqual([]);
    expect(nh.split(";")).toHaveLength(7);
  });

  it("rejeita veículo fora da lista, data fora da janela e URL inválida", () => {
    const r = validateNoticias([n({ veiculo: "Blog Qualquer" }), n({ data: "2026-07-01" }), n({ url: "ftp://x" })]);
    expect(r.erros).toHaveLength(3);
  });

  it("limita a 3 notícias por semana", () => {
    const r = validateNoticias(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"].map((data) => n({ data })));
    expect(r.erros.join(" ")).toMatch(/semana/);
  });
});
