# 001 — MVP: Boletim da Urna

## Objetivo

Construir um **estudo de caso interativo** sobre a eleição para **Presidente da República de 2026**. A ideia é mostrar, com dados oficiais da Justiça Eleitoral, como funciona o sistema eleitoral brasileiro, de forma visual e dinâmica, sem que o visitante precise ler planilhas.

O estudo cruza:
- os **boletins de urna** e os resultados oficiais do TSE (1º e 2º turnos);
- as **pesquisas de intenção de voto** e as notícias publicadas antes de cada turno.

Com esse cruzamento, ele apresenta projeções, margens de erro e **simulações hipotéticas de fraude**, explicando como uma fraude funcionaria, que sinais a revelariam e quais controles do sistema a impedem ou detectam.

O tom é **educativo e de conscientização**, não alarmista.

## Autoria e credibilidade

- A apresentação inicial deve exibir: **"Estudo de caso feito por Leno Borges usando dados da Justiça Eleitoral"**.
- Link para o portfólio: **https://lenoborges.com.br**.
- Informar que foi usada **IA para apoiar a interpretação dos dados**, deixando claro que todo número vem de fonte oficial e é rastreável.
- Todo dado exibido deve citar a fonte (TSE, instituto de pesquisa, veículo de notícia) e, quando aplicável, o hash/arquivo de origem.

## Público

Pessoas comuns, sem conhecimento técnico ou estatístico. Linguagem simples, em **pt-BR**, com explicações curtas ao lado dos gráficos.

## Escopo do MVP

### 1. Apresentação inicial
- Título, propósito do estudo, autoria (ver acima) e navegação para as seções.

### 2. Como funciona o sistema eleitoral
- Do voto ao resultado: urna → boletim de urna (BU) impresso e assinado digitalmente → transmissão → totalização → divulgação.
- Controles existentes: zerésima, BU impresso afixado na seção, assinatura digital e hash, teste público de segurança, teste de integridade, auditorias.

### 3. Resultados oficiais
- Resultado nacional do 1º e do 2º turno: votos por candidato, brancos, nulos, abstenção e comparecimento.
- **Mapa por UF** e detalhamento por município.
- Comparação entre o 1º e o 2º turno: migração de votos e variação de abstenção, por UF.

### 4. Pesquisas × urna
- Linha do tempo das pesquisas de intenção de voto antes de cada turno, com faixa de **margem de erro**.
- Projeção: média das pesquisas ponderada por data e tamanho da amostra, com intervalo de incerteza.
- Comparação da projeção com o resultado real. Mostrar quais pesquisas acertaram dentro da margem e quais não.
- Notícias relevantes marcadas na linha do tempo.

### 5. Sinais de fraude: simulações hipotéticas
Simulador interativo em que o visitante "aplica" uma fraude hipotética sobre os dados reais e vê:
- **como ela seria feita**;
- **que sinais apareceriam** nos dados;
- **qual controle do sistema a detectaria**.

Cenários iniciais:

| Cenário hipotético | Sinal nos dados | Controle que detecta |
|---|---|---|
| Inserir votos em urnas (encher urna) | Comparecimento próximo de 100%, ou acima do número de aptos; distribuição de comparecimento fora do padrão | BU por seção, cadastro de aptos, fiscais |
| Trocar votos na totalização | Soma dos BUs publicados ≠ total divulgado | BUs públicos e assinados; recontagem independente |
| Adulterar um BU | Hash/assinatura digital não confere | Assinatura digital da urna; BU impresso na seção |
| Urna com carga ou horário irregular | Data de carga, abertura ou encerramento atípicas | Logs da urna; auditoria |
| Liberar votos sem biometria em massa | Pico atípico de eleitores liberados sem biometria em uma seção ou região | Registro no BU; fiscalização |

- Também verificar os mesmos sinais nos **dados reais**, mostrando a distribuição e as seções que fogem do padrão. Explicar que um ponto fora da curva **não é prova de fraude**: é um ponto a ser checado, e normalmente tem explicação.
- Explicar por que alguns testes populares (ex.: Lei de Benford) **não se aplicam bem** a dados eleitorais.
- Dados simulados e dados reais devem ser **visualmente distintos**: rótulo "Simulação hipotética" e cor ou estilo próprios. O estudo **nunca** afirma que houve fraude real.

### 6. Confira uma seção
- O visitante busca sua seção (UF → município → zona → seção) e vê o BU dela: votos, aptos, comparecimento, horários e hash.
- Link para os arquivos oficiais assinados no site do TSE, para a pessoa verificar por conta própria.

### 7. Metodologia e fontes
- Fontes usadas, data de coleta, hashes dos arquivos, como os dados foram processados, limitações e o papel da IA.

## Dados

### Eleição
| Item | 1º turno | 2º turno |
|---|---|---|
| Data | 04/10/2026 | 25/10/2026 |
| `cd_eleicao` | 6257 | 6258 |
| Pleito | 3220 | 3221 |
| Cargo | Presidente (`c0001`) | Presidente (`c0001`) |

