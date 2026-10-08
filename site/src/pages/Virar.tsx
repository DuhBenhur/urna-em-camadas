import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CampoMunicipio } from '../components/CampoMunicipio'
import { EscolhaCandidato } from '../components/EscolhaCandidato'
import { LegendaEscala, MapaLocais } from '../components/Mapas'
import { Passo } from '../components/Passo'
import { SeloExperimental } from '../components/SeloExperimental'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { useCandidato } from '../lib/candidato'
import { useLocais, useMunicipios, useResumo, type Local } from '../lib/dados'
import { inteiro, pct, pp } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'
import {
  LENTES, RAIO_PERTO_KM, TODAS_LENTES, chaveLocal, escolasPerto, km, lerLente, potencial, potencialSomado, ranquear, rotuloValor,
  somar, vantagem, type Lente, type Lugar,
} from '../lib/virar'

const adversario = (n: NumeroCandidato): NumeroCandidato => (n === 13 ? 22 : 13)
const votos = (l: Lugar, n: NumeroCandidato) => (n === 13 ? l.v13 : l.v22)

/** "Lula 61% · Flávio 31%": sempre os dois, na mesma ordem do resto do site. */
const resultado = (l: Lugar) => `Lula ${pct(l.v13 / l.validos, 0)} · Flávio ${pct(l.v22 / l.validos, 0)}`

/** "Saldo possível para Lula": cabeçalho de tabela */
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** O que cada ação quer dizer, em uma frase, para o candidato escolhido */
function explicarLente(l: Lente, curto: string): string {
  if (l === 'faltosos') return `Quem não votou no 1º turno. Onde ${curto} ficou à frente, cada pessoa que for votar tende a somar.`
  if (l === 'abertos') return 'Quem votou em outro candidato, branco ou nulo. No 2º turno, todos escolhem entre os dois.'
  return `Escolas onde ${curto} teve menos votos do que escolas de perfil parecido na mesma cidade. Pista, não certeza.`
}

