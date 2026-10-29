import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EscolasSegundoTurno } from '../components/EscolasSegundoTurno'
import { GraficoHorario, VOTOS_DEPOIS_17H, type Marco } from '../components/GraficoHorario'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { useMunicipios, normalizar } from '../lib/dados'
import { inteiro, milhoes, pct, pp } from '../lib/formato'
import {
  abstencao, aMais, avanco, cidades, classeSegundo, coresSegundo, lerVista, lulaPct, margem, quedaAbstencao, situacao,
  ROTULOS_SEGUNDO, TITULOS_LEGENDA, useSegundoTurno, VISTAS, type CidadeDoisTurnos, type DoisTurnos, type SegundoTurno as Dados,
  type VistaSegundo,
} from '../lib/segundo'
import { useTema } from '../lib/tema'
import { comPreposicao } from '../lib/ufs'
import { useVisivel } from '../lib/useVisivel'

// o mapa (MapLibre, ~800 kB) só carrega quando a pessoa chega até ele: a abertura com a foto tem de aparecer rápido
const MapaSegundoTurno = lazy(() => import('../components/MapaSegundoTurno').then((m) => ({ default: m.MapaSegundoTurno })))

/**
 * A foto da abertura (site/public/foto/, em 2000 e 1000 px de largura): Ricardo Stuckert / Lula Oficial, CC BY-SA 4.0.
 * A licença pede o crédito com os links e que a versão redimensionada e recortada siga sob a mesma licença (ver o Sobre).
 */
const FOTO = {
  autor: 'Ricardo Stuckert / Lula Oficial',
  titulo: '24.10.2026 - Lula em São Paulo: O Brasil Pronto Pra Mais',
  url: 'https://www.flickr.com/photos/lulaoficial/55610270110/',
  licenca: 'CC BY-SA 4.0',
  urlLicenca: 'https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br',
  descricao:
    'Foto: vista do alto da Avenida Paulista lotada, em 24 de outubro, véspera do 2º turno. No meio da multidão de vermelho, Lula, de pé sobre um carro com a faixa “Vote 13”, segura a Constituição e uma bandeira do Brasil.',
}

const ATALHOS: [string, string][] = [
  ['onde', 'Onde virou'],
  ['votar', 'Mais gente foi votar'],
  ['horario', 'Das 17h às 19h'],
  ['confere', 'A conta confere'],
]

