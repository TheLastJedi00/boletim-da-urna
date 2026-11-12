# release/001-mvp → main: Boletim da Urna (MVP)

## Decisões tomadas durante a execução

1. **Porta única 3000.** O Next.js serve front e back no mesmo processo. O `RULES.md` previa front na 4200 e back na 3000.
2. **Dados das seções como `.json.gz` versionados em `public/data`, sem Vercel Blob (tarefa 2.12).** Os snapshots medem 125 MB em JSON e 33 MB com gzip. O navegador descomprime com `DecompressionStream`. Os agregados ficam em `data/snapshots`.
3. **Reconciliação: só a contagem de seções vira aviso.** No exterior (ZZ), o total oficial inclui 42 seções sem BU (não instaladas ou agregadas). Votos e comparecimento batem em 100% das UFs, nos dois turnos.
4. **Candidaturas anuladas.** Votos em número sem candidatura válida (PRTB/28 no 1º turno) entram como **nulos técnicos**, como o TSE totaliza.
5. **Pesquisas (curadoria em revisão, checkpoint 4.5 pendente).**
   - A fonte compilada é a tabela da Wikipédia, com o link original de cada pesquisa.
   - **9 institutos e 53 pesquisas.**
   - A margem declarada abaixo do mínimo estatístico (AtlasIntel declara 1 p.p. com n≈5.000) ou ausente vira aviso. Os cálculos usam a **margem teórica** como piso.
   - A soma aceita até 100 + 0,5 p.p. por valor, por causa do arredondamento.
6. **Veja incluída na lista de veículos.** É a única fonte encontrada para o debate da Band em 18/10.
7. **Malhas do IBGE.** Os anéis foram reorientados para o d3-geo (o padrão RFC 7946 era lido como "o mundo menos o polígono"). As malhas municipais foram simplificadas com TopoJSON, preservando ilhas como Fernando de Noronha.
8. **Mapas renderizados uma vez para os dois turnos.** As cores ficam em variáveis CSS e o turno é compartilhado por contexto. Isso reduziu o peso de `/resultados/mg` de 354 KB para 260 KB (gzip).
9. **Fraude simulada só "no total".** O simulador não lista outliers naturais da amostra como se detectassem a fraude.

## Correções feitas no caminho

- **Parser:** `DS_SECOES_AGREGADAS` usa "/" como separador (conforme o leia-me do TSE). 2.682 seções estavam com a lista mal lida; os snapshots foram regenerados.
- **Rótulos:** vírgula decimal no tooltip das pesquisas.

## O que entrega

- **Ingestão (`npm run ingest`):**
  - catálogo CKAN e download com SHA-512 verificado;
  - parser latin1 em streaming e uma linha por seção;
  - reconciliação com o JSON oficial do TSE;
  - snapshots e manifesto com hashes;
  - sinais pré-calculados.
- **Sinais e simulação (`lib/signals`, `lib/simulation`):**
  - comparecimento, horários, carga e biometria, com z robusto calculado dentro da UF;
  - 5 cenários de fraude hipotética, cada um detectado pelo seu sinal e **simétrico entre candidatos** (os testes garantem isso).
- **Pesquisas (`npm run pesquisas`):** validação da curadoria, votos válidos, média ponderada com faixa de incerteza e avaliação × urna.
- **Páginas:** `/`, `/sistema`, `/resultados` (mapa por UF e por município, comparação entre turnos), `/pesquisas`, `/simulacoes` (dados reais, simulador e Benford), `/secao` (BU de qualquer seção com link oficial) e `/metodologia`.
- **Publicação:** metadados, Open Graph com autoria, sitemap, robots e revisão de responsividade em 390 px.

## Resultados que o estudo mostra

- A soma dos 499.248 boletins bate com o total oficial em todas as UFs, nos dois turnos.
- **0 seções** aritmeticamente impossíveis.
- Os casos extremos de comparecimento são de comparecimento **baixo**.
- 1º turno: nenhum dos 7 institutos indicou Flávio Bolsonaro à frente (ele teve 47,03%).
- 2º turno: os 8 institutos apontavam Flávio à frente, e Lula venceu com 51,79%. Só o Ipespe ficou dentro da própria margem.

## Testes

- `npm test`: 16 arquivos, 178 testes passando (ingestão com fixtures reais do TSE, sinais, simulação, pesquisas, geo e cores).
- `npm run typecheck` e `npm run lint` sem erros.
- Teste manual no Chrome (build de produção, `localhost:3000`):
  - todas as rotas responderam 200, e a 404 respondeu 404;
  - troca de turno nos mapas (MG muda de vencedor);
  - filtro e tooltip das pesquisas;
  - os 5 cenários do simulador nos dois sentidos;
  - busca de seção em AC e SP com link oficial;
  - ausência de rolagem horizontal em 390 px;
  - console sem erros.

## Pendências do autor

- [ ] **4.5:** aprovar a curadoria de pesquisas (`data/curated/pesquisas.csv`) e de notícias (`data/curated/noticias.csv`).
- [ ] **10.4:** importar o repositório na Vercel e apontar `tse.lenoborges.com.br`, com um CNAME `tse` para o alvo indicado pela Vercel.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01HKXWC5qvwEtToZQMySBdNc
