import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { normalizar, useMunicipios, useResumo } from '../lib/dados'

/**
 * Dois caminhos até a urna: quem tem o título (ou o e-Título) sabe UF, zona e seção;
 * quem não tem procura pelo município e chega à seção pelos locais de votação.
 */
export function Busca() {
  const [modo, setModo] = useState<'titulo' | 'municipio'>('titulo')
  return (
    <div className="cartao">
      <div className="abas" role="group" aria-label="Como encontrar sua urna">
        <button aria-pressed={modo === 'titulo'} onClick={() => setModo('titulo')}>
          Tenho zona e seção
        </button>
        <button aria-pressed={modo === 'municipio'} onClick={() => setModo('municipio')}>
          Procurar pelo município
        </button>
      </div>
      {modo === 'titulo' ? <BuscaTitulo /> : <BuscaMunicipio />}
    </div>
  )
}

function BuscaTitulo() {
  const { dados: resumo } = useResumo()
  const navegar = useNavigate()
  const [uf, setUf] = useState('')
  const [zona, setZona] = useState('')
  const [secao, setSecao] = useState('')
  const pronto = uf && Number(zona) > 0 && Number(secao) > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (pronto) navegar(`/urna/${uf}/${Number(zona)}/${Number(secao)}`)
      }}
    >
      <div className="campos">
        <div>
          <label htmlFor="b-uf">Estado</label>
          <select id="b-uf" value={uf} onChange={(e) => setUf(e.target.value)} required>
            <option value="">Escolha</option>
            {resumo?.ufs.map((u) => (
              <option key={u.uf} value={u.uf}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b-zona">Zona</label>
          <input id="b-zona" inputMode="numeric" pattern="[0-9]*" value={zona} onChange={(e) => setZona(e.target.value.replace(/\D/g, ''))} placeholder="ex.: 1" required />
        </div>
        <div>
          <label htmlFor="b-secao">Seção</label>
          <input id="b-secao" inputMode="numeric" pattern="[0-9]*" value={secao} onChange={(e) => setSecao(e.target.value.replace(/\D/g, ''))} placeholder="ex.: 123" required />
        </div>
        <button className="botao" type="submit" disabled={!pronto}>
          Ver minha urna
        </button>
      </div>
      <p className="discreto" style={{ marginTop: 12, marginBottom: 0 }}>
        Nada do que você digita sai do seu navegador.
      </p>
    </form>
  )
}

function BuscaMunicipio() {
  const { dados: indice } = useMunicipios()
  const [texto, setTexto] = useState('')
  const sugestoes = useMemo(() => {
    const q = normalizar(texto)
    if (!indice || q.length < 2) return []
    const comeca: typeof indice.lista = []
    const contem: typeof indice.lista = []
    for (const m of indice.lista) {
      const n = normalizar(m.nome)
      if (n.startsWith(q)) comeca.push(m)
      else if (n.includes(q)) contem.push(m)
    }
    // municípios maiores primeiro: "São Paulo" antes de "São Paulo das Missões"
    const porTamanho = (a: { validos: number }, b: { validos: number }) => b.validos - a.validos
    return [...comeca.sort(porTamanho), ...contem.sort(porTamanho)].slice(0, 8)
  }, [indice, texto])

  return (
    <div>
      <label htmlFor="b-mun">Município</label>
      <input
        id="b-mun"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={indice ? 'Digite o nome do município' : 'Carregando municípios…'}
        autoComplete="off"
        aria-describedby="b-mun-ajuda"
      />
      <p id="b-mun-ajuda" className="discreto" style={{ marginTop: 8, marginBottom: 0 }}>
        Depois escolha o local de votação e a seção.
      </p>
      {sugestoes.length > 0 && (
        <ul className="sugestoes">
          {sugestoes.map((m) => (
            <li key={m.cd}>
              <Link to={`/municipio/${m.cd}`}>
                <span>
                  {m.nome} <span className="secundario">({m.uf})</span>
                </span>
                <span className="discreto">{m.secoes.toLocaleString('pt-BR')} seções</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
