import { useEffect, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Adivinhe } from '../components/Adivinhe'
import { BarrasHorizontais } from '../components/BarrasHorizontais'
import { CapituloExplicacoes } from '../components/CapituloExplicacoes'
import { CidadesGemeas } from '../components/CidadesGemeas'
import { ComoFoiFeito } from '../components/ComoFoiFeito'
import { ComoLer } from '../components/ComoLer'
import { ComoSabemos } from '../components/ComoSabemos'
import { ContrariamEstado } from '../components/ContrariamEstado'
import { EfeitoEstados } from '../components/EfeitoEstados'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { useCandidato } from '../lib/candidato'
import { useExplicacao, useHistoria, useMunicipios, useResumo } from '../lib/dados'
import { inteiro, pct, pontos } from '../lib/formato'
import { quedaComMunicipio } from '../lib/historia'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

const ROTULOS_PISTA = { nada: 'Sem pista', estado: 'Sabendo o estado', municipio: 'Sabendo o município', escola: 'Sabendo a escola' }

/**
 * Um capítulo: rótulo, título, uma frase-resumo em linguagem simples, o que ela quer dizer para quem vai conversar no
 * 2º turno, e o conteúdo.
 */
function Capitulo({ id, numero, rotulo, titulo, resumo, conversa, children }: {
  id: string
  numero: number
  rotulo: string
  titulo: string
  resumo: string
  conversa: ReactNode
  children: ReactNode
}) {
  return (
    <section className="capitulo" id={id} aria-labelledby={`${id}-titulo`}>
      <div className="kicker">
        {numero} · {rotulo}
      </div>
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      <p className="resumo-capitulo">
        <strong>Em resumo:</strong> {resumo}
      </p>
      <p className="para-conversar">
        <strong>Para quem vai conversar:</strong> {conversa}
      </p>
      {children}
    </section>
  )
}

