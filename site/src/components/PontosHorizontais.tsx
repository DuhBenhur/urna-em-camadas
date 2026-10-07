import { useState } from 'react'
import { useLargura } from '../lib/useLargura'

export type Ponto = {
  chave: string
  rotulo: string
  valor: number
  /** valor anterior (anel vazado), para "antes e depois" */
  antes?: number
  /** intervalo de confiança (traço fino) */
  ic?: [number, number]
}

/**
 * Pontos numa escala com o zero marcado. Uma série: o ponto na cor dada; o anel vazado é o "antes" e o traço
 * fino é o intervalo. Rótulos curtos (siglas) ficam à esquerda; longos, em cima da linha (cabe no celular).
 * Todo valor aparece na dica e na tabela.
 */
export function PontosHorizontais({
  pontos,
  formatar,
  cor,
  rotuloAria,
  cabecalho,
  legenda,
  rotulosLongos = false,
}: {
  pontos: Ponto[]
  formatar: (v: number) => string
  cor: string
  rotuloAria: string
  cabecalho: string[]
  legenda?: { ponto: string; anel?: string; intervalo?: string }
  rotulosLongos?: boolean
}) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [foco, setFoco] = useState<number | null>(null)
  const [verTabela, setVerTabela] = useState(false)
  const passo = rotulosLongos ? 46 : 22
  const topo = 22
  const colunaRotulo = rotulosLongos ? 0 : 34
  const valores = pontos.flatMap((p) => [p.valor, p.antes ?? p.valor, ...(p.ic ?? [])])
  const min = Math.min(0, ...valores)
  const max = Math.max(0, ...valores)
  const folga = (max - min) * 0.08 || 0.01
  const x0 = colunaRotulo + 8
  const x1 = largura - 12
  const x = (v: number) => x0 + ((v - (min - folga)) / (max + folga - (min - folga))) * (x1 - x0)
  const altura = topo + pontos.length * passo + 6
  const focado = foco !== null ? pontos[foco] : null
  const ticks = [min, 0, max].filter((v, i, a) => a.findIndex((w) => Math.abs(w - v) < 1e-9) === i)

  return (
    <div>
      <div className="grafico" ref={ref} onPointerLeave={() => setFoco(null)}>
        {largura > 0 && (
          <svg width={largura} height={altura} role="img" aria-label={rotuloAria}>
            <g className="grade">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={topo - 6} y2={altura - 4} className={t === 0 ? 'linha-base' : undefined} />
                  <text x={x(t)} y={topo - 10} textAnchor="middle">
                    {formatar(t)}
                  </text>
                </g>
              ))}
            </g>
            {pontos.map((p, i) => {
              const y = topo + i * passo + (rotulosLongos ? 32 : passo / 2)
              const ativo = foco === i
              return (
                <g
                  key={p.chave}
                  tabIndex={0}
                  onPointerEnter={() => setFoco(i)}
                  onFocus={() => setFoco(i)}
                  onBlur={() => setFoco(null)}
                  style={{ outline: 'none' }}
                  aria-label={`${p.rotulo}: ${formatar(p.valor)}${p.antes !== undefined ? `, antes ${formatar(p.antes)}` : ''}`}
                >
                  <rect x={0} y={topo + i * passo} width={largura} height={passo} fill={ativo ? 'var(--borda)' : 'transparent'} rx={4} />
                  <text x={rotulosLongos ? x0 : 0} y={rotulosLongos ? y - 12 : y + 4} style={{ fill: ativo ? 'var(--tinta)' : rotulosLongos ? 'var(--tinta)' : undefined, fontWeight: ativo ? 650 : undefined, fontSize: rotulosLongos ? 13 : undefined }}>
                    {p.rotulo}
                  </text>
                  {p.ic && <line x1={x(p.ic[0])} x2={x(p.ic[1])} y1={y} y2={y} stroke="var(--tinta-2)" strokeWidth={1.5} strokeLinecap="round" />}
                  {p.antes !== undefined && (
                    <>
                      <line x1={x(p.antes)} x2={x(p.valor)} y1={y} y2={y} stroke="var(--tinta-3)" strokeWidth={2} strokeLinecap="round" />
                      <circle cx={x(p.antes)} cy={y} r={4.5} fill="var(--superficie)" stroke="var(--tinta-2)" strokeWidth={1.5} />
                    </>
                  )}
                  <circle cx={x(p.valor)} cy={y} r={5.5} fill={cor} stroke="var(--superficie)" strokeWidth={2} />
                </g>
              )
            })}
          </svg>
        )}
        {focado && (
          <div className="dica" style={{ left: Math.min(Math.max(x(focado.valor), 110), largura - 110), top: topo + (foco ?? 0) * passo + 4 }}>
            <strong>{formatar(focado.valor)}</strong>
            <span className="secundario">{focado.rotulo}</span>
            {focado.antes !== undefined && <div className="discreto">antes: {formatar(focado.antes)}</div>}
            {focado.ic && (
              <div className="discreto">
                intervalo: {formatar(focado.ic[0])} a {formatar(focado.ic[1])}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="legenda">
        {legenda && (
          <>
            <span>
              <span className="chave" style={{ background: cor }} aria-hidden="true" />
              {legenda.ponto}
            </span>
            {legenda.anel && (
              <span>
                <span className="chave chave-anel" aria-hidden="true" />
                {legenda.anel}
              </span>
            )}
            {legenda.intervalo && (
              <span>
                <span className="chave-traco" aria-hidden="true" />
                {legenda.intervalo}
              </span>
            )}
          </>
        )}
        <button className="botao botao-secundario botao-pequeno" style={{ marginLeft: 'auto' }} onClick={() => setVerTabela((v) => !v)} aria-expanded={verTabela}>
          {verTabela ? 'Esconder tabela' : 'Ver como tabela'}
        </button>
      </div>
      {verTabela && (
        <div className="tabela-rolagem" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                {cabecalho.map((c, i) => (
                  <th key={c} className={i ? 'num' : undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.chave}>
                  <td>{p.rotulo}</td>
                  {p.antes !== undefined && <td className="num">{formatar(p.antes)}</td>}
                  <td className="num">{formatar(p.valor)}</td>
                  {p.ic && <td className="num">{formatar(p.ic[0])} a {formatar(p.ic[1])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
