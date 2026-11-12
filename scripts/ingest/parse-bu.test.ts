import { createReadStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { openCsvFromZip, parseBuCsv, type BuRow } from "./parse-bu";

const FX = join(__dirname, "__fixtures__");

async function collect(stream: Readable): Promise<BuRow[]> {
  const out: BuRow[] = [];
  for await (const row of parseBuCsv(stream)) out.push(row);
  return out;
}

const latin1 = (s: string) => Readable.from([Buffer.from(s, "latin1")]);

describe("parseBuCsv", () => {
  it("filtra só Presidente (o CSV do 1º turno traz todos os cargos)", async () => {
    const rows = await collect(createReadStream(join(FX, "bweb_1t_AC_santa_rosa.csv")));
    expect(rows).toHaveLength(97);
    expect(rows.every((r) => r.cargo === 1)).toBe(true);
  });

  it("converte tipos de uma linha real do 1º turno", async () => {
    const [r] = await collect(createReadStream(join(FX, "bweb_1t_AC_santa_rosa.csv")));
    expect(r).toEqual<BuRow>({
      turno: 1,
      cdEleicao: 6257,
      cdPleito: 3220,
      uf: "AC",
      cdMunicipio: 1031,
      nmMunicipio: "SANTA ROSA DO PURUS",
      zona: 3,
      secao: 157,
      localVotacao: 1082,
      cargo: 1,
      aptos: 226,
      comparecimento: 165,
      abstencoes: 61,
      tipoUrna: "Apurada",
      tipoVotavel: "Nominal",
      nrVotavel: 22,
      nmVotavel: "FLAVIO BOLSONARO",
      sgPartido: "PL",
      votos: 94,
      nrUrna: 2045356,
      dtCarga: "2026-09-23T20:29:00",
      dtAbertura: "2026-10-04T06:00:01",
      dtEncerramento: "2026-10-04T15:04:42",
      dtEmissaoBu: "2026-10-04T15:06:48",
      dtBuRecebido: "2026-10-04T17:40:40",
      eleitoresSemBiometria: 11,
      secoesAgregadas: [],
    });
  });

  it("soma de votos do 2º turno bate com o comparecimento oficial do município (2820)", async () => {
    const rows = await collect(createReadStream(join(FX, "bweb_2t_AC_santa_rosa.csv")));
    expect(rows).toHaveLength(57);
    expect(rows.reduce((s, r) => s + r.votos, 0)).toBe(2820);
  });

  it("decodifica latin1 (acentos) e trata #NULO# e seções agregadas", async () => {
    const header =
      '"DT_GERACAO";"NR_TURNO";"CD_ELEICAO";"CD_PLEITO";"SG_UF";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"NR_LOCAL_VOTACAO";"CD_CARGO_PERGUNTA";"DS_CARGO_PERGUNTA";"SG_PARTIDO";"DT_BU_RECEBIDO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_ABSTENCOES";"DS_TIPO_URNA";"DS_TIPO_VOTAVEL";"NR_VOTAVEL";"NM_VOTAVEL";"QT_VOTOS";"NR_URNA_EFETIVADA";"DT_CARGA_URNA_EFETIVADA";"DS_SECOES_AGREGADAS";"DT_ABERTURA";"DT_ENCERRAMENTO";"QT_ELEI_BIOM_SEM_HABILITACAO";"DT_EMISSAO_BU"';
    const line =
      '"x";1;6257;3220;"AC";1104;"JORDÃO";4;10;1000;1;"Presidente";"#NULO#";"#NULO#";100;80;20;"Apurada";"Branco";95;"Branco";3;#NULO#;"#NULO#";"140, 141";"2026-10-04 06:00:01";"2026-10-04 17:00:00";0;"2026-10-04 17:01:00"';
    const [r] = await collect(latin1(`${header}\r\n${line}\r\n`));
    expect(r.nmMunicipio).toBe("JORDÃO");
    expect(r.sgPartido).toBeNull();
    expect(r.dtBuRecebido).toBeNull();
    expect(r.nrUrna).toBeNull();
    expect(r.dtCarga).toBeNull();
    expect(r.secoesAgregadas).toEqual([140, 141]);
    expect(r.tipoVotavel).toBe("Branco");
  });

  it("aceita campos com ponto e vírgula entre aspas e aspas escapadas", async () => {
    const header = '"NR_TURNO";"DS_CARGO_PERGUNTA";"CD_CARGO_PERGUNTA";"NM_VOTAVEL";"QT_VOTOS"';
    const line = '2;"Presidente";1;"NOME ""APELIDO""; JR";7';
    const [r] = await collect(latin1(`${header}\r\n${line}`));
    expect(r.nmVotavel).toBe('NOME "APELIDO"; JR');
    expect(r.votos).toBe(7);
  });

  it("falha com mensagem clara se faltar coluna essencial", async () => {
    await expect(collect(latin1('"FOO";"BAR"\r\n1;2\r\n'))).rejects.toThrow(/DS_CARGO_PERGUNTA/);
  });
});

describe("openCsvFromZip", () => {
  it("abre em streaming o CSV de dentro do zip, ignorando o PDF de leia-me", async () => {
    const { entryName, stream } = await openCsvFromZip(join(FX, "bweb_2t_AC_fixture.zip"));
    expect(entryName).toBe("bweb_2t_AC_261020260742.csv");
    expect(await collect(stream)).toHaveLength(57);
  });
});
