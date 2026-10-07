import * as maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { Topology } from 'topojson-specification'
import { carregar, type IndiceMunicipios, type Local, type Resumo } from '../lib/dados'
import { classe, escalaAtual, temaEscuro } from '../lib/cores'
import { pct, pp } from '../lib/formato'
import { CANDIDATOS, efeitoMunicipio, type NumeroCandidato } from '../lib/modelo'

// O MapLibre 6 procura o worker ao lado do próprio módulo; no build do Vite ele precisa vir como asset.
maplibregl.setWorkerUrl(urlWorker)

export type VariavelMapa = 'margem' | 'efeito'

export const LIMITES: Record<VariavelMapa, [number, number, number]> = {
  margem: [0.05, 0.2, 0.4],
  efeito: [0.025, 0.075, 0.15],
}

function corPorClasse(): ExpressionSpecification {
  const e = escalaAtual()
  return ['match', ['get', 'c'], 0, e[0], 1, e[1], 2, e[2], 3, e[3], 4, e[4], 5, e[5], 6, e[6], '#8a8a8a']
}

function cssVar(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
}

/** Reage à troca de tema (botão do site ou do sistema operacional). */
function useTema(): number {
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    const mudou = () => setVersao((v) => v + 1)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    window.addEventListener('tema', mudou)
    mq.addEventListener('change', mudou)
    return () => {
      window.removeEventListener('tema', mudou)
      mq.removeEventListener('change', mudou)
    }
  }, [])
  return versao
}

type Dica = { x: number; y: number; titulo: string; valor: string; linhas: string[] } | null

function CaixaDica({ dica }: { dica: Dica }) {
  if (!dica) return null
  return (
    <div className="dica" style={{ left: dica.x, top: dica.y }}>
      <strong>{dica.valor}</strong>
      <span className="secundario">{dica.titulo}</span>
      {dica.linhas.map((l) => (
        <div className="discreto" key={l}>
          {l}
        </div>
      ))}
    </div>
  )
}

type PropsBrasil = {
  resumo: Resumo
  indice: IndiceMunicipios
  variavel: VariavelMapa
  candidato: NumeroCandidato
  aoClicar: (cd: number) => void
}

