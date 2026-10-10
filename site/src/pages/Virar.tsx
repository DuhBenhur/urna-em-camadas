import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BuscaTitulo } from '../components/Busca'
import { BuscaLugar, type Escolha } from '../components/BuscaLugar'
import { ResultadoCidade, SecoesCidade, type VistaResultado } from '../components/CidadeAbas'
import { EscolhaCandidato } from '../components/EscolhaCandidato'
import { LegendaEscala, LegendaSequencial } from '../components/Legendas'
import { LeiCurta } from '../components/LeiCurta'
import { LimitesNumeros } from '../components/LimitesNumeros'
import { Passo } from '../components/Passo'
import { SeloExperimental } from '../components/SeloExperimental'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { comCandidato, useCandidato } from '../lib/candidato'
import { contarEvento } from '../lib/contagem'
import { useLocais, useMunicipios, useResumo, type IndiceMunicipios, type Local, type Resumo, type UF } from '../lib/dados'
import { inteiro, milhoes, pct, pp } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'
import {
  LENTES, LENTES_PRINCIPAIS, RAIO_PERTO_KM, chaveLocal, escolasPerto, km, lerLente, nomeBairro, notaColuna, potencial,
  potencialSomado, ranquear, rolarQuandoAparecer, rotuloValor, somar, vantagem, type Lente, type Lugar, type NivelNota,
} from '../lib/virar'

// os mapas (MapLibre, ~800 kB) só carregam quando aparecem: o da cidade, ao abrir uma cidade; o do Brasil, quando a pessoa
// pede. A inicial é esta página e tem de abrir rápido
const MapaLocais = lazy(() => import('../components/Mapas').then((m) => ({ default: m.MapaLocais })))
const MapaBrasil = lazy(() => import('../components/Mapas').then((m) => ({ default: m.MapaBrasil })))

// Uma urna real da 1ª Zona de São Paulo (Bela Vista), na E.E. Caetano de Campos
const EXEMPLO = '/urna/SP/1/240'

const adversario = (n: NumeroCandidato): NumeroCandidato => (n === 13 ? 22 : 13)
const SEM_BAIRRO = '(sem bairro informado)'

/** A cidade numa página só (decisão D7): onde conversar (o padrão), o resultado do 1º turno e as seções de cada escola. */
type Aba = 'conversar' | 'resultado' | 'secao'
const ABAS: [Aba, string][] = [
  ['conversar', 'Onde conversar'],
  ['resultado', 'Resultado do 1º turno'],
  ['secao', 'Ache a sua seção'],
]
const lerAba = (a: string | null): Aba => (a === 'resultado' || a === 'secao' ? a : 'conversar')
const votos = (l: Lugar, n: NumeroCandidato) => (n === 13 ? l.v13 : l.v22)

/** "Lula 61% · Flávio 31%": sempre os dois, na mesma ordem do resto do site. */
const resultado = (l: Lugar) => `Lula ${pct(l.v13 / l.validos, 0)} · Flávio ${pct(l.v22 / l.validos, 0)}`

/** "Saldo possível para Lula": cabeçalho de tabela */
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** O que cada conversa quer dizer, em uma frase, para o candidato escolhido */
function explicarLente(l: Lente, curto: string): string {
  if (l === 'faltosos') {
    return `Quem não votou no 1º turno. Onde ${curto} ficou à frente, cada pessoa que for votar tende a somar; lembre também quem já votou nele de voltar no dia 25.`
  }
  if (l === 'abertos') return 'Quem votou em outro candidato, branco ou nulo no 1º turno. No 2º turno, todos escolhem entre os dois.'
  return `Escolas onde ${curto} teve menos votos do que escolas de perfil parecido na mesma cidade. Pista, não certeza.`
}

/**
 * A ferramenta, que é também a inicial: para quem → onde → que conversa → em que estados, cidades, bairros e escolas há
 * mais gente para essa conversa. O estado inteiro mora na URL (`?c=&a=&uf=&m=&perto=&bairro=&aba=&local=&vista=`), para o
 * link levar tudo.
 */
