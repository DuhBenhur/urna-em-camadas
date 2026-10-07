import type { ReactNode } from 'react'

/** A camada de método de cada capítulo: fechada por padrão, para quem quer o porquê. */
export function ComoSabemos({ children }: { children: ReactNode }) {
  return (
    <details className="como-sabemos">
      <summary>Como sabemos</summary>
      <div>{children}</div>
    </details>
  )
}