export function Virar() {
  const [params, setParams] = useSearchParams()
  const [candidato] = useCandidato()
  const lente = lerLente(params.get('a'))
  const uf = params.get('uf') ?? ''
  const cd = Number(params.get('m')) || null
  // "?perto={zona}-{local}": escola de partida (vinda da página da urna), com o anel de 2 km no mapa
  const perto = params.get('perto')
  // "?ir=como-fazer" (lista completa da lei) ou "?ir=como-calculamos": abre a página nesse trecho
  const ir = params.get('ir')

  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const municipio = cd ? indice?.porCodigo.get(cd) : undefined
  const ufAtual = uf || municipio?.uf || ''

  // espera os dados que ficam acima do trecho, senão ele desce quando a tabela chega
  const prontoParaIr = Boolean(ir) && (!candidato || Boolean(resumo && indice))
  useEffect(() => {
    if (!prontoParaIr || !ir) return
    const alvo = document.getElementById(ir)
    if (alvo instanceof HTMLDetailsElement) alvo.open = true
    alvo?.scrollIntoView({ block: 'start' })
  }, [prontoParaIr, ir])

  /** Muda parâmetros da URL; descer de nível (estado, município) entra no histórico, para o "voltar" subir. */
  const mudar = (novos: Record<string, string | null>, historico = false) => {
    const p = new URLSearchParams(params)
    // a escolha pode ter vindo de outra página (cópia da aba): entra na URL para o link compartilhado levar tudo
    if (candidato && !p.has('c')) p.set('c', String(candidato))
    // a escola de partida é de um município: trocar de lugar a desfaz
    if ('m' in novos) p.delete('perto')
    for (const [k, v] of Object.entries(novos)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: !historico })
  }

  return (
    <div className="conteudo virar">
      <section className="heroi" style={{ paddingBottom: 8 }}>
        <div className="rotulo-pequeno">2º turno · 25 de outubro</div>
        <h1>Onde virar voto</h1>
        <p className="secundario">
          Escolha o candidato e o lugar. Com os números do 1º turno, o site mostra em que bairros e escolas uma conversa pode
          render mais votos.
        </p>
      </section>

      <Passo numero={1} titulo="Para quem?">
        <EscolhaCandidato />
      </Passo>

      {candidato && resumo && indice && (
        <>
          <Passo numero={2} titulo="Que tipo de conversa?">
            <div className="lentes" role="group" aria-label="Tipo de conversa">
              {TODAS_LENTES.map((l) => (
                <button key={l} aria-pressed={lente === l} onClick={() => mudar({ a: l })}>
                  <strong>
                    {LENTES[l].titulo} {LENTES[l].experimental && <SeloExperimental />}
                  </strong>
                  <span>{explicarLente(l, CANDIDATOS[candidato].curto)}</span>
                </button>
              ))}
            </div>
          </Passo>

          <Passo numero={3} titulo="Onde?">
            <nav className="migalhas" aria-label="Nível" style={{ marginTop: 0 }}>
              <button className="link-botao" onClick={() => mudar({ uf: null, m: null }, true)}>Brasil</button>
              {ufAtual && (
                <>
                  {' › '}
                  <button className="link-botao" onClick={() => mudar({ uf: ufAtual, m: null }, true)}>
                    {resumo.ufs.find((u) => u.uf === ufAtual)?.nome}
                  </button>
                </>
              )}
              {municipio && <> › {municipio.nome}</>}
            </nav>
            <div className="campos" style={{ marginTop: 12 }}>
              <div>
                <label htmlFor="v-uf">Estado</label>
                <select id="v-uf" value={ufAtual} onChange={(e) => mudar({ uf: e.target.value || null, m: null }, true)}>
                  <option value="">Brasil inteiro</option>
                  {resumo.ufs.map((u) => (
                    <option key={u.uf} value={u.uf}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <CampoMunicipio id="v-mun" uf={ufAtual} aoEscolher={(m) => mudar({ uf: m.uf, m: String(m.cd) }, true)} />
            </div>
          </Passo>

          {municipio ? (
            <NivelMunicipio cd={municipio.cd} nome={municipio.nome} uf={municipio.uf} total={municipio} candidato={candidato} lente={lente} perto={perto} />
          ) : ufAtual ? (
            <NivelLista
              titulo={`Municípios ${comPreposicao('de', ufAtual, resumo.ufs.find((u) => u.uf === ufAtual)!.nome)}`}
              itens={indice.lista.filter((m) => m.uf === ufAtual).map((m) => ({ ...m, chave: String(m.cd), rotulo: m.nome }))}
              candidato={candidato}
              lente={lente}
              aoEscolher={(chave) => mudar({ m: chave }, true)}
              rotuloLugar="Município"
            />
          ) : (
            <NivelLista
              titulo="Estados"
              itens={resumo.ufs.map((u) => ({ ...u, chave: u.uf, rotulo: u.nome }))}
              candidato={candidato}
              lente={lente}
              aoEscolher={(chave) => mudar({ uf: chave, m: null }, true)}
              rotuloLugar="Estado"
            />
          )}
        </>
      )}

      {candidato && (!resumo || !indice) && <p className="carregando">Carregando…</p>}
      {!candidato && <p className="secundario">Escolha um candidato para ver os lugares.</p>}

      <ComoFazer />
      <ComoCalculamos />
    </div>
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
      {lente === 'perfil' && (
        <p className="aviso" style={{ gridColumn: '1 / -1', margin: 0 }}>
          <strong>Experimental.</strong> O esperado vem do modelo do capítulo 4 da análise: o efeito da cidade e a idade, o sexo e
          a escolaridade de quem vota em cada escola. Pode indicar onde há mais gente parecida com quem vota em {cand.curto}, mas
          que não votou nele. Só que o modelo não conhece a renda do bairro nem a história política do lugar, e parte da
          diferença vem daí: muitas vezes é um bairro onde o adversário é forte por motivos que o modelo não vê. Compara lugares,
          não pessoas: trate como pista, não como certeza.
        </p>
      )}
    </div>
  )
}

type ItemLista = Lugar & { chave: string; rotulo: string }

/** Brasil (lista de estados) ou estado (lista de municípios): ranking clicável. */
function NivelLista({ titulo, itens, candidato, lente, aoEscolher, rotuloLugar }: {
  titulo: string
  itens: ItemLista[]
  candidato: NumeroCandidato
  lente: Lente
  aoEscolher: (chave: string) => void
  rotuloLugar: string
}) {
  const [quantos, setQuantos] = useState(20)
  const total = somar(itens)
  // estados e municípios já trazem o saldo somado escola por escola
  const saldo = potencialSomado(itens, candidato, lente)
  const ranking = ranquear(itens, candidato, lente, quantos)
  const nItens = itens.filter((i) => potencial(i, candidato, lente) > 0).length
  const onde = rotuloLugar === 'Estado' ? 'no Brasil' : ''
  return (
    <section style={{ marginTop: 24 }}>
      <Totais total={total} saldo={saldo} candidato={candidato} lente={lente} onde={onde} />
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
  linhas: (Lugar & { valor: number; nome: ReactNode; bairro?: string; km?: number; s13?: number | null; s22?: number | null })[]
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
  // nas escolas, a ação do perfil mostra a diferença do esperado, para a conta poder ser conferida
  const comSurpresa = lente === 'perfil' && linhas.some((l) => (candidato === 13 ? l.s13 : l.s22) != null)
  return (
    <TabelaRolagem rotulo={`Lugares ordenados ${LENTES[lente].pelo}`}>
      <table>
        <thead>
          <tr>
            <th>{rotuloLugar}</th>
            {comBairro && <th className="col-sec">Bairro</th>}
            {comDistancia && <th className="num">Distância</th>}
            <th className="num">{maiuscula(rotuloValor(lente, cand.curto))}</th>
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
  )
}

/** Município: mapa das escolas, bairros e escolas ordenados. */
function NivelMunicipio({ cd, nome, uf, total, candidato, lente, perto }: {
  cd: number
  nome: string
  uf: string
  total: Lugar
  candidato: NumeroCandidato
  lente: Lente
  /** "{zona}-{local}" da escola de partida, ou null */
  perto: string | null
}) {
  const { dados: locais } = useLocais(cd)
  const [selecionado, setSelecionado] = useState<string | null>(perto)
  const [quantas, setQuantas] = useState(20)
  const [quantasPerto, setQuantasPerto] = useState(10)
  const cand = CANDIDATOS[candidato]

  // a escola de partida só vale se existe neste município e tem coordenada
  const partida = perto ? locais?.find((l) => chaveLocal(l) === perto && l.lat !== null && l.lon !== null) : undefined
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
      const b = (l.bairro || '').trim().toUpperCase() || '(sem bairro informado)'
      grupos.set(b, [...(grupos.get(b) ?? []), l])
    }
    return [...grupos.entries()]
      .map(([b, ls]) => ({ ...somar(ls), nome: b, escolas: ls.length, valor: potencialSomado(ls, candidato, lente) }))
      .filter((b) => b.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  }, [locais, candidato, lente])

  if (!locais) return <p className="carregando">Carregando escolas…</p>
  const saldo = potencialSomado(locais, candidato, lente)
  const escolas = ranquear(locais, candidato, lente, quantas)
  const nEscolas = locais.filter((l) => potencial(l, candidato, lente) > 0).length
  const tamanho = (l: Local) => potencial(l, candidato, lente)

  return (
    <section style={{ marginTop: 24 }}>
      <Totais total={total} saldo={saldo} candidato={candidato} lente={lente} onde={`em ${nome}`} />

      <h2>No mapa</h2>
      <p className="secundario">
        Cada círculo é uma escola (local de votação). O tamanho mostra {lente === 'faltosos' ? 'o' : 'os'}{' '}
        {rotuloValor(lente, cand.nome)}; a cor, quem ficou à frente no 1º turno. As pessoas que votam numa escola costumam
        morar perto dela.
      </p>
      <div id="mapa-virar">
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

      {partida && (
        <>
          <h2>Perto de você</h2>
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
                : `${cand.nome} não ficou à frente em nenhuma das ${vizinhas.length} escolas a até ${RAIO_PERTO_KM} km. Lembrar quem faltou não soma para ele neste pedaço da cidade; conversar com quem ficou de fora vale em qualquer lugar.`
            }
          />
          {comPotencial.length > quantasPerto && (
            <button className="botao botao-secundario" style={{ marginTop: 12 }} onClick={() => setQuantasPerto((q) => q + 30)}>
              Mostrar todas ({inteiro(comPotencial.length - quantasPerto)} restantes)
            </button>
          )}
        </>
      )}

      <h2>Bairros</h2>
      <p className="secundario">Soma das escolas de cada bairro (o nome do bairro é o do endereço da escola no cadastro do TSE).</p>
      <TabelaRanking
        rotuloLugar="Bairro"
        linhas={bairros.slice(0, 10)}
        candidato={candidato}
        lente={lente}
      />

      <h2>Escolas</h2>
      <p className="secundario">Toque no nome para ver a escola no mapa; o link “seções” abre as urnas dela.</p>
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
              <Link className="discreto" to={`/municipio/${cd}?local=${l.zona}-${l.local}`}>
                seções
              </Link>
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
        {nome} ({uf}): {inteiro(locais.length)} escolas. Quer ver tudo do município?{' '}
        <Link to={`/municipio/${cd}`}>Abra a página de {nome}</Link>.
      </p>
    </section>
  )
}

