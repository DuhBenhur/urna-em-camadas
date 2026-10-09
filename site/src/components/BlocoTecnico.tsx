import type { ReactNode } from 'react'

/**
 * O padrão "técnico para os dois públicos" (seção 9 do docs/plano_reorganizacao.md): a pergunta no título, uma resposta
 * curta que qualquer pessoa entende (com um número), como funciona em linguagem simples e, fechado, o detalhe técnico.
 * O detalhe fica na página mesmo fechado: a busca do navegador (Ctrl+F) acha o texto e abre o bloco.
 */
export function BlocoTecnico({ id, pergunta, resposta, comoFunciona, children, aberto = false }: {
  id: string
  pergunta: string
  resposta: ReactNode
  comoFunciona?: ReactNode
  children: ReactNode
  aberto?: boolean
}) {
  return (
    <section className="bloco-tecnico" id={id} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>{pergunta}</h2>
      <p className="resposta-curta">{resposta}</p>
      {comoFunciona && <div className="como-funciona">{comoFunciona}</div>}
      <details className="detalhe-tecnico" open={aberto}>
        <summary>Detalhe técnico</summary>
        <div className="detalhe-tecnico-conteudo">{children}</div>
      </details>
    </section>
  )
}
