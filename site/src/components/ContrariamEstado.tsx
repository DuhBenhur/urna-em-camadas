import { Link } from 'react-router-dom'
import type { Contraria, Historia } from '../lib/dados'
import { pct, pp } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

function Lista({ titulo, itens, candidato }: { titulo: string; itens: Contraria[]; candidato: NumeroCandidato }) {
  return (
    <div className="cartao">
      <h3>{titulo}</h3>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Município</th>
              <th className="num">{CANDIDATOS[candidato].curto} na cidade</th>
              <th className="num">No estado</th>
              <th className="num">Efeito</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((m) => (
              <tr key={m.cd}>
                <td>
                  <Link to={`/municipio/${m.cd}`}>{m.nome}</Link> <span className="discreto">({m.uf})</span>
                </td>
                <td className="num">{pct(m.p)}</td>
                <td className="num">{pct(m.p_uf)}</td>
                <td className="num">{pp(m.efeito)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Os cinco municípios (20 mil+ válidos) que mais se afastam do próprio estado, para cima e para baixo. */
export function ContrariamEstado({ historia, candidato }: { historia: Historia; candidato: NumeroCandidato }) {
  const c = historia.contrariam[String(candidato) as '13' | '22']
  const nome = CANDIDATOS[candidato].curto
  return (
    <div className="grade-2">
      <Lista titulo={`Muito mais ${nome} que o próprio estado`} itens={c.a_favor} candidato={candidato} />
      <Lista titulo={`Muito menos ${nome} que o próprio estado`} itens={c.contra} candidato={candidato} />
    </div>
  )
}
