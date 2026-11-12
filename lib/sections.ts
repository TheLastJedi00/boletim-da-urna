/** Ordem das seções do estudo. Usada na navegação e no componente "próxima seção". */
export const SECTIONS = [
  { href: "/", label: "Início", short: "Início" },
  { href: "/sistema", label: "Como funciona o sistema eleitoral", short: "Sistema" },
  { href: "/resultados", label: "Resultados oficiais", short: "Resultados" },
  { href: "/pesquisas", label: "Pesquisas × urna", short: "Pesquisas" },
  { href: "/simulacoes", label: "Sinais de fraude: simulações hipotéticas", short: "Simulações" },
  { href: "/secao", label: "Confira uma seção", short: "Sua seção" },
  { href: "/metodologia", label: "Metodologia e fontes", short: "Metodologia" },
] as const;

export type SectionHref = (typeof SECTIONS)[number]["href"];

export function nextSection(current: SectionHref) {
  const i = SECTIONS.findIndex((s) => s.href === current);
  return i >= 0 && i < SECTIONS.length - 1 ? SECTIONS[i + 1] : undefined;
}

export const AUTHOR = {
  name: "Leno Borges",
  portfolio: "https://lenoborges.com.br",
  credit: "Estudo de caso feito por Leno Borges usando dados da Justiça Eleitoral",
} as const;
