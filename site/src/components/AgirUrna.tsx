import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCandidato } from '../lib/candidato'
import { useLocais, type Local } from '../lib/dados'
import { inteiro } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import {
  LENTES, RAIO_PERTO_KM, TODAS_LENTES, chaveLocal, escolasPerto, km, lerLente, potencial, potencialSomado, somar, type Lente,
} from '../lib/virar'
import { LeiCurta } from './LeiCurta'
import { SeletorCandidato } from './SeletorCandidato'
import { SeloExperimental } from './SeloExperimental'

type Props = { uf: string; cd: number; zona: number; local: number; municipio: string }

/**
 * "Daqui até o dia 25" na página da urna: a escola desta urna e as escolas a até 2 km dela, nas ações do "Onde virar
 * voto". Sem candidato escolhido, mostra só o que não tem lado (quem faltou, quem ficou de fora) e pergunta para quem.
 */
export function AgirUrna({ uf, cd, zona, local, municipio }: Props) {
  const { dados: locais, erro } = useLocais(cd)
  const [candidato, definirCandidato] = useCandidato()
  const [params, setParams] = useSearchParams()
  const lente = lerLente(params.get('a'))
  const mudarLente = (l: Lente) =>
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual)
        novos.set('a', l)
        return novos
      },
      { replace: true },
    )

  const escola = locais?.find((l) => l.zona === zona && l.local === local)
  const perto = useMemo(
    () => (locais && escola && escola.lat !== null && escola.lon !== null ? escolasPerto(locais, { lat: escola.lat, lon: escola.lon }) : null),
    [locais, escola],
  )
  const noVirar = (extra: Record<string, string>) =>
    `/virar?${new URLSearchParams({ ...(candidato ? { c: String(candidato) } : {}), a: lente, uf, m: String(cd), ...extra })}`

  return (
    <section className="cartao agir" id="agir" aria-labelledby="t-agir">
      <div className="rotulo-pequeno">2º turno · 25 de outubro</div>
      <h2 id="t-agir">Daqui até o dia 25</h2>
      <p>Com o resultado do 1º turno, quanta gente há para conversar na escola desta urna e nas escolas perto dela.</p>
      <div className="agir-candidato">
        <span className="agir-pergunta" aria-hidden="true">
          Para quem?
        </span>
        <SeletorCandidato valor={candidato} aoMudar={definirCandidato} rotulo="Para quem?" />
      </div>
      <p className="nota-neutra">A mesma conta para os dois candidatos. O site não pede voto para ninguém.</p>

      {erro ? (
        <p className="aviso">Não deu para carregar as escolas de {municipio}. Tente de novo em instantes.</p>
      ) : !locais ? (
        <p className="carregando">Carregando as escolas perto daqui…</p>
      ) : escola ? (
        <div className="grade-2 agir-grade">
          <NaSuaEscola escola={escola} candidato={candidato} />
          {perto ? (
            <PertoDeVoce perto={perto} escola={escola} candidato={candidato} lente={lente} mudarLente={mudarLente}
              link={noVirar({ perto: chaveLocal(escola) })} />
          ) : (
            <div className="agir-bloco">
              <h3>Perto de você</h3>
              <p>
                Esta escola não tem coordenada no cadastro do TSE, então não dá para achar as escolas perto dela.
              </p>
              <Link to={noVirar({})}>Ver os bairros e as escolas de {municipio}</Link>
            </div>
          )}
        </div>
      ) : null}

      <p className="discreto" style={{ marginTop: 16 }}>
        <strong>O que os números não dizem.</strong> Quem faltou é um teto: parte mudou de cidade, está fora do país ou não pode
        votar. O saldo supõe que quem faltou votaria como os vizinhos que votaram. Quem votou em outro candidato, branco ou
        nulo não tem lado. O “abaixo do esperado” depende do modelo: é pista, não certeza. São somas por escola, nunca dados
        de pessoas.{' '}
        <Link to={`/virar?ir=como-calculamos${candidato ? `&c=${candidato}` : ''}`}>Como calculamos</Link>.
      </p>
      <LeiCurta candidato={candidato} />
    </section>
  )
}

function NaSuaEscola({ escola, candidato }: { escola: Local; candidato: NumeroCandidato | null }) {
  const cand = candidato ? CANDIDATOS[candidato] : null
  const saldo = candidato ? potencial(escola, candidato, 'faltosos') : 0
  const abaixo = candidato ? potencial(escola, candidato, 'perfil') : 0
  return (
    <div className="agir-bloco">
      <h3>Na sua escola</h3>
      <p className="secundario agir-lugar">
        {escola.nome}
        {escola.bairro ? ` · ${escola.bairro}` : ''}
      </p>
      <dl className="agir-numeros">
        <div>
          <dt>faltaram no 1º turno</dt>
          <dd>{inteiro(escola.faltosos)}</dd>
        </div>
        <div>
          <dt>votaram em outro candidato, branco ou nulo</dt>
          <dd>{inteiro(escola.abertos)}</dd>
        </div>
        {cand && saldo > 0 && (
          <div>
            <dt>saldo possível para {cand.curto}, se quem faltou votar</dt>
            <dd>{inteiro(Math.round(saldo))}</dd>
          </div>
        )}
        {cand && abaixo > 0 && (
          <div>
            <dt>
              votos de {cand.curto} abaixo do esperado <SeloExperimental />
            </dt>
            <dd>{inteiro(Math.round(abaixo))}</dd>
          </div>
        )}
      </dl>
      {cand && saldo <= 0 && (
        <p className="agir-nota">
          {cand.curto} não ficou à frente aqui: lembrar quem faltou não soma para ele nesta escola. Conversar com quem votou em
          outro candidato, branco ou nulo vale em qualquer lugar.
        </p>
      )}
      {!cand && <p className="agir-nota">Escolha para quem, acima, para ver o saldo possível.</p>}
    </div>
  )
}

