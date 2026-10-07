import type { Historia } from './dados'

/** Quanto o erro de adivinhação cai sabendo estado e município (média dos dois candidatos, de 5 em 5%). */
export function quedaComMunicipio(h: Historia): number {
  const queda = (['13', '22'] as const).map((n) => 1 - h.adivinhacao[n][2].erro_medio / h.adivinhacao[n][0].erro_medio)
  return Math.round(((queda[0] + queda[1]) / 2) * 20) / 20
}
