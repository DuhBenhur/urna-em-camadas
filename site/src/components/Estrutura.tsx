import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { REPOSITORIO } from '../lib/projeto'

function IconeUrna() {
  // urna em camadas: três faixas empilhadas sobre a fenda da urna
  return (
    <svg className="marca-icone" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="18" width="24" height="10" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="7" y="12" width="18" height="4" rx="1.5" fill="var(--lula)" />
      <rect x="9" y="7" width="14" height="3.5" rx="1.5" fill="var(--flavio)" />
      <rect x="11" y="3" width="10" height="2.5" rx="1.25" fill="var(--tinta-3)" />
      <rect x="10" y="21.5" width="12" height="2" rx="1" fill="var(--plano)" />
    </svg>
  )
}

function lerTema(): 'light' | 'dark' | null {
  try {
    const t = localStorage.getItem('tema')
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

export function Cabecalho() {
  const [tema, setTema] = useState(lerTema)
  useEffect(() => {
    if (tema) document.documentElement.dataset.theme = tema
    else delete document.documentElement.dataset.theme
    window.dispatchEvent(new Event('tema'))
  }, [tema])

  const escuroAgora = tema ? tema === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  const alternar = () => {
    const novo = escuroAgora ? 'light' : 'dark'
    try {
      localStorage.setItem('tema', novo)
    } catch {
      /* modo privado: o tema vale só nesta visita */
    }
    setTema(novo)
  }

  return (
    <header className="cabecalho">
      <div className="conteudo">
        <Link to="/" className="marca">
          <IconeUrna />
          Urna em Camadas
        </Link>
        <nav className="navegacao" aria-label="Principal">
          <NavLink to="/" end>Início</NavLink>
          <NavLink to="/analise">Análise</NavLink>
          <NavLink to="/conferencia">Conferência</NavLink>
          <NavLink to="/mapa">Mapa</NavLink>
          <NavLink to="/metodo">Método</NavLink>
          <NavLink to="/dados">Dados</NavLink>
          <NavLink to="/sobre">Sobre</NavLink>
        </nav>
        <button className="botao-tema" onClick={alternar} aria-label={escuroAgora ? 'Usar tema claro' : 'Usar tema escuro'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {escuroAgora ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </>
            ) : (
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            )}
          </svg>
        </button>
      </div>
    </header>
  )
}

export function Rodape() {
  return (
    <footer className="rodape">
      <div className="conteudo">
        <p>
          Projeto feito por <strong>Eduardo Ben Hur</strong> com <a href="https://claude.com/claude-code">Claude Code</a>.{' '}
          <a href={REPOSITORIO}>Código-fonte e dados no GitHub</a>. Todas as informações vêm de bases públicas do Tribunal
          Superior Eleitoral (TSE), do IBGE e do Ministério do Desenvolvimento e Assistência Social (MDS).
        </p>
        <p>
          Projeto independente, sem vínculo com partidos ou candidaturas. <strong>Não é pesquisa eleitoral</strong>: não
          entrevista eleitores nem estima intenção de voto; analisa resultados oficiais já apurados.
        </p>
        <p className="discreto">Código sob licença MIT. Dados processados e textos sob CC BY 4.0.</p>
      </div>
    </footer>
  )
}
