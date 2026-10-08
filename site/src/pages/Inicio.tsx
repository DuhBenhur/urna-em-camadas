import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Busca } from '../components/Busca'
import { CampoMunicipio } from '../components/CampoMunicipio'
import { ComoLer } from '../components/ComoLer'
import { EscolhaCandidato } from '../components/EscolhaCandidato'
import { LeiCurta } from '../components/LeiCurta'
import { Passo } from '../components/Passo'
import { SeloExperimental } from '../components/SeloExperimental'
import { comCandidato, useCandidato } from '../lib/candidato'
import { useConferencia, useExplicacao, useHistoria, useResumo, type UF } from '../lib/dados'
import { inteiro, milhoes, pct } from '../lib/formato'
import { quedaComMunicipio } from '../lib/historia'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'

// Uma urna real da 1ª Zona de São Paulo (Bela Vista), na E.E. Caetano de Campos
const EXEMPLO = '/urna/SP/1/240'

/** Média dos dois candidatos: os achados da página inicial não escolhem lado. */
const media = (f: (n: '13' | '22') => number) => (f('13') + f('22')) / 2

/**
 * A inicial conta a história do site: agir por lugar (escolha o candidato, comece pela sua urna ou por um lugar), por que
 * agir por lugar (os achados da análise), dentro da lei, e depois de votar, conferir.
 */