function ComoFazer() {
  return (
    <section className="cartao como-fazer" aria-labelledby="como-fazer" style={{ marginTop: 40 }}>
      <h2 id="como-fazer" style={{ marginTop: 0 }}>
        Como fazer, dentro da lei
      </h2>
      <ul>
        <li>
          <strong>Converse com quem você conhece</strong> no bairro: família, vizinhos, colegas. Escute antes de argumentar.
        </li>
        <li>
          <strong>Para quem faltou:</strong> lembre a data (25 de outubro), o local de votação (está no e-Título) e o documento
          com foto. Quem não puder votar pode justificar a ausência.
        </li>
        <li>
          <strong>Nada em troca do voto.</strong> Oferecer dinheiro, comida, emprego ou qualquer vantagem é crime (Código
          Eleitoral, art. 299).
        </li>
        <li>
          <strong>Não transporte eleitores no dia da eleição.</strong> Só é permitido levar a própria família no próprio carro
          (Lei 6.091/1974).
        </li>
        <li>
          <strong>A escola é referência, não palco.</strong> Ela indica o bairro de quem vota ali; propaganda dentro de escolas
          e prédios públicos é proibida (Lei 9.504/1997, art. 37).
        </li>
        <li>
          <strong>No dia 25,</strong> pedir voto ou fazer propaganda perto das seções é crime (boca de urna, Lei 9.504/1997,
          art. 39, § 5º).
        </li>
        <li>
          <strong>Só informação verdadeira e com fonte.</strong> Divulgar fato que se sabe falso sobre candidato é crime
          (Código Eleitoral, art. 323).
        </li>
        <li>
          <strong>Não pague para impulsionar</strong> conteúdo eleitoral nas redes: só candidatos, partidos e coligações podem
          contratar impulsionamento (Lei 9.504/1997, art. 57-C). Este site não impulsiona nada.
        </li>
      </ul>
      <p className="discreto" style={{ marginBottom: 0 }}>
        Resumo para orientação, não é aconselhamento jurídico. Em caso de dúvida, consulte o TSE ou o TRE do seu estado.
      </p>
    </section>
  )
}

