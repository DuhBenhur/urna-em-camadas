import { useEffect, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Adivinhe } from '../components/Adivinhe'
import { BarrasHorizontais } from '../components/BarrasHorizontais'
import { ComoLer } from '../components/ComoLer'
import { ContrariamEstado } from '../components/ContrariamEstado'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { comCandidato, useCandidato } from '../lib/candidato'
import { useExplicacao, useHistoria, useMunicipios, useResumo } from '../lib/dados'
import { inteiro, pct, pontos } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

const ROTULOS_PISTA = { nada: 'Sem pista', estado: 'Sabendo o estado', municipio: 'Sabendo a cidade', escola: 'Sabendo a escola' }

/** As respostas da página: o `?ir=` abre direto em cada uma (os endereços antigos da análise chegam aqui). */
const RESPOSTAS: [string, string][] = [
  ['lugar', 'O lugar diz muito?'],
  ['estado', 'O estado pesa?'],
  ['vizinhos', 'Vizinhos votam parecido?'],
  ['escola', 'Dentro da cidade, o que pesa?'],
  ['surpresas', 'Onde o voto foge do esperado?'],
  ['conversa', 'Do mapa à conversa'],
]

/**
 * Uma resposta: a pergunta, a resposta curta com um número, um gráfico, o que ela quer dizer para quem vai conversar e o
 * caminho para o detalhe técnico, que fica em Método e dados (`sec` é o bloco de lá).
 */
function Resposta({ id, numero, pergunta, resposta, conversa, sec, children }: {
  id: string
  numero: number
  pergunta: string
  resposta: ReactNode
  conversa: ReactNode
  sec: string
  children: ReactNode
}) {
  return (
    <section className="capitulo resposta" id={`e-${id}`} aria-labelledby={`e-${id}-t`}>
      <div className="kicker">{numero} de 5</div>
      <h2 id={`e-${id}-t`}>{pergunta}</h2>
      <p className="resumo-capitulo">{resposta}</p>
      {children}
      <p className="para-conversar">
        <strong>Para quem vai conversar:</strong> {conversa}
      </p>
      <p className="detalhe-link">
        <Link to={`/metodo?sec=${sec}`}>Detalhe técnico: como foi calculado</Link>
      </p>
    </section>
  )
}

