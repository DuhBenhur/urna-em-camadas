import * as maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { Topology } from 'topojson-specification'
import { carregar, type IndiceMunicipios } from '../lib/dados'
import { inteiro, pct, pp } from '../lib/formato'
import {
  abstencao, aMais, avanco, classeSegundo, coresSegundo, lulaPct, margem, primeiroTurno, quedaAbstencao, situacao,
  type DoisTurnos, type SegundoTurno, type VistaSegundo,
} from '../lib/segundo'
import { useTema } from '../lib/tema'
import { BRASIL, CaixaDica, cssVar, GESTOS, limitesDaUf, type Dica } from './Mapas'

const FRASE_SITUACAO = {
  virou: 'Virou para Lula',
  ganhou: 'Lula ganhou',
  perdeu: 'Flávio ganhou',
  virouFlavio: 'Virou para Flávio',
  empate: 'Empate',
}

const frente = (x: number) => (Math.abs(x) < 0.0005 ? 'empate' : `${x > 0 ? 'Lula' : 'Flávio'} à frente por ${pp(Math.abs(x)).slice(1)}`)

/** O que a dica mostra para uma cidade em cada vista: o valor principal e as linhas de apoio. */
function textoDica(l: DoisTurnos, vista: VistaSegundo): { valor: string; linhas: string[] } {
  const resultado2 = `2º turno: Lula ${pct(lulaPct(l.t2))} · Flávio ${pct(1 - lulaPct(l.t2))}`
  if (vista === 'vitoria') {
    return { valor: FRASE_SITUACAO[situacao(l)], linhas: [resultado2, `1º turno: ${frente(margem(l.t1))}`] }
  }
  if (vista === 'avanco') {
    const a = avanco(l)
    return {
      valor: a > 0 ? `Lula avançou ${pp(a).slice(1)}` : a < 0 ? `Flávio avançou ${pp(-a).slice(1)}` : 'ninguém avançou',
      linhas: [`1º turno: ${frente(margem(l.t1))}`, `2º turno: ${frente(margem(l.t2))}`],
    }
  }
  const q = quedaAbstencao(l)
  const mais = aMais(l)
  return {
    valor: q > 0 ? `abstenção caiu ${pp(q).slice(1)}` : q < 0 ? `abstenção subiu ${pp(-q).slice(1)}` : 'abstenção igual',
    linhas: [
      `não votaram: ${pct(abstencao(l.t1))} no 1º turno, ${pct(abstencao(l.t2))} no 2º`,
      mais >= 0 ? `${inteiro(mais)} pessoas a mais votaram` : `${inteiro(-mais)} pessoas a menos votaram`,
    ],
  }
}

const corDaVista = (vista: VistaSegundo): ExpressionSpecification => {
  const cores = coresSegundo(vista)
  return ['match', ['get', 'c'], ...cores.flatMap((cor, i) => [i, cor]), '#8a8a8a'] as unknown as ExpressionSpecification
}

type Props = {
  indice: IndiceMunicipios
  segundo: SegundoTurno
  vista: VistaSegundo
  /** sigla da UF: o mapa enquadra o estado */
  foco?: string
  aoClicar: (cd: number) => void
}

