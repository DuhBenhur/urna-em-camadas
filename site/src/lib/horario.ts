import { useDados } from './dados'

/** Um turno na conta dos votos depois das 17h, feita com os logs das urnas (`pipeline/15_votos_depois_17h.py`). */
export type TurnoHorario = {
  urnas_com_log: number
  urnas_sem_log: number
  urnas_conferem: number
  votos_log: number
  comparecimento_oficial: number
  votos_depois_17h: number
  votos_depois_1705: number
  urnas_com_voto_depois_17h: number
  urnas_com_voto_depois_1705: number
  /** "HH:MM:SS", horário de Brasília */
  ultimo_voto: string
  por_uf: Record<string, number>
  /** votos em cada minuto, de "16:00" a "19:29" (Brasília), em todas as urnas com log */
  por_minuto: Record<string, number>
}

export type Horario = { fonte: string; turnos: { '1': TurnoHorario; '2': TurnoHorario } }

export const useHorario = () => useDados<Horario>('horario.json')

/** Minutos desde a meia-noite. */
export const emMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const hhmm = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

/** Votos registrados de `de` (inclusive) até `ate` (exclusive), em "HH:MM". */
export function votosEntre(t: TurnoHorario, de: string, ate: string) {
  const [a, b] = [emMinutos(de), emMinutos(ate)]
  return Object.entries(t.por_minuto).reduce((s, [m, v]) => (emMinutos(m) >= a && emMinutos(m) < b ? s + v : s), 0)
}

/**
 * Os votos depois das 17h, somados: um ponto por minuto, de 17h00 (zero) até o minuto seguinte ao último voto. O ponto das 17h03
 * diz quantos votos entraram de 17h00 a 17h02min59s.
 */
export function acumuladoDepois17h(t: TurnoHorario): [number, number][] {
  const fim = emMinutos(t.ultimo_voto.slice(0, 5)) + 1
  const pontos: [number, number][] = [[17 * 60, 0]]
  let soma = 0
  for (let m = 17 * 60; m < fim; m++) {
    soma += t.por_minuto[hhmm(m)] ?? 0
    pontos.push([m + 1, soma])
  }
  return pontos
}

/** "19:06:21" → "19h06". */
export const horaCurta = (hms: string) => hms.slice(0, 5).replace(':', 'h')
