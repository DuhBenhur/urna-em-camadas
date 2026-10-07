import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Cabecalho, Rodape } from './components/Estrutura'
import { Inicio } from './pages/Inicio'
import { Metodo } from './pages/Metodo'
import { Sobre } from './pages/Sobre'
import { Urna } from './pages/Urna'

// páginas com mapa carregam o MapLibre (~800 kB) só quando abertas
const Mapa = lazy(() => import('./pages/Mapa').then((m) => ({ default: m.Mapa })))
const Municipio = lazy(() => import('./pages/Municipio').then((m) => ({ default: m.Municipio })))

function VoltarAoTopo() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
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
            <Route path="/" element={<Inicio />} />
            <Route path="/urna/:uf/:zona/:secao" element={<Urna />} />
            <Route path="/municipio/:cd" element={<Municipio />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/metodo" element={<Metodo />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </Suspense>
      </main>
      <Rodape />
    </HashRouter>
  )
}
