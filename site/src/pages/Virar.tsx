import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LegendaEscala, MapaLocais } from '../components/Mapas'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { normalizar, useLocais, useMunicipios, useResumo, type Local } from '../lib/dados'
import { inteiro, pct, pp } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'
import { LENTES, potencial, potencialSomado, ranquear, somar, vantagem, type Lente, type Lugar } from '../lib/virar'

const adversario = (n: NumeroCandidato): NumeroCandidato => (n === 13 ? 22 : 13)
const votos = (l: Lugar, n: NumeroCandidato) => (n === 13 ? l.v13 : l.v22)

/** "Lula 61% · Flávio 31%": sempre os dois, na mesma ordem do resto do site. */
const resultado = (l: Lugar) => `Lula ${pct(l.v13 / l.validos, 0)} · Flávio ${pct(l.v22 / l.validos, 0)}`

export function Virar() {
  const [params, setParams] = useSearchParams()
  const c = params.get('c')
  const candidato: NumeroCandidato | null = c === '13' ? 13 : c === '22' ? 22 : null
  const lente: Lente = params.get('a') === 'abertos' ? 'abertos' : 'faltosos'
  const uf = params.get('uf') ?? ''
  const cd = Number(params.get('m')) || null

  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const municipio = cd ? indice?.porCodigo.get(cd) : undefined
  const ufAtual = uf || municipio?.uf || ''

  /** Muda parâmetros da URL; descer de nível (estado, município) entra no histórico, para o "voltar" subir. */
  const mudar = (novos: Record<string, string | null>, historico = false) => {
    const p = new URLSearchParams(params)
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
          render mais votos. A conta é a mesma para os dois candidatos.
        </p>
      </section>

      <Passo numero={1} titulo="Para quem?">
        <div className="escolha-candidato" role="group" aria-label="Candidato">
          {([13, 22] as const).map((n) => (
            <button key={n} aria-pressed={candidato === n} onClick={() => mudar({ c: String(n) })}>
              <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
              {CANDIDATOS[n].nome} ({CANDIDATOS[n].partido})
            </button>
          ))}
        </div>
      </Passo>

      {candidato && resumo && indice && (
        <>
          <Passo numero={2} titulo="Que tipo de conversa?">
            <div className="lentes" role="group" aria-label="Tipo de conversa">
              {(['faltosos', 'abertos'] as const).map((l) => (
                <button key={l} aria-pressed={lente === l} onClick={() => mudar({ a: l })}>
                  <strong>{LENTES[l].titulo}</strong>
                  <span>
                    {l === 'faltosos'
                      ? `Quem não votou no 1º turno. Onde ${CANDIDATOS[candidato].curto} ficou à frente, cada pessoa que for votar tende a somar.`
                      : 'Quem votou em outro candidato, branco ou nulo. No 2º turno, todos escolhem entre os dois.'}
                  </span>
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
              <BuscaMunicipio uf={ufAtual} aoEscolher={(m) => mudar({ uf: m.uf, m: String(m.cd) }, true)} />
            </div>
          </Passo>

          {municipio ? (
            <NivelMunicipio cd={municipio.cd} nome={municipio.nome} uf={municipio.uf} total={municipio} candidato={candidato} lente={lente} />
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

function Passo({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="passo" aria-labelledby={`passo-${numero}`}>
      <h2 id={`passo-${numero}`}>
        <span className="passo-numero" aria-hidden="true">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function BuscaMunicipio({ uf, aoEscolher }: { uf: string; aoEscolher: (m: { cd: number; uf: string }) => void }) {
  const { dados: indice } = useMunicipios()
  const [texto, setTexto] = useState('')
  const sugestoes = useMemo(() => {
    const q = normalizar(texto)
    if (!indice || q.length < 2) return []
    const lista = indice.lista.filter((m) => !uf || m.uf === uf)
    const comeca = lista.filter((m) => normalizar(m.nome).startsWith(q))
    const contem = lista.filter((m) => !normalizar(m.nome).startsWith(q) && normalizar(m.nome).includes(q))
    const porTamanho = (a: { validos: number }, b: { validos: number }) => b.validos - a.validos
    return [...comeca.sort(porTamanho), ...contem.sort(porTamanho)].slice(0, 8)
  }, [indice, texto, uf])

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor="v-mun">Município</label>
      <input id="v-mun" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite o nome" autoComplete="off" />
      {sugestoes.length > 0 && (
        <ul className="sugestoes">
          {sugestoes.map((m) => (
            <li key={m.cd}>
              <button
                className="sugestao"
                onClick={() => {
                  setTexto('')
                  aoEscolher(m)
                }}
              >
                <span>
                  {m.nome} <span className="secundario">({m.uf})</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
      ) : (
        <div className="cartao tile">
          <div className="rotulo">votos em aberto {onde}</div>
          <div className="valor">{inteiro(total.abertos)}</div>
          <p className="nota">em outros candidatos, brancos e nulos no 1º turno</p>
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
        Ordenados pelo {LENTES[lente].medida} para {CANDIDATOS[candidato].nome}. Escolha um para descer de nível.
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

function TabelaRanking({ linhas, candidato, lente, rotuloLugar, comBairro = false }: {
  linhas: (Lugar & { valor: number; nome: ReactNode; bairro?: string })[]
  candidato: NumeroCandidato
  lente: Lente
  rotuloLugar: string
  comBairro?: boolean
}) {
  const cand = CANDIDATOS[candidato]
  if (linhas.length === 0) {
    return (
      <p className="aviso">
        {lente === 'faltosos' ? `${cand.nome} não ficou à frente em nenhum lugar deste nível.` : 'Nenhum voto em aberto neste nível.'}
      </p>
    )
  }
  return (
    <TabelaRolagem rotulo={`Lugares ordenados pelo ${LENTES[lente].medida}`}>
      <table>
        <thead>
          <tr>
            <th>{rotuloLugar}</th>
            {comBairro && <th className="col-sec">Bairro</th>}
            <th className="num">{lente === 'faltosos' ? `Saldo possível para ${cand.curto}` : 'Votos em aberto'}</th>
            {lente === 'faltosos' && <th className="num col-sec">Faltaram</th>}
            {lente === 'faltosos' && <th className="num col-sec">Vantagem de {cand.curto} no total</th>}
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
              <td className="num">
                <strong>{inteiro(Math.round(l.valor))}</strong>
              </td>
              {lente === 'faltosos' && <td className="num col-sec">{inteiro(l.faltosos)}</td>}
              {lente === 'faltosos' && <td className="num col-sec">{pp(vantagem(l, candidato), 0)}</td>}
              <td>{resultado(l)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaRolagem>
  )
}

/** Município: mapa das escolas, bairros e escolas ordenados. */
function NivelMunicipio({ cd, nome, uf, total, candidato, lente }: {
  cd: number
  nome: string
  uf: string
  total: Lugar
  candidato: NumeroCandidato
  lente: Lente
}) {
  const { dados: locais } = useLocais(cd)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [quantas, setQuantas] = useState(20)
  const cand = CANDIDATOS[candidato]

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
        Cada círculo é uma escola (local de votação). O tamanho é o {LENTES[lente].medida} para {cand.nome}; a cor, quem ficou à
        frente no 1º turno. As pessoas que votam numa escola costumam morar perto dela.
      </p>
      <div id="mapa-virar">
        <MapaLocais
          locais={locais}
          selecionado={selecionado}
          aoSelecionar={setSelecionado}
          variavel="margem"
          candidato={candidato}
          tamanho={tamanho}
          linhaExtra={(l) => `${LENTES[lente].medida} para ${cand.curto}: ${inteiro(Math.round(tamanho(l)))}`}
          chave={`${candidato}-${lente}`}
        />
      </div>
      <LegendaEscala variavel="margem" candidato={candidato} />

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
              <button
                className="link-botao"
                onClick={() => {
                  setSelecionado(`${l.zona}-${l.local}`)
                  document.getElementById('mapa-virar')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              >
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
      </ul>
      <p className="discreto" style={{ marginBottom: 0 }}>
        Resumo para orientação, não é aconselhamento jurídico. Em caso de dúvida, consulte o TSE ou o TRE do seu estado.
      </p>
    </section>
  )
}

function ComoCalculamos() {
  return (
    <details className="como-sabemos" style={{ marginTop: 24 }}>
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
          <strong>Por que não “onde está apertado”:</strong> no 2º turno para presidente, cada voto conta igual no país inteiro.
          Um voto a mais na Bahia vale o mesmo que um em Santa Catarina. O que importa é quantas pessoas alcançáveis há perto,
          não se o lugar é disputado.
        </li>
        <li>
          <strong>Lugares, não pessoas:</strong> os números são somas por escola. Ninguém é identificado.
        </li>
        <li>
          <strong>A mesma conta para os dois:</strong> trocar o candidato só troca quem é “à frente”. O site não pede voto para
          ninguém.
        </li>
      </ul>
    </details>
  )
}
