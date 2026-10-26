import { segundoTurnoAtual, sequencialAtual } from './cores'
import { registros, useDados, type IndiceMunicipios, type Local, type Municipio, type Tabela } from './dados'

/** Os números de um lugar em um turno (Presidente). */
export type Turno = { aptos: number; comparecimento: number; validos: number; v13: number; v22: number }
export type TurnoBrasil = Turno & { abstencoes: number; brancos: number; nulos: number }

/** Um lugar (o país, um estado, uma cidade) com os dois turnos lado a lado. */
export type DoisTurnos = { t1: Turno; t2: Turno }

export type EstadoDoisTurnos = DoisTurnos & { uf: string; nome: string }
export type CidadeDoisTurnos = DoisTurnos & { cd: number; ibge: number; nome: string; uf: string }

type Bruto = {
  fonte: string
  gerado_tse: string
  brasil: { t1: TurnoBrasil; t2: TurnoBrasil }
  pais: { t1: Turno; t2: Turno }
  exterior: TurnoBrasil
  ufs: Tabela
  municipios: Tabela
}

export type SegundoTurno = {
  fonte: string
  gerado_tse: string
  /** resultado oficial do Brasil, com o exterior: os números que o TSE anunciou */
  brasil: { t1: TurnoBrasil; t2: TurnoBrasil }
  /** as 27 unidades da federação, sem o exterior: a base para comparar com estados e cidades */
  pais: DoisTurnos
  exterior: TurnoBrasil
  estados: EstadoDoisTurnos[]
  /** 2º turno por código TSE do município; o 1º turno vem do índice de municípios */
  municipios: Map<number, Turno>
}

type LinhaUf = { uf: string; nome: string } & Record<`${keyof Turno}_${1 | 2}`, number>

const doTurno = (l: LinhaUf, t: 1 | 2): Turno => ({
  aptos: l[`aptos_${t}`], comparecimento: l[`comparecimento_${t}`], validos: l[`validos_${t}`], v13: l[`v13_${t}`], v22: l[`v22_${t}`],
})

function montar(b: Bruto): SegundoTurno {
  return {
    fonte: b.fonte,
    gerado_tse: b.gerado_tse,
    brasil: b.brasil,
    pais: b.pais,
    exterior: b.exterior,
    estados: registros<LinhaUf>(b.ufs).map((l) => ({ uf: l.uf, nome: l.nome, t1: doTurno(l, 1), t2: doTurno(l, 2) })),
    municipios: new Map(registros<Turno & { cd: number }>(b.municipios).map(({ cd, ...t }) => [cd, t])),
  }
}

export const useSegundoTurno = () => useDados<SegundoTurno>('segundo_turno.json', montar as (b: never) => SegundoTurno)

/** O 1º turno de uma cidade, a partir do índice de municípios (boletins de urna conferidos com o TSE). */
export const primeiroTurno = (m: Municipio): Turno => ({
  aptos: m.aptos, comparecimento: m.aptos - m.faltosos, validos: m.validos, v13: m.v13, v22: m.v22,
})

/** Os arquivos de locais já trazem o 2º turno de cada escola? (Só depois de o TSE publicar os boletins do 2º turno.) */
export const temEscolas2t = (locais: Local[]) => locais.some((l) => l.v13_2 !== undefined && l.v13_2 !== null)

/**
 * Os dois turnos de uma escola, ou null se ela não teve urna no 2º turno. No 1º, os aptos são faltosos + votos em aberto
 * + os votos dos dois finalistas (a identidade das contas da ferramenta).
 */
export function escolaDoisTurnos(l: Local): DoisTurnos | null {
  const { aptos_2, faltosos_2, validos_2, v13_2, v22_2 } = l
  if ([aptos_2, faltosos_2, validos_2, v13_2, v22_2].some((x) => x === undefined || x === null)) return null
  const aptos1 = l.faltosos + l.abertos + l.v13 + l.v22
  return {
    t1: { aptos: aptos1, comparecimento: aptos1 - l.faltosos, validos: l.validos, v13: l.v13, v22: l.v22 },
    t2: { aptos: aptos_2!, comparecimento: aptos_2! - faltosos_2!, validos: validos_2!, v13: v13_2!, v22: v22_2! },
  }
}

