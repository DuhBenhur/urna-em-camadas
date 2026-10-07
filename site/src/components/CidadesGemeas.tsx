import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CidadeGemea, Historia, Resumo } from '../lib/dados'
import { pct } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { useLargura } from '../lib/useLargura'
import { comPreposicao } from '../lib/ufs'

const PASSO = 56
const TOPO = 26
const INICIAIS = 8

const nomeCidade = (c: CidadeGemea) => `${c.nome} (${c.uf})`

/**
 * Pares de cidades conurbadas separadas por uma divisa estadual. Pontos cheios: as duas cidades.
 * Anéis: a média de cada estado. Se os pontos ficam juntos e os anéis longe, a divisa pesa pouco.
 */
export function CidadesGemeas({ historia, resumo, candidato }: { historia: Historia; resumo: Resumo; candidato: NumeroCandidato }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [todas, setTodas] = useState(false)
  const [verTabela, setVerTabela] = useState(false)
  const [foco, setFoco] = useState<number | null>(null)
  const p = (c: CidadeGemea) => (candidato === 13 ? c.p13 : c.p22)
  const u = (c: CidadeGemea) => (candidato === 13 ? c.uf13 : c.uf22)
  const nomeUf = (uf: string) => resumo.ufs.find((x) => x.uf === uf)?.nome ?? uf

  // escala fixa para os 33 pares, para não pular ao expandir
  const valores = historia.gemeas.flatMap((g) => [p(g.a), p(g.b), u(g.a), u(g.b)])
  const min = Math.floor(Math.min(...valores) * 10) / 10
  const max = Math.ceil(Math.max(...valores) * 10) / 10
  const x0 = 20
  const x1 = largura - 20
  const x = (v: number) => x0 + ((v - min) / (max - min)) * (x1 - x0)
  const ticks = Array.from({ length: Math.round((max - min) * 10) + 1 }, (_, i) => min + i / 10)

  const linhas = todas ? historia.gemeas : historia.gemeas.slice(0, INICIAIS)
  const altura = TOPO + linhas.length * PASSO
  const cor = CANDIDATOS[candidato].cor
  const focada = foco !== null ? linhas[foco] : null

  return (
    <div>
      <div className="grafico" ref={ref} onPointerLeave={() => setFoco(null)}>
        {largura > 0 && <svg width={largura} height={altura} role="img" aria-label={`Voto em ${CANDIDATOS[candidato].nome} em pares de cidades gêmeas separadas por divisa estadual`}>
          <g className="grade">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={TOPO - 6} y2={altura} />
                <text x={x(t)} y={TOPO - 12} textAnchor="middle">
                  {pct(t, 0)}
                </text>
              </g>
            ))}
          </g>
          {linhas.map((g, i) => {
            const y = TOPO + i * PASSO
            const yPonto = y + 38
            const ativo = foco === i
            return (
              <g
                key={`${g.a.cd}-${g.b.cd}`}
                tabIndex={0}
                onPointerEnter={() => setFoco(i)}
                onFocus={() => setFoco(i)}
                onBlur={() => setFoco(null)}
                style={{ outline: 'none' }}
                aria-label={`${nomeCidade(g.a)} ${pct(p(g.a))}, ${nomeCidade(g.b)} ${pct(p(g.b))}; ${nomeUf(g.a.uf)} ${pct(u(g.a))}, ${nomeUf(g.b.uf)} ${pct(u(g.b))}`}
              >
                <rect x={0} y={y} width={largura} height={PASSO} fill={ativo ? 'var(--borda)' : 'transparent'} rx={6} />
                <text x={x0} y={y + 18} style={{ fill: 'var(--tinta)' }}>
                  {nomeCidade(g.a)} e {nomeCidade(g.b)}
                  <tspan style={{ fill: 'var(--tinta-3)' }}> · {String(g.km).replace('.', ',')} km</tspan>
                </text>
                {[g.a, g.b].map((c) => (
                  <circle key={`uf-${c.cd}`} cx={x(u(c))} cy={yPonto} r={4.5} fill="var(--superficie)" stroke="var(--tinta-2)" strokeWidth={1.5} />
                ))}
                <line x1={x(p(g.a))} x2={x(p(g.b))} y1={yPonto} y2={yPonto} stroke="var(--tinta-3)" strokeWidth={2} strokeLinecap="round" />
                {[g.a, g.b].map((c) => (
                  <circle key={c.cd} cx={x(p(c))} cy={yPonto} r={5.5} fill={cor} stroke="var(--superficie)" strokeWidth={2} />
                ))}
              </g>
            )
          })}
        </svg>}
        {focada && (
          <div className="dica" style={{ left: Math.min(Math.max(x(p(focada.a)), 130), largura - 130), top: TOPO + (foco ?? 0) * PASSO + 26 }}>
            {[focada.a, focada.b].map((c) => (
              <div key={c.cd}>
                <strong style={{ display: 'inline' }}>{pct(p(c))}</strong> <span className="secundario">{nomeCidade(c)}</span>
                <div className="discreto">média {comPreposicao('de', c.uf, nomeUf(c.uf))}: {pct(u(c))}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="legenda">
        <span>
          <span className="chave" style={{ background: cor }} aria-hidden="true" />
          cidade (voto em {CANDIDATOS[candidato].curto})
        </span>
        <span>
          <span className="chave chave-anel" aria-hidden="true" />
          média do estado
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="botao botao-secundario botao-pequeno" onClick={() => setTodas((v) => !v)} aria-expanded={todas}>
            {todas ? `Mostrar só os ${INICIAIS} maiores` : `Ver os ${historia.gemeas.length} pares`}
          </button>
          <button className="botao botao-secundario botao-pequeno" onClick={() => setVerTabela((v) => !v)} aria-expanded={verTabela}>
            {verTabela ? 'Esconder tabela' : 'Ver como tabela'}
          </button>
        </span>
      </div>
      {verTabela && (
        <div className="tabela-rolagem" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Cidade</th>
                <th className="num">{CANDIDATOS[candidato].curto} na cidade</th>
                <th className="num">Média do estado</th>
                <th>Gêmea do outro lado</th>
                <th className="num">{CANDIDATOS[candidato].curto} na gêmea</th>
                <th className="num">Distância</th>
              </tr>
            </thead>
            <tbody>
              {historia.gemeas.map((g) => (
                <tr key={`${g.a.cd}-${g.b.cd}`}>
                  <td>
                    <Link to={`/municipio/${g.a.cd}`}>{nomeCidade(g.a)}</Link>
                  </td>
                  <td className="num">{pct(p(g.a))}</td>
                  <td className="num">{pct(u(g.a))}</td>
                  <td>
                    <Link to={`/municipio/${g.b.cd}`}>{nomeCidade(g.b)}</Link> <span className="discreto">({pct(u(g.b))} no estado)</span>
                  </td>
                  <td className="num">{pct(p(g.b))}</td>
                  <td className="num">{String(g.km).replace('.', ',')} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
