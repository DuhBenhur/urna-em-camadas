import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Adivinhe } from '../components/Adivinhe'
import { BarrasHorizontais } from '../components/BarrasHorizontais'
import { Busca } from '../components/Busca'
import { CidadesGemeas } from '../components/CidadesGemeas'
import { ComoFoiFeito } from '../components/ComoFoiFeito'
import { ComoSabemos } from '../components/ComoSabemos'
import { ContrariamEstado } from '../components/ContrariamEstado'
import { EfeitoEstados } from '../components/EfeitoEstados'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { useConferencia, useHistoria, useMunicipios, useResumo, type Historia } from '../lib/dados'
import { inteiro, pct, pontos } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

// Uma urna real da 1ª Zona de São Paulo (Bela Vista), na E.E. Caetano de Campos
const EXEMPLO = '/urna/SP/1/240'

const ROTULOS_PISTA = { nada: 'Sem pista', estado: 'Sabendo o estado', municipio: 'Sabendo o município', escola: 'Sabendo a escola' }

const irPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function Capitulo({ id, numero, rotulo, titulo, children }: { id: string; numero: number; rotulo: string; titulo: string; children: ReactNode }) {
  return (
    <section className="capitulo" id={id} aria-labelledby={`${id}-titulo`}>
      <div className="kicker">
        {numero} · {rotulo}
      </div>
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      {children}
    </section>
  )
}

/** Quanto o erro de adivinhação cai sabendo estado e município (média dos dois candidatos, de 5 em 5%). */
function quedaComMunicipio(h: Historia): number {
  const queda = (['13', '22'] as const).map((n) => 1 - h.adivinhacao[n][2].erro_medio / h.adivinhacao[n][0].erro_medio)
  return Math.round(((queda[0] + queda[1]) / 2) * 20) / 20
}

