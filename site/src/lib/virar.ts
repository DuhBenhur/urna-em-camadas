import type { NumeroCandidato } from './modelo'

/**
 * "Onde virar voto": duas contas simples sobre o 1º turno, iguais para os dois candidatos.
 *
 * - Lembrar quem faltou: saldo possível = faltosos × (votos do candidato − votos do adversário) ÷ válidos, só onde o
 *   candidato ficou à frente. Supõe que quem faltou votaria como os vizinhos que votaram (suposição forte: quem falta
 *   costuma ser mais jovem, mais velho ou mais pobre que quem vota). É um teto, não uma previsão.
 * - Conversar com quem ficou de fora: votos nos outros 10 candidatos + brancos + nulos. Não se sabe para que lado tendem.
 *
 * No 2º turno presidencial cada voto vale o mesmo no país inteiro, então o critério é quantas pessoas alcançáveis há
 * perto, não se o lugar é disputado.
 */
export type Lente = 'faltosos' | 'abertos'

/**
 * Qualquer lugar agregado: estado, município, bairro ou local de votação. Estados e municípios trazem `saldo13`/`saldo22`
 * já somados escola por escola (pipeline/07); num local de votação o saldo é calculado aqui.
 */
export type Lugar = {
  validos: number
  v13: number
  v22: number
  faltosos: number
  abertos: number
  saldo13?: number
  saldo22?: number
}

export const LENTES: Record<Lente, { titulo: string; curto: string; medida: string }> = {
  faltosos: {
    titulo: 'Lembrar quem faltou',
    curto: 'quem faltou',
    medida: 'saldo possível',
  },
  abertos: {
    titulo: 'Conversar com quem ficou de fora',
    curto: 'quem ficou de fora',
    medida: 'votos em aberto',
  },
}

const adversario = (n: NumeroCandidato): NumeroCandidato => (n === 13 ? 22 : 13)

/** Vantagem do candidato no lugar, em proporção dos válidos (−1 a 1). */
export function vantagem(l: Lugar, n: NumeroCandidato): number {
  if (l.validos <= 0) return 0
  const o = adversario(n)
  return ((n === 13 ? l.v13 : l.v22) - (o === 13 ? l.v13 : l.v22)) / l.validos
}

/** O número que ordena os lugares em cada lente. */
export function potencial(l: Lugar, n: NumeroCandidato, lente: Lente): number {
  if (lente === 'abertos') return l.abertos
  const somado = n === 13 ? l.saldo13 : l.saldo22
  if (somado !== undefined && somado !== null) return somado
  return Math.max(0, l.faltosos * vantagem(l, n))
}

/** Soma lugares (ex.: locais de votação de um mesmo bairro). */
export function somar<T extends Lugar>(itens: T[]): Lugar {
  return itens.reduce(
    (s, l) => ({
      validos: s.validos + l.validos,
      v13: s.v13 + l.v13,
      v22: s.v22 + l.v22,
      faltosos: s.faltosos + l.faltosos,
      abertos: s.abertos + l.abertos,
    }),
    { validos: 0, v13: 0, v22: 0, faltosos: 0, abertos: 0 },
  )
}

/** Soma do potencial de cada item: o saldo de um bairro é a soma dos saldos das suas escolas (não o saldo da soma). */
export function potencialSomado<T extends Lugar>(itens: T[], n: NumeroCandidato, lente: Lente): number {
  return itens.reduce((s, l) => s + potencial(l, n, lente), 0)
}

/** "Perto de você": até 2 km, uma caminhada de meia hora, no mesmo município. */
export const RAIO_PERTO_KM = 2

/** Chave de uma escola dentro do município: "{zona}-{local}" (o número do local só é único dentro dele). */
export const chaveLocal = (l: { zona: number; local: number }) => `${l.zona}-${l.local}`

type Ponto = { lat: number; lon: number }

/** Distância em km entre dois pontos (haversine, raio médio da Terra). */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Escolas com coordenada a até `km` do centro, da mais perto para a mais longe (a do centro entra, a 0 km). */
export function escolasPerto<T extends { lat: number | null; lon: number | null }>(locais: T[], centro: Ponto, km = RAIO_PERTO_KM): (T & { km: number })[] {
  return locais
    .filter((l) => l.lat !== null && l.lon !== null)
    .map((l) => ({ ...l, km: distanciaKm(centro, { lat: l.lat!, lon: l.lon! }) }))
    .filter((l) => l.km <= km)
    .sort((a, b) => a.km - b.km)
}

/** "0,8 km" */
export const km = (x: number) => `${x.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`

/** Ordena por potencial e devolve os primeiros. */
export function ranquear<T extends Lugar>(itens: T[], n: NumeroCandidato, lente: Lente, quantos: number): (T & { valor: number })[] {
  return itens
    .map((l) => ({ ...l, valor: potencial(l, n, lente) }))
    .filter((l) => l.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, quantos)
}
