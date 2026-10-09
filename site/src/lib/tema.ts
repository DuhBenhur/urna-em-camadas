import { useEffect, useState } from 'react'

/** Reage à troca de tema (botão do site ou do sistema operacional). */
export function useTema(): number {
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    const mudou = () => setVersao((v) => v + 1)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    window.addEventListener('tema', mudou)
    mq.addEventListener('change', mudou)
    return () => {
      window.removeEventListener('tema', mudou)
      mq.removeEventListener('change', mudou)
    }
  }, [])
  return versao
}