export function Inicio() {
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const { dados: historia } = useHistoria()
  const { dados: conferencia } = useConferencia()
  const [candidato, setCandidato] = useState<NumeroCandidato>(13)
  const n = String(candidato) as '13' | '22'
  const cand = CANDIDATOS[candidato]
  const modelo = resumo?.modelos[n]
  const seletor = <SeletorCandidato valor={candidato} aoMudar={setCandidato} />

  return (
    <div className="conteudo">
      <section className="heroi">
        <h1>A sua urna, conferida e explicada</h1>
        <p className="secundario">
          O 1º turno presidencial de 2026 teve {resumo ? inteiro(resumo.totais.secoes) : '…'} urnas, e os boletins de todas
          elas somam exatamente o resultado oficial do TSE. Procure a sua, compare com o boletim impresso da seção e veja
          quanto do resultado dela vem do estado, do município e da própria seção.
        </p>
      </section>

      <div id="busca">
        <Busca />
      </div>
      <p style={{ marginTop: 12 }}>
        Sem o título à mão? <Link to={EXEMPLO}>Veja um exemplo: uma urna da Bela Vista, em São Paulo</Link>. Ou{' '}
        <button className="link" onClick={() => irPara('historia')}>
          leia a história das urnas
        </button>
        .
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

      <div id="historia" className="intro-historia">
        <div className="kicker">A história</div>
        <p>
          Sete capítulos curtos sobre o que as urnas de 2026 dizem e como chegamos a esses números. Tudo vale para os dois
          candidatos do 2º turno: escolha por qual voto ler.
        </p>
        {seletor}
      </div>

      {resumo && indice && historia && modelo ? (
        <>
          <Capitulo id="c-jogo" numero={1} rotulo="O jogo" titulo="Cada pista sobre o lugar aproxima o palpite">
            <p>
              Dá para adivinhar o resultado de uma urna sem abri-la? Em boa parte, sim: sabendo só o estado e o município, o
              erro do palpite cai cerca de {pct(quedaComMunicipio(historia), 0)}. Tente com o voto em {cand.nome} numa urna
              sorteada. Sem saber nada, o melhor palpite é o resultado do Brasil; depois vêm as pistas: o estado, o município
              e a escola onde a urna fica.
            </p>
            <Adivinhe resumo={resumo} indice={indice} candidato={candidato} minValidos={historia.regras.min_validos_urna} />

            <h3 style={{ marginTop: 32 }}>Na média de todas as urnas</h3>
            <p className="secundario">Erro médio do palpite para o voto em {cand.nome}, em pontos percentuais.</p>
            <BarrasHorizontais
              barras={historia.adivinhacao[n].map((p) => ({
                rotulo: ROTULOS_PISTA[p.pista],
                valor: p.erro_medio,
                dica: `${Math.round(p.ate_5pp * 10)} de cada 10 urnas ficam a até 5 p.p. do palpite`,
              }))}
              formatar={(v) => pontos(v)}
              rotuloAria={`Erro médio ao adivinhar o voto em ${cand.nome} em cada urna, por pista`}
              cabecalho={['Pista', 'Erro médio', 'Urnas perto do palpite']}
            />
            <p style={{ marginTop: 16 }}>
              Só a pista do estado leva o erro de {pontos(historia.adivinhacao[n][0].erro_medio)} para{' '}
              {pontos(historia.adivinhacao[n][1].erro_medio)} Com a escola, o palpite erra em média{' '}
              {pontos(historia.adivinhacao[n][3].erro_medio)}: de cada 10 urnas, {Math.round(historia.adivinhacao[n][3].ate_5pp * 10)}{' '}
              ficam a até 5 p.p. dele.
            </p>
            <ComoSabemos>
              <p>
                O palpite de cada pista é o resultado somado das <em>outras</em> urnas do grupo. A urna sorteada fica de fora
                da conta, senão seria trapaça. O erro é a distância entre palpite e resultado, em pontos percentuais, na
                média das urnas com pelo menos {historia.regras.min_validos_urna} votos válidos.
              </p>
              <p>
                É a versão intuitiva do que um modelo multinível mede: quanta diferença está entre estados, entre municípios
                e entre urnas da mesma cidade.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-estado" numero={2} rotulo="O estado" titulo="De todas as camadas, o estado é a que mais pesa">
            <p>
              Das diferenças entre as urnas do país no voto em {cand.nome}, {pct(modelo.icc.UF, 0)} estão entre um estado e
              outro. O município responde por {pct(modelo.icc.município, 0)}, e só {pct(modelo.icc.seção, 0)} são diferenças
              entre urnas da mesma cidade.
            </p>
            {seletor}
            <div className="grade-3">
              <div className="cartao tile">
                <div className="rotulo">vem do estado</div>
                <div className="valor">{pct(modelo.icc.UF, 0)}</div>
                <p className="nota">da variação do voto em {cand.curto} entre urnas</p>
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
            <p style={{ marginTop: 24 }}>
              Quanto cada estado empurra o voto em {cand.nome}, em pontos percentuais, em relação a uma urna típica do Brasil.
              Passe o mouse ou o dedo sobre as barras.
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
                O efeito de cada estado é a estimativa do modelo convertida para pontos percentuais. <Link to="/metodo">Método completo</Link>.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-vizinhanca" numero={3} rotulo="A vizinhança" titulo="Mas a vizinhança pesa mais que a divisa">
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
              {pontos(historia.pares[n].vizinhos_divisa - historia.pares[n].vizinhos_mesmo_estado)} a mais. Parte do que o
              modelo chama de efeito do estado é região: o voto muda aos poucos pelo mapa, e a divisa acrescenta um degrau.
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
            <ComoSabemos>
              <p>
                Dois municípios são vizinhos quando os seus territórios se tocam na malha do IBGE. As diferenças são entre os
                resultados de cada município, sem ponderar pelo tamanho.
              </p>
              <p>
                As cidades gêmeas seguem uma regra fixa, sem escolha a dedo: vizinhas, de estados diferentes, com o centro dos
                locais de votação a menos de {historia.regras.dist_gemeas_km} km e pelo menos{' '}
                {inteiro(historia.regras.min_validos_gemea)} votos válidos cada. Medir quanto os vizinhos se parecem além do
                que estado e município explicam é a próxima etapa: a análise espacial.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-explicacoes" numero={4} rotulo="Em análise" titulo="Quem mora ali ou onde fica?">
            <div className="cartao em-breve">
              <p>
                Um estado pode votar diferente porque a sua população é diferente (mais jovem, mais escolarizada, mais
                evangélica) ou porque o lugar pesa por si (história, economia, lideranças locais). O próximo passo do modelo
                põe essas variáveis em cada camada, uma de cada vez, e mede quanto dos {pct(modelo.icc.UF, 0)} do estado sobra
                depois disso.
              </p>
              <p className="discreto" style={{ marginBottom: 0 }}>
                Este capítulo entra no site quando a análise estiver pronta e conferida.
              </p>
            </div>
          </Capitulo>

          <Capitulo id="c-surpresas" numero={5} rotulo="As surpresas" titulo="Onde o voto foge do esperado">
            <p>
              Até na mesma escola as urnas diferem. Na escola típica com {historia.regras.min_urnas_escola} urnas ou mais, a
              distância entre a urna com mais e a com menos votos em {cand.nome} é de{' '}
              {pontos(historia.escolas[n].amplitude_mediana)} Em {pct(historia.escolas[n].pct_10pp_ou_mais, 0)} das escolas,
              passa de 10 p.p.
            </p>
            <p>E há cidades que contrariam o próprio estado:</p>
            {seletor}
            <ContrariamEstado historia={historia} candidato={candidato} />
            <p style={{ marginTop: 16 }}>
              Todos os municípios estão no <Link to="/mapa">mapa</Link>, na opção “Efeito do município”.
            </p>
            <ComoSabemos>
              <p>
                O efeito do município é a estimativa do modelo para quanto a cidade se afasta do seu estado, convertida para
                pontos percentuais. O modelo puxa para a média os efeitos de cidades com poucas urnas, porque ali a estimativa
                é instável. Por isso a lista só tem municípios com {inteiro(historia.regras.min_validos_contraria)} votos
                válidos ou mais e segue o efeito, não o resultado bruto.
              </p>
            </ComoSabemos>
          </Capitulo>

          <Capitulo id="c-bastidores" numero={6} rotulo="Os bastidores" titulo="Como foi feito">
            <p>Do arquivo do TSE ao gráfico, cada etapa foi conferida antes da seguinte.</p>
            <ComoFoiFeito resumo={resumo} candidato={candidato} />
          </Capitulo>

          <Capitulo id="c-importa" numero={7} rotulo="Por que importa" titulo="Por que medir o voto em camadas">
            <div className="grade-3">
              <div className="cartao">
                <h3>A escala certa</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  O debate costuma resumir o país a “Nordeste contra Sul” ou “capital contra interior”. Medir as camadas
                  mostra em que escala as diferenças estão de fato, e que a vizinhança conta mais que a linha no mapa.
                </p>
              </div>
              <div className="cartao">
                <h3>Lugar não é pessoa</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  Os números descrevem urnas, não eleitores. Uma urna que deu 70% a um candidato não diz como votou cada
                  pessoa da seção. Separar as camadas evita conclusões apressadas sobre quem vota em quem.
                </p>
              </div>
              <div className="cartao">
                <h3>Dá para conferir</h3>
                <p className="secundario" style={{ marginBottom: 0 }}>
                  Dados públicos, código aberto e validação contra o TSE. A previsão do 2º turno será registrada antes da
                  eleição e aberta depois, para qualquer pessoa ver se o método funciona. Volte depois de 25 de outubro.
                </p>
              </div>
            </div>
            <div className="acoes" style={{ marginTop: 24 }}>
              <button className="botao" onClick={() => irPara('busca')}>
                Procurar minha urna
              </button>
              <Link className="botao botao-secundario" to="/mapa">
                Ver o mapa
              </Link>
              <Link className="botao botao-secundario" to="/metodo">
                Ler o método
              </Link>
            </div>
          </Capitulo>
        </>
      ) : (
        <p className="carregando">Carregando a história…</p>
      )}
    </div>
  )
}
