import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Cabecalho, Rodape } from './components/Estrutura'
import { Analise } from './pages/Analise'
import { ComoUsar } from './pages/ComoUsar'
import { Conferencia } from './pages/Conferencia'
import { Dados } from './pages/Dados'
import { Metodo } from './pages/Metodo'
import { Sobre } from './pages/Sobre'
import { Urna } from './pages/Urna'
import { Virar } from './pages/Virar'

// páginas com mapa carregam o MapLibre (~800 kB) só quando abertas; a ferramenta (inicial) carrega o dela só ao abrir uma cidade
const Mapa = lazy(() => import('./pages/Mapa').then((m) => ({ default: m.Mapa })))
const Municipio = lazy(() => import('./pages/Municipio').then((m) => ({ default: m.Municipio })))

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
            {/* a inicial é a ferramenta "Onde virar voto" (decisão D1 do docs/plano_reorganizacao.md) */}
            <Route path="/" element={<Virar />} />
            <Route path="/virar" element={<Redirecionar para="/" />} />
            <Route path="/como-usar" element={<ComoUsar />} />
            <Route path="/analise" element={<Analise />} />
            <Route path="/conferencia" element={<Conferencia />} />
            <Route path="/urna/:uf/:zona/:secao" element={<Urna />} />
            <Route path="/municipio/:cd" element={<Municipio />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/metodo" element={<Metodo />} />
            <Route path="/dados" element={<Dados />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </Suspense>
      </main>
      <Rodape />
    </HashRouter>
  )
}
