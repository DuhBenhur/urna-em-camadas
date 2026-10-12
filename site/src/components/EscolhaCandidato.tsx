import { useCandidato } from '../lib/candidato'
import { temaEscuro } from '../lib/cores'
import { CANDIDATOS } from '../lib/modelo'
import { useTema } from '../lib/tema'
import { rolarQuandoAparecer } from '../lib/virar'

/**
 * "Para quem?": os dois candidatos com o mesmo peso, nenhum escolhido de antemão, e a frase de neutralidade. Cada botão
 * traz a miniatura do mapa do saldo possível daquele candidato (site/scripts/miniaturas.py), para quem chega ver logo que
 * há um mapa e onde ficam as regiões de cada um.
 */
export function EscolhaCandidato() {
  const [candidato, definir] = useCandidato()
  useTema() // a miniatura acompanha o tema claro ou escuro
  const tema = temaEscuro() ? 'escuro' : 'claro'
  return (
    <>
      <div className="escolha-candidato" role="group" aria-label="Candidato">
        {([13, 22] as const).map((n) => (
          <button key={n} aria-pressed={candidato === n} onClick={() => definir(n)}>
            <img
              className="miniatura-mapa"
              src={`${import.meta.env.BASE_URL}miniaturas/saldo-${n}-${tema}.png`}
              alt=""
              width={360}
              height={377}
              decoding="async"
            />
            <span className="escolha-nome">
              <span className="chave" style={{ background: CANDIDATOS[n].cor }} aria-hidden="true" />
              {CANDIDATOS[n].nome} ({CANDIDATOS[n].partido})
            </span>
          </button>
        ))}
      </div>
      <p className="nota-neutra">
        Nos mapas, onde lembrar quem faltou rende mais para cada um. A mesma conta para os dois candidatos. O site não pede voto
        para ninguém.
        {candidato && (
          <>
            {' '}
            <button className="link-botao" onClick={() => rolarQuandoAparecer('resultado')}>
              Ver o mapa de {CANDIDATOS[candidato].curto}
            </button>
          </>
        )}
      </p>
    </>
  )
}
