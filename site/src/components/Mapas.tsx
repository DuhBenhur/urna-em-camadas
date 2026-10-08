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

export type VariavelMapa = 'margem' | 'efeito' | 'semperfil' | 'bolsoes' | 'regioes'

export const LIMITES: Record<'margem' | 'efeito', [number, number, number]> = {
  margem: [0.05, 0.2, 0.4],
  efeito: [0.025, 0.075, 0.15],
}

// LISA (pipeline/11): 1 alto cercado de alto, 2 baixo cercado de alto, 3 baixo cercado de baixo, 4 alto cercado de baixo.
// "Alto" é mais voto no candidato escolhido do que o perfil e a região fariam prever: vai para o lado da cor dele.
const CLASSE_LISA: Record<number, [number, number]> = { 0: [3, 3], 1: [0, 6], 4: [2, 4], 2: [4, 2], 3: [6, 0] }
export const ROTULOS_LISA: Record<number, string> = {
  1: 'bolsão acima do esperado',
  4: 'acima do esperado, cercado de abaixo',
  0: 'sem padrão espacial',
  2: 'abaixo do esperado, cercado de acima',
  3: 'bolsão abaixo do esperado',
}

type Regiao = { margem: number; municipios: number; v13: number; v22: number; validos: number }

/** Margem Lula − Flávio de cada região de voto (soma dos municípios da região). */
function margensRegioes(indice: IndiceMunicipios): Map<number, Regiao> {
  const r = new Map<number, Regiao>()
  for (const m of indice.lista) {
    if (m.regiao === null || m.regiao === undefined) continue
    const a = r.get(m.regiao) ?? { margem: 0, municipios: 0, v13: 0, v22: 0, validos: 0 }
    a.municipios += 1
    a.v13 += m.v13
    a.v22 += m.v22
    a.validos += m.validos
    r.set(m.regiao, a)
  }
  for (const a of r.values()) a.margem = (a.v13 - a.v22) / a.validos
  return r
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
  const [geo, setGeo] = useState<{ mun: FeatureCollection; ufs: FeatureCollection; regioes: FeatureCollection | null } | null>(null)
  const [dica, setDica] = useState<Dica>(null)
  const versaoTema = useTema()
  const props = useRef({ variavel, candidato, aoClicar })
  props.current = { variavel, candidato, aoClicar }

  useEffect(() => {
    Promise.all([
      carregar<Topology>('geo/municipios.topo.json'),
      carregar<Topology>('geo/ufs.topo.json'),
      carregar<FeatureCollection>('geo/regioes.json').catch(() => null),
    ]).then(([tm, tu, regioes]) => {
      const mun = feature(tm, tm.objects[Object.keys(tm.objects)[0]]) as FeatureCollection<Geometry>
      const ufs = feature(tu, tu.objects[Object.keys(tu.objects)[0]]) as FeatureCollection<Geometry>
      setGeo({ mun, ufs, regioes })
    })
  }, [])

  // valores e classes por município, recalculados ao trocar variável ou candidato
  useEffect(() => {
    if (!geo) return
    const ufs = new Map(resumo.ufs.map((u) => [u.uf, u]))
    const regioes = variavel === 'regioes' ? margensRegioes(indice) : null
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
      } else if (variavel === 'efeito') {
        const v = efeitoMunicipio(resumo, ufs.get(m.uf)!, m, candidato)
        p.v = v
        p.c = classe(v, LIMITES.efeito, candidato === 13)
      } else if (variavel === 'semperfil') {
        const v = candidato === 13 ? m.sp13 : m.sp22
        p.v = v ?? NaN
        p.c = v === null || v === undefined ? -1 : classe(v, LIMITES.efeito, candidato === 13)
      } else if (variavel === 'bolsoes') {
        const l = candidato === 13 ? m.lisa13 : m.lisa22
        p.v = l ?? NaN
        p.c = l === null || l === undefined ? -1 : CLASSE_LISA[l][candidato === 13 ? 0 : 1]
      } else {
        const r = m.regiao === null || m.regiao === undefined ? undefined : regioes?.get(m.regiao)
        p.v = r?.margem ?? NaN
        p.c = r ? classe(r.margem, LIMITES.margem, true) : -1
      }
    }
    const fonte = mapa.current?.getSource('municipios') as GeoJSONSource | undefined
    fonte?.setData(geo.mun)
    const m = mapa.current
    if (m?.getLayer('regioes-contorno')) m.setLayoutProperty('regioes-contorno', 'visibility', variavel === 'regioes' ? 'visible' : 'none')
    if (m?.getLayer('uf-contorno')) m.setPaintProperty('uf-contorno', 'line-width', variavel === 'regioes' ? 0.5 : 0.8)
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
      if (geo.regioes) {
        m.addSource('regioes', { type: 'geojson', data: geo.regioes })
        m.addLayer({
          id: 'regioes-contorno',
          type: 'line',
          source: 'regioes',
          layout: { visibility: props.current.variavel === 'regioes' ? 'visible' : 'none' },
          paint: { 'line-color': cssVar('--tinta'), 'line-width': 1.6 },
        })
      }
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
      const v = f.properties?.v ?? NaN
      const frente = (x: number) => `${x >= 0 ? 'Lula' : 'Flávio'} à frente por ${pp(Math.abs(x)).slice(1)}`
      const valor =
        va === 'margem' ? frente(margem)
          : va === 'regioes' ? (Number.isFinite(v) ? `região: ${frente(v)}` : 'sem região')
            : va === 'bolsoes' ? (Number.isFinite(v) ? ROTULOS_LISA[v] : 'sem dado')
              : pp(v)
      const linha1 = {
        margem: 'diferença entre os dois mais votados',
        efeito: `efeito do município no voto em ${CANDIDATOS[ca].curto}`,
        semperfil: `o que o perfil e a região não explicam no voto em ${CANDIDATOS[ca].curto}`,
        bolsoes: `voto em ${CANDIDATOS[ca].curto} além do perfil e da região, comparado aos vizinhos`,
        regioes: `região de voto nº ${(mun.regiao ?? -1) + 1}`,
      }[va]
      setDica({
        x: e.point.x,
        y: e.point.y,
        titulo: `${mun.nome} (${mun.uf})`,
        valor,
        linhas: [linha1, `Lula ${pct(mun.v13 / mun.validos)} · Flávio ${pct(mun.v22 / mun.validos)}`],
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
      if (m.getLayer('regioes-contorno')) m.setPaintProperty('regioes-contorno', 'line-color', cssVar('--tinta'))
    }
    if (m.isStyleLoaded()) aplicar()
    else m.once('load', aplicar)
  }, [versaoTema])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={container} className="mapa" role="region" aria-roledescription="mapa" aria-label="Mapa dos municípios do Brasil; a mesma informação está na busca por município" />
      <CaixaDica dica={dica} />
      {!geo && <p className="carregando">Carregando o mapa…</p>}
    </div>
  )
}

