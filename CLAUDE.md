# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

"Boletim da Urna" is an interactive **case study** of Brazilian elections. It is meant to teach people how the electoral system works through visuals, not spreadsheets. It:

- Collects data from **boletins de urna** (the user will provide the files) and other official Justiça Eleitoral (TSE) data.
- Cross-references it with news and **vote-intention polls** published before the 1st and 2nd rounds.
- Shows **projections and margins of error**, comparing what the polls said with the official result.
- Presents **simulations of hypothetical fraud**: how a fraud would work, what statistical and data signals would reveal it, and how the system's controls catch it. The goal is awareness, not alarmism.
- Keeps the presentation dynamic and easy to read (charts, interactive simulations, short explanations). Avoid dumping raw tables.

Content rules:
- UI language is **Portuguese (pt-BR)**.
- The opening/landing presentation must credit the author: *"Estudo de caso feito por Leno Borges usando dados da Justiça Eleitoral"*, with a link to the portfolio **https://lenoborges.com.br**. Mention that AI was used to help interpret the data. The point is to show credibility.
- Every dataset shown must cite its source (TSE, poll institute, news outlet).
- Fraud scenarios must be clearly labeled as **hypothetical simulations**. Never present them as claims that a real fraud happened. Keep real data and simulated data visually distinct.

## Data sources (2026 presidential election — verified 2026-11-11)

Election: **Presidente 2026**. 1st round 04/10/2026 (`cd_eleicao` 6257), 2nd round 25/10/2026 (6258), pleito 3220, ciclo `ele2026`.

1. **Results JSON** (`https://resultados.tse.jus.br/oficial`, the same files the TSE "Resultados" app reads). Not a formal REST API: these are static files and their layout may change.
   - Config/index: `/comum/config/ele-c.json` (path templates + election codes), `/ele2026/<cd_eleicao>/config/mun-e00<cd_eleicao>-cm.json` (municipalities/zones).
   - Totals for Presidente (cargo `c0001`):
     - Nacional: `/ele2026/6257/dados/br/br-c0001-e006257-u.json`
     - UF: `/dados/<uf>/<uf>-c0001-e006257-u.json`
     - Município: `/dados/<uf>/<uf><cd_mun>-c0001-e006257-u.json`
   - Per section: `/ele2026/arquivo-urna/3220/config/<uf>/<uf>-p003220-cs.json` lists the sections. `/arquivo-urna/3220/dados/<uf>/<mun>/<zona>/<secao>/p003220-<uf>-m<mun>-z<zona>-s<secao>-aux.json` gives the hash and the signed files (`-bu.dat`, `-rdv.dat`, `-log.jez`, `-vota.vsc`).
2. **Boletim de Urna CSVs** (Portal de Dados Abertos, CKAN API at `https://dadosabertos.tse.jus.br/api/3/action/...`, dataset `resultados-2026-boletim-de-urna`). There is one zip per UF and round, plus a `.sha512` file each: `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/buweb/bweb_<1t|2t>_<UF>_<timestamp>.zip`. The zips are large (SP 1st round ≈ 1.4 GB, because it holds every cargo) and must be filtered down to Presidente.

Never hit TSE at request time. Ingest through scripts (download → verify SHA-512 → stream/filter → aggregate) into compact snapshots that the app reads. **No database in the MVP.** `npm run ingest` (`scripts/ingest/run.ts`; flags `--uf AC,SP --turno 2`) writes:
- `data/snapshots/`: aggregates (`resultados.json`, `municipios/<UF>.json`) and `manifest.json`. Committed, and read by server components at build time.
- `public/data/secoes/<turno>/<UF>/<cdMunicipio>.json.gz`: one file per municipality in the columnar format of `lib/section-codec.ts`. Committed and gzipped, about 33 MB in total (about 125 MB uncompressed). The browser fetches one on demand and decompresses it with `DecompressionStream`.

Raw zips are about 5 GB and live in `data/raw/` (gitignored). They never go to the repo or deploy. The ingestion reconciles the sum of the BUs against the official TSE totals. Every UF matches exactly; ZZ (exterior) only differs in section count, because some sections have no BU, and that is reported as an `aviso`. Note: in the CSV the 2nd round has `CD_PLEITO` 3221.

Production domain: **https://tse.lenoborges.com.br**. Visual identity follows lenoborges.com.br. The tokens are listed in `.specs/001 - MVP/context.md`: dark neumorphic theme, accent `#3986ff`, Outfit / DM Sans / JetBrains Mono, Tailwind v4. Candidate chart colors use **subtle party colors**: desaturated and tuned for the dark theme, applied only to data marks and never to UI chrome. A party color that is close to the brand accent gets shifted away from it. All of them are defined in one `party-colors` token map.

## Stack and project state

- **Next.js** (App Router). This one app covers both frontend and backend, using Route Handlers and Server Actions.
- No code or git history exists yet. Once the app is scaffolded, update this file with its build, lint and test commands and its architecture.
- Ports: `RULES.md` says the frontend runs on 4200 and the backend on 3000. Since Next.js serves both from one process, run the dev server on **3000** (`next dev`). If you need a different port, change it here and in `RULES.md`.

## Spec-driven workflow (from RULES.md — authoritative, read it for the full text)

Work is organized into **specs**. Each spec lives in its own folder under **`.specs/`** at the repo root (`.specs/<spec-name>/`) and contains:
- `context.md` — the spec's context/requirements, written in Markdown
- `tasks.md` — tasks grouped into **phases**
- `fix.md` — bug reports to fix (when present)

The user drives work with commands (in Portuguese). Behavior per command:

- **Spec** — create a new folder for the spec under `.specs/`, figure out what the requirements affect, write `context.md` in Markdown. Ask questions to keep it specific and objective.
- **Revisar** (also the default when no command is given) — infer project conventions from previous specs, review the current spec, find inconsistencies between `context.md` and `tasks.md`; fix obvious ones directly, ask about complex ones.
- **Formatar** — rewrite the spec's `context.md` as proper Markdown without changing its meaning; ask if needed.
- **Executar** — implement the spec:
  - One branch `feat/<name>` per phase, **one commit per task** in that phase.
  - Backend uses **TDD**: write the test suite before the implementation.
  - After all phases, merge the feat branches into `release/<spec-name>`.
  - Run the app (Next.js dev server, see Ports above), open Chrome and manually test every feature added, removed, or changed.
- **fix.md** — read the current `fix.md`:
  - If the spec is finished and merged into `main`: branch `fix/<bug-name>` and open a PR against `main`.
  - If the spec's PR against `main` is still open: commit the fix (as a `fix` commit) on the branch that owns that PR.
  - Correct inconsistencies found in `fix.md` and call them out in the PR.

When `context.md` / `tasks.md` disagree during execution, choose the path that favors easy maintenance and scalability, and **list the decisions taken at the top of the PR description**.
