import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

export function SeletorCandidato({ valor, aoMudar }: { valor: NumeroCandidato; aoMudar: (n: NumeroCandidato) => void }) {
  return (
    <div className="abas" role="group" aria-label="Candidato analisado">
      {([13, 22] as const).map((n) => (
        <button key={n} aria-pressed={valor === n} onClick={() => aoMudar(n)}>
          <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
          {CANDIDATOS[n].nome} ({CANDIDATOS[n].partido})
        </button>
      ))}
    </div>
  )
}