/** Coroplético dos municípios. A geometria é a malha mínima do IBGE (TopoJSON). */
export function MapaBrasil({ resumo, indice, variavel, candidato, aoClicar }: PropsBrasil) {
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const [geo, setGeo] = useState<{ mun: FeatureCollection; ufs: FeatureCollection } | null>(null)
  const [dica, setDica] = useState<Dica>(null)
  const versaoTema = useTema()
  const props = useRef({ variavel, candidato, aoClicar })
  props.current = { variavel, candidato, aoClicar }

  useEffect(() => {
    Promise.all([carregar<Topology>('geo/municipios.topo.json'), carregar<Topology>('geo/ufs.topo.json')]).then(([tm, tu]) => {
      const mun = feature(tm, tm.objects[Object.keys(tm.objects)[0]]) as FeatureCollection<Geometry>
      const ufs = feature(tu, tu.objects[Object.keys(tu.objects)[0]]) as FeatureCollection<Geometry>
      setGeo({ mun, ufs })
    })
  }, [])

  // valores e classes por município, recalculados ao trocar variável ou candidato
  useEffect(() => {
    if (!geo) return
    const ufs = new Map(resumo.ufs.map((u) => [u.uf, u]))
    for (const f of geo.mun.features) {
      const m = indice.porIbge.get(Number(f.properties?.codarea))
      const p = (f.properties ??= {})
      if (!m) {
        p.c = -1
        continue
      }
      p.cd = m.cd
      if (variavel === 'margem') {
        const v = (m.v13 - m.v22) / m.validos
        p.v = v
        p.c = classe(v, LIMITES.margem, true)
      } else {
        const v = efeitoMunicipio(resumo, ufs.get(m.uf)!, m, candidato)
        p.v = v
        p.c = classe(v, LIMITES.efeito, candidato === 13)
      }
    }
    const fonte = mapa.current?.getSource('municipios') as GeoJSONSource | undefined
    fonte?.setData(geo.mun)
  }, [geo, indice, resumo, variavel, candidato])

  useEffect(() => {
    if (!geo || !container.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': cssVar('--superficie') } }] },
      bounds: [[-74.5, -34], [-34.5, 5.5]],
      fitBoundsOptions: { padding: 12 },
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true, customAttribution: 'Malha municipal: IBGE' },
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      m.addSource('municipios', { type: 'geojson', data: geo.mun, promoteId: 'codarea' })
      m.addSource('ufs', { type: 'geojson', data: geo.ufs })
      m.addLayer({ id: 'mun-preench', type: 'fill', source: 'municipios', paint: { 'fill-color': corPorClasse() } })
      m.addLayer({
        id: 'mun-contorno',
        type: 'line',
        source: 'municipios',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'foco'], false], cssVar('--tinta'), cssVar('--superficie')],
          // "zoom" só pode ficar no topo de um interpolate; o destaque do foco vai dentro de cada parada
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
      const mun = indice.porIbge.get(Number(f.id))
      if (!mun) return
      const { variavel: va, candidato: ca } = props.current
      const margem = (mun.v13 - mun.v22) / mun.validos
      setDica({
        x: e.point.x,
        y: e.point.y,
        titulo: `${mun.nome} (${mun.uf})`,
        valor: va === 'margem' ? `${margem >= 0 ? 'Lula' : 'Flávio'} à frente por ${pp(Math.abs(margem)).slice(1)}` : pp(f.properties?.v ?? NaN),
        linhas: [
          va === 'efeito' ? `efeito do município no voto em ${CANDIDATOS[ca].curto}` : 'diferença entre os dois mais votados',
          `Lula ${pct(mun.v13 / mun.validos)} · Flávio ${pct(mun.v22 / mun.validos)}`,
        ],
      })
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
    // o mapa é criado uma vez por geometria; dados e cores são atualizados nos outros efeitos
  }, [geo])

  // cores: escala divergente do tema atual
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const aplicar = () => {
      m.setPaintProperty('fundo', 'background-color', cssVar('--superficie'))
      m.setPaintProperty('mun-preench', 'fill-color', corPorClasse())
      m.setPaintProperty('uf-contorno', 'line-color', cssVar('--tinta-3'))
    }
    if (m.isStyleLoaded()) aplicar()
    else m.once('load', aplicar)
  }, [versaoTema])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={container} className="mapa" role="img" aria-label="Mapa dos municípios do Brasil" />
      <CaixaDica dica={dica} />
      {!geo && <p className="carregando">Carregando o mapa…</p>}
    </div>
  )
}

/** Legenda da escala divergente em 7 classes; Lula à esquerda, Flávio à direita. */
export function LegendaEscala({ variavel, candidato }: { variavel: VariavelMapa; candidato: NumeroCandidato }) {
  useTema()
  const e = escalaAtual()
  const [a, b, c] = LIMITES[variavel].map((x) => Math.round(x * 1000) / 10)
  const rotulos = [`> ${c}`, `${b} a ${c}`, `${a} a ${b}`, `± ${a}`, `${a} a ${b}`, `${b} a ${c}`, `> ${c}`]
  const titulo =
    variavel === 'margem'
      ? ['Lula à frente (p.p.)', 'Flávio à frente (p.p.)']
      : candidato === 13
        ? ['município empurra a favor de Lula (p.p.)', 'empurra contra Lula']
        : ['empurra contra Flávio', 'município empurra a favor de Flávio (p.p.)']
  return (
    <div>
      <div className="legenda-escala" aria-hidden="true">
        {e.map((cor, i) => (
          <div key={i}>
            <span style={{ background: cor }} />
            {rotulos[i]}
          </div>
        ))}
      </div>
      <div className="legenda" style={{ maxWidth: 520, justifyContent: 'space-between', marginTop: 4 }}>
        <span>← {titulo[0]}</span>
        <span>{titulo[1]} →</span>
      </div>
    </div>
  )
}

type PropsLocais = { locais: Local[]; selecionado: string | null; aoSelecionar: (chave: string) => void }

