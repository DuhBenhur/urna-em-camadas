import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocais, type Local } from '../lib/dados'
import { inteiro, pp } from '../lib/formato'
import {
  classeSegundo, coresSegundo, escolaDoisTurnos, margem, ROTULOS_SEGUNDO, situacao, temEscolas2t, type CidadeDoisTurnos,
  type DoisTurnos,
} from '../lib/segundo'
import { useTema } from '../lib/tema'
import { TabelaRolagem } from './TabelaRolagem'

const MapaLocais = lazy(() => import('./Mapas').then((m) => ({ default: m.MapaLocais })))

type Escola = { l: Local; chave: string; d: DoisTurnos }

const frente = (x: number) => (Math.abs(x) < 0.0005 ? 'empate' : `${x > 0 ? 'Lula' : 'Flávio'} à frente por ${pp(Math.abs(x)).slice(1)}`)

/** Uma linha por escola: nome e bairro, eleitores, quem estava à frente em cada turno. */
function Linha({ e, aoEscolher }: { e: Escola; aoEscolher: (chave: string) => void }) {
  const s = situacao(e.d)
  return (
    <tr>
      <td>
        <button className="link" onClick={() => aoEscolher(e.chave)}>{e.l.nome}</button>
        {s === 'virou' && <> <span className="pilula pilula-virou">virou</span></>}
        {e.l.bairro && <span className="discreto" style={{ display: 'block' }}>{e.l.bairro}</span>}
      </td>
      <td className="num col-sec">{inteiro(e.d.t2.aptos)}</td>
      <td>{frente(margem(e.d.t1))}</td>
      <td>{frente(margem(e.d.t2))}</td>
    </tr>
  )
}

function Tabela({ escolas, rotulo, aoEscolher }: { escolas: Escola[]; rotulo: string; aoEscolher: (chave: string) => void }) {
  const [todas, setTodas] = useState(false)
  const mostradas = todas ? escolas : escolas.slice(0, 15)
  return (
    <>
      <TabelaRolagem rotulo={rotulo}>
        <table>
          <thead>
            <tr>
              <th scope="col">Escola</th>
              <th scope="col" className="num col-sec">Eleitores</th>
              <th scope="col">1º turno</th>
              <th scope="col">2º turno</th>
            </tr>
          </thead>
          <tbody>
            {mostradas.map((e) => <Linha key={e.chave} e={e} aoEscolher={aoEscolher} />)}
          </tbody>
        </table>
      </TabelaRolagem>
      {escolas.length > 15 && (
        <button className="botao botao-secundario botao-pequeno" style={{ marginTop: 12 }} onClick={() => setTodas(!todas)}>
          {todas ? 'Mostrar só as 15 maiores' : `Mostrar todas as ${inteiro(escolas.length)}`}
        </button>
      )}
    </>
  )
}

/**
 * As escolas de uma cidade nos dois turnos: o mapa (quem ganhou cada escola e onde virou), as escolas que viraram e todas as
 * escolas. Só aparece depois de o TSE publicar os boletins de urna do 2º turno (pipeline/14 e 07); antes, fica o link para as
 * escolas no 1º turno, na ferramenta.
 */
export function EscolasSegundoTurno({ cidade }: { cidade: CidadeDoisTurnos }) {
  useTema()
  const { dados: locais } = useLocais(cidade.cd)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const escolas = useMemo(() => {
    const lista: Escola[] = []
    for (const l of locais ?? []) {
      const d = escolaDoisTurnos(l)
      if (d) lista.push({ l, chave: `${l.zona}-${l.local}`, d })
    }
    return lista.sort((a, b) => b.d.t2.aptos - a.d.t2.aptos)
  }, [locais])

  if (!locais) return <p className="carregando">Carregando as escolas…</p>
  if (!temEscolas2t(locais)) {
    return (
      <p className="discreto" style={{ marginTop: 12 }}>
        <Link to={`/ferramenta?m=${cidade.cd}&aba=resultado`}>Ver as escolas da cidade no 1º turno</Link>.
      </p>
    )
  }

  const contagem = ROTULOS_SEGUNDO.vitoria.map(() => 0)
  for (const e of escolas) contagem[classeSegundo(e.d, 'vitoria')] += 1
  const viraram = escolas.filter((e) => situacao(e.d) === 'virou')
  const ganhou = escolas.filter((e) => e.d.t2.v13 > e.d.t2.v22).length
  const cores = coresSegundo('vitoria')
  const escolher = (chave: string) => {
    setSelecionada(chave)
    document.getElementById('escolas-2t-mapa')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="escolas-2t" id="escolas-2t">
      <h3>As escolas de {cidade.nome}</h3>
      <p>
        Lula ganhou em {inteiro(ganhou)} das {inteiro(escolas.length)} escolas.{' '}
        {viraram.length > 0 ? (
          <>Em <strong>{inteiro(viraram.length)} delas, virou</strong>: Flávio tinha mais votos no 1º turno, e Lula passou à frente no 2º.</>
        ) : (
          <>Nenhuma virou: onde Lula ganhou, já estava à frente no 1º turno.</>
        )}
      </p>
      <div id="escolas-2t-mapa">
        <Suspense fallback={<div className="mapa mapa-pequeno mapa-espera"><p className="carregando">Carregando o mapa…</p></div>}>
          <MapaLocais locais={escolas.map((e) => e.l)} variavel="vitoria" selecionado={selecionada} aoSelecionar={setSelecionada} chave="vitoria" />
        </Suspense>
      </div>
      <div className="legenda-segundo">
        <ul>
          {ROTULOS_SEGUNDO.vitoria.map((r, i) => (
            <li key={r}>
              <span className="chave" style={{ background: cores[i] }} aria-hidden="true" />
              {r} <span className="discreto">({inteiro(contagem[i])} {contagem[i] === 1 ? 'escola' : 'escolas'})</span>
            </li>
          ))}
        </ul>
      </div>
      {viraram.length > 0 && (
        <>
          <h4>As escolas que viraram</h4>
          <Tabela escolas={viraram} rotulo={`Escolas que viraram em ${cidade.nome}`} aoEscolher={escolher} />
        </>
      )}
      <details className="escolas-2t-todas">
        <summary>Todas as escolas, nos dois turnos</summary>
        <Tabela escolas={escolas} rotulo={`Escolas de ${cidade.nome}`} aoEscolher={escolher} />
      </details>
      <p className="nota-tabela">
        Diferença entre Lula e Flávio, em pontos dos votos válidos de cada escola; eleitores do 2º turno. Uma escola que virou não
        diz quem mudou de voto: mostra o resultado das urnas daquele lugar.{' '}
        <Link to={`/ferramenta?m=${cidade.cd}&aba=secao`}>Ache a sua seção</Link>.
      </p>
    </div>
  )
}
