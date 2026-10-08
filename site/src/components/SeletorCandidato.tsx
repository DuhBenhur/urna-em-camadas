import { useCandidato } from '../lib/candidato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

/**
 * Lula e Flávio lado a lado, com o mesmo peso. Sem props, segue o candidato que viaja pelo site (`useCandidato`; sem
 * escolha, mostra Lula, o primeiro na ordem do site); com `valor` e `aoMudar`, segue um estado de fora. `valor={null}`
 * deixa os dois soltos: nas telas de ação, nada vem escolhido de antemão.
 */
export function SeletorCandidato({ valor, aoMudar, rotulo = 'Candidato analisado' }: {
  valor?: NumeroCandidato | null
  aoMudar?: (n: NumeroCandidato) => void
  rotulo?: string
}) {
  const [escolhido, definir] = useCandidato()
  const atual = valor === undefined ? (escolhido ?? 13) : valor
  const mudar = aoMudar ?? definir
  return (
    <div className="abas" role="group" aria-label={rotulo}>
      {([13, 22] as const).map((n) => (
        <button key={n} aria-pressed={atual === n} onClick={() => mudar(n)}>
          <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
          {CANDIDATOS[n].nome} ({CANDIDATOS[n].partido})
        </button>
      ))}
    </div>
  )
}
