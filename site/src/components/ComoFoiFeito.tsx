import { Link } from 'react-router-dom'
import type { Resumo } from '../lib/dados'
import { DECISOES } from '../lib/decisoes'
import { inteiro, pct } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { REPOSITORIO } from '../lib/projeto'

type Etapa = { titulo: string; situacao: 'feito' | 'em andamento' | 'a seguir'; texto: string; numero?: string }

// 4 percentuais do g1 (1ª ZE) + 7 totais oficiais de SP: pipeline/03_validar_controle.py
const CONFERENCIAS = 11

export function ComoFoiFeito({ resumo, candidato }: { resumo: Resumo; candidato: NumeroCandidato }) {
  const icc = resumo.modelos[String(candidato) as '13' | '22'].icc
  const etapas: Etapa[] = [
    {
      titulo: 'A pergunta',
      situacao: 'feito',
      texto:
        'Quanto do resultado de uma urna vem do estado, do município e da própria seção? O desenho vem de um estudo sobre a renda nos estados brasileiros, agora aplicado ao voto.',
    },
    {
      titulo: 'Os dados',
      situacao: 'feito',
      texto:
        'Boletins de urna das 27 UFs, perfil do eleitorado e locais de votação (TSE); Censo e PIB (IBGE); Bolsa Família (MDS). Quase 8 GB compactados, todos públicos.',
      numero: `${inteiro(resumo.totais.secoes)} urnas em ${inteiro(resumo.totais.locais)} locais de votação`,
    },
    {
      titulo: 'A conferência',
      situacao: 'feito',
      texto:
        'Cada arquivo tem a assinatura (SHA-512) conferida com a publicada pelo TSE. Antes de qualquer conta, a base reproduz a totalização oficial de São Paulo e o resultado da 1ª Zona publicado pelo g1.',
      numero: `${CONFERENCIAS} de ${CONFERENCIAS} conferências batem exatamente`,
    },
    {
      titulo: 'O modelo',
      situacao: 'feito',
      texto: 'Regressão multinível de três níveis (seção, município, estado), ajustada com gpboost e conferida com statsmodels.',
      numero: `${CANDIDATOS[candidato].curto}: estado ${pct(icc.UF, 0)} · município ${pct(icc.município, 0)} · seção ${pct(icc.seção, 0)} da variação`,
    },
    {
      titulo: 'O espaço',
      situacao: 'em andamento',
      texto:
        'Quem é vizinho de quem, pela malha do IBGE. A seguir: autocorrelação espacial (vizinhos se parecem mais do que o acaso explica?) e regiões de voto parecido.',
    },
    {
      titulo: 'As explicações',
      situacao: 'a seguir',
      texto:
        'Perfil da seção (idade, escolaridade), contexto do município (renda, religião, Bolsa Família) e do estado entram no modelo, uma camada por vez.',
    },
    {
      titulo: 'A previsão',
      situacao: 'a seguir',
      texto: 'Previsão do 2º turno por urna, registrada antes de 25 de outubro e aberta só depois da eleição, com a conferência dos acertos.',
    },
  ]

  return (
    <>
      <ol className="etapas">
        {etapas.map((e, i) => (
          <li key={e.titulo} data-situacao={e.situacao}>
            <span className="etapa-numero" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3>
                {e.titulo} <span className="pilula">{e.situacao}</span>
              </h3>
              <p>{e.texto}</p>
              {e.numero && <p className="etapa-dado">{e.numero}</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className="cartao destaque">
        <h3>O detalhe que a conferência pegou</h3>
        <p>
          Na primeira versão, os percentuais da Bela Vista não batiam com o g1 na segunda casa decimal. O motivo: votos em
          candidaturas que renunciaram ou foram indeferidas aparecem no boletim de urna como votos no candidato, mas a
          totalização oficial os conta como nulos, o <em>nulo técnico</em>. Com o ajuste, todas as conferências passaram a
          bater. Sem validar antes de modelar, esse erro teria entrado em todos os números do site.
        </p>
      </div>

      <h3 style={{ marginTop: 32 }}>Por que essas escolhas</h3>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Escolha</th>
              <th>Por quê</th>
              <th>O que ficou de fora</th>
            </tr>
          </thead>
          <tbody>
            {DECISOES.filter((d) => d.inicio).map((d) => (
              <tr key={d.escolha}>
                <td>
                  <strong>{d.escolha}</strong>
                </td>
                <td>{d.porque}</td>
                <td className="secundario">{d.descartada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="discreto" style={{ marginTop: 12 }}>
        As outras escolhas (logit, teste de variância, motor de estimação) estão no <Link to="/metodo">Método</Link>.
      </p>

      <p style={{ marginTop: 24 }}>
        <strong>Bastidores.</strong> Este site foi construído por Eduardo Ben Hur com o Claude Code, o assistente de programação
        da Anthropic, do download dos dados à verificação visual de cada página. Cada decisão e cada correção estão no{' '}
        <a href={REPOSITORIO}>histórico do repositório</a>.
      </p>
    </>
  )
}