Ciclo: `ele2026`. Os endpoints estão detalhados no `CLAUDE.md`, seção *Data sources*.

### Fontes
1. **JSON de resultados do TSE** (`resultados.tse.jus.br`): totais nacional, por UF e por município; lista de municípios com código IBGE (útil para os mapas); arquivos por seção (hash e BU assinado).
2. **CSV de boletim de urna** (Portal de Dados Abertos do TSE): uma linha por seção × cargo × votável, um zip por UF e turno, com verificação SHA-512. Arquivos grandes: SP no 1º turno tem cerca de 1,4 GB zipado.
   - Colunas úteis para os sinais: `QT_APTOS`, `QT_COMPARECIMENTO`, `QT_ABSTENCOES`, `DT_ABERTURA`, `DT_ENCERRAMENTO`, `DT_EMISSAO_BU`, `DT_BU_RECEBIDO`, `DT_CARGA_URNA_EFETIVADA`, `QT_ELEI_BIOM_SEM_HABILITACAO`, `DS_TIPO_URNA`, `DS_SECOES_AGREGADAS`.
   - Os CSVs também contêm Governador e os outros cargos. Filtrar só `Presidente`.
3. **Pesquisas de intenção de voto**: **curadoria feita no projeto** (o TSE não publica os resultados das pesquisas).
   - Institutos mais relevantes nacionalmente, a confirmar na coleta: Datafolha, Quaest, AtlasIntel, Ipec, Paraná Pesquisas, PoderData, entre outros de peso.
   - Critérios de entrada: pesquisa nacional, **registrada no TSE** (PesqEle), com cenário estimulado que inclua os candidatos efetivos. Período: do início oficial da campanha (16/08/2026) até a véspera de cada turno.
   - Campos obrigatórios: instituto, contratante, nº de registro no TSE, datas de campo, **tamanho da amostra**, margem de erro, nível de confiança, metodologia (presencial, telefone ou online), turno, cenário, percentual por candidato, brancos/nulos, indecisos, se o percentual é sobre votos totais ou válidos, e URL da fonte.
4. **Notícias**: **curadoria feita no projeto**, a partir dos veículos mais relevantes: Folha de S.Paulo, G1, Estadão, O Globo, UOL, CNN Brasil, Poder360, BBC News Brasil.
   - Critério: fatos de campanha com impacto plausível nas intenções de voto (debates, eventos marcantes, decisões judiciais, entrada ou saída de candidatos).
   - Campos: data, título, veículo, URL e um resumo de uma linha.
   - Peso: no máximo cerca de 3 notícias por semana na linha do tempo.

   A curadoria de pesquisas e notícias fica versionada em `data/curated/` (CSV) e precisa da **aprovação do autor** antes de ir para o site.
5. **Malhas geográficas** de UF e município: IBGE.

### Ingestão (sem banco de dados no MVP)
Os dados são estáticos, porque a eleição acabou. Por isso **não há banco de dados no MVP**: tudo é pré-processado por scripts locais.

```
TSE (JSON + CSV) ──► scripts de ingestão (local) ──► snapshots compactos ──► Next.js (estático/CDN)
```

- **Download automático** (o autor não baixa nada manualmente): o catálogo vem da API CKAN do Portal de Dados Abertos e os zips vêm do CDN do TSE.
- **Verificação de integridade**: o SHA-512 de cada zip é conferido antes do processamento.
- **Processamento em streaming**: os arquivos não cabem na memória de uma vez.
- **Saídas**:
  - agregados nacional, por UF e por município, por turno;
  - **uma linha por seção** (identificação, aptos, comparecimento, votos por candidato, brancos, nulos, horários, tipo de urna, liberações sem biometria), **particionada por UF e turno** e carregada sob demanda;
  - estatísticas pré-calculadas para os sinais (distribuições, percentis, seções fora do padrão);
  - um manifesto com fonte, data de coleta e hash de cada arquivo de origem.
- O CSV bruto **nunca** vai para o repositório nem para o deploy. Ele fica em `data/raw/`, que é ignorada pelo git.
- O site **nunca** consulta o TSE no momento da requisição.

## Arquitetura

- **Next.js (App Router)**: páginas geradas de forma estática a partir dos snapshots, com deploy na Vercel.
- Scripts de ingestão e funções de cálculo (agregação, projeção, margem de erro, detecção de sinais, simulação de fraude) ficam **isolados da UI** e são testáveis.
- **TDD** nos scripts e nas funções de cálculo: a suíte de testes vem antes da implementação, conforme o `RULES.md`.
- Banco de dados fica para depois do MVP, se surgirem consultas livres ou dados que mudam. Migrar será só uma etapa extra de carga a partir dos mesmos dados limpos.

### Navegação
**Páginas separadas por seção**, com navegação global e indicação de "próxima seção" ao final de cada página para manter o fluxo de leitura:

