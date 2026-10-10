import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { contar } from '../lib/contagem'
import { jaPedido, normalizar, type Tabela } from '../lib/dados'

const TITULOS: Record<string, string> = {
  '/como-usar': 'Como usar',
  '/conferencia': 'Confira sua urna',
  '/entenda': 'Entenda',
  '/sobre': 'Sobre',
}
// endereços antigos: redirecionam na hora, então conta só o destino
const REDIRECIONAM = ['/virar', '/analise', '/dados']

/** "São Paulo" → "sao-paulo" */
const slug = (s: string) => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * O nome da cidade, se a página já pediu o índice de municípios (a ferramenta e a folha pedem); sem ele, fica o código.
 * A contagem não baixa o índice por conta própria.
 */
async function cidade(cd: string): Promise<{ slug: string; nome: string }> {
  const pedido = jaPedido('municipios.json') as Promise<Tabela> | undefined
  if (pedido) {
    try {
      const t = await pedido
      const [ic, inome, iuf] = ['cd', 'nome', 'uf'].map((c) => t.colunas.indexOf(c))
      const linha = t.linhas.find((l) => String(l[ic]) === cd)
      if (linha) return { slug: `${slug(String(linha[inome]))}-${String(linha[iuf]).toLowerCase()}`, nome: `${linha[inome]} (${linha[iuf]})` }
    } catch {
      // sem o índice, fica o código
    }
  }
  return { slug: cd, nome: `cidade ${cd}` }
}

/** O que a página vira na contagem: o tipo de página e a cidade. Nunca o candidato, a zona, a seção nem a escola. */
export async function paraContar(pathname: string, search: string): Promise<{ path: string; title: string } | null> {
  const p = new URLSearchParams(search)
  if (REDIRECIONAM.includes(pathname) || pathname.startsWith('/municipio/')) return null
  if (pathname === '/') {
    const m = p.get('m')
    const uf = p.get('uf')
    if (m) {
      const c = await cidade(m)
      const aba = p.get('aba')
      const parte = aba === 'resultado' ? '/resultado' : aba === 'secao' ? '/secao' : p.get('perto') ? '/perto' : p.get('bairro') ? '/bairro' : ''
      return { path: `/cidade/${c.slug}${parte}`, title: `Virar voto: ${c.nome}` }
    }
    if (uf) return { path: `/estado/${uf.toLowerCase()}`, title: `Virar voto: ${uf.toUpperCase()}` }
    return { path: '/', title: 'Virar voto: Brasil' }
  }
  const urna = pathname.match(/^\/urna\/([A-Za-z]{2})\//)
  if (urna) return { path: `/urna/${urna[1].toLowerCase()}`, title: `Urna: ${urna[1].toUpperCase()}` }
  if (pathname === '/folha') {
    const m = p.get('m')
    if (!m) return { path: '/folha', title: 'Folha do bairro' }
    const c = await cidade(m)
    return { path: `/folha/${c.slug}`, title: `Folha do bairro: ${c.nome}` }
  }
  if (pathname === '/metodo') {
    const sec = p.get('sec')
    return { path: sec ? `/metodo/${slug(sec)}` : '/metodo', title: 'Método e dados' }
  }
  if (pathname === '/mapa') return { path: `/mapa/${slug(p.get('v') ?? 'virar')}`, title: 'Mapa' }
  if (TITULOS[pathname]) return { path: pathname, title: TITULOS[pathname] }
  return { path: '/nao-encontrada', title: 'Página não encontrada' }
}

/**
 * Conta cada página vista, uma vez por caminho: trocar o candidato, a conversa ou o mapa dentro da mesma página não conta de
 * novo. `?naocontar=1` em qualquer endereço tira este navegador da contagem (o GoatCounter respeita o `skipgc`);
 * `?naocontar=0` devolve.
 */
export function ContarVisitas() {
  const { pathname, search } = useLocation()
  const ultima = useRef<string | null>(null)
  useEffect(() => {
    const naoContar = new URLSearchParams(search).get('naocontar')
    try {
      if (naoContar === '1') localStorage.setItem('skipgc', 't')
      if (naoContar === '0') localStorage.removeItem('skipgc')
    } catch {
      // armazenamento bloqueado: segue sem a preferência
    }
    let ativo = true
    paraContar(pathname, search).then((c) => {
      if (!ativo || !c || c.path === ultima.current) return
      ultima.current = c.path
      contar(c)
    })
    return () => {
      ativo = false
    }
  }, [pathname, search])
  return null
}
