/**
 * Escala divergente vermelho (Lula) ↔ cinza ↔ azul (Flávio), em 7 classes.
 * Azul: rampa sequencial da paleta de referência. Vermelho: calculado com a mesma luminosidade
 * OKLCH de cada degrau do azul, no matiz de #e34948 (ver docs/plano_de_analise.md).
 * No modo escuro a âncora inverte: perto do meio fica escuro (recua para a superfície), os extremos acendem.
 * O extremo escuro não é o degrau 200 (croma 0,08, abaixo do piso de 0,10: no mapa lia como pastel, "fraco");
 * é o mesmo L de 0,72 com croma máximo no gamut, para "mais votos" continuar parecendo mais intenso.
 * Cada braço passa no validate_palette.js --ordinal --mode dark --surface #1a1a19.
 */
const AZUL = { 200: '#9ec5f4', 400: '#3987e5', 600: '#184f95', vivo: '#5fa7ff' }
const VERMELHO = { 200: '#f8aaa3', 400: '#e24a48', 600: '#911e22', vivo: '#ff716b' }

export const ESCALA_CLARA = [VERMELHO[600], VERMELHO[400], VERMELHO[200], '#f0efec', AZUL[200], AZUL[400], AZUL[600]]
export const ESCALA_ESCURA = [VERMELHO.vivo, VERMELHO[400], VERMELHO[600], '#383835', AZUL[600], AZUL[400], AZUL.vivo]

export function temaEscuro(): boolean {
  const forcado = document.documentElement.dataset.theme
  if (forcado) return forcado === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const escalaAtual = () => (temaEscuro() ? ESCALA_ESCURA : ESCALA_CLARA)

/**
 * Rampas sequenciais de 5 classes do mapa "Onde virar voto": uma cor, do pouco para o muito. No claro, degraus 250 → 650
 * da rampa azul de referência (250 é o mais claro que ainda passa de 2:1 na superfície); no escuro a âncora inverte,
 * 600 → 200 (o pouco recua para a superfície, o muito acende).
 * Vermelho: mesma luminosidade OKLCH de cada degrau, no matiz de #e34948, croma = 1,175 × o do azul (limitado ao gamut),
 * a mesma regra que gerou o braço vermelho da escala divergente acima.
 * Cinza ("votos em aberto", que não têm lado): mesmas luminosidades, no matiz das tintas do site (croma 0,008).
 * Cada rampa passa no validate_palette.js --ordinal no seu modo (superfícies #fcfcfb e #1a1a19).
 */
export type Rampa = 'lula' | 'flavio' | 'neutra'
const SEQUENCIAL: Record<Rampa, { claro: string[]; escuro: string[] }> = {
  flavio: {
    claro: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
    escuro: ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
  },
  lula: {
    claro: ['#f2958e', '#e76762', '#d2383a', '#a72528', '#7e1419'],
    escuro: ['#911e22', '#bb3032', '#e24a48', '#ee7e77', '#f8aaa3'],
  },
  neutra: {
    claro: ['#b4b2ad', '#979590', '#7a7974', '#5f5d58', '#45443f'],
    escuro: ['#52504c', '#6d6b66', '#888781', '#a5a49e', '#c3c1bc'],
  },
}

export const sequencialAtual = (rampa: Rampa) => (temaEscuro() ? SEQUENCIAL[rampa].escuro : SEQUENCIAL[rampa].claro)

/**
 * Mapas do 2º turno: cinza onde Flávio ganhou (ou Lula não avançou), vermelho onde Lula ganhou, e degraus da rampa vermelha
 * acima. Cinza = degrau mais claro da rampa neutra; vermelhos = degraus da rampa de Lula acima. O cinza contra o primeiro
 * vermelho passa na separação para daltonismo (ΔE ≥ 10 no validate_palette.js, nos dois modos); cada trio vermelho passa
 * no --ordinal. Contraste do cinza com a superfície fica em ~2:1: a mesma informação está nas tabelas da página.
 * `vitoria`: Flávio ganhou · Lula ganhou · virou (Flávio à frente no 1º turno, Lula no 2º), em verde (pedido do usuário, 26/10:
 * um vermelho mais claro parecia "menos votos"). Vermelho x verde é o par que o daltonismo mais confunde: o verde fica longe do
 * vermelho em luminosidade (escuro no tema claro, vivo no escuro) e passa com ΔE > 10 contra os outros dois (--pairs all).
 * `avanco`: Lula não avançou · até 3 pontos · 3 a 6 · mais de 6.
 */
const SEGUNDO_TURNO = {
  vitoria: { claro: ['#b4b2ad', '#e76762', '#0a5c2b'], escuro: ['#52504c', '#e24a48', '#4fd17f'] },
  avanco: { claro: ['#b4b2ad', '#e76762', '#d2383a', '#7e1419'], escuro: ['#52504c', '#e24a48', '#ee7e77', '#f8aaa3'] },
}

export const segundoTurnoAtual = (vista: 'vitoria' | 'avanco') =>
  temaEscuro() ? SEGUNDO_TURNO[vista].escuro : SEGUNDO_TURNO[vista].claro

/** Classe de 0 a 4 numa escala sequencial: `cortes` são os 4 limites inferiores das classes 1 a 4. */
export function classeSequencial(valor: number, cortes: [number, number, number, number]): number {
  let c = 0
  while (c < 4 && valor >= cortes[c]) c++
  return c
}

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
