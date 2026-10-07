// Artigo de cada UF: "no Paraná", "na Bahia", "em Goiás" ('' = sem artigo)
const ARTIGO: Record<string, 'o' | 'a' | ''> = {
  AC: 'o', AL: '', AM: 'o', AP: 'o', BA: 'a', CE: 'o', DF: 'o', ES: 'o', GO: '', MA: 'o', MG: '', MS: '', MT: '', PA: 'o',
  PB: 'a', PE: '', PI: 'o', PR: 'o', RJ: 'o', RN: 'o', RO: '', RR: '', RS: 'o', SC: '', SE: '', SP: '', TO: 'o',
}

const CONTRACAO = {
  de: { o: 'do', a: 'da', '': 'de' },
  em: { o: 'no', a: 'na', '': 'em' },
  para: { o: 'para o', a: 'para a', '': 'para' },
}

/** comPreposicao('de', 'PR', 'Paraná') → "do Paraná" */
export const comPreposicao = (preposicao: keyof typeof CONTRACAO, uf: string, nome: string) =>
  `${CONTRACAO[preposicao][ARTIGO[uf] ?? '']} ${nome}`
