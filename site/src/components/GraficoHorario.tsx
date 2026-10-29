import { useState } from 'react'
import { inteiro } from '../lib/formato'
import { useLargura } from '../lib/useLargura'

/** Minutos desde as 13h (horário de Brasília). */
const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h - 13) * 60 + m
}

export type Marco = { numero: number; hora: string; texto: string }

/**
 * Votos registrados depois das 17h, acumulados (levantamento da Setup News para a CNN Brasil, com dados do TSE, 26/10/2026).
 * Entre 17h05 e 19h06 não há detalhe por minuto: o trecho sai tracejado.
 */
export const VOTOS_DEPOIS_17H: [string, number, string][] = [
  ['17:00', 0, '17h: fim do horário normal; quem está na fila recebe senha e vota'],
  ['17:01', 13_961, '13.961 votos no primeiro minuto'],
  ['17:05', 29_001, '29.001 votos até 17h05: a fila de quem já estava lá'],
  ['19:06', 34_330, '34.330 votos até o último, às 19h06'],
]

const INICIO = 0
const FIM = minutos('19:30')
const TOPO_PLOT = 86
const ALTURA_PLOT = 168
const MAXIMO = 35_000
const ESQUERDA = 46
const DIREITA = 18

type Dica = { x: number; y: number; titulo: string; texto: string } | null

/**
 * A tarde de 25/10 numa linha do tempo: os marcos das decisões (numerados como na cronologia abaixo do gráfico) e, a
 * partir das 17h, os votos registrados, acumulados. Uma série só, um eixo só; a mesma informação está na cronologia e na
 * tabela que acompanham o gráfico.
 */
export function GraficoHorario({ marcos }: { marcos: Marco[] }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [dica, setDica] = useState<Dica>(null)
  const w = Math.max(0, largura - ESQUERDA - DIREITA)
  const x = (hhmm: string) => ESQUERDA + ((minutos(hhmm) - INICIO) / (FIM - INICIO)) * w
  const y = (v: number) => TOPO_PLOT + ALTURA_PLOT * (1 - v / MAXIMO)
  const base = TOPO_PLOT + ALTURA_PLOT
  const altura = base + 34
  const pontos = VOTOS_DEPOIS_17H.map(([h, v]) => [x(h), y(v)] as const)
  const estreito = largura < 520
  const mostrar = (px: number, py: number, titulo: string, texto: string) =>
    setDica({ x: Math.min(Math.max(px, 110), largura - 110), y: py, titulo, texto })

  return (
    <div className="grafico grafico-horario" ref={ref} onPointerLeave={() => setDica(null)}>
      {largura > 0 && (
        <svg width={largura} height={altura} role="img"
          aria-label="Linha do tempo de 25 de outubro, das 13h às 19h30: os pedidos e as decisões sobre o horário, e os votos registrados depois das 17h, acumulados: 29.001 até 17h05 e 34.330 até o último voto, às 19h06.">
          {/* a prorrogação: das 17h às 19h, só nas urnas que ainda estavam abertas */}
          <rect x={x('17:00')} y={TOPO_PLOT} width={x('19:00') - x('17:00')} height={ALTURA_PLOT} className="faixa-prorrogacao" />
          <text x={x('18:00')} y={base - 8} textAnchor="middle" className="rotulo-faixa">
            {estreito ? 'prorrogação' : 'prorrogação (só urnas abertas)'}
          </text>

          <g className="grade">
            {[10_000, 20_000, 30_000].map((v) => (
              <g key={v}>
                <line x1={ESQUERDA} x2={largura - DIREITA} y1={y(v)} y2={y(v)} />
                <text x={ESQUERDA - 6} y={y(v) + 4} textAnchor="end">{v / 1000} mil</text>
              </g>
            ))}
          </g>
          <line x1={ESQUERDA} x2={largura - DIREITA} y1={base} y2={base} className="linha-base" />
          {Array.from({ length: 7 }, (_, i) => `${13 + i}:00`).map((h) => (
            <text key={h} x={x(h)} y={base + 20} textAnchor="middle">
              {h.split(':')[0]}h
            </text>
          ))}

          {/* marcos: em duas fileiras, para os que ficam a poucos minutos um do outro não se sobreporem */}
          {marcos.map((m, i) => {
            const mx = x(m.hora)
            const my = i % 2 === 0 ? 20 : 50
            return (
              <g key={m.numero} tabIndex={0} className="marco" aria-label={`${m.numero}. ${m.hora.replace(':', 'h')}: ${m.texto}`}
                onPointerEnter={() => mostrar(mx, my + 14, `${m.numero} · ${m.hora.replace(':', 'h')}`, m.texto)}
                onFocus={() => mostrar(mx, my + 14, `${m.numero} · ${m.hora.replace(':', 'h')}`, m.texto)}
                onBlur={() => setDica(null)}>
                <line x1={mx} x2={mx} y1={my + 11} y2={base} className="fio-marco" />
                <circle cx={mx} cy={my} r={11} className="circulo-marco" />
                <text x={mx} y={my + 4.5} textAnchor="middle" className="numero-marco">{m.numero}</text>
              </g>
            )
          })}

          {/* votos acumulados depois das 17h: medido até 17h05; dali ao último voto, só o total (tracejado) */}
          <polyline points={pontos.slice(0, 3).map((p) => p.join(',')).join(' ')} className="linha-votos" />
          <line x1={pontos[2][0]} y1={pontos[2][1]} x2={pontos[3][0]} y2={pontos[3][1]} className="linha-votos tracejada" />
          {VOTOS_DEPOIS_17H.slice(1).map(([h, v, texto], i) => {
            const [px, py] = pontos[i + 1]
            return (
              <g key={h} tabIndex={0} aria-label={texto}
                onPointerEnter={() => mostrar(px, py, `${h.replace(':', 'h')} · ${inteiro(v)} votos`, texto)}
                onFocus={() => mostrar(px, py, `${h.replace(':', 'h')} · ${inteiro(v)} votos`, texto)}
                onBlur={() => setDica(null)}>
                <circle cx={px} cy={py} r={12} fill="transparent" />
                <circle cx={px} cy={py} r={4.5} className="ponto-votos" />
              </g>
            )
          })}
          {/* rótulos diretos, com borda na cor do fundo para ficarem legíveis sobre os fios dos marcos */}
          <text x={pontos[2][0] - 10} y={pontos[2][1] + 5} textAnchor="end" className="valor-forte rotulo-halo">29.001 até 17h05</text>
          <text x={pontos[3][0]} y={pontos[3][1] - 10} textAnchor="end" className="valor-forte rotulo-halo">34.330 às 19h06</text>
        </svg>
      )}
      {dica && (
        <div className="dica" style={{ left: dica.x, top: dica.y }}>
          <strong>{dica.titulo}</strong>
          <span className="secundario">{dica.texto}</span>
        </div>
      )}
    </div>
  )
}
