import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { NumeroCandidato } from './modelo'

/**
 * O candidato escolhido viaja pelo site: fica no parâmetro `?c=13|22` da URL (o link compartilhado leva a escolha) e numa
 * cópia no sessionStorage, que vale para as próximas páginas e quando a página é recarregada. A cópia é só desta aba,
 * some quando ela fecha e nunca sai do navegador. Sem escolha, o valor é null e cada página decide o que mostrar.
 */
const CHAVE = 'candidato'

const ler = (v: string | null): NumeroCandidato | null => (v === '13' ? 13 : v === '22' ? 22 : null)

function lerCopia(): NumeroCandidato | null {
  try {
    return ler(sessionStorage.getItem(CHAVE))
  } catch {
    return null // armazenamento bloqueado (modo privado, preview): vale só a URL
  }
}

function guardar(n: NumeroCandidato) {
  try {
    sessionStorage.setItem(CHAVE, String(n))
  } catch {
    /* armazenamento bloqueado: vale só a URL */
  }
}

/** `[candidato escolhido ou null, definir]`. Definir grava na URL (sem criar passo no "voltar") e na cópia. */
export function useCandidato(): [NumeroCandidato | null, (n: NumeroCandidato) => void] {
  const [params, setParams] = useSearchParams()
  const daUrl = ler(params.get('c'))
  // quem chega por um link com ?c= leva a escolha para as próximas páginas
  useEffect(() => {
    if (daUrl) guardar(daUrl)
  }, [daUrl])
  const definir = useCallback(
    (n: NumeroCandidato) => {
      guardar(n)
      setParams(
        (atual) => {
          const novos = new URLSearchParams(atual)
          novos.set('c', String(n))
          return novos
        },
        { replace: true },
      )
    },
    [setParams],
  )
  return [daUrl ?? lerCopia(), definir]
}

/** "?c=22" para levar a escolha num link; vazio sem escolha. */
export const comCandidato = (n: NumeroCandidato | null, separador: '?' | '&' = '?') => (n ? `${separador}c=${n}` : '')