function ComoCalculamos() {
  return (
    <details className="como-sabemos" id="como-calculamos" style={{ marginTop: 24 }}>
      <summary>Como calculamos (e o que os números não dizem)</summary>
      <ul>
        <li>
          <strong>Fonte:</strong> boletins de urna do 1º turno, somados por escola. A soma é{' '}
          <Link to="/conferencia">idêntica ao resultado oficial do TSE</Link>.
        </li>
        <li>
          <strong>Faltaram:</strong> eleitores aptos que não votaram. É um teto: parte deles mudou de cidade, está fora do país
          ou ainda consta no cadastro sem poder votar.
        </li>
        <li>
          <strong>Saldo possível:</strong> faltosos × vantagem do candidato na escola (votos dele menos os do adversário,
          divididos pelos votos válidos), só onde ele ficou à frente. Supõe que quem faltou votaria como os vizinhos que
          votaram; quem falta costuma ser mais jovem, mais velho ou mais pobre que quem vota. Por isso o número é uma ordem de
          grandeza, não uma previsão.
        </li>
        <li>
          <strong>Votos em aberto:</strong> votos nos outros 10 candidatos, brancos e nulos. O site não sabe para que lado eles
          tendem; mostra quantos são e como o lugar votou.
        </li>
        <li>
          <strong>Votos abaixo do esperado (experimental):</strong> para cada escola, o modelo do{' '}
          <Link to="/analise?cap=c-explicacoes">capítulo 4 da análise</Link> calcula quanto o candidato teria, dado o efeito da
          cidade e o perfil de quem vota ali (idade, sexo e escolaridade). Onde ele teve menos, a diferença vezes os votos
          válidos é o número; onde teve mais, zero. A soma é feita escola por escola. Escolas sem o perfil do eleitorado
          publicado ficam de fora. O modelo não conhece a renda de cada bairro (só a da cidade) nem a história política do
          lugar: em São Paulo, por exemplo, as escolas mais abaixo do esperado para Lula ficam em bairros ricos, e as mais
          abaixo para Flávio, no centro expandido. Parte do número é isso, e não gente esperando uma conversa. Depende do
          modelo (<Link to="/metodo">Método</Link>) e compara lugares, não pessoas: uma escola abaixo do esperado não diz como
          votou nem como votaria ninguém em particular (falácia ecológica). É pista, não certeza.
        </li>
        <li>
          <strong>Por que não “onde está apertado”:</strong> no 2º turno para presidente, cada voto conta igual no país inteiro.
          Um voto a mais na Bahia vale o mesmo que um em Santa Catarina. O que importa é quantas pessoas alcançáveis há perto,
          não se o lugar é disputado.
        </li>
        <li>
          <strong>Lugares, não pessoas:</strong> os números são somas por escola. Ninguém é identificado.
        </li>
        <li>
          <strong>Três contas separadas, sem índice:</strong> juntar as três num número só esconderia a conta. Separadas, cada
          uma pode ser conferida.
        </li>
        <li>
          <strong>A mesma conta para os dois:</strong> trocar o candidato só troca quem é “à frente” e qual esperado é usado. O
          site não pede voto para ninguém.
        </li>
      </ul>
    </details>
  )
}
