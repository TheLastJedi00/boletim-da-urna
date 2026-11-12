/** Lei de Benford: proporção esperada e observada do primeiro dígito. */
export const benfordEsperado = () => Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)));

export function primeirosDigitos(valores: number[]): number[] {
  const cont = Array(9).fill(0);
  let n = 0;
  for (const v of valores) {
    if (!(v > 0)) continue;
    cont[Number(String(Math.floor(v))[0]) - 1]++;
    n++;
  }
  return cont.map((c) => (n ? c / n : 0));
}