export function Inicio() {
  const { dados: resumo } = useResumo()
  const { dados: historia } = useHistoria()
  const { dados: conferencia } = useConferencia()
  const { dados: explicacao } = useExplicacao()
  const [candidato] = useCandidato()
  const cand = candidato ? CANDIDATOS[candidato] : null

  const soma = (f: (u: UF) => number) => resumo?.ufs.reduce((s, u) => s + f(u), 0) ?? 0
  const quatro = (n: '13' | '22') => explicacao!.stepup.candidatos[n].quatro_niveis.icc
  const achados =
    historia && explicacao
      ? {
          queda: quedaComMunicipio(historia),
          vizinhosDivisa: media((n) => historia.pares[n].vizinhos_divisa),
          mesmoEstado: media((n) => historia.pares[n].quaisquer_mesmo_estado),
          escola: media((n) => quatro(n).local),
          urna: media((n) => quatro(n).secao),
        }
      : null
  const naVirar = (a: string) => `/virar?a=${a}${comCandidato(candidato, '&')}`

  return (
    <div className="conteudo">
      <section className="heroi heroi-inicio">
        <div className="rotulo-pequeno">2º turno · 25 de outubro</div>
        <h1>Onde a sua conversa pode virar voto</h1>
        <p className="secundario">
          Com o resultado oficial do 1º turno, urna por urna, o site mostra em que bairros e escolas há mais gente para
          conversar, para o candidato que você escolher.
        </p>
      </section>

      <Passo numero={1} titulo="Para quem?">
        <EscolhaCandidato />
      </Passo>

      <Passo numero={2} titulo="Por onde começar?">
        <div className="portas">
          <section className="porta" aria-labelledby="porta-urna">
            <h3 id="porta-urna">Pela minha urna</h3>
            <p className="secundario">Com a zona e a seção do seu título, veja a sua urna e as escolas perto dela.</p>
            <div id="busca">
              <Busca />
            </div>
          </section>
          <section className="porta" aria-labelledby="porta-lugar">
            <h3 id="porta-lugar">Por um lugar</h3>
            <p className="secundario">Escolha um estado ou uma cidade e veja os bairros e as escolas onde há mais gente para conversar.</p>
            <PorUmLugar candidato={candidato} />
          </section>
        </div>
        <p className="ajuda-busca">
          Não sabe a sua zona e a sua seção? Elas estão no título de eleitor e no aplicativo e-Título, gratuito, do{' '}
          <a href="https://www.tse.jus.br/">Tribunal Superior Eleitoral</a>. Também dá para procurar pela cidade e pela escola
          onde você vota, na aba “Procurar pelo município”. Ou{' '}
          <Link to={`${EXEMPLO}${comCandidato(candidato)}`}>veja um exemplo: uma urna da Bela Vista, em São Paulo</Link>.
        </p>
      </Passo>

      <h2>Três jeitos de fazer diferença</h2>
      <p className="secundario">Cada um com a sua conta, para conferir. Nenhum índice escondido.</p>
      {resumo ? (
        <div className="achados">
          <article className="cartao achado">
            <h3>Lembrar quem faltou</h3>
            <div className="jeito-numero">{milhoes(soma((u) => u.faltosos))}</div>
            <p>
              de pessoas não votaram no 1º turno.{' '}
              {cand
                ? `Onde ${cand.curto} ficou à frente, lembrar quem faltou pode render até ${milhoes(soma((u) => (candidato === 13 ? u.saldo13 : u.saldo22)))} de votos para ele: um teto, não uma previsão.`
                : 'Onde o seu candidato ficou à frente, cada pessoa que for votar tende a somar. Escolha o candidato para ver quanto.'}
            </p>
            <Link to={naVirar('faltosos')}>Onde lembrar quem faltou</Link>
          </article>
          <article className="cartao achado">
            <h3>Conversar com quem ficou de fora</h3>
            <div className="jeito-numero">{milhoes(soma((u) => u.abertos))}</div>
            <p>
              de votos foram para outros candidatos, brancos ou nulos no 1º turno. No 2º turno, todos escolhem entre os dois.
              Esses votos não têm lado: a conversa decide.
            </p>
            <Link to={naVirar('abertos')}>Onde estão esses votos</Link>
          </article>
          <article className="cartao achado">
            <h3>
              Onde o perfil promete mais <SeloExperimental />
            </h3>
            {cand ? (
              <div className="jeito-numero">{milhoes(soma((u) => (candidato === 13 ? u.gap13 : u.gap22) ?? 0))}</div>
            ) : (
              <div className="jeito-dois">
                {([13, 22] as const).map((n) => (
                  <div key={n}>
                    <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
                    {CANDIDATOS[n].curto} <strong>{milhoes(soma((u) => (n === 13 ? u.gap13 : u.gap22) ?? 0))}</strong>
                  </div>
                ))}
              </div>
            )}
            <p>
              de votos abaixo do esperado{cand ? ` para ${cand.curto}` : ''}: escolas onde{' '}
              {cand ? 'ele' : 'cada candidato'} teve menos votos do que escolas de perfil parecido na mesma cidade. Depende do
              modelo: é pista, não certeza.
            </p>
            <Link to={naVirar('perfil')}>Onde o perfil promete mais</Link>
          </article>
        </div>
      ) : (
        <p className="carregando">Carregando…</p>
      )}

      <h2>Por que pensar em bairros</h2>
      {achados ? (
        <div className="achados">
          <article className="cartao achado">
            <h3>O lugar diz muito</h3>
            <p>
              Sabendo só o estado e a cidade de uma urna, dá para chegar perto do resultado dela: quem tenta adivinhar erra
              cerca de {pct(achados.queda, 0)} menos.
            </p>
            <Link to="/analise?cap=c-jogo">Tente adivinhar uma urna</Link>
            <Link to="/analise?cap=c-estado">Veja o peso de cada estado</Link>
          </article>
          <article className="cartao achado">
            <h3>Vizinhos votam parecido</h3>
            <p>
              Duas cidades vizinhas de estados diferentes votam mais parecido do que duas cidades quaisquer do mesmo estado:
              diferem cerca de {Math.round(achados.vizinhosDivisa)} pontos, contra {Math.round(achados.mesmoEstado)}. O voto
              muda aos poucos pelo mapa; por isso faz sentido conversar no bairro.
            </p>
            <Link to="/analise?cap=c-vizinhanca">Veja a vizinhança</Link>
          </article>
          <article className="cartao achado">
            <h3>Dentro da cidade, o que pesa é o bairro, não a urna</h3>
            <p>
              Da diferença entre as urnas do país, cerca de {pct(achados.escola, 0)} está entre escolas da mesma cidade (cada
              escola com o bairro em volta) e só {pct(achados.urna, 0)} entre urnas da mesma escola. Por isso a ferramenta fala
              de escolas, não de seções.
            </p>
            <Link to="/analise?cap=c-explicacoes">Entenda o que explica o voto</Link>
          </article>
        </div>
      ) : (
        <p className="carregando">Carregando…</p>
      )}

      <LeiCurta candidato={candidato} Titulo="h2" />

      {conferencia && (
        <section className="cartao conferencia-inicio" aria-labelledby="t-confira">
          <div>
            <h2 id="t-confira">Depois de votar, confira</h2>
            <p style={{ marginBottom: 0 }}>
              Ao fim da votação, cada urna imprime o boletim, e uma via fica afixada no local de votação: fotografe a da sua
              seção. No 1º turno,{' '}
              {conferencia.brasil.conferem === conferencia.brasil.secoes
                ? `as ${inteiro(conferencia.brasil.secoes)} urnas batiam`
                : `${inteiro(conferencia.brasil.conferem)} de ${inteiro(conferencia.brasil.secoes)} urnas batiam`}{' '}
              com o resultado oficial do TSE, uma por uma. Depois de 25 de outubro, a conferência do 2º turno entra aqui.
            </p>
          </div>
          <Link className="botao" to="/conferencia">
            Como conferir a sua
          </Link>
        </section>
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

/** "Por um lugar": estado e, se quiser, a cidade; leva ao "Onde virar voto" nesse lugar. */
function PorUmLugar({ candidato }: { candidato: NumeroCandidato | null }) {
  const { dados: resumo } = useResumo()
  const navegar = useNavigate()
  const [uf, setUf] = useState('')
  const ir = (destino: { uf?: string; m?: number }) => {
    const p = new URLSearchParams()
    if (candidato) p.set('c', String(candidato))
    if (destino.uf) p.set('uf', destino.uf)
    if (destino.m) p.set('m', String(destino.m))
    const busca = p.toString()
    navegar(`/virar${busca ? `?${busca}` : ''}`)
  }
  const nomeUf = resumo?.ufs.find((u) => u.uf === uf)?.nome
  return (
    <div className="cartao">
      <div className="campos">
        <div>
          <label htmlFor="l-uf">Estado</label>
          <select id="l-uf" value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="">Brasil inteiro</option>
            {resumo?.ufs.map((u) => (
              <option key={u.uf} value={u.uf}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <CampoMunicipio id="l-mun" uf={uf} rotulo="Cidade (se quiser)" aoEscolher={(m) => ir({ uf: m.uf, m: m.cd })} />
      </div>
      <button className="botao" style={{ marginTop: 12 }} onClick={() => ir({ uf })}>
        {uf && nomeUf ? `Ver as cidades ${comPreposicao('de', uf, nomeUf)}` : 'Ver os estados'}
      </button>
    </div>
  )
}