/** "Lula à frente por 4,1 pontos" */
const frente = (x: number) => (Math.abs(x) < 0.0005 ? 'empate' : `${x > 0 ? 'Lula' : 'Flávio'} à frente por ${pp(Math.abs(x)).slice(1)}`)
const plural = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`

/** Fontes da cronologia das 17h às 19h (consultadas em 26/10/2026). */
const FONTES_HORARIO = [
  ['Poder360: cronologia da ampliação do horário', 'https://www.poder360.com.br/poder-eleicoes-2026/leia-a-cronologia-da-ampliacao-do-horario-de-votacao-no-2o-turno/'],
  ['Poder360: Zanin prorroga a votação até as 19h', 'https://www.poder360.com.br/poder-eleicoes-2026/zanin-prorroga-votacao-do-2o-turno-ate-19h/'],
  ['CartaCapital: Lula e Flávio pedem prorrogação até as 19h', 'https://www.cartacapital.com.br/politica/lula-e-flavio-bolsonaro-pedem-ao-tse-prorrogacao-da-votacao-ate-as-19h/'],
  ['Metrópoles: Flávio pede mais 2 horas em cidades de SP, PR e SC', 'https://www.metropoles.com/brasil/flavio-pede-ao-tse-mais-2-horas-de-votacao-em-cidades-de-sp-pr-e-sc'],
  ['Brasil 61: votação prorrogada, pausa na apuração e transporte', 'https://brasil61.com/n/eleicoes-2026-segundo-turno-teve-votacao-prorrogada-pausa-na-apuracao-e-denuncias-sobre-transporte-bras2617370'],
  ['InfoMoney: Flávio não reconhece o resultado', 'https://www.infomoney.com.br/politica/flavio-nao-reconhece-resultado-da-eleicao-e-diz-que-pedira-anulacao-ao-tse/'],
  ['Jovem Pan: Zanin definiu a prorrogação em conversa com Nunes Marques e Fachin', 'https://jovempan.com.br/politica/zanin-definiu-prorrogacao-da-votacao-em-conversa-com-nunes-marques-e-fachin/'],
  ['CNN Brasil: 34 mil eleitores votaram após as 17h (levantamento da Setup News com dados do TSE)', 'https://www.cnnbrasil.com.br/eleicoes/dados-tse-votacao-apos-prorrogacao/'],
  ['Gazeta do Povo: levantamento do G1 com os registros das urnas aponta 35.521 votos após as 17h', 'https://www.gazetadopovo.com.br/eleicoes/2026/extensao-horario-votacao-teve-35-mil-votos-17h-19h/'],
  ['ND Mais: Flávio desiste de pedir a anulação e muda a estratégia para tentar cassar a chapa de Lula', 'https://ndmais.com.br/politica/flavio-bolsonaro-desiste-de-pedir-anulacao-da-eleicao-e-muda-estrategia-para-tentar-cassar-chapa-de-lula/'],
]

/** Os marcos da tarde de 25/10, em horário de Brasília; o número é o mesmo no gráfico. */
const CRONOLOGIA: Marco[] = [
  { numero: 1, hora: '13:22', texto: 'A campanha de Lula pede ao TSE mais tempo de votação: faltam ônibus em cidades da Bahia.' },
  { numero: 2, hora: '13:30', texto: 'Por volta das 13h30, o presidente do TSE, Kassio Nunes Marques, recebe o pedido e não decide naquele momento.' },
  { numero: 3, hora: '15:42', texto: 'A campanha de Lula amplia o pedido para todos os estados.' },
  { numero: 4, hora: '15:50', texto: 'A campanha de Flávio Bolsonaro também pede ao TSE votação até as 19h, em cidades de São Paulo, do Paraná e de Santa Catarina, por causa de chuva, alagamentos e falta de energia.' },
  { numero: 5, hora: '16:22', texto: 'A campanha de Lula leva o pedido ao Supremo Tribunal Federal.' },
  { numero: 6, hora: '16:33', texto: 'O ministro Cristiano Zanin é sorteado relator no STF.' },
  { numero: 7, hora: '17:03', texto: 'Zanin manda estender a votação até as 19h. Numa ligação com Nunes Marques e com o presidente do STF, Edson Fachin, a decisão é restringida: vale só para as seções em que a urna ainda não tinha sido encerrada. Nas já encerradas, os votos são contados normalmente. O TSE suspende a divulgação dos resultados (estava em 0,25% das urnas) até as 19h.' },
  { numero: 8, hora: '19:06', texto: 'O último voto do país é registrado. A divulgação dos resultados já tinha sido retomada às 19h.' },
]

function Abertura({ st }: { st: Dados | null }) {
  const b = st?.brasil
  return (
    <section className="vitoria" aria-labelledby="titulo-vitoria">
      <div className="vitoria-foto" role="img" aria-label={FOTO.descricao} />
      <div className="conteudo vitoria-texto">
        <p className="vitoria-kicker">2º turno · 25 de outubro de 2026</p>
        <h1 id="titulo-vitoria">Lula reeleito</h1>
        {b ? (
          <>
            <p className="vitoria-lead">
              No 1º turno, Flávio Bolsonaro teve {milhoes(b.t1.v22 - b.t1.v13)} de votos a mais que Lula. No 2º, Lula virou e
              venceu por {milhoes(b.t2.v13 - b.t2.v22)}. E mais gente foi votar: {inteiro(b.t2.comparecimento - b.t1.comparecimento)}{' '}
              pessoas a mais nas urnas.
            </p>
            <dl className="vitoria-numeros">
              <div>
                <dt>Lula</dt>
                <dd className="vitoria-lula">{inteiro(b.t2.v13)}</dd>
                <dd>{pct(b.t2.v13 / b.t2.validos, 2)} dos votos válidos</dd>
              </div>
              <div>
                <dt>Flávio Bolsonaro</dt>
                <dd>{inteiro(b.t2.v22)}</dd>
                <dd>{pct(b.t2.v22 / b.t2.validos, 2)}</dd>
              </div>
              <div>
                <dt>Não votaram</dt>
                <dd>{pct(b.t2.abstencoes / b.t2.aptos, 2)}</dd>
                <dd>eram {pct(b.t1.abstencoes / b.t1.aptos, 2)} no 1º turno</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="vitoria-lead">Carregando o resultado…</p>
        )}
        <p className="vitoria-assinatura">Viva o governo Lula! <span>Eduardo Ben Hur, autor do site</span></p>
        {/* botões, não âncoras: com o HashRouter, um href="#onde" trocaria de página */}
        <nav className="vitoria-atalhos" aria-label="Nesta página">
          {ATALHOS.map(([id, rotulo]) => (
            <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
              {rotulo}
            </button>
          ))}
        </nav>
        <p className="vitoria-credito">
          Foto: <a href={FOTO.url}>{FOTO.autor}</a> (“{FOTO.titulo}”), <a href={FOTO.urlLicenca}>{FOTO.licenca}</a>; redimensionada
          e recortada.
        </p>
      </div>
    </section>
  )
}

function Legenda({ vista, contagem }: { vista: VistaSegundo; contagem: number[] }) {
  useTema()
  const cores = coresSegundo(vista)
  return (
    <div className="legenda-segundo">
      <p className="rotulo-pequeno">{TITULOS_LEGENDA[vista]}</p>
      <ul>
        {ROTULOS_SEGUNDO[vista].map((r, i) => (
          <li key={r}>
            <span className="chave chave-quadrada" style={{ background: cores[i] }} aria-hidden="true" />
            {r} <span className="discreto">({plural(contagem[i] ?? 0, 'cidade', 'cidades')})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const EXPLICACAO: Record<VistaSegundo, string> = {
  vitoria:
    'Em vermelho, onde Lula teve mais votos que Flávio no 2º turno. Em verde, onde virou: no 1º turno, Flávio tinha mais votos que Lula; no 2º, Lula passou à frente.',
  avanco:
    'Quanto a diferença entre os dois andou para o lado de Lula do 1º para o 2º turno, em pontos: 1 ponto é 1 voto em cada 100 votos válidos. Em cinza, as cidades onde Flávio avançou mais.',
  votar:
    'Quanto caiu a parte do eleitorado que não foi votar, do 1º para o 2º turno, em pontos: 1 ponto é 1 eleitor em cada 100. Mais escuro, mais gente a mais nas urnas.',
}

function CartaoCidade({ c, aoFechar }: { c: CidadeDoisTurnos; aoFechar: () => void }) {
  const s = situacao(c)
  const titulo = { virou: 'Virou para Lula', ganhou: 'Lula ganhou', perdeu: 'Flávio ganhou', virouFlavio: 'Virou para Flávio', empate: 'Empate' }[s]
  const linhas: [string, (l: DoisTurnos['t1']) => string][] = [
    ['Lula', (t) => `${pct(lulaPct(t))} (${inteiro(t.v13)})`],
    ['Flávio', (t) => `${pct(t.validos ? t.v22 / t.validos : 0)} (${inteiro(t.v22)})`],
    ['Diferença', (t) => frente(margem(t))],
    ['Não votaram', (t) => pct(abstencao(t))],
    ['Votaram', (t) => inteiro(t.comparecimento)],
  ]
  return (
    <div className="cartao cidade-2t" aria-live="polite">
      <div className="cidade-2t-topo">
        <h3>
          {c.nome} ({c.uf}) <span className={`pilula ${s === 'virou' ? 'pilula-virou' : ''}`}>{titulo}</span>
        </h3>
        <button className="link" onClick={aoFechar}>Fechar</button>
      </div>
      <TabelaRolagem rotulo={`${c.nome}, 1º e 2º turnos`}>
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col" className="num">1º turno</th>
              <th scope="col" className="num">2º turno</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(([rotulo, f]) => (
              <tr key={rotulo}>
                <th scope="row">{rotulo}</th>
                <td className="num">{f(c.t1)}</td>
                <td className="num">{f(c.t2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolagem>
      <p className="discreto" style={{ marginTop: 12, marginBottom: 0 }}>
        Lula avançou {pp(avanco(c))} na diferença entre os dois.
      </p>
    </div>
  )
}

function BuscaCidade({ lista, aoEscolher }: { lista: CidadeDoisTurnos[]; aoEscolher: (cd: number) => void }) {
  const [texto, setTexto] = useState('')
  const achadas = useMemo(() => {
    const t = normalizar(texto)
    if (t.length < 2) return []
    return lista.filter((c) => normalizar(c.nome).startsWith(t)).sort((a, b) => b.t2.aptos - a.t2.aptos).slice(0, 8)
  }, [texto, lista])
  return (
    <div className="campo-municipio">
      <label htmlFor="busca-2t">Procure uma cidade</label>
      <input id="busca-2t" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ex.: Belo Horizonte" autoComplete="off" />
      {achadas.length > 0 && (
        <ul className="sugestoes">
          {achadas.map((c) => (
            <li key={c.cd}>
              <button
                className="sugestao"
                onClick={() => {
                  aoEscolher(c.cd)
                  setTexto('')
                }}
              >
                {c.nome} ({c.uf})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OndeVirou({ st, lista }: { st: Dados; lista: CidadeDoisTurnos[] }) {
  const [params, setParams] = useSearchParams()
  const vista = lerVista(params.get('v'))
  const uf = (params.get('e') ?? '').toUpperCase()
  const estado = st.estados.find((e) => e.uf === uf) ?? null
  const cdCidade = Number(params.get('cidade')) || null
  const [refMapa, mapaPerto] = useVisivel<HTMLDivElement>()
  const [todas, setTodas] = useState(false)
  const { dados: indice } = useMunicipios()

  const mudar = (novos: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(novos)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  const doLugar = estado ? lista.filter((c) => c.uf === estado.uf) : lista
  const contagem = useMemo(() => {
    const n = ROTULOS_SEGUNDO[vista].map(() => 0)
    for (const c of doLugar) n[classeSegundo(c, vista)] += 1
    return n
  }, [doLugar, vista])
  const ganhou = doLugar.filter((c) => c.t2.v13 > c.t2.v22).length
  const viraram = doLugar.filter((c) => situacao(c) === 'virou').sort((a, b) => b.t2.aptos - a.t2.aptos)
  const contrario = doLugar.filter((c) => situacao(c) === 'virouFlavio')
  const escolhida = cdCidade ? lista.find((c) => c.cd === cdCidade) ?? null : null
  const lugar = estado ? comPreposicao('em', estado.uf, estado.nome) : 'no Brasil'

  return (
    <section id="onde" className="capitulo-2t">
      <h2>Onde Lula ganhou e onde virou</h2>
      <p className="resumo-capitulo">
        Lula ganhou em {inteiro(ganhou)} das {plural(doLugar.length, 'cidade', 'cidades')} {lugar}.{' '}
        {viraram.length > 0 ? (
          <>
            Em <strong>{inteiro(viraram.length)} delas, virou</strong>: Flávio tinha mais votos no 1º turno, e Lula passou à frente no 2º.
          </>
        ) : (
          <>Em nenhuma delas virou: onde Lula ganhou, já estava à frente de Flávio no 1º turno.</>
        )}
        {estado && situacao(estado) === 'virou' && <> E o estado inteiro virou: {frente(margem(estado.t1))} no 1º turno, {frente(margem(estado.t2))} no 2º.</>}
      </p>

      <div className="campos campos-2t">
        <div>
          <label htmlFor="estado-2t">Estado</label>
          <select id="estado-2t" value={uf} onChange={(e) => mudar({ e: e.target.value || null, cidade: null })}>
            <option value="">Brasil inteiro</option>
            {[...st.estados].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((e) => (
              <option key={e.uf} value={e.uf}>{e.nome}</option>
            ))}
          </select>
        </div>
        <BuscaCidade lista={lista} aoEscolher={(cd) => mudar({ cidade: String(cd) })} />
      </div>

      <div className="abas" role="group" aria-label="O que o mapa mostra" style={{ marginTop: 16 }}>
        {VISTAS.map(([v, rotulo]) => (
          <button key={v} aria-pressed={vista === v} onClick={() => mudar({ v: v === 'vitoria' ? null : v })}>
            {rotulo}
          </button>
        ))}
      </div>
      <p className="como-ler-2t">{EXPLICACAO[vista]}</p>

      <div ref={refMapa}>
        {mapaPerto && indice ? (
          <Suspense fallback={<div className="mapa mapa-espera"><p className="carregando">Carregando o mapa…</p></div>}>
            <MapaSegundoTurno indice={indice} segundo={st} vista={vista} foco={estado?.uf} aoClicar={(cd) => mudar({ cidade: String(cd) })} />
          </Suspense>
        ) : (
          <div className="mapa mapa-espera"><p className="carregando">Carregando o mapa…</p></div>
        )}
      </div>
      <Legenda vista={vista} contagem={contagem} />

      {escolhida && (
        <>
          <CartaoCidade c={escolhida} aoFechar={() => mudar({ cidade: null })} />
          <EscolasSegundoTurno key={escolhida.cd} cidade={escolhida} />
        </>
      )}

      <h3 style={{ marginTop: 32 }}>As cidades que viraram {lugar}</h3>
      {viraram.length === 0 ? (
        <p>Nenhuma cidade virou para Lula {lugar}.</p>
      ) : (
        <>
          <TabelaRolagem rotulo="Cidades que viraram">
            <table>
              <thead>
                <tr>
                  <th scope="col">Cidade</th>
                  <th scope="col" className="num">Eleitores</th>
                  <th scope="col">1º turno</th>
                  <th scope="col">2º turno</th>
                </tr>
              </thead>
              <tbody>
                {(todas ? viraram : viraram.slice(0, 15)).map((c) => (
                  <tr key={c.cd}>
                    <td>
                      <button className="link" onClick={() => mudar({ cidade: String(c.cd) })}>{c.nome}</button>{' '}
                      <span className="discreto">({c.uf})</span>
                    </td>
                    <td className="num">{inteiro(c.t2.aptos)}</td>
                    <td>{frente(margem(c.t1))}</td>
                    <td>{frente(margem(c.t2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelaRolagem>
          {viraram.length > 15 && (
            <button className="botao botao-secundario botao-pequeno" style={{ marginTop: 12 }} onClick={() => setTodas(!todas)}>
              {todas ? 'Mostrar só as 15 maiores' : `Mostrar todas as ${inteiro(viraram.length)}`}
            </button>
          )}
        </>
      )}
      <p className="nota-tabela">
        Virou: entre os dois que foram ao 2º turno, Flávio tinha mais votos que Lula no 1º turno e Lula ficou à frente no 2º.{' '}
        {contrario.length > 0
          ? `No sentido contrário, ${plural(contrario.length, 'cidade virou', 'cidades viraram')} para Flávio ${lugar}: ${contrario.map((c) => `${c.nome} (${c.uf})`).slice(0, 5).join(', ')}.`
          : `Nenhuma cidade virou para Flávio ${lugar}.`}
      </p>

      {!estado && <TabelaEstados st={st} aoEscolher={(u) => mudar({ e: u, cidade: null })} />}
    </section>
  )
}

function TabelaEstados({ st, aoEscolher }: { st: Dados; aoEscolher: (uf: string) => void }) {
  const estados = [...st.estados].sort((a, b) => lulaPct(b.t2) - lulaPct(a.t2))
  return (
    <>
      <h3 style={{ marginTop: 32 }}>Os estados</h3>
      <TabelaRolagem rotulo="Os estados nos dois turnos">
        <table>
          <thead>
            <tr>
              <th scope="col">Estado</th>
              <th scope="col" className="num">Lula no 2º turno</th>
              <th scope="col">1º turno</th>
              <th scope="col">2º turno</th>
              <th scope="col" className="num">Lula avançou</th>
            </tr>
          </thead>
          <tbody>
            {estados.map((e) => (
              <tr key={e.uf}>
                <td>
                  <button className="link" onClick={() => aoEscolher(e.uf)}>{e.nome}</button>
                  {situacao(e) === 'virou' && <> <span className="pilula pilula-virou">virou</span></>}
                </td>
                <td className="num">{pct(lulaPct(e.t2))}</td>
                <td>{frente(margem(e.t1))}</td>
                <td>{frente(margem(e.t2))}</td>
                <td className="num">{pp(avanco(e))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolagem>
      <p className="nota-tabela">Diferença entre Lula e Flávio, em pontos dos votos válidos. Sem o voto do exterior.</p>
    </>
  )
}

function MaisGente({ st }: { st: Dados }) {
  const b = st.brasil
  const estados = [...st.estados].sort((x, y) => quedaAbstencao(y) - quedaAbstencao(x))
  const subiu = estados.filter((e) => quedaAbstencao(e) < 0)
  return (
    <section id="votar" className="capitulo-2t">
      <h2>Mais gente foi votar</h2>
      <p className="resumo-capitulo">
        No 1º turno, {milhoes(b.t1.abstencoes)} de eleitores não votaram ({pct(b.t1.abstencoes / b.t1.aptos, 2)}). No 2º,{' '}
        {milhoes(b.t2.abstencoes)} ({pct(b.t2.abstencoes / b.t2.aptos, 2)}). Foram <strong>{inteiro(b.t2.comparecimento - b.t1.comparecimento)} pessoas a
        mais</strong> nas urnas.
      </p>
      <p>
        A abstenção caiu em {plural(estados.length - subiu.length, 'estado', 'estados')}, e mais em {estados.slice(0, 3).map((e) => e.nome).join(', ')}.
        {subiu.length > 0 && (
          <> Não em todos: subiu em {subiu.map((e) => e.nome).join(', ')}.</>
        )}{' '}
        O dado mostra onde mais gente votou; não mostra por quê. No mapa acima, a opção “Onde mais gente foi votar” mostra cada cidade.
      </p>
      <TabelaRolagem rotulo="Abstenção por estado nos dois turnos">
        <table>
          <thead>
            <tr>
              <th scope="col">Estado</th>
              <th scope="col" className="num">Não votaram no 1º turno</th>
              <th scope="col" className="num">No 2º turno</th>
              <th scope="col" className="num">Variação</th>
              <th scope="col" className="num">Pessoas a mais nas urnas</th>
            </tr>
          </thead>
          <tbody>
            {estados.map((e) => (
              <tr key={e.uf}>
                <td>{e.nome}</td>
                <td className="num">{pct(abstencao(e.t1))}</td>
                <td className="num">{pct(abstencao(e.t2))}</td>
                <td className="num">{pp(-quedaAbstencao(e))}</td>
                <td className="num">{inteiro(aMais(e))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolagem>
      <p className="nota-tabela">
        Parte do eleitorado que não foi votar, em cada turno. Variação em pontos: 1 ponto é 1 eleitor em cada 100; negativo é
        abstenção menor. Sem o voto do exterior.
      </p>
    </section>
  )
}

function Horario({ st }: { st: Dados }) {
  const b = st.brasil.t2
  const depois = VOTOS_DEPOIS_17H[VOTOS_DEPOIS_17H.length - 1][1]
  const margem = b.v13 - b.v22
  const faixas: [string, number][] = [
    ['17h00 a 17h01', VOTOS_DEPOIS_17H[1][1]],
    ['17h01 a 17h05', VOTOS_DEPOIS_17H[2][1] - VOTOS_DEPOIS_17H[1][1]],
    ['17h05 a 19h06 (o último voto)', depois - VOTOS_DEPOIS_17H[2][1]],
  ]
  return (
    <section id="horario" className="capitulo-2t">
      <h2>Das 17h às 19h: por que a votação foi até mais tarde</h2>
      <p className="resumo-capitulo">
        As duas campanhas pediram mais tempo. A prorrogação valeu só onde a urna ainda estava aberta: urna encerrada não podia ser
        reaberta. Depois das 17h, foram registrados {inteiro(depois)} votos ({pct(depois / b.comparecimento, 3)} de quem votou),
        quase todos nos cinco primeiros minutos, de quem já estava na fila. Lula venceu por {inteiro(margem)} votos:{' '}
        {inteiro(Math.round(margem / depois))} vezes mais.
      </p>
      <GraficoHorario marcos={CRONOLOGIA} />
      <p className="legenda" style={{ maxWidth: 680 }}>
        Números: os marcos da tarde, explicados abaixo. Linha: votos registrados depois das 17h, somados, minuto a minuto até
        17h05; dali ao último voto, às 19h06, só se sabe o total (tracejado). Horário de Brasília.
      </p>
      <ol className="cronologia">
        {CRONOLOGIA.map((m) => (
          <li key={m.numero}>
            <span className="cronologia-hora"><span className="cronologia-numero">{m.numero}</span>{m.hora.replace(':', 'h')}</span>
            <span>{m.texto}</span>
          </li>
        ))}
      </ol>

      <h3>Quantos votaram depois das 17h</h3>
      <p>
        Às 17h, quem está na fila recebe uma senha e vota: é a regra de toda eleição (Código Eleitoral, art. 153). Por isso, a
        maior parte dos votos depois das 17h entra nos primeiros minutos. Desta vez, foram {inteiro(VOTOS_DEPOIS_17H[2][1])} até
        17h05. Durante o resto da prorrogação, até o último voto, às 19h06, foram {inteiro(depois - VOTOS_DEPOIS_17H[2][1])}.
      </p>
      <TabelaRolagem rotulo="Votos registrados depois das 17h">
        <table className="tabela-estreita">
          <thead>
            <tr>
              <th scope="col">Horário</th>
              <th scope="col" className="num">Votos</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map(([h, v]) => (
              <tr key={h}>
                <td>{h}</td>
                <td className="num">{inteiro(v)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total depois das 17h</th>
              <td className="num"><strong>{inteiro(depois)}</strong></td>
            </tr>
            <tr>
              <th scope="row">Diferença entre Lula e Flávio</th>
              <td className="num"><strong>{inteiro(margem)}</strong></td>
            </tr>
          </tbody>
        </table>
      </TabelaRolagem>
      <p className="nota-tabela">
        Levantamento da Setup News, parceira da CNN Brasil, com dados do TSE (26/10). O G1, com os registros das urnas (os logs)
        das 497.897 seções, chegou a 35.521 votos depois das 17h. O TSE confirmou o método, mas não divulgou um número oficial.
        Mesmo que todos esses votos fossem para o mesmo candidato, o resultado não mudaria. Este site ainda não refez a conta: os
        arquivos de urna do 2º turno, com a hora de cada voto, não estão no Portal de Dados Abertos do TSE.
      </p>

      <h3>Sem ônibus, não tem voto</h3>
      <p>
        O voto é obrigatório, mas quem depende de ônibus só chega à seção se houver ônibus. No domingo, o Ministério da Justiça
        registrou falhas na oferta de ônibus em São Paulo, no Rio de Janeiro, em Sergipe, no Pará, no Piauí, em Alagoas e na
        Paraíba; a federação de Lula denunciou frota reduzida em Salvador, Feira de Santana e Lauro de Freitas. A prorrogação serviu
        para quem estava na fila ou a caminho.
      </p>
      <h3>Quem fala em golpe</h3>
      <p>
        Na noite da eleição, Flávio Bolsonaro disse que não reconhecia o resultado, criticou a prorrogação e anunciou que
        pediria a anulação do 2º turno. Menos de 24 horas depois, desistiu da anulação e passou a pedir a cassação da chapa de
        Lula por suposto abuso de poder, o que a Justiça Eleitoral ainda vai analisar. A própria campanha dele tinha pedido
        votação até as 19h em cidades do Sul e do Sudeste. Depois das 17h, entraram cerca
        de {inteiro(Math.round(depois / 1000))} mil votos, e Lula venceu por {milhoes(margem)}. E o resultado está publicado cidade
        por cidade: qualquer pessoa pode somar e conferir, como este site fez (abaixo).
      </p>
      <details className="fontes-2t">
        <summary>Fontes</summary>
        <ul>
          {FONTES_HORARIO.map(([nome, url]) => (
            <li key={url}><a href={url}>{nome}</a></li>
          ))}
        </ul>
      </details>
    </section>
  )
}

function ContaConfere({ st, n }: { st: Dados; n: number }) {
  const b = st.brasil.t2
  const p = st.pais.t2
  const e = st.exterior
  return (
    <section id="confere" className="capitulo-2t">
      <h2>A conta confere</h2>
      <p className="resumo-capitulo">
        Somamos o resultado oficial de cada uma das {inteiro(n)} cidades do Brasil e das cidades do exterior: dá exatamente o
        total que o TSE anunciou, em cada número.
      </p>
      <TabelaRolagem rotulo="Soma das cidades e total oficial">
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col" className="num">Soma das cidades do Brasil</th>
              <th scope="col" className="num">Exterior</th>
              <th scope="col" className="num">Total oficial do TSE</th>
            </tr>
          </thead>
          <tbody>
            {([['Lula', 'v13'], ['Flávio', 'v22'], ['Votos válidos', 'validos'], ['Votaram', 'comparecimento'], ['Eleitores das seções instaladas', 'aptos']] as const).map(([rotulo, campo]) => (
              <tr key={campo}>
                <th scope="row">{rotulo}</th>
                <td className="num">{inteiro(p[campo])}</td>
                <td className="num">{inteiro(e[campo])}</td>
                <td className="num">{inteiro(b[campo])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolagem>
      <p className="nota-tabela">
        Fonte: TSE, resultado oficial por município (resultados.tse.jus.br), gerado em {st.gerado_tse}, com 100% das seções
        totalizadas. O total de eleitores anunciado (158.745.502) inclui 423 eleitores de 41 seções do exterior que não foram
        instaladas; a abstenção é calculada sobre os eleitores das seções instaladas. A conferência roda a cada publicação do site; se um número não fechar, o site não é publicado. No 1º turno,
        este site conferiu as 497.897 urnas uma por uma: <Link to="/conferencia">confira a sua</Link>.
      </p>
    </section>
  )
}

/**
 * A inicial depois de 25/10: Lula reeleito. O 2º turno por cidade (resultado oficial do TSE) ao lado do 1º (boletins de urna
 * conferidos), a queda da abstenção, a cronologia da votação até as 19h e a conferência da soma. Estado na URL: `?e=UF`,
 * `?cidade={código TSE}` e `?v=avanco|votar`.
 */
export function SegundoTurno() {
  const { dados: st, erro } = useSegundoTurno()
  const { dados: indice } = useMunicipios()
  const lista = useMemo(() => (st && indice ? cidades(indice, st) : []), [st, indice])

  return (
    <>
      <Abertura st={st} />
      <div className="conteudo">
        {erro && <p className="aviso" style={{ marginTop: 32 }}>Não foi possível carregar o resultado do 2º turno.</p>}
        {st && lista.length > 0 ? (
          <>
            <OndeVirou st={st} lista={lista} />
            <MaisGente st={st} />
            <Horario st={st} />
            <ContaConfere st={st} n={lista.length} />
            <section className="capitulo-2t">
              <h2>A ferramenta da campanha</h2>
              <p>
                Até 24 de outubro, a página inicial deste site foi a ferramenta “Onde virar voto”: com o 1º turno urna por urna,
                os bairros e as escolas onde havia mais gente para conversar, com a mesma conta para os dois candidatos. Ela
                continua no ar, como registro.
              </p>
              <Link className="botao botao-secundario" to="/ferramenta">Abrir a ferramenta do 1º turno</Link>
            </section>
          </>
        ) : (
          !erro && <p className="carregando">Carregando…</p>
        )}
      </div>
    </>
  )
}
