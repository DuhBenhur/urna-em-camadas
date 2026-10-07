import { useEffect, useRef, useState } from 'react'

/** Largura do contêiner, atualizada com ResizeObserver (gráficos SVG responsivos). */
export function useLargura<T extends HTMLElement>(inicial = 640) {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(inicial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, largura] as const
}