export function cidades(indice: IndiceMunicipios, st: SegundoTurno): CidadeDoisTurnos[] {
  const lista: CidadeDoisTurnos[] = []
  for (const m of indice.lista) {
    const t2 = st.municipios.get(m.cd)
    if (t2) lista.push({ cd: m.cd, ibge: m.ibge, nome: m.nome, uf: m.uf, t1: primeiroTurno(m), t2 })
  }
  return lista
}

/** Lula − Flávio, em proporção dos votos válidos (positivo: Lula à frente). */
export const margem = (t: Turno) => (t.validos > 0 ? (t.v13 - t.v22) / t.validos : 0)
export const abstencao = (t: Turno) => (t.aptos > 0 ? (t.aptos - t.comparecimento) / t.aptos : 0)
export const lulaPct = (t: Turno) => (t.validos > 0 ? t.v13 / t.validos : 0)

/** Quanto a diferença Lula − Flávio andou para o lado de Lula do 1º para o 2º turno (proporção). */
export const avanco = (l: DoisTurnos) => margem(l.t2) - margem(l.t1)
/** Quanto a abstenção caiu (proporção; negativo: subiu). */
export const quedaAbstencao = (l: DoisTurnos) => abstencao(l.t1) - abstencao(l.t2)
/** Pessoas a mais que foram votar no 2º turno (negativo: a menos). */
export const aMais = (l: DoisTurnos) => l.t2.comparecimento - l.t1.comparecimento

/**
 * "Virou": entre os dois finalistas, Flávio estava à frente no 1º turno e Lula ficou à frente no 2º.
 * `virouFlavio`, o contrário. Quem teve mais votos no 1º turno entre os outros candidatos não entra na conta.
 */
export type Situacao = 'virou' | 'ganhou' | 'virouFlavio' | 'perdeu' | 'empate'
export function situacao(l: DoisTurnos): Situacao {
  const { t1, t2 } = l
  if (t2.v13 === t2.v22) return 'empate'
  if (t2.v13 > t2.v22) return t1.v13 < t1.v22 ? 'virou' : 'ganhou'
  return t1.v13 > t1.v22 ? 'virouFlavio' : 'perdeu'
}

export type VistaSegundo = 'vitoria' | 'avanco' | 'votar'

export const VISTAS: [VistaSegundo, string][] = [
  ['vitoria', 'Onde Lula ganhou'],
  ['avanco', 'Onde Lula mais avançou'],
  ['votar', 'Onde mais gente foi votar'],
]

export const lerVista = (v: string | null): VistaSegundo => (v === 'avanco' || v === 'votar' ? v : 'vitoria')

// cortes fixos, em proporção: o avanço mediano das cidades foi de 4,5 pontos; a queda mediana da abstenção, de 1,9
const CORTES_AVANCO = [0.03, 0.06]
const CORTES_VOTAR = [0, 0.01, 0.02, 0.04]

/** Classe de cor de um lugar em cada vista (índice na paleta da vista). */
export function classeSegundo(l: DoisTurnos, vista: VistaSegundo): number {
  if (vista === 'vitoria') {
    const s = situacao(l)
    return s === 'virou' ? 2 : s === 'ganhou' ? 1 : 0
  }
  if (vista === 'avanco') {
    const a = avanco(l)
    if (a <= 0) return 0
    return 1 + CORTES_AVANCO.filter((c) => a >= c).length
  }
  const q = quedaAbstencao(l)
  return CORTES_VOTAR.filter((c) => q > c).length
}

/** Cores da vista no tema atual, na ordem das classes. */
export const coresSegundo = (vista: VistaSegundo): string[] => (vista === 'votar' ? sequencialAtual('neutra') : segundoTurnoAtual(vista))

/** Rótulos da legenda, na ordem das classes. */
export const ROTULOS_SEGUNDO: Record<VistaSegundo, string[]> = {
  vitoria: ['Flávio ganhou ou empatou', 'Lula ganhou', 'Virou para Lula'],
  avanco: ['Lula não avançou', 'até 3 pontos', '3 a 6 pontos', 'mais de 6 pontos'],
  votar: ['a abstenção não caiu', 'caiu até 1 ponto', '1 a 2 pontos', '2 a 4 pontos', 'mais de 4 pontos'],
}

export const TITULOS_LEGENDA: Record<VistaSegundo, string> = {
  vitoria: 'Quem ganhou cada cidade no 2º turno',
  avanco: 'Quanto a diferença andou para o lado de Lula, do 1º para o 2º turno',
  votar: 'Quanto a abstenção caiu do 1º para o 2º turno',
}
