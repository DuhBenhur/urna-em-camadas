import { useCandidato } from '../lib/candidato'
import { CANDIDATOS } from '../lib/modelo'

/** "Para quem?": os dois candidatos com o mesmo peso, nenhum escolhido de antemão, e a frase de neutralidade. */
export function EscolhaCandidato() {
  const [candidato, definir] = useCandidato()
  return (
    <>
      <div className="escolha-candidato" role="group" aria-label="Candidato">
        {([13, 22] as const).map((n) => (
          <button key={n} aria-pressed={candidato === n} onClick={() => definir(n)}>
            <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
            {CANDIDATOS[n].nome} ({CANDIDATOS[n].partido})
          </button>
        ))}
      </div>
      <p className="nota-neutra">A mesma conta para os dois candidatos. O site não pede voto para ninguém.</p>
    </>
  )
}