/** Legenda da escala divergente em 7 classes; Lula à esquerda, Flávio à direita. */
export function LegendaEscala({ variavel, candidato }: { variavel: VariavelMapa | 'surpresa'; candidato: NumeroCandidato }) {
  useTema()
  const e = escalaAtual()
  if (variavel === 'bolsoes') {
    const lado = candidato === 13 ? 0 : 1
    return (
      <div className="legenda" style={{ marginTop: 12 }}>
        {[1, 4, 0, 2, 3].map((l) => (
          <span key={l}>
            <span className="chave chave-quadrada" style={{ background: e[CLASSE_LISA[l][lado]] }} aria-hidden="true" />
            {ROTULOS_LISA[l]}
          </span>
        ))}
      </div>
    )
  }
  const escala = variavel === 'margem' || variavel === 'regioes' ? 'margem' : 'efeito'
  const [a, b, c] = LIMITES[escala].map((x) => Math.round(x * 1000) / 10)
  const rotulos = [`> ${c}`, `${b} a ${c}`, `${a} a ${b}`, `± ${a}`, `${a} a ${b}`, `${b} a ${c}`, `> ${c}`]
  const quem = variavel === 'semperfil' ? 'acima do que perfil e região preveem' : variavel === 'surpresa' ? 'local vota acima do esperado' : 'município empurra a favor'
  const naRegiao = variavel === 'regioes' ? ' na região' : ''
  const titulo =
    escala === 'margem'
      ? [`Lula à frente${naRegiao} (pontos)`, `Flávio à frente${naRegiao} (pontos)`]
      : candidato === 13
        ? [`${quem} de Lula (pontos)`, 'contra Lula']
        : ['contra Flávio', `${quem} de Flávio (pontos)`]
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

type PropsLocais = {
  locais: Local[]
  selecionado: string | null
  aoSelecionar: (chave: string) => void
  /** "surpresa": resultado − esperado pelo município e pelo perfil do eleitorado do local (pipeline/07) */
  variavel?: 'margem' | 'surpresa'
  candidato?: NumeroCandidato
  /** "Onde virar voto": o que define o tamanho do círculo (padrão: votos válidos), em escala relativa ao maior */
  tamanho?: (l: Local) => number
  /** linha a mais na dica e no balão */
  linhaExtra?: (l: Local) => string
  /** muda quando `tamanho` ou `linhaExtra` mudam (ação, candidato), para o mapa refazer os dados */
  chave?: string
}

// raio cresce com o zoom: na cidade inteira os ~2 mil locais de SP não podem virar uma mancha.
// `extra` aumenta o círculo do local selecionado em cada parada (o zoom só pode ficar no topo do interpolate).
// `maxRaiz` (raiz do maior tamanho) troca a escala fixa de votos válidos por uma relativa: o maior local fica com o
// raio máximo e um local sem potencial vira um ponto pequeno.
const raioLocal = (extra = 0, maxRaiz?: number): ExpressionSpecification => {
  const r = (a: number, b: number, c: number): ExpressionSpecification =>
    maxRaiz
      ? ['interpolate', ['linear'], ['sqrt', ['get', 'tam']], 0, a * 0.6, Math.max(maxRaiz, 1), c * 1.2]
      : ['interpolate', ['linear'], ['sqrt', ['get', 'tam']], 10, a, 40, b, 90, c]
  return [
    'interpolate', ['linear'], ['zoom'],
    9, ['+', r(1.5, 3, 5), extra * 0.6],
    12, ['+', r(3, 6, 10), extra * 0.8],
    15, ['+', r(5, 10, 16), extra],
  ]
}

/** Classe de cor do local: margem Lula − Flávio, ou surpresa no voto do candidato (sem dado: cinza). */
function corLocal(l: Local, variavel: 'margem' | 'surpresa', candidato: NumeroCandidato): number {
  if (variavel === 'margem') return classe((l.v13 - l.v22) / l.validos, LIMITES.margem, true)
  const s = candidato === 13 ? l.s13 : l.s22
  return s === null || s === undefined ? -1 : classe(s, LIMITES.efeito, candidato === 13)
}

/** O local selecionado ganha uma camada própria por cima; os demais recuam. */
function aplicarSelecao(m: maplibregl.Map, chave: string | null) {
  if (!m.getLayer('locais-sel')) return
  m.setFilter('locais-sel', ['==', ['get', 'chave'], chave ?? ''])
  m.setPaintProperty('locais', 'circle-opacity', chave ? 0.35 : 1)
  m.setPaintProperty('locais', 'circle-stroke-opacity', chave ? 0.35 : 1)
}

/** Balão do local selecionado. Nomes vêm dos dados: entram como texto, nunca como HTML. */
function conteudoBalao(l: Local, extra = ''): HTMLElement {
  const div = document.createElement('div')
  const linha = (texto: string, forte = false) => {
    const el = document.createElement(forte ? 'strong' : 'div')
    el.textContent = texto
    if (forte) el.style.display = 'block'
    div.appendChild(el)
  }
  linha(l.nome, true)
  if (l.bairro) linha(l.bairro)
  linha(`Lula ${pct(l.v13 / l.validos)} · Flávio ${pct(l.v22 / l.validos)}`)
  linha(`${l.secoes} ${l.secoes === 1 ? 'seção' : 'seções'} · ${l.validos.toLocaleString('pt-BR')} votos válidos`)
  if (extra) linha(extra)
  return div
}

/** Locais de votação de um município sobre mapa de ruas (OpenFreeMap). Tamanho = votos válidos; cor = margem. */
export function MapaLocais({ locais, selecionado, aoSelecionar, variavel = 'margem', candidato = 13, tamanho, linhaExtra, chave = '' }: PropsLocais) {
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const [dica, setDica] = useState<Dica>(null)
  const versaoTema = useTema()
  const aoSelecionarRef = useRef(aoSelecionar)
  aoSelecionarRef.current = aoSelecionar
  const selecionadoRef = useRef(selecionado)
  selecionadoRef.current = selecionado
  const surpresaRef = useRef(variavel === 'surpresa')
  surpresaRef.current = variavel === 'surpresa'
  const balao = useRef<maplibregl.Popup | null>(null)

  const comCoordenada = locais.filter((l) => l.lat !== null && l.lon !== null)
  const maxRaiz = tamanho ? Math.sqrt(Math.max(0, ...comCoordenada.map(tamanho))) : undefined
  const maxRaizRef = useRef(maxRaiz)
  maxRaizRef.current = maxRaiz
  const linhaExtraRef = useRef(linhaExtra)
  linhaExtraRef.current = linhaExtra
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
        tam: tamanho ? tamanho(l) : l.validos,
        extra: linhaExtra ? linhaExtra(l) : '',
        lula: l.v13 / l.validos,
        flavio: l.v22 / l.validos,
        surpresa: (candidato === 13 ? l.s13 : l.s22) ?? null,
        c: corLocal(l, variavel, candidato),
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
          'circle-radius': raioLocal(0, maxRaizRef.current),
          'circle-stroke-color': cssVar('--superficie'),
          'circle-stroke-width': 1.5,
        },
      })
      m.addLayer({
        id: 'locais-sel',
        type: 'circle',
        source: 'locais',
        filter: ['==', ['get', 'chave'], ''],
        paint: {
          'circle-color': corPorClasse(),
          'circle-radius': raioLocal(5, maxRaizRef.current),
          'circle-stroke-color': cssVar('--tinta'),
          'circle-stroke-width': 3,
        },
      })
      aplicarSelecao(m, selecionadoRef.current)
    }
    m.on('load', montar)
    m.on('style.load', montar)
    m.on('mousemove', 'locais', (e) => {
      const p = e.features?.[0]?.properties
      if (!p) return
      m.getCanvas().style.cursor = 'pointer'
      const surpresa = p.surpresa === null || p.surpresa === undefined || p.surpresa === 'null' ? null : Number(p.surpresa)
      setDica({
        x: e.point.x,
        y: e.point.y,
        titulo: p.nome,
        valor: `Lula ${pct(p.lula)} · Flávio ${pct(p.flavio)}`,
        linhas: [
          p.bairro,
          `${Number(p.validos).toLocaleString('pt-BR')} votos válidos`,
          p.extra ?? '',
          surpresaRef.current && surpresa !== null ? `${pp(surpresa)} em relação ao esperado` : '',
        ].filter(Boolean),
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

  // troca de vista (resultado ou surpresa), de candidato ou de ação: refaz cores, tamanhos e dicas
  useEffect(() => {
    const m = mapa.current
    const fonte = m?.getSource('locais') as GeoJSONSource | undefined
    fonte?.setData(dados)
    if (m?.getLayer('locais')) {
      m.setPaintProperty('locais', 'circle-radius', raioLocal(0, maxRaiz))
      m.setPaintProperty('locais-sel', 'circle-radius', raioLocal(5, maxRaiz))
    }
  }, [variavel, candidato, chave])

  useEffect(() => {
    const m = mapa.current
    if (!m) return
    aplicarSelecao(m, selecionado)
    balao.current?.remove()
    balao.current = null
    const l = selecionado ? comCoordenada.find((x) => `${x.zona}-${x.local}` === selecionado) : undefined
    if (!l) return
    m.easeTo({ center: [l.lon!, l.lat!], zoom: Math.max(m.getZoom(), 15) })
    balao.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 18, maxWidth: '280px' })
      .setLngLat([l.lon!, l.lat!])
      .setDOMContent(conteudoBalao(l, linhaExtraRef.current?.(l) ?? ''))
      .addTo(m)
  }, [selecionado])

  if (comCoordenada.length === 0) return <p className="discreto">Sem coordenadas para os locais deste município.</p>
  return (
    <div style={{ position: 'relative' }}>
      <div ref={container} className="mapa mapa-pequeno" role="region" aria-roledescription="mapa" aria-label="Mapa dos locais de votação do município; a mesma informação está na tabela abaixo" />
      <CaixaDica dica={dica} />
    </div>
  )
}
