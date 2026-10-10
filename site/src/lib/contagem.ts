/**
 * Contagem de visitas anônima com o GoatCounter: sem cookies e sem guardar dados pessoais. O script fica no `index.html`
 * com "no_onload", e o site conta as páginas do jeito dele (os endereços usam `#/`). Regra: nunca enviar o candidato
 * escolhido, a zona, a seção nem a escola; só o tipo de página, a cidade e as ações de uso (eventos).
 *
 * Em navegador automatizado (os testes), nada é enviado: o que seria contado fica em `window.__contagens`, para os testes
 * conferirem. No preview local, o próprio GoatCounter não conta (localhost).
 */
export type Contagem = { path: string; title?: string; event?: boolean }

declare global {
  interface Window {
    goatcounter?: { count: (c: Contagem) => void }
    __contagens?: Contagem[]
  }
}

const fila: Contagem[] = []
let tentativas = 0

/** O script do GoatCounter carrega assíncrono; um bloqueador de anúncios pode impedir: depois de 15 s, desiste. */
function despachar(): void {
  if (window.goatcounter?.count) {
    while (fila.length) window.goatcounter.count(fila.shift()!)
  } else if (tentativas++ < 30) {
    setTimeout(despachar, 500)
  } else {
    fila.length = 0
  }
}

export function contar(c: Contagem): void {
  if (navigator.webdriver) {
    ;(window.__contagens ??= []).push(c)
    return
  }
  fila.push(c)
  if (fila.length === 1) {
    tentativas = 0
    despachar()
  }
}

/** Uma ação de uso (imprimir a folha, compartilhar o cartão, abrir o mapa, usar a busca), sem dado nenhum de quem fez. */
export const contarEvento = (nome: string, titulo: string): void => contar({ path: nome, title: titulo, event: true })