/** Por que agir por lugar: o essencial da análise em cinco respostas curtas, sem jargão. O resto fica em Método e dados. */
export function Entenda() {
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const { dados: historia } = useHistoria()
  const { dados: explicacao } = useExplicacao()
  const [escolhido, definirCandidato] = useCandidato()
  const candidato: NumeroCandidato = escolhido ?? 13
  const [params] = useSearchParams()
  const n = String(candidato) as '13' | '22'
  const cand = CANDIDATOS[candidato]
  const modelo = resumo?.modelos[n]
  const pronto = Boolean(resumo && indice && historia && modelo && explicacao)

  const ir = params.get('ir')
  useEffect(() => {
    if (pronto && ir) document.getElementById(`e-${ir}`)?.scrollIntoView({ block: 'start' })
  }, [pronto, ir])

  return (
    <div className="conteudo">
      <section className="heroi" style={{ paddingBottom: 8 }}>
        <div className="rotulo-pequeno">Entenda</div>
        <h1>Por que o lugar importa</h1>
        <p className="secundario">
          Cinco perguntas sobre o que as urnas do 1º turno mostram, cada uma com a resposta curta e o que ela quer dizer para
          quem vai conversar até o dia 25. Os números valem para os dois candidatos: escolha por qual voto ler.
        </p>
      </section>
      <SeletorCandidato valor={candidato} aoMudar={definirCandidato} rotulo="Ler os números pelo voto em" />
      <ComoLer />
      <nav className="sumario" aria-label="Nesta página" style={{ marginTop: 24 }}>
        {RESPOSTAS.map(([id, titulo]) => (
          <Link key={id} to={`/entenda?ir=${id}`} replace>
            {titulo}
          </Link>
        ))}
      </nav>

      {resumo && indice && historia && modelo && explicacao ? (
        <>
          <Resposta id="lugar" numero={1} pergunta="O lugar diz muito sobre o voto?" sec="numeros"
            resposta={
              <>
                Diz muito. Sem nenhuma pista, um palpite sobre o voto em {cand.nome} numa urna qualquer erra, em média,{' '}
                {pontos(historia.adivinhacao[n][0].erro_medio)}. Sabendo o estado e a cidade, erra{' '}
                {pontos(historia.adivinhacao[n][2].erro_medio)}; sabendo também a escola,{' '}
                {pontos(historia.adivinhacao[n][3].erro_medio)}.
              </>
            }
            conversa="o voto tem endereço. Antes de conversar, vale saber como votou o seu bairro: a sua urna e as escolas perto dela dizem muito.">
            <Adivinhe resumo={resumo} indice={indice} candidato={candidato} minValidos={historia.regras.min_validos_urna} />
            <h3>Na média de todas as urnas</h3>
            <BarrasHorizontais
              barras={historia.adivinhacao[n].map((p) => ({
                rotulo: ROTULOS_PISTA[p.pista],
                valor: p.erro_medio,
                dica: `${Math.round(p.ate_5pp * 10)} de cada 10 urnas ficam a até 5 pontos do palpite`,
              }))}
              formatar={(v) => pontos(v)}
              rotuloAria={`Erro médio ao adivinhar o voto em ${cand.nome} em cada urna, por pista`}
              cabecalho={['Pista', 'Erro médio', 'Urnas perto do palpite']}
            />
          </Resposta>

          <Resposta id="estado" numero={2} pergunta="O estado pesa?" sec="modelo"
            resposta={
              <>
                Pesa: da diferença entre as urnas do país no voto em {cand.nome}, {pct(modelo.icc.UF, 0)} aparece de um estado
                para outro. Mas, no 2º turno para presidente, um voto vale o mesmo em qualquer estado.
              </>
            }
            conversa="o que importa é quanta gente há perto de você, não se o seu estado é disputado.">
            <div className="grade-3">
              <div className="cartao tile">
                <div className="rotulo">vem do estado</div>
                <div className="valor">{pct(modelo.icc.UF, 0)}</div>
                <p className="nota">da diferença entre urnas no voto em {cand.curto}</p>
              </div>
              <div className="cartao tile">
                <div className="rotulo">vem da cidade</div>
                <div className="valor">{pct(modelo.icc.município, 0)}</div>
                <p className="nota">dentro do mesmo estado</p>
              </div>
              <div className="cartao tile">
                <div className="rotulo">é da própria urna</div>
                <div className="valor">{pct(modelo.icc.seção, 0)}</div>
                <p className="nota">dentro da mesma cidade</p>
              </div>
            </div>
            <p className="discreto" style={{ marginTop: 12 }}>
              Atenção: não é “{pct(modelo.icc.UF, 0)} do seu voto vem do estado”. É quanto da diferença entre as urnas do país se
              explica por elas estarem em estados diferentes.
            </p>
          </Resposta>

          <Resposta id="vizinhos" numero={3} pergunta="Vizinhos votam parecido?" sec="espaco"
            resposta={
              <>
                Sim, mesmo com uma divisa estadual no meio. No voto em {cand.nome}, duas cidades vizinhas de estados diferentes
                diferem, em média, {pontos(historia.pares[n].vizinhos_divisa)}; duas cidades quaisquer do mesmo estado,{' '}
                {pontos(historia.pares[n].quaisquer_mesmo_estado)}.
              </>
            }
            conversa="converse no bairro: vizinhos votam parecido, e as escolas perto da sua dizem muito sobre ela.">
            <h3>Diferença média no voto em {cand.nome} entre duas cidades</h3>
            <BarrasHorizontais
              barras={[
                { rotulo: 'Duas cidades quaisquer do Brasil', valor: historia.pares[n].quaisquer_brasil },
                { rotulo: 'Duas quaisquer do mesmo estado', valor: historia.pares[n].quaisquer_mesmo_estado },
                {
                  rotulo: 'Vizinhas, com uma divisa estadual no meio',
                  valor: historia.pares[n].vizinhos_divisa,
                  dica: `${inteiro(historia.pares.n_vizinhos_divisa)} pares de vizinhas`,
                },
                {
                  rotulo: 'Vizinhas do mesmo estado',
                  valor: historia.pares[n].vizinhos_mesmo_estado,
                  dica: `${inteiro(historia.pares.n_vizinhos_mesmo_estado)} pares de vizinhas`,
                },
              ]}
              formatar={(v) => pontos(v)}
              rotuloAria={`Diferença média no voto em ${cand.nome} entre pares de cidades`}
              cabecalho={['Par de cidades', 'Diferença média', 'Pares']}
            />
            <p style={{ marginTop: 16 }}>
              O voto muda aos poucos pelo mapa, e a divisa acrescenta só um degrau: com ela no meio, vizinhas diferem{' '}
              {pontos(historia.pares[n].vizinhos_divisa - historia.pares[n].vizinhos_mesmo_estado)} a mais.
            </p>
          </Resposta>

          <QuatroNiveis candidato={candidato} icc={explicacao.stepup.candidatos[n].quatro_niveis.icc} />

          <Resposta id="surpresas" numero={5} pergunta="Onde o voto foge do esperado?" sec="espaco"
            resposta={
              <>
                Em grupos de vizinhos. Mesmo descontando o estado, a região e o perfil de quem vota,{' '}
                {inteiro(explicacao.espacial.candidatos[n].completo.lisa['alto cercado de alto'])} cidades formam bolsões que votam
                em {cand.nome} acima do esperado, e {inteiro(explicacao.espacial.candidatos[n].completo.lisa['baixo cercado de baixo'])},
                bolsões abaixo.
              </>
            }
            conversa={
              <>
                a opção avançada da ferramenta, <Link to={`/?a=perfil${comCandidato(escolhido, '&')}`}>“votos abaixo do esperado”</Link>,
                parte dessa ideia. É pista, não certeza: parte do que foge do esperado é o que o modelo não vê, como a renda do
                bairro e a história do lugar.
              </>
            }>
            <p>E há cidades grandes que contrariam o próprio estado:</p>
            <ContrariamEstado historia={historia} candidato={candidato} />
            <p style={{ marginTop: 16 }}>
              No mapa, veja <Link to={`/mapa?v=bolsoes&c=${candidato}`}>os bolsões</Link> e{' '}
              <Link to={`/mapa?v=efeito&c=${candidato}`}>quanto cada cidade se afasta do seu estado</Link>.
            </p>
          </Resposta>

          <section className="capitulo" id="e-conversa" aria-labelledby="e-conversa-t">
            <h2 id="e-conversa-t">Do mapa à conversa</h2>
            <p className="resumo-capitulo">
              Saber onde estão as diferenças ajuda a agir por lugar, sem expor ninguém. A conta é a mesma para os dois
              candidatos, e o site não pede voto para ninguém: quem escolhe o lado é quem usa.
            </p>
            <div className="grade-3">
              <div className="cartao">
                <h3>Agir por lugar</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  O debate costuma resumir o país a “Nordeste contra Sul” ou “capital contra interior”. As urnas mostram que o
                  voto muda de bairro para bairro, e é por lugar que dá para agir: em que escolas há mais gente que faltou ou que
                  votou em outro candidato, branco ou nulo.
                </p>
              </div>
              <div className="cartao">
                <h3>Sem expor ninguém</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  Os números descrevem urnas e escolas, não eleitores. Uma urna que deu 70% a um candidato não diz como votou
                  cada pessoa. A conversa é com quem você conhece, não com uma lista: nada aqui aponta para uma pessoa.
                </p>
              </div>
              <div className="cartao">
                <h3>Conferir a urna</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  Cada urna do 1º turno foi conferida com o resultado oficial do TSE. Na página da sua urna, o boletim vem com um
                  selo que diz se ele é idêntico ao resultado oficial.
                </p>
              </div>
            </div>
            <div className="acoes" style={{ marginTop: 24 }}>
              <Link className="botao" to={`/${comCandidato(escolhido)}`}>
                Agora, encontre onde conversar
              </Link>
              <Link className="botao botao-secundario" to="/como-usar">
                Como usar
              </Link>
              <Link className="botao botao-secundario" to="/conferencia">
                Confira sua urna
              </Link>
            </div>
          </section>
        </>
      ) : (
        <p className="carregando">Carregando…</p>
      )}
    </div>
  )
}

