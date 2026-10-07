import { useCallback, useRef, useState } from 'react'

/**
 * Largura do contêiner, atualizada com ResizeObserver (gráficos SVG responsivos).
 * Devolve uma callback ref: mede o elemento quando ele entra na página, inclusive se ele só aparece depois
 * de um clique. Até medir, a largura é 0 e o gráfico não desenha o SVG: se desenhasse com uma largura
 * provisória, as transições de CSS fariam os pontos deslizarem da posição errada para a certa.
 */
export function useLargura<T extends HTMLElement>() {
  const [largura, setLargura] = useState(0)
  const observador = useRef<ResizeObserver | null>(null)
  const ref = useCallback((elemento: T | null) => {
    observador.current?.disconnect()
    observador.current = null
    if (!elemento) return
    setLargura(Math.round(elemento.getBoundingClientRect().width))
    observador.current = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)))
    observador.current.observe(elemento)
  }, [])
  return [ref, largura] as const
}
