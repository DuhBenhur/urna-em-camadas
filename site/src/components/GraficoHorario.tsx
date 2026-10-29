import { useState, type PointerEvent } from 'react'
import { inteiro } from '../lib/formato'
import { emMinutos, hhmm, horaCurta, type TurnoHorario } from '../lib/horario'
import { useLargura } from '../lib/useLargura'

export type Marco = { numero: number; hora: string; texto: string }

const TOPO_PLOT = 86
const ALTURA_PLOT = 168
const ESQUERDA = 46
const DIREITA = 18

type Dica = { x: number; y: number; titulo: string; texto: string } | null

/** Posição horizontal de um minuto do dia num gráfico que vai de `inicio` a `fim` (minutos desde a meia-noite). */
const escalaX = (largura: number, inicio: number, fim: number, esquerda = ESQUERDA) => {
  const w = Math.max(0, largura - esquerda - DIREITA)
  return (m: number) => esquerda + ((m - inicio) / (fim - inicio)) * w
}

/** O minuto mais perto do ponteiro, entre `de` e `ate`. */
const minutoDoPonteiro = (e: PointerEvent<SVGElement>, largura: number, inicio: number, fim: number, de: number, ate: number,
  esquerda = ESQUERDA) => {
  const caixa = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
  const w = Math.max(1, largura - esquerda - DIREITA)
  const m = Math.round(inicio + ((e.clientX - caixa.left - esquerda) / w) * (fim - inicio))
  return Math.min(Math.max(m, de), ate)
}

/**
 * A tarde de 25/10 numa linha do tempo: os marcos das decisões (numerados como na cronologia abaixo do gráfico) e, a
 * partir das 17h, os votos registrados nos logs das urnas, somados minuto a minuto. Uma série só, um eixo só; a mesma
 * informação está na cronologia e na tabela que acompanham o gráfico.
 */
