import { escalaAtual, sequencialAtual } from '../lib/cores'
import { CLASSE_LISA, CORTES_VIRAR, LIMITES, ROTULOS_LISA, rampaVirar, umaCasa, type VariavelMapa } from '../lib/escalas'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { useTema } from '../lib/tema'
import { rotuloValor, type Lente } from '../lib/virar'

/* As legendas dos mapas ficam fora de Mapas.tsx para quem as usa não carregar o MapLibre junto. */

/** Legenda das 5 classes do "Onde virar voto", do pouco para o muito, com a unidade. */
export function LegendaSequencial({ lente, candidato }: { lente: Lente; candidato: NumeroCandidato }) {
  useTema()
  const cores = sequencialAtual(rampaVirar(lente, candidato))
  const [a, b, c, d] = CORTES_VIRAR[lente].map(umaCasa)
  const rotulos = [`menos de ${a}`, `${a} a ${b}`, `${b} a ${c}`, `${c} a ${d}`, `${d} ou mais`]
  return (
    <div>
      <div className="legenda-escala legenda-sequencial">
        {cores.map((cor, i) => (
          <div key={i}>
            <span style={{ background: cor }} aria-hidden="true" />
            {rotulos[i]}
          </div>
        ))}
      </div>
      <p className="legenda" style={{ maxWidth: 520, marginTop: 4 }}>
        {rotuloValor(lente, CANDIDATOS[candidato].curto)}, de cada 100 eleitores aptos do município
      </p>
    </div>
  )
}

/** Legenda da escala divergente em 7 classes; Lula à esquerda, Flávio à direita. */
export function LegendaEscala({ variavel, candidato }: { variavel: VariavelMapa | 'surpresa'; candidato: NumeroCandidato }) {
  useTema()
  const e = escalaAtual()
  if (variavel === 'bolsoes') {
    const lado = candidato === 13 ? 0 : 1
    return (
      <div className="legenda" style={{ marginTop: 12 }}>
        {[1, 4, 0, 2, 3].map((l) => (
          <span key={l}>
            <span className="chave chave-quadrada" style={{ background: e[CLASSE_LISA[l][lado]] }} aria-hidden="true" />
            {ROTULOS_LISA[l]}
          </span>
        ))}
      </div>
    )
  }
  const escala = variavel === 'margem' || variavel === 'regioes' ? 'margem' : 'efeito'
  const [a, b, c] = LIMITES[escala].map((x) => Math.round(x * 1000) / 10)
  const rotulos = [`> ${c}`, `${b} a ${c}`, `${a} a ${b}`, `± ${a}`, `${a} a ${b}`, `${b} a ${c}`, `> ${c}`]
  const quem = variavel === 'semperfil' ? 'acima do que perfil e região preveem' : variavel === 'surpresa' ? 'local vota acima do esperado' : 'município empurra a favor'
  const naRegiao = variavel === 'regioes' ? ' na região' : ''
  const titulo =
    escala === 'margem'
      ? [`Lula à frente${naRegiao} (pontos)`, `Flávio à frente${naRegiao} (pontos)`]
      : candidato === 13
        ? [`${quem} de Lula (pontos)`, 'contra Lula']
        : ['contra Flávio', `${quem} de Flávio (pontos)`]
  return (
    <div>
      <div className="legenda-escala" aria-hidden="true">
        {e.map((cor, i) => (
          <div key={i}>
            <span style={{ background: cor }} />
            {rotulos[i]}
          </div>
        ))}
      </div>
      <div className="legenda" style={{ maxWidth: 520, justifyContent: 'space-between', marginTop: 4 }}>
        <span>← {titulo[0]}</span>
        <span>{titulo[1]} →</span>
      </div>
    </div>
  )
}
