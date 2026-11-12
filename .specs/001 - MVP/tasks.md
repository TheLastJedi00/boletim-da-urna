# 001 — MVP: Tarefas

> Fluxo (ver `RULES.md`):
> - **cada fase** é uma branch `feat/<nome>`;
> - **cada tarefa** é um commit;
> - no backend (ingestão, cálculos, modelos) vale **TDD**: a tarefa de testes vem antes da de implementação;
> - ao fim, todas as branches são mergeadas em `release/001-mvp`, a app sobe em `localhost:3000` e as funcionalidades são testadas no Chrome.
>
> Referência completa: [context.md](./context.md).

---

## Fase 1 — `feat/setup`: base do projeto

- [x] **1.1** Criar o app Next.js (App Router, TypeScript, Tailwind v4, ESLint) e configurar o `.gitignore` (incluindo `data/raw/`).
- [x] **1.2** Configurar o Vitest com os scripts `test` e `test:watch` e a estrutura de pastas: `scripts/` (ingestão), `lib/` (cálculos), `app/` (UI), `data/` (raw, curated, snapshots).
- [x] **1.3** Criar os tokens de identidade visual (cores, sombras, raios) no tema do Tailwind e carregar as fontes Outfit, DM Sans e JetBrains Mono via `next/font`.
- [x] **1.4** Criar o layout global: cabeçalho com navegação entre as seções, rodapé com autoria ("Estudo de caso feito por Leno Borges usando dados da Justiça Eleitoral" e link para lenoborges.com.br) e o componente "próxima seção".
- [x] **1.5** Criar as rotas vazias: `/`, `/sistema`, `/resultados`, `/resultados/[uf]`, `/pesquisas`, `/simulacoes`, `/secao` e `/metodologia`.
- [x] **1.6** Testes do mapa `party-colors`: todo partido tem cor; contraste ≥ 3:1 contra `#232326`; distância mínima em relação ao acento `#3986ff`.
- [x] **1.7** Implementar o `party-colors` (cores dos partidos dessaturadas e ajustadas ao tema escuro) e os tons de cinza para brancos, nulos e abstenção.
- [x] **1.8** Criar os componentes base de gráfico: escalas, eixos, legenda e tooltip em SVG com `d3-scale`/`d3-shape`, e o estilo "Simulação hipotética" (hachura e rótulo fixo).

## Fase 2 — `feat/ingestao-tse`: dados oficiais

- [x] **2.1** Criar as fixtures de teste: um recorte real do CSV de BU do AC (1º e 2º turnos), um JSON de totalização e um JSON de municípios.
- [x] **2.2** Testes do download: monta a URL a partir do catálogo CKAN, verifica o SHA-512, rejeita arquivo corrompido e não baixa de novo o que já está em cache.
- [x] **2.3** Implementar o download: catálogo CKAN, CDN do TSE, verificação SHA-512 e cache em `data/raw/`.
- [x] **2.4** Testes do parser: lê em streaming, trata o encoding latin1, filtra só `Presidente` e converte os tipos (datas, números, `#NULO#`).
- [x] **2.5** Implementar o parser de CSV em streaming.
- [x] **2.6** Testes do normalizador por seção: uma linha por seção com aptos, comparecimento, abstenções, votos por candidato, brancos, nulos, horários (abertura, encerramento, emissão, recebimento, carga), tipo de urna, liberações sem biometria e seções agregadas.
- [x] **2.7** Implementar o normalizador por seção.
- [x] **2.8** Testes dos agregados por município, UF e Brasil, e da **reconciliação**: a soma dos BUs tem que bater com o total oficial do JSON do TSE.
- [x] **2.9** Implementar o cliente do JSON de resultados (totais nacional, por UF e por município; municípios com código IBGE), os agregados e a reconciliação.
- [x] **2.10** Testes do writer: snapshots compactos particionados por UF e turno, mais o manifesto (fonte, data de coleta, hash de origem).
- [x] **2.11** Implementar o writer e o comando `npm run ingest`, que roda tudo de ponta a ponta e é idempotente.
- [x] **2.12** Rodar a ingestão completa e **medir o tamanho dos snapshots**. Até ~50 MB, versionar em `public/data/`. Acima disso, publicar no Vercel Blob e registrar a decisão no PR.
  - **Resultado:** 125 MB em JSON, 33 MB com gzip. **Decisão:** as seções vão como `.json.gz` em `public/data/secoes/` e são descomprimidas no navegador (`DecompressionStream`); os agregados vão em `data/snapshots/`. Tudo versionado, sem Blob e sem credenciais.
- [x] **2.13** Gerar as malhas simplificadas de UF e município (IBGE) para os mapas.

## Fase 3 — `feat/sinais-simulacoes`: estatística e simulações

- [x] **3.1** Testes da distribuição de comparecimento: percentis, detecção robusta de outliers (mediana/MAD) e seções com comparecimento acima do número de aptos (o impossível).
- [x] **3.2** Implementar a distribuição de comparecimento.
- [x] **3.3** Testes dos sinais de horário e carga: abertura, encerramento e emissão fora do padrão; carga da urna fora da janela esperada.
- [x] **3.4** Implementar os sinais de horário e carga.
- [x] **3.5** Testes do sinal de liberações sem biometria, por seção e por região.
- [x] **3.6** Implementar o sinal de liberações sem biometria.
- [x] **3.7** Testes do motor de simulação. Cada cenário (encher urna, trocar votos na totalização, adulterar BU, urna com horário irregular, liberação em massa sem biometria) é aplicado sobre os dados reais e deve ser **detectado** pelo sinal correspondente. Os cenários são **simétricos entre candidatos**.
- [x] **3.8** Implementar o motor de simulação.
- [x] **3.9** Pré-calcular as estatísticas e os sinais nos snapshots (passo extra do `npm run ingest`).