/** Resposta 4: com a escola entre a cidade e a urna, quase tudo o que parecia ser da urna é da escola. */
function QuatroNiveis({ candidato, icc }: { candidato: NumeroCandidato; icc: Record<'uf' | 'mun' | 'local' | 'secao', number> }) {
  const cand = CANDIDATOS[candidato]
  return (
    <Resposta id="escola" numero={4} pergunta="Dentro da cidade, o que pesa?" sec="explicacoes"
      resposta={
        <>
          A escola, muito mais que a urna. No voto em {cand.nome}, {pct(icc.local, 0)} da diferença entre as urnas do país está
          entre escolas da mesma cidade, e só {pct(icc.secao, 0)} entre urnas da mesma escola.
        </>
      }
      conversa="o que parece ser da urna é, quase todo, do bairro em volta da escola. Por isso a ferramenta fala de escolas e bairros, e não de urnas ou de tipos de eleitor.">
      <h3>Onde está a diferença entre as urnas, no voto em {cand.nome}</h3>
      <BarrasHorizontais
        barras={[
          { rotulo: 'Entre estados', valor: icc.uf },
          { rotulo: 'Entre cidades do mesmo estado', valor: icc.mun },
          { rotulo: 'Entre escolas da mesma cidade', valor: icc.local },
          { rotulo: 'Entre urnas da mesma escola', valor: icc.secao },
        ]}
        formatar={(v) => pct(v, 0)}
        rotuloAria={`Parte da diferença entre urnas no voto em ${cand.nome} em cada camada, com a escola`}
        cabecalho={['Camada', 'Parte da diferença entre urnas']}
      />
      <p className="discreto" style={{ marginTop: 12 }}>
        Com a escola no meio, as partes mudam um pouco em relação à pergunta anterior: boa parte do que parecia ser da urna é da
        escola.
      </p>
    </Resposta>
  )
}
