import type { ReactNode } from 'react'

/** Passo numerado de uma tela de ação ("1 Para quem?", "2 Por onde começar?"). */
export function Passo({ numero, titulo, children, id = `passo-${numero}` }: { numero: number; titulo: string; children: ReactNode; id?: string }) {
  return (
    <section className="passo" aria-labelledby={id}>
      <h2 id={id}>
        <span className="passo-numero" aria-hidden="true">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}
