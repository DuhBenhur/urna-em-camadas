/**
 * Escala divergente vermelho (Lula) ↔ cinza ↔ azul (Flávio), em 7 classes.
 * Azul: rampa sequencial da paleta de referência. Vermelho: calculado com a mesma luminosidade
 * OKLCH de cada degrau do azul, no matiz de #e34948 (ver docs/plano_de_analise.md).
 * No modo escuro a âncora inverte: perto do meio fica escuro (recua para a superfície), os extremos acendem.
 */
const AZUL = { 200: '#9ec5f4', 400: '#3987e5', 600: '#184f95' }
const VERMELHO = { 200: '#f8aaa3', 400: '#e24a48', 600: '#911e22' }

export const ESCALA_CLARA = [VERMELHO[600], VERMELHO[400], VERMELHO[200], '#f0efec', AZUL[200], AZUL[400], AZUL[600]]
export const ESCALA_ESCURA = [VERMELHO[200], VERMELHO[400], VERMELHO[600], '#383835', AZUL[600], AZUL[400], AZUL[200]]

export function temaEscuro(): boolean {
  const forcado = document.documentElement.dataset.theme
  if (forcado) return forcado === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const escalaAtual = () => (temaEscuro() ? ESCALA_ESCURA : ESCALA_CLARA)

/**
 * Classe de 0 a 6 para um valor divergente. `limites` são os 3 cortes positivos (o negativo é espelhado):
 * valores muito pró-Lula ficam na classe 0 (vermelho forte) e muito pró-Flávio na 6.
 * `positivoLula`: se true, valor positivo significa mais Lula.
 */
export function classe(valor: number, limites: [number, number, number], positivoLula = true): number {
  const v = positivoLula ? valor : -valor
  const [a, b, c] = limites
  if (v >= c) return 0
  if (v >= b) return 1
  if (v >= a) return 2
  if (v > -a) return 3
  if (v > -b) return 4
  if (v > -c) return 5
  return 6
}
