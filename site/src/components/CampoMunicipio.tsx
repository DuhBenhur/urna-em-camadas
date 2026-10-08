import { useMemo, useState } from 'react'
import { normalizar, useMunicipios } from '../lib/dados'

/** Campo de município com sugestões (maiores primeiro); `uf` restringe a um estado. Não navega: avisa quem usa. */
export function CampoMunicipio({ id, uf = '', aoEscolher, rotulo = 'Município' }: {
  id: string
  uf?: string
  aoEscolher: (m: { cd: number; uf: string }) => void
  rotulo?: string
}) {
  const { dados: indice } = useMunicipios()
  const [texto, setTexto] = useState('')
  const sugestoes = useMemo(() => {
    const q = normalizar(texto)
    if (!indice || q.length < 2) return []
    const lista = indice.lista.filter((m) => !uf || m.uf === uf)
    const comeca = lista.filter((m) => normalizar(m.nome).startsWith(q))
    const contem = lista.filter((m) => !normalizar(m.nome).startsWith(q) && normalizar(m.nome).includes(q))
    // municípios maiores primeiro: "São Paulo" antes de "São Paulo das Missões"
    const porTamanho = (a: { validos: number }, b: { validos: number }) => b.validos - a.validos
    return [...comeca.sort(porTamanho), ...contem.sort(porTamanho)].slice(0, 8)
  }, [indice, texto, uf])

  return (
    <div className="campo-municipio">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={indice ? 'Digite o nome' : 'Carregando municípios…'}
        autoComplete="off"
      />
      {sugestoes.length > 0 && (
        <ul className="sugestoes">
          {sugestoes.map((m) => (
            <li key={m.cd}>
              <button
                className="sugestao"
                onClick={() => {
                  setTexto('')
                  aoEscolher(m)
                }}
              >
                <span>
                  {m.nome} <span className="secundario">({m.uf})</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