export function GraficoHorario({ marcos, acumulado, ultimo }: { marcos: Marco[]; acumulado: [number, number][]; ultimo: string }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [dica, setDica] = useState<Dica>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const inicio = emMinutos('13:00')
  const fim = emMinutos('19:30')
  const x = escalaX(largura, inicio, fim)
  const total = acumulado[acumulado.length - 1][1]
  const maximo = Math.ceil(total / 5000) * 5000 + 5000
  const y = (v: number) => TOPO_PLOT + ALTURA_PLOT * (1 - v / maximo)
  const base = TOPO_PLOT + ALTURA_PLOT
  const altura = base + 34
  const estreito = largura < 520
  const mostrar = (px: number, py: number, titulo: string, texto: string) =>
    setDica({ x: Math.min(Math.max(px, 110), largura - 110), y: py, titulo, texto })
  const ponto = (m: number) => acumulado.find(([mm]) => mm === m) ?? acumulado[acumulado.length - 1]
  const p1705 = ponto(emMinutos('17:05'))
  const pFim = acumulado[acumulado.length - 1]
  const mUltimo = emMinutos(ultimo.slice(0, 5))
  const destaques = [
    { m: p1705[0], v: p1705[1], hora: '17h05', texto: `${inteiro(p1705[1])} votos de 17h00 a 17h05: a fila de quem já estava lá` },
    { m: pFim[0], v: total, hora: horaCurta(ultimo), texto: `${inteiro(total)} votos depois das 17h, até o último, às ${horaCurta(ultimo)}` },
  ]
  const dicaMinuto = (m: number) => {
    const [, v] = ponto(m)
    setCursor(m)
    mostrar(x(m), y(v), `até ${horaCurta(hhmm(m))} · ${inteiro(v)} votos`, 'registrados depois das 17h, somados')
  }

  return (
    <div className="grafico grafico-horario" ref={ref} onPointerLeave={() => { setDica(null); setCursor(null) }}>
      {largura > 0 && (
        <svg width={largura} height={altura} role="img"
          aria-label={`Linha do tempo de 25 de outubro, das 13h às 19h30: os pedidos e as decisões sobre o horário, e os votos registrados depois das 17h, somados: ${inteiro(p1705[1])} até 17h05 e ${inteiro(total)} até o último voto, às ${horaCurta(ultimo)}.`}>
          {/* a prorrogação: das 17h às 19h, só nas urnas que ainda estavam abertas */}
          <rect x={x(emMinutos('17:00'))} y={TOPO_PLOT} width={x(emMinutos('19:00')) - x(emMinutos('17:00'))} height={ALTURA_PLOT}
            className="faixa-prorrogacao" />
          <text x={x(emMinutos('18:00'))} y={base - 8} textAnchor="middle" className="rotulo-faixa">
            {estreito ? 'prorrogação' : 'prorrogação (só urnas abertas)'}
          </text>

          <g className="grade">
            {[10_000, 20_000, 30_000].filter((v) => v < maximo).map((v) => (
              <g key={v}>
                <line x1={ESQUERDA} x2={largura - DIREITA} y1={y(v)} y2={y(v)} />
                <text x={ESQUERDA - 6} y={y(v) + 4} textAnchor="end">{v / 1000} mil</text>
              </g>
            ))}
          </g>
          <line x1={ESQUERDA} x2={largura - DIREITA} y1={base} y2={base} className="linha-base" />
          {Array.from({ length: 7 }, (_, i) => 13 + i).map((h) => (
            <text key={h} x={x(h * 60)} y={base + 20} textAnchor="middle">{h}h</text>
          ))}

          {/* área de leitura da linha: o ponteiro mostra o total até aquele minuto */}
          <rect x={x(emMinutos('17:00'))} y={TOPO_PLOT} width={Math.max(0, x(fim) - x(emMinutos('17:00')))} height={ALTURA_PLOT}
            fill="transparent" className="leitura"
            onPointerMove={(e) => dicaMinuto(minutoDoPonteiro(e, largura, inicio, fim, emMinutos('17:00'), pFim[0]))} />

          {/* marcos: em duas fileiras, para os que ficam a poucos minutos um do outro não se sobreporem */}
          {marcos.map((m, i) => {
            const mx = x(emMinutos(m.hora))
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

          {/* votos depois das 17h, somados minuto a minuto, até o minuto do último voto */}
          <polyline points={acumulado.map(([m, v]) => `${x(m)},${y(v)}`).join(' ')} className="linha-votos" />
          {cursor !== null && <line x1={x(cursor)} x2={x(cursor)} y1={TOPO_PLOT} y2={base} className="cursor" />}
          {destaques.map(({ m, v, hora, texto }) => (
            <g key={m} tabIndex={0} aria-label={texto}
              onPointerEnter={() => mostrar(x(m), y(v), `${hora} · ${inteiro(v)} votos`, texto)}
              onFocus={() => mostrar(x(m), y(v), `${hora} · ${inteiro(v)} votos`, texto)}
              onBlur={() => setDica(null)}>
              <circle cx={x(m)} cy={y(v)} r={12} fill="transparent" />
              <circle cx={x(m)} cy={y(v)} r={4.5} className="ponto-votos" />
            </g>
          ))}
          {/* rótulos diretos, com borda na cor do fundo para ficarem legíveis sobre os fios dos marcos */}
          <text x={x(p1705[0]) - 10} y={y(p1705[1]) + 5} textAnchor="end" className="valor-forte rotulo-halo">
            {inteiro(p1705[1])} até 17h05
          </text>
          <text x={x(Math.max(pFim[0], mUltimo))} y={y(total) - 10} textAnchor="end" className="valor-forte rotulo-halo">
            {inteiro(total)} às {horaCurta(ultimo)}
          </text>
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

const ALTURA_MINUTO = 220
const TOPO_MINUTO = 16
const ESQUERDA_MINUTO = 62 // "200 mil" é mais largo que "30 mil"

/**
 * Votos por minuto, das 16h às 19h30 (Brasília), nos dois turnos, nas mesmas urnas. Ênfase: o 2º turno na cor da tinta, o 1º
 * em cinza e tracejado (contexto: um domingo de eleição sem prorrogação). Um eixo só (votos por minuto), com legenda e rótulos
 * diretos; a tabela ao lado traz os mesmos números.
 */
export function GraficoPorMinuto({ t1, t2 }: { t1: TurnoHorario; t2: TurnoHorario }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [cursor, setCursor] = useState<number | null>(null)
  const inicio = emMinutos('16:00')
  const fim = emMinutos('19:30')
  const x = escalaX(largura, inicio, fim, ESQUERDA_MINUTO)
  const valores = (t: TurnoHorario) => Object.entries(t.por_minuto).map(([m, v]) => [emMinutos(m), v] as const)
  const s1 = valores(t1)
  const s2 = valores(t2)
  const maior = Math.max(...s1.map(([, v]) => v), ...s2.map(([, v]) => v))
  const maximo = Math.ceil(maior / 50_000) * 50_000
  const y = (v: number) => TOPO_MINUTO + ALTURA_MINUTO * (1 - v / maximo)
  const base = TOPO_MINUTO + ALTURA_MINUTO
  const altura = base + 34
  const linha = (s: (readonly [number, number])[]) => s.map(([m, v]) => `${x(m + 0.5)},${y(v)}`).join(' ')
  const estreito = largura < 520
  const em = (t: TurnoHorario, m: number) => t.por_minuto[hhmm(m)] ?? 0
  const rotulo = emMinutos('16:10')

  return (
    <div className="grafico grafico-horario grafico-minuto" ref={ref} onPointerLeave={() => setCursor(null)}>
      <ul className="legenda-series" aria-hidden="true">
        <li><span className="amostra amostra-t2" />2º turno, 25/10 (prorrogação até 19h onde a urna estava aberta)</li>
        <li><span className="amostra amostra-t1" />1º turno, 4/10 (sem prorrogação)</li>
      </ul>
      <div className="grafico-plano">
      {largura > 0 && (
        <svg width={largura} height={altura} role="img"
          aria-label={`Votos por minuto das 16h às 19h30, nos dois turnos. No 1º turno, ${inteiro(em(t1, emMinutos('17:30')))} votos às 17h30 e ${inteiro(em(t1, emMinutos('18:30')))} às 18h30. No 2º, ${inteiro(em(t2, emMinutos('17:30')))} às 17h30 e ${inteiro(em(t2, emMinutos('18:30')))} às 18h30.`}>
          <rect x={x(emMinutos('17:00'))} y={TOPO_MINUTO} width={x(emMinutos('19:00')) - x(emMinutos('17:00'))} height={ALTURA_MINUTO}
            className="faixa-prorrogacao" />
          <text x={x(emMinutos('18:00'))} y={TOPO_MINUTO + 18} textAnchor="middle" className="rotulo-faixa">
            {estreito ? 'prorrogação no 2º' : 'prorrogação no 2º turno (só urnas abertas)'}
          </text>
          <g className="grade">
            {Array.from({ length: maximo / 50_000 }, (_, i) => (i + 1) * 50_000).map((v) => (
              <g key={v}>
                <line x1={ESQUERDA_MINUTO} x2={largura - DIREITA} y1={y(v)} y2={y(v)} />
                <text x={ESQUERDA_MINUTO - 6} y={y(v) + 4} textAnchor="end">{v / 1000} mil</text>
              </g>
            ))}
          </g>
          <line x1={ESQUERDA_MINUTO} x2={largura - DIREITA} y1={base} y2={base} className="linha-base" />
          {[16, 17, 18, 19].map((h) => (
            <text key={h} x={x(h * 60)} y={base + 20} textAnchor="middle">{h}h</text>
          ))}
          <polyline points={linha(s1)} className="linha-t1" />
          <polyline points={linha(s2)} className="linha-votos" />
          <text x={x(rotulo)} y={y(em(t1, rotulo)) - 10} className="rotulo-halo rotulo-serie">1º turno</text>
          <text x={x(rotulo)} y={y(em(t2, rotulo)) + 20} className="rotulo-halo rotulo-serie valor-forte">2º turno</text>
          {cursor !== null && <line x1={x(cursor + 0.5)} x2={x(cursor + 0.5)} y1={TOPO_MINUTO} y2={base} className="cursor" />}
          <rect x={ESQUERDA_MINUTO} y={TOPO_MINUTO} width={Math.max(0, largura - ESQUERDA_MINUTO - DIREITA)} height={ALTURA_MINUTO}
            fill="transparent" className="leitura"
            onPointerMove={(e) => setCursor(minutoDoPonteiro(e, largura, inicio, fim, inicio, fim - 1, ESQUERDA_MINUTO))} />
        </svg>
      )}
      {cursor !== null && (
        <div className="dica" style={{ left: Math.min(Math.max(x(cursor + 0.5), 110), largura - 110),
          top: Math.max(y(Math.max(em(t1, cursor), em(t2, cursor))), TOPO_MINUTO + 80) }}>
          <strong>{horaCurta(hhmm(cursor))}, votos neste minuto</strong>
          <span>2º turno: {inteiro(em(t2, cursor))}</span>
          <span className="secundario">1º turno: {inteiro(em(t1, cursor))}</span>
        </div>
      )}
      </div>
    </div>
  )
}
