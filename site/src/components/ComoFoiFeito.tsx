import type { Conferencia, Explicacao, Resumo } from '../lib/dados'
import { inteiro, pct } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

type Etapa = { titulo: string; texto: string; numero?: string }

/** O site em uma tela, em linguagem simples: o "como funciona" do primeiro bloco de Método e dados. */
export function ComoFoiFeito({ resumo, conferencia, explicacao, candidato }: {
  resumo: Resumo
  conferencia: Conferencia
  explicacao: Explicacao
  candidato: NumeroCandidato
}) {
  const n = String(candidato) as '13' | '22'
  const cand = CANDIDATOS[candidato]
  const icc = resumo.modelos[n].icc
  const lisa = explicacao.espacial.candidatos[n].completo.lisa
  const etapas: Etapa[] = [
    {
      titulo: 'A pergunta',
      texto:
        'Quanto do resultado de uma urna vem do estado, da cidade e da própria urna? E, para o 2º turno: em que bairros e escolas há mais gente para conversar?',
    },
    {
      titulo: 'Os dados',
      texto:
        'Boletins de urna, perfil do eleitorado e locais de votação, do TSE; Censo e PIB, do IBGE; Bolsa Família, do MDS; exportações, do MDIC. Todos públicos.',
      numero: `${inteiro(resumo.totais.secoes)} urnas em ${inteiro(resumo.totais.locais)} escolas`,
    },
    {
      titulo: 'A conferência',
      texto:
        'Cada arquivo do TSE foi conferido com a assinatura digital publicada pelo tribunal, e cada urna, com o resultado oficial. A conferência roda de novo a cada publicação do site.',
      numero: `${inteiro(conferencia.brasil.conferem)} de ${inteiro(conferencia.brasil.secoes)} urnas idênticas ao resultado oficial`,
    },
    {
      titulo: 'As contas da ferramenta',
      texto:
        'Quem faltou e quem votou em outro candidato, branco ou nulo são somas simples, escola por escola. Só a opção avançada, “votos abaixo do esperado”, depende do modelo.',
      numero: `${inteiro(resumo.totais.abstencoes)} pessoas faltaram; ${inteiro(resumo.ufs.reduce((s, u) => s + u.abertos, 0))} votos ficaram fora dos dois finalistas`,
    },
    {
      titulo: 'O modelo',
      texto:
        'Um modelo estatístico separa o resultado de cada urna em camadas: o que é do estado, da cidade e da própria urna. Depois, mede quanto o perfil dos lugares explica cada camada.',
      numero: `${cand.curto}: estado ${pct(icc.UF, 0)} · cidade ${pct(icc.município, 0)} · urna ${pct(icc.seção, 0)} da diferença entre urnas`,
    },
    {
      titulo: 'Os vizinhos',
      texto: 'Por fim, cada cidade é comparada com as vizinhas, para achar bolsões e regiões que votam parecido.',
      numero: `${cand.curto}: ${inteiro(lisa['alto cercado de alto'] + lisa['baixo cercado de baixo'])} cidades em bolsões`,
    },
  ]

  return (
    <ol className="etapas">
      {etapas.map((e, i) => (
        <li key={e.titulo}>
          <span className="etapa-numero" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <h3>{e.titulo}</h3>
            <p>{e.texto}</p>
            {e.numero && <p className="etapa-dado">{e.numero}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
