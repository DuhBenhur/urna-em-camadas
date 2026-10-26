import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ContarVisitas } from './components/ContarVisitas'
import { Cabecalho, Rodape } from './components/Estrutura'
import { ComoUsar } from './pages/ComoUsar'
import { Conferencia } from './pages/Conferencia'
import { Entenda } from './pages/Entenda'
import { Folha } from './pages/Folha'
import { Metodo } from './pages/Metodo'
import { SegundoTurno } from './pages/SegundoTurno'
import { Sobre } from './pages/Sobre'
import { Urna } from './pages/Urna'
import { Virar } from './pages/Virar'

// o mapa do Brasil carrega o MapLibre (~800 kB) só quando aberto; a ferramenta (inicial) carrega o dela só quando aparece
const Mapa = lazy(() => import('./pages/Mapa').then((m) => ({ default: m.Mapa })))

function VoltarAoTopo() {
  const { pathname } = useLocation()
  // corpo em bloco: no Chrome recente scrollTo devolve uma Promise, que o React chamaria como limpeza
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Endereços antigos que já circularam continuam valendo: vão para o novo, com os mesmos parâmetros. */
function Redirecionar({ para }: { para: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: para, search }} replace />
}

/** Parâmetros da ferramenta "Onde virar voto", que foi a inicial até 24/10: links com eles vão para a ferramenta. */
const PARAMETROS_FERRAMENTA = ['c', 'a', 'uf', 'm', 'perto', 'bairro', 'aba', 'local', 'vista']

/** A inicial é o 2º turno; um link antigo da ferramenta (`#/?c=13&m=...`, cartões e folhas já compartilhados) abre a ferramenta. */
function Inicio() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  if (PARAMETROS_FERRAMENTA.some((p) => params.has(p))) return <Navigate to={{ pathname: '/ferramenta', search }} replace />
  return <SegundoTurno />
}

/** Capítulos da antiga análise completa: o essencial foi para o Entenda; os bastidores, para Método e dados. */
const CAPITULOS: Record<string, string> = {
  'c-jogo': '/entenda?ir=lugar',
  'c-estado': '/entenda?ir=estado',
  'c-vizinhanca': '/entenda?ir=vizinhos',
  'c-explicacoes': '/entenda?ir=escola',
  'c-surpresas': '/entenda?ir=surpresas',
  'c-bastidores': '/metodo?sec=simples',
  'c-importa': '/entenda?ir=conversa',
}

/** `#/analise?cap=c-estado` (ou o antigo `?c=c-estado`) vai para a resposta certa; o candidato (`c=13|22`) vai junto. */
function RedirecionarAnalise() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const c = params.get('c')
  const capitulo = params.get('cap') ?? (c?.startsWith('c-') ? c : null)
  const destino = (capitulo && CAPITULOS[capitulo]) || '/entenda'
  const candidato = c === '13' || c === '22' ? `${destino.includes('?') ? '&' : '?'}c=${c}` : ''
  return <Navigate to={destino + candidato} replace />
}

/**
 * A antiga página do município virou a cidade dentro da ferramenta (decisão D7): `#/municipio/{cd}` abre a aba do resultado;
 * com `?local=`, a aba das seções, com a escola escolhida; com `?a=` (vinda do "Virar voto"), a aba "Onde conversar".
 */
function RedirecionarMunicipio() {
  const { cd } = useParams()
  const antigos = new URLSearchParams(useLocation().search)
  const novos = new URLSearchParams()
  const c = antigos.get('c')
  if (c === '13' || c === '22') novos.set('c', c)
  const a = antigos.get('a')
  if (a) novos.set('a', a)
  novos.set('m', cd ?? '')
  const local = antigos.get('local')
  if (local) {
    novos.set('aba', 'secao')
    novos.set('local', local)
  } else if (!a) {
    novos.set('aba', 'resultado')
  }
  return <Navigate to={`/ferramenta?${novos}`} replace />
}

function NaoEncontrada() {
  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Página não encontrada</h1>
      <a href="#/">Voltar ao início</a>
    </div>
  )
}

export function App() {
  return (
    <HashRouter>
      <VoltarAoTopo />
      <Cabecalho />
      <main>
        <Suspense fallback={<div className="conteudo carregando">Carregando…</div>}>
          <Routes>
            {/* desde 26/10 a inicial é o 2º turno (docs/plano_segundo_turno.md); a ferramenta "Onde virar voto" fica como registro */}
            <Route path="/" element={<Inicio />} />
            <Route path="/ferramenta" element={<Virar />} />
            <Route path="/virar" element={<Redirecionar para="/ferramenta" />} />
            <Route path="/como-usar" element={<ComoUsar />} />
            <Route path="/folha" element={<Folha />} />
            <Route path="/entenda" element={<Entenda />} />
            <Route path="/analise" element={<RedirecionarAnalise />} />
            <Route path="/conferencia" element={<Conferencia />} />
            <Route path="/urna/:uf/:zona/:secao" element={<Urna />} />
            <Route path="/municipio/:cd" element={<RedirecionarMunicipio />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/metodo" element={<Metodo />} />
            <Route path="/dados" element={<Navigate to="/metodo?sec=dados" replace />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </Suspense>
      </main>
      <Rodape />
      <ContarVisitas />
    </HashRouter>
  )
}
