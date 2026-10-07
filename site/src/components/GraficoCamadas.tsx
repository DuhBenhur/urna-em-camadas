import { pct, pp } from '../lib/formato'
import type { Camada } from '../lib/modelo'
import { useLargura } from '../lib/useLargura'

const ALTURA_LINHA = 64
const TOPO = 28

/**
 * Cada camada do modelo multinível move o ponteiro na escala de 0% a 100%.
 * Um único candidato por vez (sem legenda: o título nomeia a série); todos os quatro valores
 * aparecem como texto, então o gráfico já é a própria tabela.
 */
export function GraficoCamadas({ camadas, cor, candidato }: { camadas: Camada[]; cor: string; candidato: string }) {
  const [ref, largura] = useLargura<HTMLElement>()
  const estreito = largura < 560
  const colunaRotulo = estreito ? 0 : 190
  const colunaValor = estreito ? 0 : 150
  const x0 = colunaRotulo + 8
  const x1 = largura - colunaValor - 12
  const x = (v: number) => x0 + Math.max(0, Math.min(1, v)) * (x1 - x0)
  const alturaLinha = estreito ? ALTURA_LINHA + 30 : ALTURA_LINHA
  const altura = TOPO + camadas.length * alturaLinha + 8
  const yPonto = (i: number) => TOPO + i * alturaLinha + (estreito ? 46 : alturaLinha / 2)

  return (
    <figure className="grafico" ref={ref} style={{ margin: 0 }}>
      {largura > 0 && <svg width={largura} height={altura} role="img" aria-label={`Voto em ${candidato} camada por camada`}>
        <g className="grade">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={TOPO - 6} y2={altura - 8} className={t === 0.5 ? 'linha-base' : undefined} />
              <text x={x(t)} y={TOPO - 12} textAnchor="middle">
                {pct(t, 0)}
              </text>
            </g>
          ))}
        </g>
        {camadas.map((c, i) => {
          const y = yPonto(i)
          const anterior = i > 0 ? camadas[i - 1].valor : null
          const final = c.chave === 'secao'
          return (
            <g key={c.chave}>
              <text x={estreito ? x0 : 0} y={estreito ? y - 24 : y - 4} className={final ? 'valor-forte' : undefined} style={final ? undefined : { fill: 'var(--tinta)' }}>
                {c.rotulo}
              </text>
              <text x={estreito ? x0 : 0} y={estreito ? y - 9 : y + 13}>
                {c.detalhe}
              </text>
              {anterior !== null && (
                <>
                  <circle cx={x(anterior)} cy={y} r={4} fill="none" stroke="var(--eixo)" strokeWidth={1.5} />
                  <line className="mov" x1={x(anterior)} x2={x(c.valor)} y1={y} y2={y} stroke="var(--tinta-3)" strokeWidth={2} strokeLinecap="round" />
                </>
              )}
              <circle cx={x(c.valor)} cy={y} r={final ? 8 : 6} fill={cor} stroke="var(--superficie)" strokeWidth={2} />
              {estreito ? (
                <text x={x1} y={y - 24} textAnchor="end">
                  <tspan className="valor-forte">{pct(c.valor)}</tspan>
                  {c.delta !== null && <tspan dx={6}>{pp(c.delta)}</tspan>}
                </text>
              ) : (
                <>
                  <text x={largura} y={y - 2} textAnchor="end" className="valor-forte">
                    {pct(c.valor)}
                  </text>
                  {c.delta !== null && (
                    <text x={largura} y={y + 15} textAnchor="end">
                      {pp(c.delta)}
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>}
      <figcaption className="discreto" style={{ marginTop: 8 }}>
        Percentual de votos válidos em {candidato}. A linha mais escura marca 50%. O círculo vazado é onde a camada anterior
        deixou o ponteiro.
      </figcaption>
    </figure>
  )
}
