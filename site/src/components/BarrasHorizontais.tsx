import { useState } from 'react'
import { useLargura } from '../lib/useLargura'

export type Barra = { rotulo: string; valor: number; dica?: string }

const ESPESSURA = 18
const PASSO = 52

/**
 * Uma série só, em barras horizontais com o rótulo em cima (cabe no celular) e o valor na ponta.
 * Todos os valores aparecem escritos; o detalhe extra da dica também está na tabela.
 */
export function BarrasHorizontais({
  barras,
  formatar,
  rotuloAria,
  cabecalho,
  cor = 'var(--tinta-3)',
}: {
  barras: Barra[]
  formatar: (v: number) => string
  rotuloAria: string
  cabecalho: [string, string, string?]
  cor?: string
}) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [foco, setFoco] = useState<number | null>(null)
  const [verTabela, setVerTabela] = useState(false)
  const maximo = Math.max(...barras.map((b) => b.valor))
  const espacoValor = 76
  const escala = (largura - espacoValor) / maximo
  const altura = barras.length * PASSO
  const focada = foco !== null ? barras[foco] : null

  return (
    <div>
      <div className="grafico" ref={ref} onPointerLeave={() => setFoco(null)}>
        {largura > 0 && <svg width={largura} height={altura} role="img" aria-label={rotuloAria}>
          {barras.map((b, i) => {
            const y = i * PASSO + 22
            const w = Math.max(2, b.valor * escala)
            const r = Math.min(4, w / 2)
            const ativo = foco === i
            return (
              <g
                key={b.rotulo}
                tabIndex={b.dica ? 0 : undefined}
                onPointerEnter={() => setFoco(i)}
                onFocus={() => setFoco(i)}
                onBlur={() => setFoco(null)}
                style={{ outline: 'none' }}
                aria-label={`${b.rotulo}: ${formatar(b.valor)}`}
              >
                <rect x={0} y={i * PASSO} width={largura} height={PASSO} fill="transparent" />
                <text x={0} y={y - 7} style={{ fill: 'var(--tinta)', fontSize: 13 }}>
                  {b.rotulo}
                </text>
                {/* ponta arredondada no fim do dado, base reta no zero */}
                <path
                  d={`M0,${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${ESPESSURA - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z`}
                  fill={cor}
                  opacity={foco !== null && !ativo ? 0.5 : 1}
                />
                <text x={w + 8} y={y + ESPESSURA - 4} className="valor-forte">
                  {formatar(b.valor)}
                </text>
              </g>
            )
          })}
          <line x1={0} x2={0} y1={14} y2={altura - 8} className="linha-base" />
        </svg>}
        {focada?.dica && (
          <div className="dica" style={{ left: Math.min(Math.max(focada.valor * escala, 100), largura - 100), top: (foco ?? 0) * PASSO + 20 }}>
            <strong>{formatar(focada.valor)}</strong>
            <span className="secundario">{focada.dica}</span>
          </div>
        )}
      </div>
      <div className="legenda">
        <button className="botao botao-secundario botao-pequeno" style={{ marginLeft: 'auto' }} onClick={() => setVerTabela((v) => !v)} aria-expanded={verTabela}>
          {verTabela ? 'Esconder tabela' : 'Ver como tabela'}
        </button>
      </div>
      {verTabela && (
        <div className="tabela-rolagem" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>{cabecalho[0]}</th>
                <th className="num">{cabecalho[1]}</th>
                {cabecalho[2] && <th>{cabecalho[2]}</th>}
              </tr>
            </thead>
            <tbody>
              {barras.map((b) => (
                <tr key={b.rotulo}>
                  <td>{b.rotulo}</td>
                  <td className="num">{formatar(b.valor)}</td>
                  {cabecalho[2] && <td>{b.dica}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