/** Locais de votação de um município sobre mapa de ruas (OpenFreeMap). Tamanho = votos válidos; cor = margem. */
export function MapaLocais({ locais, selecionado, aoSelecionar }: PropsLocais) {
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const [dica, setDica] = useState<Dica>(null)
  const versaoTema = useTema()
  const aoSelecionarRef = useRef(aoSelecionar)
  aoSelecionarRef.current = aoSelecionar

  const comCoordenada = locais.filter((l) => l.lat !== null && l.lon !== null)
  const dados: FeatureCollection = {
    type: 'FeatureCollection',
    features: comCoordenada.map((l) => ({
      type: 'Feature',
      id: l.zona * 100000 + l.local,
      geometry: { type: 'Point', coordinates: [l.lon!, l.lat!] },
      properties: {
        chave: `${l.zona}-${l.local}`,
        nome: l.nome,
        bairro: l.bairro,
        validos: l.validos,
        lula: l.v13 / l.validos,
        flavio: l.v22 / l.validos,
        c: classe((l.v13 - l.v22) / l.validos, LIMITES.margem, true),
      },
    })),
  }

  useEffect(() => {
    if (!container.current || comCoordenada.length === 0) return
    // enquadra entre os percentis 2 e 98: um local com coordenada errada no cadastro não estraga a vista
    const quantil = (xs: number[], q: number) => {
      const o = [...xs].sort((a, b) => a - b)
      return o[Math.min(o.length - 1, Math.max(0, Math.round(q * (o.length - 1))))]
    }
    const lons = comCoordenada.map((l) => l.lon!)
    const lats = comCoordenada.map((l) => l.lat!)
    const corte = comCoordenada.length >= 20 ? 0.02 : 0
    const m = new maplibregl.Map({
      container: container.current,
      style: `https://tiles.openfreemap.org/styles/${temaEscuro() ? 'dark' : 'positron'}`,
      bounds: [[quantil(lons, corte), quantil(lats, corte)], [quantil(lons, 1 - corte), quantil(lats, 1 - corte)]],
      fitBoundsOptions: { padding: 40, maxZoom: 15 },
      dragRotate: false,
      pitchWithRotate: false,
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    const montar = () => {
      if (m.getSource('locais')) return
      m.addSource('locais', { type: 'geojson', data: dados })
      m.addLayer({
        id: 'locais',
        type: 'circle',
        source: 'locais',
        paint: {
          'circle-color': corPorClasse(),
          // raio cresce com o zoom: na cidade inteira os ~2 mil locais de SP não podem virar uma mancha
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            9, ['interpolate', ['linear'], ['sqrt', ['get', 'validos']], 10, 1.5, 40, 3, 90, 5],
            12, ['interpolate', ['linear'], ['sqrt', ['get', 'validos']], 10, 3, 40, 6, 90, 10],
            15, ['interpolate', ['linear'], ['sqrt', ['get', 'validos']], 10, 5, 40, 10, 90, 16],
          ],
          'circle-stroke-color': cssVar('--superficie'),
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'sel'], false], 3, 1.5],
        },
      })
    }
    m.on('load', montar)
    m.on('style.load', montar)
    m.on('mousemove', 'locais', (e) => {
      const p = e.features?.[0]?.properties
      if (!p) return
      m.getCanvas().style.cursor = 'pointer'
      setDica({
        x: e.point.x,
        y: e.point.y,
        titulo: p.nome,
        valor: `Lula ${pct(p.lula)} · Flávio ${pct(p.flavio)}`,
        linhas: [p.bairro, `${Number(p.validos).toLocaleString('pt-BR')} votos válidos`].filter(Boolean),
      })
    })
    m.on('mouseleave', 'locais', () => {
      m.getCanvas().style.cursor = ''
      setDica(null)
    })
    m.on('click', 'locais', (e) => {
      const chave = e.features?.[0]?.properties?.chave
      if (chave) aoSelecionarRef.current(chave)
    })
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [locais])

  useEffect(() => {
    const m = mapa.current
    if (!m) return
    m.setStyle(`https://tiles.openfreemap.org/styles/${temaEscuro() ? 'dark' : 'positron'}`)
  }, [versaoTema])

  useEffect(() => {
    const m = mapa.current
    if (!m || !selecionado) return
    const [zona, local] = selecionado.split('-').map(Number)
    const id = zona * 100000 + local
    const aplicar = () => {
      m.removeFeatureState({ source: 'locais' })
      m.setFeatureState({ source: 'locais', id }, { sel: true })
    }
    if (m.getSource('locais')) aplicar()
    const l = comCoordenada.find((x) => x.zona === zona && x.local === local)
    if (l) m.easeTo({ center: [l.lon!, l.lat!], zoom: Math.max(m.getZoom(), 14) })
  }, [selecionado])

  if (comCoordenada.length === 0) return <p className="discreto">Sem coordenadas para os locais deste município.</p>
  return (
    <div style={{ position: 'relative' }}>
      <div ref={container} className="mapa mapa-pequeno" role="img" aria-label="Mapa dos locais de votação do município" />
      <CaixaDica dica={dica} />
    </div>
  )
}
