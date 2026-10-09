import type { Local } from './dados'
import { inteiro } from './formato'
import { CANDIDATOS, type NumeroCandidato } from './modelo'
import { chaveLocal, km } from './virar'

/**
 * Uma escola da folha do bairro, sem lado: os números que não têm candidato (quem faltou, votos em aberto) e quem ficou à
 * frente no 1º turno, com o saldo possível dele (quem faltou × vantagem; o do outro é zero). Serve a quem apoia qualquer um.
 */
export type LinhaFolha = {
  chave: string
  nome: string
  bairro: string
  /** distância até a escola de partida, quando a folha é "perto de" uma escola */
  km?: number
  faltosos: number
  abertos: number
  /** quem ficou à frente na escola; null no empate */
  frente: NumeroCandidato | null
  /** vantagem de quem ficou à frente, em pontos (0–100) */
  pontos: number
  /** saldo possível de quem ficou à frente: a mesma conta da ferramenta */
  saldo: number
}

export function linhaFolha(l: Local & { km?: number }): LinhaFolha {
  const vantagem = l.validos > 0 ? (l.v13 - l.v22) / l.validos : 0
  return {
    chave: chaveLocal(l),
    nome: l.nome,
    bairro: l.bairro,
    km: l.km,
    faltosos: l.faltosos,
    abertos: l.abertos,
    frente: vantagem > 0 ? 13 : vantagem < 0 ? 22 : null,
    pontos: Math.abs(vantagem) * 100,
    saldo: l.faltosos * Math.abs(vantagem),
  }
}

/** Quantas escolas vão no texto: o resto fica no link. */
const NO_TEXTO = 10

/**
 * A folha em texto puro, para colar no grupo: as escolas, as duas conversas, a lei e os limites, com o link da folha.
 * Sem candidato, como o resto do que o site compartilha.
 */
export function textoFolha({ titulo, lugar, linhas, url }: { titulo: string; lugar: string; linhas: LinhaFolha[]; url: string }): string {
  const faltaram = linhas.reduce((s, l) => s + l.faltosos, 0)
  const abertos = linhas.reduce((s, l) => s + l.abertos, 0)
  const escolas = linhas.slice(0, NO_TEXTO).map((l, i) => {
    const distancia = l.km === undefined ? '' : ` (${km(l.km)})`
    const frente = l.frente ? `${CANDIDATOS[l.frente].curto} à frente` : 'empate'
    return `${i + 1}. ${l.nome}${distancia}: ${inteiro(l.faltosos)} faltaram, ${inteiro(l.abertos)} votos em aberto, ${frente}`
  })
  return [
    `Folha do bairro: ${titulo}, ${lugar}`,
    '2º turno: domingo, 25 de outubro',
    '',
    `Nas ${linhas.length} escolas, no 1º turno: ${inteiro(faltaram)} pessoas faltaram e ${inteiro(abertos)} votaram em outro candidato, branco ou nulo.`,
    '',
    ...escolas,
    ...(linhas.length > NO_TEXTO ? [`(e mais ${linhas.length - NO_TEXTO} no link)`] : []),
    '',
    'Duas conversas:',
    '- Onde o seu candidato ficou à frente: lembrar quem faltou, e também quem já votou nele, de votar no dia 25 (data, local no e-Título, documento com foto).',
    '- Em qualquer escola: conversar com quem votou em outro candidato, branco ou nulo, ouvindo antes de argumentar.',
    '',
    'Dentro da lei: nada em troca do voto; não transportar eleitores; nada de boca de urna no dia 25; só informação verdadeira, com fonte.',
    '',
    'Limites: os números são do 1º turno e descrevem escolas, não pessoas. Quem faltou é um teto (inclui quem mudou de cidade ou tem voto facultativo), e os votos em aberto não têm lado.',
    url,
  ].join('\n')
}
