import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LegendaEscala, MapaLocais } from '../components/Mapas'
import { normalizar, registros, useLocais, useMunicipios, useResumo, useZona, type Secao } from '../lib/dados'
import { inteiro, pct, pp } from '../lib/formato'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { CANDIDATOS, efeitoMunicipio, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'
import { TabelaRolagem } from '../components/TabelaRolagem'

export function Municipio() {
  const cd = Number(useParams().cd)
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const { dados: locais } = useLocais(cd || null)
  const [filtro, setFiltro] = useState('')
  const [params] = useSearchParams()
  const [selecionado, setSelecionado] = useState<string | null>(params.get('local'))
  const [limite, setLimite] = useState(30)
  const [vista, setVista] = useState<'margem' | 'surpresa'>('margem')
  const [candidato, setCandidato] = useState<NumeroCandidato>(13)

  const municipio = indice?.porCodigo.get(cd)
  const visiveis = useMemo(() => {
    if (!locais) return []
    const q = normalizar(filtro)
    return locais
      .filter((l) => !q || normalizar(`${l.nome} ${l.bairro}`).includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [locais, filtro])

  if (indice && !municipio) {
    return (
      <div className="conteudo">
        <h1>Município não encontrado</h1>
        <Link to="/">Voltar à busca</Link>
      </div>
    )
  }
  if (!resumo || !municipio) return <div className="conteudo carregando">Carregando…</div>

  const uf = resumo.ufs.find((u) => u.uf === municipio.uf)!
  const local = selecionado ? locais?.find((l) => `${l.zona}-${l.local}` === selecionado) : undefined
  // escolhido na tabela: sobe até o mapa, onde o local aparece destacado
  const selecionarNaTabela = (chave: string) => {
    setSelecionado(chave)
    document.getElementById('mapa-locais')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="conteudo">
      <nav className="migalhas" aria-label="Você está em">
        <Link to="/">Início</Link> › {uf.nome} › {municipio.nome}
      </nav>
      <h1 style={{ marginTop: 16 }}>
        {municipio.nome} <span className="secundario">({municipio.uf})</span>
      </h1>

      <div className="grade-3" style={{ marginTop: 24 }}>
        {([13, 22] as const).map((n) => (
          <div className="cartao tile" key={n}>
            <div className="rotulo">
              <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
              {CANDIDATOS[n].nome}
            </div>
            <div className="valor">{pct((n === 13 ? municipio.v13 : municipio.v22) / municipio.validos)}</div>
            <p className="nota">
              Efeito do município: {pp(efeitoMunicipio(resumo, uf, municipio, n))} em relação ao esperado {comPreposicao('para', uf.uf, uf.nome)}
            </p>
          </div>
        ))}
        <div className="cartao tile">
          <div className="rotulo">Urnas</div>
          <div className="valor">{inteiro(municipio.secoes)}</div>
          <p className="nota">
            {inteiro(municipio.validos)} votos válidos em {municipio.zonas.length} {municipio.zonas.length === 1 ? 'zona' : 'zonas'}
          </p>
        </div>
      </div>

      <h2>Locais de votação</h2>
      <p className="secundario">
        {vista === 'margem'
          ? 'Cada círculo é um local de votação: o tamanho é o número de votos válidos e a cor, quem ficou à frente.'
          : `Cada círculo é um local de votação: a cor é quanto ele votou em ${CANDIDATOS[candidato].nome} acima ou abaixo do esperado para ${municipio.nome} e para o perfil do seu eleitorado (idade, sexo, escolaridade).`}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="abas" role="group" aria-label="O que o mapa mostra">
          <button aria-pressed={vista === 'margem'} onClick={() => setVista('margem')}>
            Resultado
          </button>
          <button aria-pressed={vista === 'surpresa'} onClick={() => setVista('surpresa')}>
            Surpresa
          </button>
        </div>
        {vista === 'surpresa' && <SeletorCandidato valor={candidato} aoMudar={setCandidato} />}
      </div>
      <div id="mapa-locais">
        {locais ? (
          <MapaLocais locais={locais} selecionado={selecionado} aoSelecionar={setSelecionado} variavel={vista} candidato={candidato} />
        ) : (
          <p className="carregando">Carregando locais…</p>
        )}
      </div>
      <LegendaEscala variavel={vista} candidato={candidato} />

      {local && <SecoesDoLocal uf={municipio.uf} zona={local.zona} local={local.local} nome={local.nome} cd={cd} />}

      <div style={{ marginTop: 24, maxWidth: 420 }}>
        <label htmlFor="f-local">Procurar local (escola, bairro)</label>
        <input id="f-local" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="ex.: Caetano de Campos" />
      </div>
      <div style={{ marginTop: 12 }}>
        <TabelaRolagem>
        <table>
          <thead>
            <tr>
              <th>Local</th>
              <th>Bairro</th>
              <th className="num">Zona</th>
              <th className="num">Seções</th>
              <th className="num">Lula</th>
              <th className="num">Flávio</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.slice(0, limite).map((l) => {
              const chave = `${l.zona}-${l.local}`
              return (
                <tr key={chave} style={chave === selecionado ? { background: 'var(--borda)' } : undefined}>
                  <td>
                    <button className="link" onClick={() => selecionarNaTabela(chave)} style={{ textAlign: 'left' }}>
                      {l.nome}
                    </button>
                  </td>
                  <td>{l.bairro}</td>
                  <td className="num">{l.zona}</td>
                  <td className="num">{l.secoes}</td>
                  <td className="num">{pct(l.v13 / l.validos)}</td>
                  <td className="num">{pct(l.v22 / l.validos)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </TabelaRolagem>
        {visiveis.length > limite && (
          <p style={{ marginTop: 12 }}>
            <button className="botao botao-secundario" onClick={() => setLimite((n) => n + 100)}>
              Mostrar mais ({inteiro(visiveis.length - limite)} restantes)
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

function SecoesDoLocal({ uf, zona, local, nome, cd }: { uf: string; zona: number; local: number; nome: string; cd: number }) {
  const { dados: arquivo, erro } = useZona(uf, zona)
  const secoes = useMemo(() => (arquivo ? registros<Secao>(arquivo).filter((s) => s.local === local && s.cd === cd) : []), [arquivo, local, cd])
  return (
    <section className="cartao" style={{ marginTop: 16 }} aria-live="polite">
      <h3>{nome}</h3>
      <p className="secundario">Zona {zona}. Escolha a seção para abrir a urna:</p>
      {erro ? (
        <p className="aviso">Não deu para carregar as seções deste local. Tente de novo em instantes.</p>
      ) : !arquivo ? (
        <p className="carregando">Carregando seções…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {secoes.map((s) => (
            <Link key={s.secao} className="botao botao-secundario" style={{ minHeight: 36, padding: '4px 12px' }} to={`/urna/${uf}/${zona}/${s.secao}`}>
              Seção {s.secao}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
