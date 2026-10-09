/** Escalas e classes dos mapas, sem o MapLibre: as legendas usam isto sem carregar o mapa. */
import type { Rampa } from './cores'
import type { NumeroCandidato } from './modelo'
import type { Lente } from './virar'

export type VariavelMapa = 'margem' | 'efeito' | 'semperfil' | 'bolsoes' | 'regioes' | 'virar'

/**
 * "Onde virar voto": limites inferiores das classes 2 a 5 de cada conta, por 100 eleitores aptos. Fixos e iguais para os
 * dois candidatos, para os dois mapas poderem ser comparados; números redondos, tirados da distribuição dos municípios
 * (em 08/10/2026: um terço dos municípios tem saldo zero; a mediana dos votos em aberto é 7,9; a do perfil, cerca de 1).
 */
export const CORTES_VIRAR: Record<Lente, [number, number, number, number]> = {
  faltosos: [1, 3, 6, 10],
  abertos: [6, 8, 10, 12],
  perfil: [0.5, 1, 2, 3],
}

/** Votos em aberto não têm lado: rampa cinza. As outras contas são de um candidato: a cor dele. */
export const rampaVirar = (lente: Lente, candidato: NumeroCandidato): Rampa => (lente === 'abertos' ? 'neutra' : candidato === 13 ? 'lula' : 'flavio')

export const umaCasa = (x: number) => x.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export const LIMITES: Record<'margem' | 'efeito', [number, number, number]> = {
  margem: [0.05, 0.2, 0.4],
  efeito: [0.025, 0.075, 0.15],
}

// LISA (pipeline/11): 1 alto cercado de alto, 2 baixo cercado de alto, 3 baixo cercado de baixo, 4 alto cercado de baixo.
// "Alto" é mais voto no candidato escolhido do que o perfil e a região fariam prever: vai para o lado da cor dele.
export const CLASSE_LISA: Record<number, [number, number]> = { 0: [3, 3], 1: [0, 6], 4: [2, 4], 2: [4, 2], 3: [6, 0] }
export const ROTULOS_LISA: Record<number, string> = {
  1: 'bolsão acima do esperado',
  4: 'acima do esperado, cercado de abaixo',
  0: 'sem padrão espacial',
  2: 'abaixo do esperado, cercado de acima',
  3: 'bolsão abaixo do esperado',
}
