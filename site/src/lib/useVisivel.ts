import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Fica `true` quando o elemento chega perto da tela, e não volta. Para o mapa (MapLibre e malha, ~800 kB) carregar só
 * quando a pessoa chega até ele, sem botão e sem pesar a abertura da página.
 */
export function useVisivel<T extends Element>(margem = '300px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    if (visivel || !ref.current) return
    if (!('IntersectionObserver' in window)) {
      setVisivel(true)
      return
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true)
          observador.disconnect()
        }
      },
      { rootMargin: margem },
    )
    observador.observe(ref.current)
    return () => observador.disconnect()
  }, [visivel, margem])
  return [ref, visivel]
}
