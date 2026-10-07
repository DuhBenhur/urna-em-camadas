import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Contêiner de tabela com rolagem lateral. Quando a tabela não cabe na largura, ele entra na ordem do Tab, com nome,
 * para quem usa teclado conseguir rolar (WCAG 2.1.1); quando cabe, não vira parada de Tab à toa.
 */
export function TabelaRolagem({ children, rotulo = 'Tabela', style }: { children: ReactNode; rotulo?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [rola, setRola] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setRola(el.scrollWidth > el.clientWidth + 1)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    if (el.firstElementChild) obs.observe(el.firstElementChild)
    return () => obs.disconnect()
  }, [])
  const acessivel = rola ? { tabIndex: 0, role: 'region', 'aria-label': `${rotulo}: role para os lados para ver todas as colunas` } : {}
  return (
    <div ref={ref} className="tabela-rolagem" style={style} {...acessivel}>
      {children}
    </div>
  )
}