| Rota | Seção |
|---|---|
| `/` | Apresentação inicial |
| `/sistema` | Como funciona o sistema eleitoral |
| `/resultados` | Resultados oficiais (com `/resultados/[uf]` para o detalhamento) |
| `/pesquisas` | Pesquisas × urna |
| `/simulacoes` | Sinais de fraude: simulações hipotéticas |
| `/secao` | Confira uma seção |
| `/metodologia` | Metodologia e fontes |

### Domínio
Publicado como subdomínio do portfólio: **https://tse.lenoborges.com.br** (projeto na Vercel com domínio customizado).

### Identidade visual
Seguir a identidade de **lenoborges.com.br**: tema escuro, superfícies com relevo suave (neumorfismo) e acento azul. Tokens extraídos do site em 11/11/2026:

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#1c1c1e` | fundo da página |
| `--color-surface` | `#232326` | cartões |
| `--color-raised` | `#2a2a2d` | elementos elevados |
| `--color-line` | `#383838` | bordas |
| `--color-paper` | `#f2f3f5` | títulos e texto de destaque |
| `--color-muted` | `#a3a7ad` | texto corrido |
| `--color-faint` | `#8e8e93` | texto secundário |
| `--color-accent` | `#3986ff` | acento e links (variações `#2563d9` deep, `#488fff` soft) |

- **Fontes**: Outfit (títulos), DM Sans (texto), JetBrains Mono (números, hashes, código).
- **Sombras**: `raised` `6px 6px 16px rgb(0 0 0 / .42), -4px -4px 12px rgb(255 255 255 / .025), inset 0 1px 0 rgb(255 255 255 / .04)` e `inset` `inset 3px 3px 7px rgb(0 0 0 / .5), inset -2px -2px 6px rgb(255 255 255 / .03)`.
- **Raios**: `.75rem` e `1rem`.
- **Stack de estilo**: Tailwind CSS v4, a mesma do portfólio.
- **Cores dos candidatos nos gráficos**: usar a **cor de cada partido, de forma sutil**, para que o visitante reconheça os candidatos sem que a identidade visual fique poluída:
  - versões dessaturadas e levemente escurecidas da cor oficial, ajustadas ao tema escuro: tons "pastel/terrosos", nunca a cor saturada pura;
  - a cor aparece só nos **elementos de dados** (barras, linhas, áreas do mapa, marcadores). A interface (botões, links, navegação) continua com o azul de acento da marca;
  - se a cor de um partido for próxima do azul de acento `#3986ff`, ajustar matiz e saturação para que não se confunda com a marca;
  - os candidatos comparados lado a lado precisam ser distinguíveis entre si, inclusive para daltônicos. Quando as cores forem próximas, usar um diferencial secundário, como estilo de linha, padrão ou rótulo direto;
  - contraste mínimo de 3:1 contra a superfície (`#232326`) para os elementos gráficos;
  - brancos, nulos e abstenção em tons de cinza da própria paleta (`--color-faint`, `--color-line`);
  - as cores ficam centralizadas em um único mapa de tokens por partido (`party-colors`), para manter consistência em todos os gráficos.
- **Simulações hipotéticas**: estilo próprio (ex.: hachura e rótulo fixo "Simulação hipotética") que não se confunda com os dados reais.

## Requisitos não funcionais

- Interface em pt-BR, responsiva (mobile first) e acessível.
- Carregamento rápido: dados por seção só são carregados quando o visitante abre aquela UF.
- Neutralidade: nenhuma linguagem que favoreça um candidato ou partido. As simulações tratam todos os candidatos de forma simétrica.
- Rastreabilidade: todo número leva à sua fonte.

## Fora do escopo do MVP

- Outros cargos (Governador, Senador, Deputados).
- Eleições anteriores (2018, 2022).
- Banco de dados, contas de usuário e comentários.
- Validação criptográfica completa dos arquivos `.bu.dat` dentro do site (no MVP, o site linka para os arquivos oficiais).
- Evolução da apuração em tempo real (arquivo de resultados parciais).

## Decisões tomadas

1. **Next.js único** para front e back, rodando na porta 3000. O `RULES.md` previa front na 4200 e back na 3000, mas o Next.js serve os dois.
2. **Sem banco no MVP**: a ingestão gera snapshots estáticos.
3. **Ingestão automatizada** via JSON do TSE e CSV do Portal de Dados Abertos, em vez de download manual.
4. **Simulações sempre rotuladas como hipotéticas** e visualmente separadas dos dados reais.
5. **Pesquisas e notícias** vêm de curadoria feita no projeto (institutos e veículos mais relevantes, sempre com o tamanho da amostra) e passam pela aprovação do autor.
6. **Páginas separadas por seção**, e não uma página única de rolagem.
7. **Identidade visual** do lenoborges.com.br. Os candidatos usam as cores dos partidos de forma sutil (dessaturadas e só nos elementos de dados), e a interface continua com o azul da marca.
8. **Domínio**: `tse.lenoborges.com.br`.