## Fase 4 — `feat/pesquisas`: curadoria e modelo

- [x] **4.1** Testes do esquema e da validação dos CSVs de `data/curated/` (pesquisas e notícias): campos obrigatórios, nº de registro no TSE, tamanho da amostra > 0, margem coerente com a amostra, datas dentro da janela.
- [x] **4.2** Implementar o esquema e a validação.
- [x] **4.3** Coletar as pesquisas nacionais registradas no TSE (Datafolha, Quaest, AtlasIntel, Ipec, Paraná Pesquisas, PoderData e outros relevantes), de 16/08/2026 até a véspera de cada turno, com a URL de cada fonte.
- [x] **4.4** Coletar as notícias (Folha, G1, Estadão, O Globo, UOL, CNN Brasil, Poder360, BBC Brasil), no máximo ~3 por semana.
- [ ] **4.5** ⏸ **Checkpoint: aprovação do autor** para as listas de pesquisas e notícias antes de seguir.
  - **Pendente.** O desenvolvimento seguiu com os dados marcados como "em revisão" (nada é publicado antes do merge). Fonte compilada: tabelas da Wikipédia, com o link original de cada pesquisa.
- [x] **4.6** Testes do modelo de projeção: conversão para votos válidos; média ponderada por data e amostra; intervalo de incerteza; comparação com o resultado (acertou ou não dentro da margem).
- [x] **4.7** Implementar o modelo de projeção e gerar o snapshot de pesquisas.

## Fase 5 — `feat/paginas-institucionais`

- [x] **5.1** `/`: apresentação inicial com propósito, autoria, link para o portfólio, menção ao uso de IA e acesso às seções.
- [x] **5.2** `/sistema`: fluxo voto → BU → transmissão → totalização → divulgação, e os controles (zerésima, BU impresso, assinatura e hash, testes públicos, auditorias).
- [x] **5.3** `/metodologia`: fontes, manifesto de hashes, processamento, limitações e papel da IA.

## Fase 6 — `feat/resultados`

- [x] **6.1** `/resultados`: resultado nacional do 1º e do 2º turno, com brancos, nulos, abstenção e comparecimento.
- [x] **6.2** Mapa por UF com as cores dos partidos de forma sutil, tooltip e link para a UF.
- [x] **6.3** `/resultados/[uf]`: detalhamento por município (mapa e tabela resumida), gerado de forma estática.
- [x] **6.4** Comparação 1º × 2º turno por UF: migração de votos e variação de abstenção.

## Fase 7 — `feat/pagina-pesquisas`

- [x] **7.1** Linha do tempo das pesquisas por candidato, com a faixa de margem de erro e filtro por instituto.
- [x] **7.2** Notícias marcadas na linha do tempo.
- [x] **7.3** Projeção × resultado real, destacando quais pesquisas acertaram dentro da margem.

## Fase 8 — `feat/pagina-simulacoes`

- [x] **8.1** Sinais nos dados reais: distribuições, seções fora do padrão e a explicação de que outlier não é prova.
- [x] **8.2** Simulador interativo: escolher o cenário e a intensidade e ver como a fraude seria feita, que sinal aparece e qual controle detecta. Tudo com o estilo "Simulação hipotética".
- [x] **8.3** Bloco "Por que Benford não serve para eleições".

## Fase 9 — `feat/pagina-secao`

- [x] **9.1** Busca encadeada UF → município → zona → seção, carregando só o snapshot da UF escolhida.
- [x] **9.2** BU da seção: votos, aptos, comparecimento, horários, hash e links para os arquivos oficiais assinados no TSE.

## Fase 10 — `feat/publicacao`

- [x] **10.1** Metadados e SEO: título, descrição, imagem Open Graph com autoria, `sitemap` e `robots`.
- [x] **10.2** Revisão de acessibilidade (contraste, navegação por teclado, texto alternativo dos gráficos) e de responsividade em telas de celular.
- [x] **10.3** Revisão de performance: tamanho dos snapshots carregados por página e geração estática.
- [ ] **10.4** Configurar o projeto na Vercel e o domínio `tse.lenoborges.com.br`. Requer acesso do autor à Vercel e ao DNS.
  - **Pendente do autor:** importar o repositório na Vercel (framework Next.js, sem variáveis de ambiente) e adicionar o domínio `tse.lenoborges.com.br` (registro CNAME `tse` → `cname.vercel-dns.com` no DNS de lenoborges.com.br).

---

## Encerramento

- [x] Mergear todas as `feat/*` em `release/001-mvp`.
- [x] Subir a app em `localhost:3000` e testar no Chrome todas as rotas e interações (mapa, filtros, simulador, busca de seção).
- [ ] Abrir o PR de `release/001-mvp` contra `main`, com as **decisões tomadas no topo**.
  - Descrição pronta em [pr.md](./pr.md); falta um remoto no GitHub.