function PertoDeVoce({ perto, escola, candidato, lente, mudarLente, link }: {
  perto: (Local & { km: number })[]
  escola: Local
  candidato: NumeroCandidato | null
  lente: Lente
  mudarLente: (l: Lente) => void
  link: string
}) {
  const cand = candidato ? CANDIDATOS[candidato] : null
  const total = somar(perto)
  const saldo = candidato ? potencialSomado(perto, candidato, 'faltosos') : 0
  const abaixo = candidato ? potencialSomado(perto, candidato, 'perfil') : 0
  const minha = chaveLocal(escola)
  // "em aberto" não depende do candidato; "quem faltou" e "o perfil" precisam dele
  const ranking =
    !LENTES[lente].porCandidato || candidato
      ? perto
          .map((l) => ({ ...l, valor: potencial(l, candidato ?? 13, lente) }))
          .filter((l) => l.valor > 0)
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 3)
      : []

  return (
    <div className="agir-bloco">
      <h3>Perto de você</h3>
      <p className="secundario agir-lugar">
        {perto.length} {perto.length === 1 ? 'escola' : 'escolas'} a até {RAIO_PERTO_KM} km, contando a sua
      </p>
      <dl className="agir-numeros">
        <div>
          <dt>faltaram no 1º turno</dt>
          <dd>{inteiro(total.faltosos)}</dd>
        </div>
        <div>
          <dt>votaram em outro candidato, branco ou nulo</dt>
          <dd>{inteiro(total.abertos)}</dd>
        </div>
        {cand && saldo > 0 && (
          <div>
            <dt>saldo possível para {cand.curto}, se quem faltou votar</dt>
            <dd>{inteiro(Math.round(saldo))}</dd>
          </div>
        )}
        {cand && abaixo > 0 && (
          <div>
            <dt>
              votos de {cand.curto} abaixo do esperado <SeloExperimental />
            </dt>
            <dd>{inteiro(Math.round(abaixo))}</dd>
          </div>
        )}
      </dl>

      <div className="abas" role="group" aria-label="Que tipo de conversa" style={{ marginTop: 16 }}>
        {TODAS_LENTES.map((l) => (
          <button key={l} aria-pressed={lente === l} onClick={() => mudarLente(l)}>
            {LENTES[l].titulo}
          </button>
        ))}
      </div>
      {ranking.length > 0 ? (
        <>
          <p className="agir-legenda">
            {lente === 'faltosos'
              ? `Onde lembrar quem faltou rende mais para ${cand!.curto}:`
              : lente === 'perfil'
                ? `Onde ${cand!.curto} teve menos votos do que escolas de perfil parecido na cidade (pista, não certeza):`
                : 'Onde há mais votos em aberto:'}
          </p>
          <ol className="agir-lista">
            {ranking.map((l) => (
              <li key={chaveLocal(l)}>
                <span>
                  <span className="agir-lista-nome">{l.nome}</span>
                  <span className="agir-lista-detalhe">
                    {chaveLocal(l) === minha ? 'a sua escola' : km(l.km)}
                    {l.bairro ? ` · ${l.bairro}` : ''}
                  </span>
                </span>
                <strong className="agir-lista-valor">{inteiro(Math.round(l.valor))}</strong>
              </li>
            ))}
          </ol>
        </>
      ) : !cand ? (
        <p className="agir-nota">
          Escolha para quem, acima, para ver {lente === 'perfil' ? 'onde o perfil promete mais' : 'onde lembrar quem faltou rende mais'}.
        </p>
      ) : lente === 'perfil' ? (
        <p className="agir-nota">
          {cand.curto} não ficou abaixo do esperado em nenhuma das {perto.length} escolas perto daqui.{' '}
          <button className="link-botao" onClick={() => mudarLente('abertos')}>
            Ver onde há mais votos em aberto
          </button>
          .
        </p>
      ) : (
        <p className="agir-nota">
          {cand.curto} não ficou à frente em nenhuma das {perto.length} escolas perto daqui: lembrar quem faltou não soma para
          ele neste pedaço da cidade.{' '}
          <button className="link-botao" onClick={() => mudarLente('abertos')}>
            Ver onde há mais votos em aberto
          </button>
          .
        </p>
      )}
      <Link className="botao" to={link} style={{ marginTop: 16 }}>
        Ver as escolas perto daqui no mapa
      </Link>
    </div>
  )
}
