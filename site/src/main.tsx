import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// aplica o tema salvo antes do primeiro desenho, para não piscar
try {
  const tema = localStorage.getItem('tema')
  if (tema === 'light' || tema === 'dark') document.documentElement.dataset.theme = tema
} catch {
  /* sem acesso ao armazenamento: segue o tema do sistema */
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
