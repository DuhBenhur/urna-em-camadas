import type { Municipio, Resumo, UF } from './dados'

export type NumeroCandidato = 13 | 22

export const CANDIDATOS: Record<NumeroCandidato, { nome: string; curto: string; partido: string; cor: string }> = {
  13: { nome: 'Lula', curto: 'Lula', partido: 'PT', cor: 'var(--lula)' },
  22: { nome: 'Flávio Bolsonaro', curto: 'Flávio', partido: 'PL', cor: 'var(--flavio)' },
}

export const expit = (x: number) => 1 / (1 + Math.exp(-x))

export type Camada = {
  chave: 'brasil' | 'estado' | 'municipio' | 'secao'
  rotulo: string
  detalhe: string
  valor: number
  delta: number | null
}

/**
 * Decomposição do modelo nulo de três níveis (seção em município em UF), no logit:
 *   logit(p) = γ00 + u_UF + u_município + e_seção
 * Cada camada soma um termo e volta para a escala de proporção.
 */
export function camadas(
  resumo: Resumo,
  uf: UF,
  municipio: Municipio,
  votos: number,
  validos: number,
  numero: NumeroCandidato,
): Camada[] {
  const g00 = resumo.modelos[String(numero) as '13' | '22'].intercepto
  const uUf = numero === 13 ? uf.u13 : uf.u22
  const uMun = numero === 13 ? municipio.u13 : municipio.u22
  const brasil = expit(g00)
  const estado = expit(g00 + uUf)
  const mun = expit(g00 + uUf + uMun)
  const secao = validos > 0 ? votos / validos : NaN
  return [
    { chave: 'brasil', rotulo: 'Urna típica do Brasil', detalhe: 'ponto de partida do modelo', valor: brasil, delta: null },
    { chave: 'estado', rotulo: `+ efeito do estado`, detalhe: uf.nome, valor: estado, delta: estado - brasil },
    { chave: 'municipio', rotulo: `+ efeito do município`, detalhe: municipio.nome, valor: mun, delta: mun - estado },
    { chave: 'secao', rotulo: '= sua urna', detalhe: 'resultado real da seção', valor: secao, delta: secao - mun },
  ]
}

/** Efeito do estado em pontos percentuais, relativo à urna típica do Brasil. */
export function efeitoEstado(resumo: Resumo, uf: UF, numero: NumeroCandidato): number {
  const g00 = resumo.modelos[String(numero) as '13' | '22'].intercepto
  return expit(g00 + (numero === 13 ? uf.u13 : uf.u22)) - expit(g00)
}

/** Efeito do município em pontos percentuais, relativo ao nível do seu estado. */
export function efeitoMunicipio(resumo: Resumo, uf: UF, municipio: Municipio, numero: NumeroCandidato): number {
  const g00 = resumo.modelos[String(numero) as '13' | '22'].intercepto
  const base = g00 + (numero === 13 ? uf.u13 : uf.u22)
  return expit(base + (numero === 13 ? municipio.u13 : municipio.u22)) - expit(base)
}
