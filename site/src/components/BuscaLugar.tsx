import { useMemo, useState, type KeyboardEvent } from 'react'
import { normalizar, useLocais, useMunicipios, type Local } from '../lib/dados'
import { nomeBairro } from '../lib/virar'

export type Escolha = { tipo: 'cidade'; cd: number; uf: string } | { tipo: 'escola'; local: Local } | { tipo: 'bairro'; nome: string }

type Sugestao = { chave: string; titulo: string; detalhe: string; escolha: Escolha }

/** Onde o texto aparece no nome: no começo (0), no começo de uma palavra (1), no meio (2) ou em lugar nenhum (−1). */
function posicao(nome: string, q: string): number {
  const n = normalizar(nome)
  if (n.startsWith(q)) return 0
  if (n.split(/[\s.,/()-]+/).some((p) => p.startsWith(q))) return 1
  return n.includes(q) ? 2 : -1
}

/**
 * A busca única de lugares (decisão D10, fase 1). Sem cidade escolhida, procura cidades (do estado, se houver um). Com uma
 * cidade, procura primeiro as escolas e os bairros dela, no arquivo de escolas que a ferramenta já carregou, e depois
 * outras cidades. Segue o padrão combobox: setas, Enter e Esc no teclado; o leitor de tela ouve quantas sugestões há.
 */
export function BuscaLugar({ id, uf, cd, aoEscolher }: {
  id: string
  uf: string
  cd: number | null
  aoEscolher: (e: Escolha) => void
}) {
  const { dados: indice } = useMunicipios()
  const { dados: locais } = useLocais(cd)
  const [texto, setTexto] = useState('')
  const [ativa, setAtiva] = useState(-1)
  const [aberta, setAberta] = useState(false)
  const q = normalizar(texto)

  const sugestoes = useMemo<Sugestao[]>(() => {
    if (q.length < 2) return []
    const saida: Sugestao[] = []
    if (cd && locais) {
      locais
        .map((l) => ({ l, p: posicao(l.nome, q) }))
        .filter((x) => x.p >= 0)
        .sort((a, b) => a.p - b.p || b.l.validos - a.l.validos)
        .slice(0, 6)
        .forEach(({ l }) =>
          saida.push({ chave: `e${l.zona}-${l.local}`, titulo: l.nome, detalhe: `escola · ${l.bairro || 'bairro não informado'}`, escolha: { tipo: 'escola', local: l } }),
        )
      const bairros = new Map<string, number>()
      for (const l of locais) {
        const b = nomeBairro(l)
        if (b) bairros.set(b, (bairros.get(b) ?? 0) + 1)
      }
      ;[...bairros.entries()]
        .map(([b, n]) => ({ b, n, p: posicao(b, q) }))
        .filter((x) => x.p >= 0)
        .sort((a, b) => a.p - b.p || b.n - a.n)
        .slice(0, 3)
        .forEach(({ b, n }) =>
          saida.push({ chave: `b${b}`, titulo: b, detalhe: `bairro · ${n} ${n === 1 ? 'escola' : 'escolas'}`, escolha: { tipo: 'bairro', nome: b } }),
        )
    }
    if (indice) {
      // cidades maiores primeiro: "São Paulo" antes de "São Paulo das Missões"
      indice.lista
        .filter((m) => (!uf || m.uf === uf) && m.cd !== cd)
        .map((m) => ({ m, p: posicao(m.nome, q) }))
        .filter((x) => x.p >= 0)
        .sort((a, b) => Math.min(a.p, 1) - Math.min(b.p, 1) || b.m.validos - a.m.validos)
        .slice(0, cd ? 3 : 8)
        .forEach(({ m }) =>
          saida.push({ chave: `c${m.cd}`, titulo: m.nome, detalhe: `cidade · ${m.uf}`, escolha: { tipo: 'cidade', cd: m.cd, uf: m.uf } }),
        )
    }
    return saida
  }, [q, cd, locais, indice, uf])

  const mostrar = aberta && sugestoes.length > 0
  const escolher = (s: Sugestao) => {
    setTexto('')
    setAberta(false)
    setAtiva(-1)
    aoEscolher(s.escolha)
  }
  const teclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setAberta(false)
      setAtiva(-1)
      return
    }
    if (!sugestoes.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAberta(true)
      setAtiva((a) => (a + 1) % sugestoes.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAberta(true)
      setAtiva((a) => (a <= 0 ? sugestoes.length - 1 : a - 1))
    } else if (e.key === 'Enter' && mostrar) {
      // Enter sem nada marcado escolhe a primeira sugestão
      e.preventDefault()
      escolher(sugestoes[Math.max(0, ativa)])
    }
  }

  const carregando = !indice || (cd !== null && !locais)
  return (
    <div className="campo-municipio busca-lugar">
      <label htmlFor={id}>{cd ? 'Escola, bairro ou cidade' : 'Cidade'}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={mostrar && ativa >= 0 ? `${id}-op${ativa}` : undefined}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberta(true)
          setAtiva(-1)
        }}
        onKeyDown={teclar}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        placeholder={carregando ? 'Carregando…' : cd ? 'Nome da escola, do bairro ou de outra cidade' : 'Nome da cidade'}
        autoComplete="off"
      />
      <ul id={`${id}-lista`} role="listbox" aria-label="Lugares encontrados" className="sugestoes" hidden={!mostrar}>
        {sugestoes.map((s, i) => (
          <li
            key={s.chave}
            id={`${id}-op${i}`}
            role="option"
            aria-selected={i === ativa}
            className="sugestao"
            // sem isto o campo perde o foco antes do clique e a lista fecha
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => escolher(s)}
          >
            <span>
              {s.titulo} <span className="secundario">· {s.detalhe}</span>
            </span>
          </li>
        ))}
      </ul>
      {q.length >= 2 && !carregando && sugestoes.length === 0 && (
        <p className="discreto" style={{ margin: '6px 0 0' }}>
          Nenhum lugar com esse nome{cd ? ' nesta cidade' : uf ? ' neste estado' : ''}.
        </p>
      )}
      <div className="so-leitor" aria-live="polite">
        {q.length >= 2 && !carregando ? (sugestoes.length ? `${sugestoes.length} lugares encontrados` : 'Nenhum lugar encontrado') : ''}
      </div>
    </div>
  )
}
