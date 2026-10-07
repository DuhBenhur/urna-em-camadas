import { Link } from 'react-router-dom'
import { Busca } from '../components/Busca'
import { ComoLer } from '../components/ComoLer'
import { useConferencia, useExplicacao, useHistoria, useResumo } from '../lib/dados'
import { inteiro, pct } from '../lib/formato'
import { quedaComMunicipio } from '../lib/historia'

// Uma urna real da 1ª Zona de São Paulo (Bela Vista), na E.E. Caetano de Campos
const EXEMPLO = '/urna/SP/1/240'

/** Média dos dois candidatos: os achados da página inicial não escolhem lado. */
const media = (f: (n: '13' | '22') => number) => (f('13') + f('22')) / 2

export function Inicio() {
  const { dados: resumo } = useResumo()
  const { dados: historia } = useHistoria()
  const { dados: conferencia } = useConferencia()
  const { dados: explicacao } = useExplicacao()

  const shapley = (n: '13' | '22') => explicacao!.stepup.candidatos[n].shapley.uf.com_regiao.blocos
  const achados = historia && explicacao
    ? {
        queda: quedaComMunicipio(historia),
        vizinhosDivisa: media((n) => historia.pares[n].vizinhos_divisa),
        mesmoEstado: media((n) => historia.pares[n].quaisquer_mesmo_estado),
        perfilCidades: media((n) => shapley(n).renda_economia + shapley(n).cor_raca + shapley(n).religiao + shapley(n).urbanizacao),
        regiao: media((n) => shapley(n).regiao),
        perfilUrnas: media((n) => shapley(n).idade_sexo + shapley(n).escolaridade),
      }
    : null

  return (
    <div className="conteudo">
      <section className="heroi">
        <h1>A sua urna, conferida e explicada</h1>
        <p className="secundario">
          O 1º turno de 2026 teve {resumo ? inteiro(resumo.totais.secoes) : '…'} urnas. Conferimos todas: os boletins somam
          exatamente o resultado oficial do TSE. Procure a sua e veja o que ela tem em comum com o seu estado, a sua cidade e o
          seu bairro.
        </p>
      </section>

      <div id="busca">
        <Busca />
      </div>
      <p className="ajuda-busca">
        Não sabe a sua zona e a sua seção? Elas estão no título de eleitor e no aplicativo e-Título, gratuito, do{' '}
        <a href="https://www.tse.jus.br/">Tribunal Superior Eleitoral</a>. Também dá para procurar pela cidade e pela escola onde
        você vota, na aba “Procurar pelo município”. Ou <Link to={EXEMPLO}>veja um exemplo: uma urna da Bela Vista, em São Paulo</Link>.
      </p>

      {conferencia && (
        <div className="cartao conferencia-inicio">
          <div>
            <div className="rotulo-pequeno">Conferência</div>
            <div className="valor">
              {inteiro(conferencia.brasil.conferem)} de {inteiro(conferencia.brasil.secoes)} urnas
            </div>
            <p className="secundario" style={{ margin: 0 }}>
              idênticas ao resultado oficial do TSE, em todos os números do boletim
            </p>
          </div>
          <Link className="botao" to="/conferencia">
            Como conferir a sua
          </Link>
        </div>
      )}

      <h2>O que as urnas mostram</h2>
      {achados ? (
        <div className="achados">
          <article className="cartao achado">
            <h3>O lugar diz muito</h3>
            <p>
              Sabendo só o estado e a cidade de uma urna, dá para chegar perto do resultado dela: quem tenta adivinhar erra
              cerca de {pct(achados.queda, 0)} menos.
            </p>
            <Link to="/analise?c=c-jogo">Tente adivinhar uma urna</Link>
          </article>
          <article className="cartao achado">
            <h3>Vizinhos votam parecido, mesmo com divisa no meio</h3>
            <p>
              Duas cidades vizinhas de estados diferentes votam mais parecido do que duas cidades quaisquer do mesmo estado:
              diferem cerca de {Math.round(achados.vizinhosDivisa)} pontos, contra {Math.round(achados.mesmoEstado)}.
            </p>
            <Link to="/analise?c=c-vizinhanca">Veja a vizinhança</Link>
          </article>
          <article className="cartao achado">
            <h3>A cidade pesa mais que a urna</h3>
            <p>
              Renda, cor ou raça e religião de cada cidade explicam cerca de {pct(achados.perfilCidades, 0)} da diferença entre os
              estados, e a região do país, outros {pct(achados.regiao, 0)}. A idade e a escolaridade de quem vota em cada urna
              explicam só {pct(achados.perfilUrnas, 0)}.
            </p>
            <Link to="/analise?c=c-explicacoes">Entenda o que explica o voto</Link>
          </article>
        </div>
      ) : (
        <p className="carregando">Carregando…</p>
      )}
      <ComoLer />
      <p className="discreto">
        Os números descrevem urnas e cidades, não pessoas: uma urna que votou num candidato não diz como votou cada eleitor.
      </p>

      <div className="acoes" style={{ marginTop: 24 }}>
        <Link className="botao" to="/analise">
          Ler a análise completa
        </Link>
        <Link className="botao botao-secundario" to="/mapa">
          Ver o mapa
        </Link>
      </div>
    </div>
  )
}

