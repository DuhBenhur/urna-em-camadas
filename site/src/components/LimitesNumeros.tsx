import { Link } from 'react-router-dom'
import { RAIO_PERTO_KM } from '../lib/virar'

/**
 * Os limites dos números, em destaque na ferramenta, antes dos resultados (pedido do usuário em 09/10): onde o valor do site
 * para para quem faz trabalho de base. O guia explica cada um, com as fontes (`/como-usar?ir=limites`).
 */
export function LimitesNumeros() {
  return (
    <section className="limites" aria-labelledby="t-limites">
      <h2 id="t-limites">Antes de sair conversando: o que estes números não dizem</h2>
      <ul>
        <li>
          <strong>Quem faltou é um teto.</strong> Entra quem mudou de cidade, está fora do país, ficou desatualizado no cadastro
          ou tem voto facultativo (16 e 17 anos, mais de 70, quem não é alfabetizado). Lugares com muitos idosos ou muita mudança
          aparecem com mais gente do que dá para alcançar.
        </li>
        <li>
          <strong>Votos em aberto não têm lado.</strong> O site não sabe se quem votou num terceiro candidato está mais perto de
          um lado ou do outro: a lista é a mesma para os dois.
        </li>
        <li>
          <strong>Lembrar de votar rende mais do que tentar convencer.</strong> Em pesquisas de campo, quase todas feitas fora do
          Brasil, lembrar as pessoas de votar tem efeito pequeno, mas real, maior cara a cara; tentar mudar o voto de alguém
          rende, em média, pouco.
        </li>
        <li>
          <strong>A lista orienta; quem conhece o bairro decide.</strong> Cada pessoa vota onde está registrada, não
          necessariamente onde mora, e numa cidade grande as escolas a até {RAIO_PERTO_KM} km de uma escola reúnem dezenas de
          milhares de eleitores.
        </li>
        <li>
          <strong>O site não organiza o grupo.</strong> A folha do bairro ajuda a dividir as escolas, mas o site não guarda quem
          foi aonde: combinem isso entre vocês.
        </li>
      </ul>
      <p>
        Tudo vem do resultado oficial do 1º turno: não é previsão, e são somas por escola, sem identificar ninguém.{' '}
        <Link to="/como-usar?ir=limites">Cada limite, explicado</Link>.
      </p>
    </section>
  )
}