export function Virar() {
  const [params, setParams] = useSearchParams()
  const navegar = useNavigate()
  const [candidato, definirCandidato] = useCandidato()
  const lente = lerLente(params.get('a'))
  const uf = params.get('uf') ?? ''
  const cd = Number(params.get('m')) || null
  // "?perto={zona}-{local}": escola de partida (vinda da página da urna), com o anel de 2 km no mapa
  const perto = params.get('perto')
  // "?bairro=NOME": o bairro escolhido na busca ou na tabela de bairros, com as escolas dele
  const bairro = params.get('bairro')
  // a cidade: "?aba=resultado|secao" (sem aba, "Onde conversar"); "?local={zona}-{local}", a escola escolhida em "Ache a
  // sua seção"; "?vista=surpresa", o mapa da aba de resultado
  const aba = lerAba(params.get('aba'))
  const local = params.get('local')
  const vista: VistaResultado = params.get('vista') === 'surpresa' ? 'surpresa' : 'margem'
  const ir = params.get('ir')

  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const municipio = cd ? indice?.porCodigo.get(cd) : undefined
  const ufAtual = uf || municipio?.uf || ''

  // links antigos para a lei e para o "como calculamos", que agora ficam no guia
  useEffect(() => {
    if (ir === 'como-fazer' || ir === 'como-calculamos') {
      navegar(`/como-usar?ir=${ir === 'como-fazer' ? 'lei' : 'conversas'}`, { replace: true })
    }
  }, [ir, navegar])

  // quem chega por um link de aba (os endereços antigos da página do município) vê a cidade, não o topo da ferramenta
  const rolou = useRef(false)
  useEffect(() => {
    if (rolou.current || !municipio) return
    rolou.current = true
    if (local && aba === 'secao') rolarQuandoAparecer('secoes-escola')
    else if (aba !== 'conversar') rolarQuandoAparecer('cidade')
  }, [municipio, aba, local])

  /** Muda parâmetros da URL; descer de nível (estado, cidade) entra no histórico, para o "voltar" subir. */
  const mudar = (novos: Record<string, string | null>, historico = false) => {
    const p = new URLSearchParams(params)
    // a escolha pode ter vindo de outra página (cópia da aba): entra na URL para o link compartilhado levar tudo
    if (candidato && !p.has('c')) p.set('c', String(candidato))
    // a escola de partida, o bairro e a escola das seções são de uma cidade: trocar de lugar os desfaz
    if ('m' in novos) {
      p.delete('perto')
      p.delete('bairro')
      p.delete('local')
    }
    for (const [k, v] of Object.entries(novos)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: !historico })
  }

  /**
   * A busca única: cidade desce de nível; escola abre "Perto de você" (ou, na aba "Ache a sua seção", as seções dela);
   * bairro abre as escolas do bairro.
   */
  const escolherLugar = (e: Escolha) => {
    // só o tipo do que foi escolhido, nunca o texto digitado nem o lugar
    contarEvento(`busca-${e.tipo}`, `Busca: escolheu ${e.tipo}`)
    if (e.tipo === 'cidade') {
      mudar({ uf: e.uf, m: String(e.cd) }, true)
    } else if (e.tipo === 'escola' && aba === 'secao') {
      verSecoes(chaveLocal(e.local))
    } else if (e.tipo === 'escola') {
      mudar({ perto: chaveLocal(e.local), bairro: null, aba: null }, true)
      rolarQuandoAparecer('perto-de-voce')
    } else {
      escolherBairro(e.nome)
    }
  }
  const escolherBairro = (nome: string) => {
    mudar({ bairro: nome, perto: null, aba: null }, true)
    rolarQuandoAparecer('no-bairro')
  }
  const verSecoes = (chave: string) => {
    mudar({ aba: 'secao', local: chave }, true)
    rolarQuandoAparecer('secoes-escola')
  }

  return (
    <div className="conteudo virar">
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

      <Passo numero={2} titulo="Onde?">
        {ufAtual && resumo && (
          <nav className="migalhas" aria-label="Nível" style={{ marginTop: 0, marginBottom: 8 }}>
            <button className="link-botao" onClick={() => mudar({ uf: null, m: null }, true)}>Brasil</button>
            {' › '}
            <button className="link-botao" onClick={() => mudar({ uf: ufAtual, m: null }, true)}>
              {resumo.ufs.find((u) => u.uf === ufAtual)?.nome}
            </button>
            {municipio && <> › {municipio.nome}</>}
          </nav>
        )}
        <div className="campos campos-onde">
          <div>
            <label htmlFor="v-uf">Estado</label>
            <select id="v-uf" value={ufAtual} onChange={(e) => mudar({ uf: e.target.value || null, m: null }, true)}>
              <option value="">Brasil inteiro</option>
              {resumo?.ufs.map((u) => (
                <option key={u.uf} value={u.uf}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
          <BuscaLugar id="v-busca" uf={ufAtual} cd={municipio?.cd ?? null} aoEscolher={escolherLugar} />
        </div>
        <details className="zona-secao">
          <summary>Tenho a zona e a seção: ir direto à minha urna</summary>
          <BuscaTitulo />
          <p className="ajuda-busca">
            A zona e a seção estão no título de eleitor e no aplicativo e-Título, gratuito, do{' '}
            <a href="https://www.tse.jus.br/">Tribunal Superior Eleitoral</a>. Sem o título à mão? Escolha a sua cidade acima e
            procure a sua escola. Ou <Link to={`${EXEMPLO}${comCandidato(candidato)}`}>veja uma urna de exemplo, da Bela Vista, em São Paulo</Link>.
          </p>
        </details>
      </Passo>

      <Passo numero={3} titulo="Que tipo de conversa?">
        <Conversas lente={lente} candidato={candidato} ufs={resumo?.ufs ?? null} aoEscolher={(l) => mudar({ a: l })} />
      </Passo>

      <LimitesNumeros />

      {resumo && indice && municipio ? (
        <section className="cidade" id="cidade" aria-labelledby="t-cidade">
          <h2 id="t-cidade">
            {municipio.nome} <span className="secundario">({municipio.uf})</span>
          </h2>
          <div className="abas" role="group" aria-label={`O que ver em ${municipio.nome}`}>
            {ABAS.map(([chave, rotulo]) => (
              <button key={chave} aria-pressed={aba === chave} onClick={() => mudar({ aba: chave === 'conversar' ? null : chave })}>
                {rotulo}
              </button>
            ))}
          </div>
          {aba === 'resultado' ? (
            <ResultadoCidade
              municipio={municipio}
              resumo={resumo}
              candidato={candidato}
              definirCandidato={definirCandidato}
              vista={vista}
              aoMudarVista={(v) => mudar({ vista: v === 'margem' ? null : v })}
            />
          ) : aba === 'secao' ? (
            <SecoesCidade municipio={municipio} local={local} aoEscolherLocal={verSecoes} />
          ) : candidato ? (
            <NivelMunicipio
              cd={municipio.cd}
              nome={municipio.nome}
              uf={municipio.uf}
              total={municipio}
              candidato={candidato}
              lente={lente}
              perto={perto}
              bairro={bairro}
              aoEscolherBairro={escolherBairro}
              aoVerSecoes={verSecoes}
            />
          ) : (
            <p className="aviso">
              Escolha um candidato, no passo 1, para ver onde conversar em {municipio.nome}. O resultado do 1º turno e as seções,
              nas outras abas, não dependem dessa escolha.
            </p>
          )}
        </section>
      ) : candidato && resumo && indice ? (
        ufAtual ? (
          <NivelLista
            resumo={resumo}
            indice={indice}
            aoAbrirCidade={(uf, cd) => mudar({ uf, m: String(cd) }, true)}
            titulo={`Cidades ${comPreposicao('de', ufAtual, resumo.ufs.find((u) => u.uf === ufAtual)!.nome)}`}
            itens={indice.lista.filter((m) => m.uf === ufAtual).map((m) => ({ ...m, chave: String(m.cd), rotulo: m.nome }))}
            candidato={candidato}
            lente={lente}
            aoEscolher={(chave) => mudar({ m: chave }, true)}
            rotuloLugar="Cidade"
          />
        ) : (
          <NivelLista
            resumo={resumo}
            indice={indice}
            aoAbrirCidade={(uf, cd) => mudar({ uf, m: String(cd) }, true)}
            titulo="Estados"
            itens={resumo.ufs.map((u) => ({ ...u, chave: u.uf, rotulo: u.nome }))}
            candidato={candidato}
            lente={lente}
            aoEscolher={(chave) => mudar({ uf: chave, m: null }, true)}
            rotuloLugar="Estado"
          />
        )
      ) : candidato ? (
        <p className="carregando">Carregando…</p>
      ) : (
        <p className="aviso" style={{ marginTop: 24 }}>
          Escolha um candidato, no passo 1, para ver os lugares com mais gente para conversar.
        </p>
      )}

      <ComoUsarCurto />
      <LeiCurta Titulo="h2" />
    </div>
  )
}

/** Passo 3: as duas conversas de todo lugar, com o número do Brasil, e a do perfil como opção avançada (D9). */
function Conversas({ lente, candidato, ufs, aoEscolher }: {
  lente: Lente
  candidato: NumeroCandidato | null
  ufs: UF[] | null
  aoEscolher: (l: Lente) => void
}) {
  const soma = (f: (u: UF) => number | undefined) => (ufs ? ufs.reduce((s, u) => s + (f(u) ?? 0), 0) : 0)
  const cand = candidato ? CANDIDATOS[candidato] : null
  const numero = (l: Lente): ReactNode => {
    if (!ufs) return '…'
    if (l === 'faltosos') {
      return (
        <>
          {milhoes(soma((u) => u.faltosos))} faltaram no 1º turno
          {cand && `; saldo possível para ${cand.curto}: até ${milhoes(soma((u) => (candidato === 13 ? u.saldo13 : u.saldo22)))}`}
        </>
      )
    }
    if (l === 'abertos') return <>{milhoes(soma((u) => u.abertos))} votaram em outro candidato, branco ou nulo</>
    return cand ? (
      <>
        {milhoes(soma((u) => (candidato === 13 ? u.gap13 : u.gap22)))} votos abaixo do esperado para {cand.curto}
      </>
    ) : (
      <>
        Lula {milhoes(soma((u) => u.gap13))} · Flávio {milhoes(soma((u) => u.gap22))} votos abaixo do esperado
      </>
    )
  }
  const cartao = (l: Lente) => (
    <button key={l} aria-pressed={lente === l} onClick={() => aoEscolher(l)}>
      <strong>
        {l === 'perfil' && 'Opção avançada: '}
        {LENTES[l].titulo} {LENTES[l].experimental && <SeloExperimental />}
      </strong>
      <span className="lente-numero">{numero(l)}</span>
      <span>{explicarLente(l, cand?.curto ?? 'o seu candidato')}</span>
    </button>
  )
  return (
    <>
      <div className="lentes" role="group" aria-label="Que tipo de conversa">
        {LENTES_PRINCIPAIS.map(cartao)}
      </div>
      <div className="lentes lentes-avancada" role="group" aria-label="Opção avançada">
        {cartao('perfil')}
      </div>
      {lente === 'perfil' && (
        <p className="aviso" style={{ marginTop: 12 }}>
          <strong>Opção avançada, experimental.</strong> O esperado vem de um modelo que conhece a cidade e a idade, o sexo e a
          escolaridade de quem vota em cada escola, mas não a renda do bairro nem a história do lugar: muitas vezes, “abaixo do
          esperado” é um bairro onde o adversário é forte. Trate como pista, não como certeza.{' '}
          <Link to="/como-usar?ir=conversas">Entenda as três conversas</Link>.
        </p>
      )}
    </>
  )
}

/** Totais de um nível, em frases e números grandes. */
function Totais({ total, saldo, candidato, lente, onde }: { total: Lugar; saldo: number; candidato: NumeroCandidato; lente: Lente; onde: string }) {
  const cand = CANDIDATOS[candidato]
  const adv = CANDIDATOS[adversario(candidato)]
  return (
    <div className="grade-3" style={{ marginTop: 8 }}>
      {lente === 'faltosos' ? (
        <>
          <div className="cartao tile">
            <div className="rotulo">faltaram no 1º turno {onde}</div>
            <div className="valor">{inteiro(total.faltosos)}</div>
            <p className="nota">pessoas aptas que não votaram</p>
          </div>
          <div className="cartao tile">
            <div className="rotulo">saldo possível para {cand.curto}</div>
            <div className="valor">{inteiro(Math.round(saldo))}</div>
            <p className="nota">votos, se quem faltou onde {cand.curto} ficou à frente votasse como os vizinhos</p>
          </div>
        </>
      ) : lente === 'abertos' ? (
        <div className="cartao tile">
          <div className="rotulo">votos em aberto {onde}</div>
          <div className="valor">{inteiro(total.abertos)}</div>
          <p className="nota">em outros candidatos, brancos e nulos no 1º turno</p>
        </div>
      ) : (
        <div className="cartao tile">
          <div className="rotulo">
            votos abaixo do esperado para {cand.curto} {onde} <SeloExperimental />
          </div>
          <div className="valor">{inteiro(Math.round(saldo))}</div>
          <p className="nota">nas escolas onde {cand.curto} teve menos votos do que escolas de perfil parecido na mesma cidade</p>
        </div>
      )}
      <div className="cartao tile">
        <div className="rotulo">resultado do 1º turno {onde}</div>
        <div className="valor" style={{ fontSize: '1.6rem' }}>
          {cand.curto} {pct(votos(total, candidato) / total.validos, 0)}
        </div>
        <p className="nota">
          {adv.curto} {pct(votos(total, adversario(candidato)) / total.validos, 0)} dos votos válidos
        </p>
      </div>
    </div>
  )
}

type ItemLista = Lugar & { chave: string; rotulo: string }

/** Brasil (lista de estados) ou estado (lista de cidades): o mapa do Brasil, se a pessoa pedir, e o ranking clicável. */
function NivelLista({ resumo, indice, aoAbrirCidade, titulo, itens, candidato, lente, aoEscolher, rotuloLugar }: {
  resumo: Resumo
  indice: IndiceMunicipios
  aoAbrirCidade: (uf: string, cd: number) => void
  titulo: string
  itens: ItemLista[]
  candidato: NumeroCandidato
  lente: Lente
  aoEscolher: (chave: string) => void
  rotuloLugar: string
}) {
  const [quantos, setQuantos] = useState(20)
  const [verMapa, setVerMapa] = useState(false)
  const total = somar(itens)
  // estados e cidades já trazem o saldo somado escola por escola
  const saldo = potencialSomado(itens, candidato, lente)
  const ranking = ranquear(itens, candidato, lente, quantos)
  const nItens = itens.filter((i) => potencial(i, candidato, lente) > 0).length
  const onde = rotuloLugar === 'Estado' ? 'no Brasil' : ''
  return (
    <section style={{ marginTop: 24 }}>
      <Totais total={total} saldo={saldo} candidato={candidato} lente={lente} onde={onde} />
      {/* a conversa do perfil, experimental, não vai para o mapa do Brasil (D9) */}
      {LENTES_PRINCIPAIS.includes(lente) &&
        (verMapa ? (
          <div style={{ marginTop: 16 }}>
            <Suspense fallback={<p className="carregando">Carregando o mapa…</p>}>
              <MapaBrasil
                resumo={resumo}
                indice={indice}
                variavel="virar"
                candidato={candidato}
                lente={lente}
                aoClicar={(cd) => {
                  const uf = indice.porCodigo.get(cd)?.uf
                  if (uf) aoAbrirCidade(uf, cd)
                }}
              />
            </Suspense>
            <LegendaSequencial lente={lente} candidato={candidato} />
            <p className="discreto" style={{ marginTop: 8 }}>
              Em cada cidade, de cada 100 eleitores aptos, para as cidades grandes não dominarem o mapa. Toque numa cidade para
              ver os bairros e as escolas dela.
            </p>
          </div>
        ) : (
          <button
            className="botao botao-secundario"
            style={{ marginTop: 16 }}
            onClick={() => {
              contarEvento('mapa-brasil', 'Ver no mapa do Brasil')
              setVerMapa(true)
            }}
          >
            Ver no mapa do Brasil
          </button>
        ))}
      <h2>{titulo}</h2>
      <p className="secundario">
        Ordenados {LENTES[lente].pelo}
        {LENTES[lente].porCandidato ? ` para ${CANDIDATOS[candidato].nome}` : ''}. Escolha um para descer de nível.
      </p>
      <TabelaRanking
        rotuloLugar={rotuloLugar}
        linhas={ranking.map((r) => ({ ...r, nome: <button className="link-botao" onClick={() => aoEscolher(r.chave)}>{r.rotulo}</button> }))}
        candidato={candidato}
        lente={lente}
      />
      {nItens > quantos && (
        <button className="botao botao-secundario" style={{ marginTop: 12 }} onClick={() => setQuantos((q) => q + 30)}>
          Mostrar mais ({inteiro(nItens - quantos)} restantes)
        </button>
      )}
    </section>
  )
}

function TabelaRanking({ linhas, candidato, lente, rotuloLugar, comBairro = false, comDistancia = false, vazio }: {
  linhas: (Lugar & { valor: number; nome: ReactNode; bairro?: string; km?: number })[]
  candidato: NumeroCandidato
  lente: Lente
  rotuloLugar: string
  comBairro?: boolean
  /** "Perto de você": distância até a escola de partida */
  comDistancia?: boolean
  /** aviso quando nenhum lugar tem potencial */
  vazio?: string
}) {
  const cand = CANDIDATOS[candidato]
  // a nota com asterisco do número principal, ligada à tabela para o leitor de tela
  const idNota = useId()
  if (linhas.length === 0) {
    return (
      <p className="aviso">
        {vazio ??
          (lente === 'faltosos'
            ? `${cand.nome} não ficou à frente em nenhum lugar deste nível.`
            : lente === 'perfil'
              ? `${cand.nome} não ficou abaixo do esperado em nenhum lugar deste nível.`
              : 'Nenhum voto em aberto neste nível.')}
      </p>
    )
  }
  // nas escolas, a conversa do perfil mostra a diferença do esperado, para a conta poder ser conferida
  const comSurpresa = lente === 'perfil' && linhas.some((l) => (candidato === 13 ? l.s13 : l.s22) != null)
  return (
    <>
    <TabelaRolagem rotulo={`Lugares ordenados ${LENTES[lente].pelo}`}>
      <table aria-describedby={idNota}>
        <thead>
          <tr>
            <th>{rotuloLugar}</th>
            {comBairro && <th className="col-sec">Bairro</th>}
            {comDistancia && <th className="num">Distância</th>}
            <th className="num">
              {maiuscula(rotuloValor(lente, cand.curto))}
              <span aria-hidden="true">*</span>
            </th>
            {lente === 'faltosos' && <th className="num col-sec">Faltaram</th>}
            {lente === 'faltosos' && <th className="num col-sec">Vantagem de {cand.curto} no total</th>}
            {comSurpresa && <th className="num col-sec">{cand.curto} em relação ao esperado</th>}
            {comSurpresa && <th className="num col-sec">Votos válidos</th>}
            <th>Resultado no 1º turno</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              <td>
                {l.nome}
                {/* no celular a coluna de bairro some e o bairro vem embaixo do nome */}
                {comBairro && l.bairro && <span className="bairro-celular">{l.bairro}</span>}
              </td>
              {comBairro && <td className="col-sec">{l.bairro}</td>}
              {comDistancia && <td className="num">{l.km === undefined ? '' : l.km === 0 ? 'a sua' : km(l.km)}</td>}
              <td className="num">
                <strong>{inteiro(Math.round(l.valor))}</strong>
              </td>
              {lente === 'faltosos' && <td className="num col-sec">{inteiro(l.faltosos)}</td>}
              {lente === 'faltosos' && <td className="num col-sec">{pp(vantagem(l, candidato), 0)}</td>}
              {comSurpresa && <td className="num col-sec">{pp((candidato === 13 ? l.s13 : l.s22) ?? NaN)}</td>}
              {comSurpresa && <td className="num col-sec">{inteiro(l.validos)}</td>}
              <td>{resultado(l)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaRolagem>
    <p className="nota-tabela" id={idNota}>
      {notaColuna(lente, candidato, rotuloLugar.toLowerCase() as NivelNota)}
    </p>
    </>
  )
}

/**
 * Aba "Onde conversar" da cidade: mapa das escolas, as escolas perto de uma escola de partida ou de um bairro, e bairros e
 * escolas ordenados.
 */
function NivelMunicipio({ cd, nome, uf, total, candidato, lente, perto, bairro, aoEscolherBairro, aoVerSecoes }: {
  cd: number
  nome: string
  uf: string
  total: Lugar
  candidato: NumeroCandidato
  lente: Lente
  /** "{zona}-{local}" da escola de partida, ou null */
  perto: string | null
  /** bairro escolhido (como `nomeBairro`), ou null */
  bairro: string | null
  aoEscolherBairro: (nome: string) => void
  /** abre a aba "Ache a sua seção" com a escola escolhida */
  aoVerSecoes: (chave: string) => void
}) {
  const { dados: locais } = useLocais(cd)
  const [selecionado, setSelecionado] = useState<string | null>(perto)
  const [quantas, setQuantas] = useState(20)
  const [quantasPerto, setQuantasPerto] = useState(10)
  const cand = CANDIDATOS[candidato]

  // uma escola escolhida na busca troca a marcada no mapa
  useEffect(() => {
    if (perto) setSelecionado(perto)
  }, [perto])

  // a escola de partida só vale se existe nesta cidade; sem coordenada, não há "perto"
  const escolhida = perto ? locais?.find((l) => chaveLocal(l) === perto) : undefined
  const partida = escolhida && escolhida.lat !== null && escolhida.lon !== null ? escolhida : undefined
  const anel = useMemo(() => (partida ? { lat: partida.lat!, lon: partida.lon!, km: RAIO_PERTO_KM } : null), [partida])
  const vizinhas = useMemo(
    () => (locais && anel ? escolasPerto(locais, anel).map((l) => ({ ...l, valor: potencial(l, candidato, lente) })) : []),
    [locais, anel, candidato, lente],
  )
  const comPotencial = vizinhas.filter((l) => l.valor > 0).sort((a, b) => b.valor - a.valor)
  const selecionarNoMapa = (chave: string) => {
    setSelecionado(chave)
    document.getElementById('mapa-virar')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const bairros = useMemo(() => {
    if (!locais) return []
    const grupos = new Map<string, Local[]>()
    for (const l of locais) {
      const b = nomeBairro(l) || SEM_BAIRRO
      grupos.set(b, [...(grupos.get(b) ?? []), l])
    }
    return [...grupos.entries()]
      .map(([b, ls]) => ({ ...somar(ls), nome: b, escolas: ls.length, valor: potencialSomado(ls, candidato, lente) }))
      .filter((b) => b.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  }, [locais, candidato, lente])

  const doBairro = useMemo(
    () =>
      locais && bairro
        ? locais
            .filter((l) => nomeBairro(l) === bairro)
            .map((l) => ({ ...l, valor: potencial(l, candidato, lente) }))
            .sort((a, b) => b.valor - a.valor)
        : [],
    [locais, bairro, candidato, lente],
  )

  if (!locais) return <p className="carregando">Carregando escolas…</p>
  const saldo = potencialSomado(locais, candidato, lente)
  const escolas = ranquear(locais, candidato, lente, quantas)
  const nEscolas = locais.filter((l) => potencial(l, candidato, lente) > 0).length
  const tamanho = (l: Local) => potencial(l, candidato, lente)

  return (
    <>
      <Totais total={total} saldo={saldo} candidato={candidato} lente={lente} onde={`em ${nome}`} />

      <h3>No mapa</h3>
      <p className="secundario">
        Cada círculo é uma escola (local de votação). O tamanho mostra {lente === 'faltosos' ? 'o' : 'os'}{' '}
        {rotuloValor(lente, cand.nome)}; a cor, quem ficou à frente no 1º turno. As pessoas que votam numa escola costumam
        morar perto dela.
      </p>
      <div id="mapa-virar">
        <Suspense fallback={<p className="carregando">Carregando o mapa…</p>}>
          <MapaLocais
            locais={locais}
            selecionado={selecionado}
            aoSelecionar={setSelecionado}
            variavel="margem"
            candidato={candidato}
            tamanho={tamanho}
            linhaExtra={(l) => `${rotuloValor(lente, cand.curto)}: ${inteiro(Math.round(tamanho(l)))}`}
            chave={`${candidato}-${lente}`}
            anel={anel}
          />
        </Suspense>
      </div>
      <LegendaEscala variavel="margem" candidato={candidato} />
      {partida && (
        <p className="legenda" style={{ marginTop: 8 }}>
          <span>
            <span className="chave-traco chave-tracejada" aria-hidden="true" />
            {RAIO_PERTO_KM} km em volta de {partida.nome}
          </span>
        </p>
      )}

      {escolhida && !partida && (
        <p className="aviso" id="perto-de-voce" style={{ marginTop: 24 }}>
          {escolhida.nome} não tem localização no cadastro do TSE, então não dá para mostrar as escolas perto dela.{' '}
          {nomeBairro(escolhida) && (
            <button className="link-botao" onClick={() => aoEscolherBairro(nomeBairro(escolhida))}>
              Veja as escolas do bairro {nomeBairro(escolhida)}
            </button>
          )}
        </p>
      )}

      {partida && (
        <>
          <h3 id="perto-de-voce">Perto de você</h3>
          <p className="secundario">
            As {vizinhas.length} escolas a até {RAIO_PERTO_KM} km de {partida.nome} (contando ela), ordenadas{' '}
            {LENTES[lente].pelo}
            {LENTES[lente].porCandidato ? ` para ${cand.nome}` : ''}. Toque no nome para ver a escola no mapa.
          </p>
          <TabelaRanking
            rotuloLugar="Escola"
            comBairro
            comDistancia
            linhas={comPotencial.slice(0, quantasPerto).map((l) => ({
              ...l,
              nome: (
                <button className="link-botao" onClick={() => selecionarNoMapa(chaveLocal(l))}>
                  {l.nome}
                </button>
              ),
            }))}
            candidato={candidato}
            lente={lente}
            vazio={
              lente === 'perfil'
                ? `${cand.nome} não ficou abaixo do esperado em nenhuma das ${vizinhas.length} escolas a até ${RAIO_PERTO_KM} km.`
                : `${cand.nome} não ficou à frente em nenhuma das ${vizinhas.length} escolas a até ${RAIO_PERTO_KM} km. Lembrar quem faltou não soma para ele neste pedaço da cidade; conversar com quem votou em outro vale em qualquer lugar.`
            }
          />
          {comPotencial.length > quantasPerto && (
            <button className="botao botao-secundario" style={{ marginTop: 12 }} onClick={() => setQuantasPerto((q) => q + 30)}>
              Mostrar todas ({inteiro(comPotencial.length - quantasPerto)} restantes)
            </button>
          )}
          <div className="acoes" style={{ marginTop: 16 }}>
            <Link className="botao botao-secundario" to={`/folha?${new URLSearchParams({ m: String(cd), perto: chaveLocal(partida) })}`}>
              Folha do bairro: imprimir ou mandar ao grupo
            </Link>
          </div>
        </>
      )}

      {bairro && doBairro.length > 0 && (
        <>
          <h3 id="no-bairro">No bairro {bairro}</h3>
          <p className="secundario">
            {doBairro.length === 1
              ? `A única escola do bairro: ${rotuloValor(lente, cand.curto)}, ${inteiro(Math.round(doBairro[0].valor))}.`
              : `As ${doBairro.length} escolas do bairro, ordenadas ${LENTES[lente].pelo}${LENTES[lente].porCandidato ? ` para ${cand.nome}` : ''} (no bairro todo: ${inteiro(Math.round(potencialSomado(doBairro, candidato, lente)))}).`}{' '}
            Toque no nome para ver a escola no mapa.
          </p>
          <TabelaRanking
            rotuloLugar="Escola"
            linhas={doBairro
              .filter((l) => l.valor > 0)
              .map((l) => ({
                ...l,
                nome: (
                  <button className="link-botao" onClick={() => selecionarNoMapa(chaveLocal(l))}>
                    {l.nome}
                  </button>
                ),
              }))}
            candidato={candidato}
            lente={lente}
            vazio={
              lente === 'perfil'
                ? `${cand.nome} não ficou abaixo do esperado em nenhuma escola do bairro.`
                : `${cand.nome} não ficou à frente em nenhuma escola do bairro. Lembrar quem faltou não soma para ele aqui; conversar com quem votou em outro vale em qualquer lugar.`
            }
          />
          <div className="acoes" style={{ marginTop: 16 }}>
            <Link className="botao botao-secundario" to={`/folha?${new URLSearchParams({ m: String(cd), bairro })}`}>
              Folha do bairro: imprimir ou mandar ao grupo
            </Link>
          </div>
        </>
      )}

      <h3>Bairros</h3>
      <p className="secundario">
        Soma das escolas de cada bairro (o nome do bairro é o do endereço da escola no cadastro do TSE). Toque no nome para ver
        as escolas do bairro.
      </p>
      <TabelaRanking
        rotuloLugar="Bairro"
        linhas={bairros.slice(0, 10).map((b) => ({
          ...b,
          nome:
            b.nome === SEM_BAIRRO ? (
              b.nome
            ) : (
              <button className="link-botao" onClick={() => aoEscolherBairro(b.nome)}>
                {b.nome}
              </button>
            ),
        }))}
        candidato={candidato}
        lente={lente}
      />

      <h3>Escolas</h3>
      <p className="secundario">Toque no nome para ver a escola no mapa; “seções” abre as urnas dela.</p>
      <TabelaRanking
        rotuloLugar="Escola"
        comBairro
        linhas={escolas.map((l) => ({
          ...l,
          nome: (
            <>
              <button className="link-botao" onClick={() => selecionarNoMapa(chaveLocal(l))}>
                {l.nome}
              </button>{' '}
              <button className="link-botao discreto" onClick={() => aoVerSecoes(chaveLocal(l))}>
                seções
              </button>
            </>
          ),
        }))}
        candidato={candidato}
        lente={lente}
      />
      {nEscolas > quantas && (
        <button className="botao botao-secundario" style={{ marginTop: 12 }} onClick={() => setQuantas((q) => q + 30)}>
          Mostrar mais ({inteiro(nEscolas - quantas)} restantes)
        </button>
      )}
      <p className="discreto" style={{ marginTop: 16 }}>
        {nome} ({uf}): {inteiro(locais.length)} escolas. O resultado do 1º turno e as seções de cada escola estão nas abas
        acima.
      </p>
    </>
  )
}

/** O mínimo para começar; o guia completo fica em "Como usar". */
function ComoUsarCurto() {
  return (
    <section className="cartao como-usar-curto" aria-labelledby="t-como-usar" style={{ marginTop: 40 }}>
      <h2 id="t-como-usar">Como usar em 1 minuto</h2>
      <ol>
        <li>
          <strong>Para quem:</strong> escolha o candidato. A conta é a mesma para os dois.
        </li>
        <li>
          <strong>Onde:</strong> escolha o estado e a cidade, ou vá direto à sua urna com a zona e a seção.
        </li>
        <li>
          <strong>Que conversa:</strong> lembrar quem faltou ou conversar com quem votou em outro. O site mostra as escolas e
          os bairros com mais gente para essa conversa.
        </li>
      </ol>
      <div className="acoes">
        <Link className="botao" to="/como-usar">
          Guia completo: como usar
        </Link>
        <Link className="botao botao-secundario" to="/entenda">
          Por que bairros e escolas?
        </Link>
        <Link className="botao botao-secundario" to="/conferencia">
          Depois de votar, confira a sua urna
        </Link>
      </div>
    </section>
  )
}
