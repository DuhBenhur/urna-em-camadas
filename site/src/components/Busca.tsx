import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { comCandidato, useCandidato } from '../lib/candidato'
import { useResumo } from '../lib/dados'

/**
 * O caminho direto até a urna: quem tem o título (ou o e-Título) sabe o estado, a zona e a seção. Quem não sabe procura
 * a cidade e a escola na própria ferramenta (passo "Onde?").
 */
export function BuscaTitulo() {
  const { dados: resumo } = useResumo()
  const [candidato] = useCandidato()
  const navegar = useNavigate()
  const [uf, setUf] = useState('')
  const [zona, setZona] = useState('')
  const [secao, setSecao] = useState('')
  const pronto = uf && Number(zona) > 0 && Number(secao) > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (pronto) navegar(`/urna/${uf}/${Number(zona)}/${Number(secao)}${comCandidato(candidato)}`)
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