/** As cidades do Brasil no 2º turno: onde Lula ganhou (e onde virou), onde mais avançou e onde mais gente foi votar. */
export function MapaSegundoTurno({ indice, segundo, vista, foco, aoClicar }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const [geo, setGeo] = useState<{ mun: FeatureCollection; ufs: FeatureCollection } | null>(null)
  const [dica, setDica] = useState<Dica>(null)
  const versaoTema = useTema()
  const props = useRef({ vista, aoClicar })
  props.current = { vista, aoClicar }

  // os dois turnos de cada cidade, pelo código do IBGE (o da malha)
  const lugares = useRef(new Map<number, DoisTurnos & { cd: number; nome: string; uf: string }>())
  useEffect(() => {
    const mapaLugares = new Map<number, DoisTurnos & { cd: number; nome: string; uf: string }>()
    for (const m of indice.lista) {
      const t2 = segundo.municipios.get(m.cd)
      if (t2) mapaLugares.set(m.ibge, { cd: m.cd, nome: m.nome, uf: m.uf, t1: primeiroTurno(m), t2 })
    }
    lugares.current = mapaLugares
  }, [indice, segundo])

  useEffect(() => {
    Promise.all([carregar<Topology>('geo/municipios.topo.json'), carregar<Topology>('geo/ufs.topo.json')]).then(([tm, tu]) => {
      const mun = feature(tm, tm.objects[Object.keys(tm.objects)[0]]) as FeatureCollection<Geometry>
      const ufs = feature(tu, tu.objects[Object.keys(tu.objects)[0]]) as FeatureCollection<Geometry>
      setGeo({ mun, ufs })
    })
  }, [])

  // classe de cada cidade na vista escolhida
  useEffect(() => {
    if (!geo) return
    for (const f of geo.mun.features) {
      const p = (f.properties ??= {})
      const l = lugares.current.get(Number(p.codarea))
      p.c = l ? classeSegundo(l, vista) : -1
      if (l) p.cd = l.cd
    }
    ;(mapa.current?.getSource('municipios') as GeoJSONSource | undefined)?.setData(geo.mun)
    const m = mapa.current
    if (m?.getLayer('mun-preench')) m.setPaintProperty('mun-preench', 'fill-color', corDaVista(vista))
  }, [geo, vista, indice, segundo])

  useEffect(() => {
    if (!geo || !container.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': cssVar('--superficie') } }] },
      bounds: BRASIL,
      fitBoundsOptions: { padding: 12 },
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: true,
      locale: GESTOS,
      attributionControl: { compact: true, customAttribution: 'Malha municipal: IBGE · Resultado: TSE' },
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      m.addSource('municipios', { type: 'geojson', data: geo.mun, promoteId: 'codarea' })
      m.addSource('ufs', { type: 'geojson', data: geo.ufs })
      m.addLayer({ id: 'mun-preench', type: 'fill', source: 'municipios', paint: { 'fill-color': corDaVista(props.current.vista) } })
      m.addLayer({
        id: 'mun-contorno',
        type: 'line',
        source: 'municipios',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'foco'], false], cssVar('--tinta'), cssVar('--superficie')],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, ['case', ['boolean', ['feature-state', 'foco'], false], 2, 0.1],
            7, ['case', ['boolean', ['feature-state', 'foco'], false], 2.5, 0.6],
          ],
        },
      })
      m.addLayer({ id: 'uf-contorno', type: 'line', source: 'ufs', paint: { 'line-color': cssVar('--tinta-3'), 'line-width': 0.8 } })
    })

    let focado: string | number | undefined
    const limpar = () => {
      if (focado !== undefined) m.setFeatureState({ source: 'municipios', id: focado }, { foco: false })
      focado = undefined
      setDica(null)
    }
    m.on('mousemove', 'mun-preench', (e) => {
      const f = e.features?.[0]
      if (!f || f.id === undefined) return
      if (focado !== f.id) {
        limpar()
        focado = f.id
        m.setFeatureState({ source: 'municipios', id: focado }, { foco: true })
      }
      m.getCanvas().style.cursor = 'pointer'
      const l = lugares.current.get(Number(f.id))
      if (!l) return
      const { valor, linhas } = textoDica(l, props.current.vista)
      setDica({ x: e.point.x, y: e.point.y, titulo: `${l.nome} (${l.uf})`, valor, linhas })
    })
    m.on('mouseleave', 'mun-preench', () => {
      m.getCanvas().style.cursor = ''
      limpar()
    })
    m.on('click', 'mun-preench', (e) => {
      const cd = e.features?.[0]?.properties?.cd
      if (cd) props.current.aoClicar(Number(cd))
    })
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
    // o mapa é criado uma vez por geometria; cores e enquadramento são atualizados nos outros efeitos
  }, [geo])

  useEffect(() => {
    const m = mapa.current
    if (!m || !geo) return
    const enquadrar = () => m.fitBounds((foco && limitesDaUf(geo.mun, indice, foco)) || BRASIL, { padding: 16, duration: 0 })
    if (m.loaded()) enquadrar()
    else m.once('load', enquadrar)
  }, [geo, foco, indice])

  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const aplicar = () => {
      m.setPaintProperty('fundo', 'background-color', cssVar('--superficie'))
      m.setPaintProperty('mun-preench', 'fill-color', corDaVista(props.current.vista))
      m.setPaintProperty('uf-contorno', 'line-color', cssVar('--tinta-3'))
    }
    if (m.isStyleLoaded()) aplicar()
    else m.once('load', aplicar)
  }, [versaoTema])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={container} className="mapa" role="region" aria-roledescription="mapa"
        aria-label="Mapa das cidades do Brasil no 2º turno; a mesma informação está nas tabelas abaixo" />
      <CaixaDica dica={dica} />
      {!geo && <p className="carregando">Carregando o mapa…</p>}
    </div>
  )
}
