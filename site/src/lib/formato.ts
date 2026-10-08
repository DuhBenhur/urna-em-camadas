const formatadores = new Map<number, Intl.NumberFormat>()

function decimal(casas: number): Intl.NumberFormat {
  let f = formatadores.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatadores.set(casas, f)
  }
  return f
}

const inteiros = new Intl.NumberFormat('pt-BR')
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** 0.6058 → "60,6%" */
export const pct = (x: number, casas = 1) => (Number.isFinite(x) ? `${decimal(casas).format(x * 100)}%` : '—')

/**
 * Diferenças de percentual em "pontos": 1 ponto = 1 voto a mais (ou a menos) em cada 100 votos válidos.
 * "Ponto" no singular abaixo de 2 (1,5 ponto), como manda o português para decimais.
 */
const unidade = (absoluto: number, casas: number) => (Number(absoluto.toFixed(casas)) < 2 ? 'ponto' : 'pontos')

/** Valor em pontos (0–100) com sinal: 3.2 → "+3,2 pontos"; o que arredonda para zero sai sem sinal */
export const pontosComSinal = (v: number, casas = 1) => {
  if (!Number.isFinite(v)) return '—'
  const absoluto = Math.abs(v)
  if (Number(absoluto.toFixed(casas)) === 0) return `${decimal(casas).format(0)} ponto`
  return `${v > 0 ? '+' : '−'}${decimal(casas).format(absoluto)} ${unidade(absoluto, casas)}`
}

/** Diferença de proporções em pontos: 0.123 → "+12,3 pontos"; usa o sinal de menos tipográfico */
export const pp = (x: number, casas = 1) => pontosComSinal(x * 100, casas)

export const inteiro = (x: number) => inteiros.format(x)
export const compactar = (x: number) => compacto.format(x)

/** Para frases: 32_894_899 → "32,9 milhões"; abaixo de 1 milhão, o número inteiro */
export const milhoes = (x: number) => {
  if (Math.abs(x) < 1e6) return inteiro(Math.round(x))
  const m = Number((x / 1e6).toFixed(1))
  return `${decimal(1).format(m)} ${m < 2 ? 'milhão' : 'milhões'}`
}

/** Valor já em pontos, sem sinal: 14.5 → "14,5 pontos" */
export const pontos = (x: number, casas = 1) => (Number.isFinite(x) ? `${decimal(casas).format(x)} ${unidade(Math.abs(x), casas)}` : '—')

/** Proporção em linguagem de todo dia: 0.68 → "68 de cada 100" */
export const cada100 = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)} de cada 100` : '—')
