import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { normalizar, registros, useLocais, useZona, type Municipio, type Resumo, type Secao } from '../lib/dados'
import { inteiro, pct, pp } from '../lib/formato'
import { CANDIDATOS, efeitoMunicipio, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'
import { chaveLocal } from '../lib/virar'
import { LegendaEscala } from './Legendas'
import { SeletorCandidato } from './SeletorCandidato'
import { TabelaRolagem } from './TabelaRolagem'

// o mapa (MapLibre) só carrega quando a aba aparece
const MapaLocais = lazy(() => import('./Mapas').then((m) => ({ default: m.MapaLocais })))

export type VistaResultado = 'margem' | 'surpresa'

/**
 * Aba "Resultado do 1º turno" da cidade (decisão D7): os dois candidatos lado a lado e o mapa das escolas, com o resultado
 * ou a surpresa (o quanto cada escola fugiu do esperado). A surpresa é de um candidato: sem escolha, o mapa fica no
 * resultado e pede a escolha, sem escolher por ninguém.
 */
export function ResultadoCidade({ municipio, resumo, candidato, definirCandidato, vista, aoMudarVista }: {
  municipio: Municipio
  resumo: Resumo
  candidato: NumeroCandidato | null
  definirCandidato: (n: NumeroCandidato) => void
  vista: VistaResultado
  aoMudarVista: (v: VistaResultado) => void
}) {
  const { dados: locais } = useLocais(municipio.cd)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const uf = resumo.ufs.find((u) => u.uf === municipio.uf)!
  const lido = vista === 'surpresa' ? candidato : null

  return (
    <>
      <div className="grade-3" style={{ marginTop: 16 }}>
        {([13, 22] as const).map((n) => (
          <div className="cartao tile" key={n}>
            <div className="rotulo">
              <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
              {CANDIDATOS[n].nome}
            </div>
            <div className="valor">{pct((n === 13 ? municipio.v13 : municipio.v22) / municipio.validos)}</div>
            <p className="nota">
              Efeito da cidade: {pp(efeitoMunicipio(resumo, uf, municipio, n))} em relação ao esperado{' '}
              {comPreposicao('para', uf.uf, uf.nome)}
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

      <h3>No mapa</h3>
      <p className="secundario">
        {lido
          ? `Cada círculo é uma escola: a cor é quanto ela votou em ${CANDIDATOS[lido].nome} acima ou abaixo do esperado para ${municipio.nome} e para o perfil de quem vota ali (idade, sexo, escolaridade).`
          : 'Cada círculo é uma escola: o tamanho é o número de votos válidos e a cor, quem ficou à frente.'}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="abas" role="group" aria-label="O que o mapa mostra">
          <button aria-pressed={vista === 'margem'} onClick={() => aoMudarVista('margem')}>
            Resultado
          </button>
          <button aria-pressed={vista === 'surpresa'} onClick={() => aoMudarVista('surpresa')}>
            Surpresa
          </button>
        </div>
        {vista === 'surpresa' && <SeletorCandidato valor={candidato} aoMudar={definirCandidato} rotulo="Surpresa no voto em" />}
      </div>
      {vista === 'surpresa' && !candidato && <p className="aviso">Escolha por qual voto ler a surpresa.</p>}
      {locais ? (
        <Suspense fallback={<p className="carregando">Carregando o mapa…</p>}>
          <MapaLocais
            locais={locais}
            selecionado={selecionado}
            aoSelecionar={setSelecionado}
            variavel={lido ? 'surpresa' : 'margem'}
            candidato={lido ?? 13}
            chave={lido ? `surpresa-${lido}` : 'margem'}
          />
        </Suspense>
      ) : (
        <p className="carregando">Carregando escolas…</p>
      )}
      <LegendaEscala variavel={lido ? 'surpresa' : 'margem'} candidato={lido ?? 13} />
    </>
  )
}

/** Aba "Ache a sua seção": as escolas da cidade, com filtro, e as seções da escola escolhida, cada uma com o link da urna. */
export function SecoesCidade({ municipio, local, aoEscolherLocal }: {
  municipio: Municipio
  /** "{zona}-{local}" da escola escolhida, ou null */
  local: string | null
  aoEscolherLocal: (chave: string) => void
}) {
  const { dados: locais } = useLocais(municipio.cd)
  const [filtro, setFiltro] = useState('')
  const [limite, setLimite] = useState(30)
  const visiveis = useMemo(() => {
    if (!locais) return []
    const q = normalizar(filtro)
    return locais
      .filter((l) => !q || normalizar(`${l.nome} ${l.bairro}`).includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [locais, filtro])
  const escolhida = local ? locais?.find((l) => chaveLocal(l) === local) : undefined

  return (
    <>
      <p className="secundario" style={{ marginTop: 16 }}>
        Procure a sua escola pelo nome ou pelo bairro e escolha a seção para abrir a urna, com o boletim e as camadas. A zona e
        a seção também estão no título de eleitor e no aplicativo e-Título.
      </p>
      {escolhida && <SecoesDaEscola uf={municipio.uf} zona={escolhida.zona} local={escolhida.local} nome={escolhida.nome} cd={municipio.cd} />}
      <div style={{ marginTop: 24, maxWidth: 420 }}>
        <label htmlFor="f-local">Procurar escola (nome ou bairro)</label>
        <input id="f-local" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="ex.: Caetano de Campos" />
      </div>
      {locais ? (
        <div style={{ marginTop: 12 }}>
          <TabelaRolagem rotulo={`Escolas de ${municipio.nome}`}>
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Bairro</th>
                  <th className="num">Zona</th>
                  <th className="num">Seções</th>
                  <th className="num">Lula</th>
                  <th className="num">Flávio</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.slice(0, limite).map((l) => {
                  const chave = chaveLocal(l)
                  return (
                    <tr key={chave} style={chave === local ? { background: 'var(--borda)' } : undefined}>
                      <td>
                        <button className="link" onClick={() => aoEscolherLocal(chave)} style={{ textAlign: 'left' }}>
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
      ) : (
        <p className="carregando">Carregando escolas…</p>
      )}
    </>
  )
}

function SecoesDaEscola({ uf, zona, local, nome, cd }: { uf: string; zona: number; local: number; nome: string; cd: number }) {
  const { dados: arquivo, erro } = useZona(uf, zona)
  const secoes = useMemo(() => (arquivo ? registros<Secao>(arquivo).filter((s) => s.local === local && s.cd === cd) : []), [arquivo, local, cd])
  return (
    <section className="cartao" id="secoes-escola" style={{ marginTop: 16 }} aria-live="polite">
      <h3>{nome}</h3>
      <p className="secundario">Zona {zona}. Escolha a seção para abrir a urna:</p>
      {erro ? (
        <p className="aviso">Não deu para carregar as seções desta escola. Tente de novo em instantes.</p>
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
