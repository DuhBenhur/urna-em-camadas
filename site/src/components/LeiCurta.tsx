import { Link } from 'react-router-dom'

/** A lei, versão curta, para toda tela de ação. A lista completa, com os artigos, fica no guia "Como usar". */
export function LeiCurta({ Titulo = 'h3' }: { Titulo?: 'h2' | 'h3' }) {
  return (
    <div className="lei-curta">
      <Titulo>Dentro da lei</Titulo>
      <ul>
        <li>
          <strong>Nada em troca do voto.</strong> Oferecer dinheiro, comida, emprego ou qualquer vantagem é crime.
        </li>
        <li>
          <strong>Não transporte eleitores</strong> no dia da eleição. Só é permitido levar a própria família, no próprio carro.
        </li>
        <li>
          <strong>Nada de boca de urna.</strong> No dia 25, pedir voto perto das seções é crime.
        </li>
        <li>
          <strong>Só informação verdadeira</strong>, com fonte.
        </li>
      </ul>
      <Link to="/como-usar?ir=lei">Todas as regras, com os artigos da lei</Link>
    </div>
  )
}
