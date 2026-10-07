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

/** 0.123 → "+12,3 p.p."; usa o sinal de menos tipográfico */
export const pp = (x: number, casas = 1) =>
  Number.isFinite(x) ? `${x >= 0 ? '+' : '−'}${decimal(casas).format(Math.abs(x * 100))} p.p.` : '—'

export const inteiro = (x: number) => inteiros.format(x)
export const compactar = (x: number) => compacto.format(x)