export function Analise() {
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
  const espacial = explicacao?.espacial.candidatos[n]
  const regioes = explicacao?.espacial.regioes
  const sp = explicacao?.espacial.sao_paulo
  const seletor = <SeletorCandidato valor={candidato} aoMudar={definirCandidato} />
  const pronto = Boolean(resumo && indice && historia && modelo)

  // "?cap=c-estado": abre direto no capítulo pedido (links da página inicial). Links antigos usavam "?c=c-estado",
  // antes de o ?c= passar a guardar o candidato escolhido; continuam valendo.
  const antigo = params.get('c')
  const capitulo = params.get('cap') ?? (antigo?.startsWith('c-') ? antigo : null)
  useEffect(() => {
    if (pronto && capitulo) document.getElementById(capitulo)?.scrollIntoView({ block: 'start' })
  }, [pronto, capitulo])

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>A análise completa</h1>
      <p className="secundario" style={{ fontSize: '1.1rem' }}>
        Sete capítulos curtos sobre o que as urnas de 2026 mostram e como chegamos a esses números. Tudo vale para os dois
        candidatos do 2º turno: escolha por qual voto ler. Cada capítulo diz também o que ele quer dizer para quem vai
        conversar antes do dia 25.
      </p>
      {seletor}
      <ComoLer />

      {resumo && indice && historia && modelo ? (
        <>
          <Capitulo id="c-jogo" numero={1} rotulo="O jogo" titulo="Cada pista sobre o lugar aproxima o palpite"
            resumo="sabendo só o estado e a cidade de uma urna, já dá para chegar perto do resultado dela."
            conversa="o voto tem endereço. Antes de conversar, vale saber como votou o seu bairro: a sua urna e as escolas perto dela dizem muito.">
            <p>
              Dá para adivinhar o resultado de uma urna sem abri-la? Em boa parte, sim: sabendo só o estado e o município, o
              erro do palpite cai cerca de {pct(quedaComMunicipio(historia), 0)}. Tente com o voto em {cand.nome} numa urna
              sorteada. Sem saber nada, o melhor palpite é o resultado do Brasil. Depois vêm as pistas: o estado, o município
              e a escola onde a urna fica.
            </p>
            <Adivinhe resumo={resumo} indice={indice} candidato={candidato} minValidos={historia.regras.min_validos_urna} />

            <h3 style={{ marginTop: 32 }}>Na média de todas as urnas</h3>
            <p className="secundario">Quanto o palpite erra, em média, no voto em {cand.nome}, a cada pista.</p>
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
            <p style={{ marginTop: 16 }}>
              Só a pista do estado leva o erro de {pontos(historia.adivinhacao[n][0].erro_medio)} para{' '}
              {pontos(historia.adivinhacao[n][1].erro_medio)} Com a escola, o palpite erra em média{' '}
              {pontos(historia.adivinhacao[n][3].erro_medio)}: de cada 10 urnas, {Math.round(historia.adivinhacao[n][3].ate_5pp * 10)}{' '}
              ficam a até 5 pontos dele.
            </p>
            <ComoSabemos>
              <p>
                O palpite de cada pista é o resultado somado das <em>outras</em> urnas do grupo. A urna sorteada fica de fora
                da conta, senão seria trapaça. O erro é a distância entre palpite e resultado, em pontos, na média das urnas
                com pelo menos {historia.regras.min_validos_urna} votos válidos.
              </p>
              <p>
                É a versão intuitiva do que um modelo multinível mede: quanta diferença está entre estados, entre municípios
                e entre urnas da mesma cidade.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-estado" numero={2} rotulo="O estado" titulo="De todas as camadas, o estado é a que mais pesa"
            resumo="de tudo o que faz uma urna votar diferente de outra, o estado onde ela fica é o que mais pesa."
            conversa="o estado pesa, mas no 2º turno cada voto vale igual em qualquer um deles. O que importa é quanta gente há perto de você, não se o seu estado é disputado.">
            <p>
              Comparando as urnas do país no voto em {cand.nome}, a maior parte da diferença entre elas ({pct(modelo.icc.UF, 0)})
              aparece de um estado para outro. Mudar de cidade dentro do mesmo estado responde por {pct(modelo.icc.município, 0)}, e
              só {pct(modelo.icc.seção, 0)} é diferença entre urnas da mesma cidade.
            </p>
            {seletor}
            <div className="grade-3">
              <div className="cartao tile">
                <div className="rotulo">vem do estado</div>
                <div className="valor">{pct(modelo.icc.UF, 0)}</div>
                <p className="nota">da diferença entre urnas no voto em {cand.curto}</p>
              </div>
              <div className="cartao tile">
                <div className="rotulo">vem do município</div>
                <div className="valor">{pct(modelo.icc.município, 0)}</div>
                <p className="nota">dentro do mesmo estado</p>
              </div>
              <div className="cartao tile">
                <div className="rotulo">é da própria seção</div>
                <div className="valor">{pct(modelo.icc.seção, 0)}</div>
                <p className="nota">dentro do mesmo município</p>
              </div>
            </div>
            <p className="discreto" style={{ marginTop: 12 }}>
              Atenção: não é “{pct(modelo.icc.UF, 0)} do seu voto vem do estado”. É quanto da diferença entre as urnas do país se
              explica por elas estarem em estados diferentes.
            </p>
            <p style={{ marginTop: 24 }}>
              Quanto cada estado empurra o voto em {cand.nome}, em pontos, em relação a uma urna típica do Brasil. Passe o mouse
              ou o dedo sobre as barras.
            </p>
            <EfeitoEstados resumo={resumo} candidato={candidato} />
            <ComoSabemos>
              <p>
                Os percentuais são a correlação intraclasse (ICC) de um modelo multinível de três níveis: a parte da variação
                total que está entre estados, entre municípios do mesmo estado e entre urnas do mesmo município. A conta é
                feita na escala do modelo (logit), por isso não é idêntica à do jogo acima, mas as duas contam a mesma
                história.
              </p>
              <p>
                O efeito de cada estado é a estimativa do modelo convertida para pontos. <Link to="/metodo">Método completo</Link>.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-vizinhanca" numero={3} rotulo="A vizinhança" titulo="Mas a vizinhança pesa mais que a divisa"
            resumo="cidades vizinhas votam parecido, mesmo com uma divisa estadual no meio. O voto muda aos poucos pelo mapa."
            conversa="converse no bairro: vizinhos votam parecido.">
            <p>
              Dois municípios vizinhos em estados diferentes se parecem mais do que dois municípios quaisquer do mesmo
              estado.
            </p>
            {seletor}
            <h3>Diferença média no voto em {cand.nome} entre dois municípios</h3>
            <BarrasHorizontais
              barras={[
                { rotulo: 'Dois municípios quaisquer do Brasil', valor: historia.pares[n].quaisquer_brasil },
                { rotulo: 'Dois quaisquer do mesmo estado', valor: historia.pares[n].quaisquer_mesmo_estado },
                {
                  rotulo: 'Vizinhos, com uma divisa estadual no meio',
                  valor: historia.pares[n].vizinhos_divisa,
                  dica: `${inteiro(historia.pares.n_vizinhos_divisa)} pares de vizinhos`,
                },
                {
                  rotulo: 'Vizinhos do mesmo estado',
                  valor: historia.pares[n].vizinhos_mesmo_estado,
                  dica: `${inteiro(historia.pares.n_vizinhos_mesmo_estado)} pares de vizinhos`,
                },
              ]}
              formatar={(v) => pontos(v)}
              rotuloAria={`Diferença média no voto em ${cand.nome} entre pares de municípios`}
              cabecalho={['Par de municípios', 'Diferença média', 'Pares']}
            />
            <p style={{ marginTop: 16 }}>
              A divisa não é um muro, mas também não é nada: com uma divisa no meio, vizinhos diferem{' '}
              {pontos(historia.pares[n].vizinhos_divisa - historia.pares[n].vizinhos_mesmo_estado)} a mais. Parte do que parece
              efeito do estado é região: o voto muda aos poucos pelo mapa, e a divisa acrescenta um degrau.
            </p>

            <h3 style={{ marginTop: 32 }}>Cidades gêmeas</h3>
            <p>
              São {historia.resumo_gemeas.n_pares} pares de cidades coladas uma na outra, com uma divisa no meio. Em média, as
              duas cidades diferem {pontos(historia.resumo_gemeas[n].dif_cidades)}, quase o mesmo que os seus estados (
              {pontos(historia.resumo_gemeas[n].dif_estados)}). Em {historia.resumo_gemeas[n].mais_perto_da_gemea} das{' '}
              {historia.resumo_gemeas[n].n_cidades} cidades, o resultado fica mais perto da gêmea do outro lado do que da
              média do próprio estado.
            </p>
            <CidadesGemeas historia={historia} resumo={resumo} candidato={candidato} />
            {espacial && regioes && (
              <>
                <h3 style={{ marginTop: 32 }}>Degrau ou rampa?</h3>
                <p>
                  Se o voto mudasse só aos poucos pelo mapa, como uma rampa, a divisa não faria diferença. Num modelo que deixa o voto
                  variar de forma suave entre municípios próximos (a semelhança cai pela metade a cada cerca de{' '}
                  {inteiro(Math.round((espacial.degrau_gradiente.com_gp.alcance_km * Math.LN2) / 10) * 10)} km), a camada do estado
                  encolhe {pct(espacial.degrau_gradiente.queda_uf, 0)}: o voto muda pelo país mais como rampa do que como degrau. O
                  degrau que sobra na divisa é pequeno, como nas cidades gêmeas.
                </p>
                <p>
                  Outra forma de ver: agrupando municípios vizinhos só pelo voto, {regioes.n} regiões explicam{' '}
                  {pct(regioes[n].r2_regioes, 0)} da diferença entre municípios no voto em {cand.nome}; os {regioes.n} estados explicam{' '}
                  {pct(regioes[n].r2_estados, 0)}.{' '}
                  {regioes[n].r2_regioes > regioes[n].r2_estados
                    ? 'O mapa desenhado pelo voto separa melhor que as divisas.'
                    : 'As divisas ainda separam o voto melhor que qualquer recorte só geográfico.'}{' '}
                  <Link to="/mapa?v=regioes">Veja as regiões de voto no mapa</Link>.
                </p>
              </>
            )}
            <ComoSabemos>
              <p>
                Dois municípios são vizinhos quando os seus territórios se tocam na malha do IBGE. As diferenças são entre os
                resultados de cada município, sem ponderar pelo tamanho.
              </p>
              <p>
                As cidades gêmeas seguem uma regra fixa, sem escolha a dedo: vizinhas, de estados diferentes, com o centro dos
                locais de votação a menos de {historia.regras.dist_gemeas_km} km e pelo menos{' '}
                {inteiro(historia.regras.min_validos_gemea)} votos válidos cada. Medir quanto os vizinhos se parecem além do
                que estado e município explicam é o papel da análise espacial.
              </p>
              <p>
                A rampa é um processo gaussiano nas coordenadas dos municípios, ao lado do efeito do estado. Degrau e rampa não se
                separam por completo: estados são blocos contíguos, e um modelo espacial também consegue imitar blocos. Por isso o
                número é uma indicação, confirmada pela comparação entre vizinhos acima. As regiões de voto saem do SKATER, que só
                junta municípios vizinhos e procura grupos parecidos no voto em Lula e em Flávio.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-explicacoes" numero={4} rotulo="Composição ou contexto" titulo="Quem mora ali ou onde fica?"
            resumo="o que mais explica a diferença entre os estados é o perfil das cidades (renda, cor ou raça, religião) e a região do país, e não a idade ou a escolaridade de quem vota em cada urna."
            conversa="o perfil de quem vota explica pouco dentro da cidade; o bairro e a história do lugar pesam mais. Por isso a ferramenta fala de escolas e bairros, não de tipos de eleitor.">
            {explicacao ? (
              <>
                {seletor}
                <CapituloExplicacoes explicacao={explicacao} resumo={resumo} candidato={candidato} />
              </>
            ) : (
              <p className="carregando">Carregando…</p>
            )}
          </Capitulo>

          <Capitulo id="c-surpresas" numero={5} rotulo="As surpresas" titulo="Onde o voto foge do esperado"
            resumo="mesmo descontando tudo isso, há bairros e cidades que votam diferente do esperado, e eles aparecem em grupos de vizinhos."
            conversa={
              <>
                os bolsões mostram onde o voto foge do esperado; a terceira ação do{' '}
                <Link to={`/?a=perfil&c=${candidato}`}>“Onde virar voto”</Link> parte deles. É pista, não certeza: parte do que
                foge do esperado é o que o modelo não vê.
              </>
            }>
            <p>
              Até na mesma escola as urnas diferem. Na escola típica com {historia.regras.min_urnas_escola} urnas ou mais, a
              distância entre a urna com mais e a com menos votos em {cand.nome} é de{' '}
              {pontos(historia.escolas[n].amplitude_mediana)} Em {pct(historia.escolas[n].pct_10pp_ou_mais, 0)} das escolas,
              passa de 10 pontos.
            </p>
            <p>E há cidades que contrariam o próprio estado:</p>
            {seletor}
            <ContrariamEstado historia={historia} candidato={candidato} />
            <p style={{ marginTop: 16 }}>
              Todos os municípios estão no <Link to="/mapa?v=efeito">mapa</Link>, na opção “Efeito do município”.
            </p>
            {espacial && sp && (
              <>
                <h3 style={{ marginTop: 32 }}>Bolsões</h3>
                <p>
                  Mesmo depois do perfil e da região, o que sobra em cada município não se espalha ao acaso: municípios vizinhos se
                  parecem mais do que o acaso explicaria (índice de Moran{' '}
                  {espacial.completo.moran_I.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}; zero seria acaso). São{' '}
                  {inteiro(espacial.completo.lisa['alto cercado de alto'])} municípios em bolsões que votam em {cand.nome} acima do
                  esperado e {inteiro(espacial.completo.lisa['baixo cercado de baixo'])} em bolsões abaixo.{' '}
                  <Link to={`/mapa?v=bolsoes&c=${candidato}`}>Veja os bolsões no mapa</Link>.
                </p>
                <p>
                  O mesmo acontece dentro das cidades. Em São Paulo, a surpresa de cada um dos {inteiro(sp.n_locais)} locais de votação
                  (o resultado menos o esperado pelo município e pelo perfil do eleitorado) forma bolsões entre locais vizinhos (Moran{' '}
                  {sp[n].moran_I.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}).{' '}
                  <Link to="/municipio/71072">Veja o mapa da cidade na opção “Surpresa”</Link>.
                </p>
              </>
            )}
            <ComoSabemos>
              <p>
                O efeito do município é a estimativa do modelo para quanto a cidade se afasta do seu estado, convertida para
                pontos. O modelo puxa para a média os efeitos de cidades com poucas urnas, porque ali a estimativa é instável.
                Por isso a lista só tem municípios com {inteiro(historia.regras.min_validos_contraria)} votos válidos ou mais e
                segue o efeito, não o resultado bruto.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-bastidores" numero={6} rotulo="Os bastidores" titulo="Como foi feito"
            resumo="dados públicos, conferidos urna por urna com o resultado oficial antes de qualquer conta."
            conversa="os números de onde a conversa parte foram conferidos com o resultado oficial. Depois de votar, dá para conferir de novo, com o boletim da sua seção.">
            <p>Do arquivo do TSE ao gráfico, cada etapa foi conferida antes da seguinte.</p>
            <ComoFoiFeito resumo={resumo} candidato={candidato} explicacao={explicacao} />
          </Capitulo>

          <Capitulo id="c-importa" numero={7} rotulo="Por que importa" titulo="Do mapa à conversa"
            resumo="saber onde estão as diferenças ajuda a agir por lugar, sem expor ninguém, e a conferir o resultado depois."
            conversa="a mesma conta vale para os dois candidatos, e o site não pede voto para ninguém. Quem escolhe o lado é quem usa.">
            <div className="grade-3">
              <div className="cartao">
                <h3>Agir por lugar</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  O debate costuma resumir o país a “Nordeste contra Sul” ou “capital contra interior”. As camadas mostram que
                  o voto muda de bairro para bairro, e é por lugar que dá para agir: em que escolas há mais gente que faltou ou
                  que votou em outro candidato, branco ou nulo.
                </p>
              </div>
              <div className="cartao">
                <h3>Sem expor ninguém</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  Os números descrevem urnas e escolas, não eleitores. Uma urna que deu 70% a um candidato não diz como votou
                  cada pessoa da seção. A conversa é com quem você conhece, não com uma lista: nada aqui aponta para uma pessoa.
                </p>
              </div>
              <div className="cartao">
                <h3>Conferir a urna</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  Dados públicos, código aberto e validação contra o TSE, urna por urna. Depois de votar, fotografe o boletim
                  da sua seção; depois de 25 de outubro, a mesma conferência vale para o 2º turno, e os dois turnos serão
                  comparados urna por urna.
                </p>
              </div>
            </div>
            <div className="acoes" style={{ marginTop: 24 }}>
              <Link className="botao" to={`/?c=${candidato}`}>
                Onde virar voto
              </Link>
              <Link className="botao botao-secundario" to="/">
                Procurar minha urna
              </Link>
              <Link className="botao botao-secundario" to="/conferencia">
                Como conferir
              </Link>
              <Link className="botao botao-secundario" to="/metodo">
                Ler o método
              </Link>
            </div>
          </Capitulo>
        </>
      ) : (
        <p className="carregando">Carregando a análise…</p>
      )}
    </div>
  )
}
