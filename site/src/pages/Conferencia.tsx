import { Link } from 'react-router-dom'
import { useConferencia, type LinhaConferencia } from '../lib/dados'
import { inteiro } from '../lib/formato'
import { REPOSITORIO } from '../lib/projeto'

const PORTAL_TSE = 'https://dadosabertos.tse.jus.br/'

/** Soma das diferenças absolutas entre boletins e resultado oficial, em todos os campos da linha. */
const diferenca = (l: LinhaConferencia) =>
  [l.comparecimento, l.validos, l.brancos, l.nulos, l.v13, l.v22].reduce((soma, [boletins, oficial]) => soma + Math.abs(boletins - oficial), 0)

export function Conferencia() {
  const { dados: c } = useConferencia()

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Confira você mesmo</h1>
      <p className="secundario" style={{ fontSize: '1.1rem' }}>
        Os boletins de urna publicados pelo TSE somam exatamente o resultado oficial da eleição. Conferimos, uma a uma, as{' '}
        {c ? inteiro(c.brasil.secoes) : '…'} urnas do 1º turno presidencial de 2026, em todos os números do boletim.
      </p>

      {c && (
        <div className="grade-3" style={{ marginTop: 24 }}>
          <div className="cartao tile">
            <div className="rotulo">urnas idênticas ao resultado oficial</div>
            <div className="valor">{inteiro(c.brasil.conferem)}</div>
            <p className="nota">de {inteiro(c.brasil.secoes)} urnas no Brasil</p>
          </div>
          <div className="cartao tile">
            <div className="rotulo">estados em que todas conferem</div>
            <div className="valor">{c.ufs.filter((u) => u.conferem === u.secoes).length}</div>
            <p className="nota">de {c.ufs.length} unidades da federação</p>
          </div>
          <div className="cartao tile">
            <div className="rotulo">diferença entre a soma e o resultado oficial</div>
            <div className="valor">{inteiro(diferenca(c.brasil))} votos</div>
            <p className="nota">em todos os campos conferidos</p>
          </div>
        </div>
      )}

      <h2>Como conferir a sua urna</h2>
      <ol className="passos-conferencia">
        <li>
          <strong>Ache a sua zona e a sua seção</strong> no título de eleitor ou no app e-Título.
        </li>
        <li>
          <strong>Abra a sua urna neste site</strong> (<Link to="/">busca na página inicial</Link>). O boletim aparece com os
          números publicados pelo TSE, e um selo diz se ele é idêntico ao resultado oficial da seção.
        </li>
        <li>
          <strong>Compare com o boletim impresso.</strong> Ao fim da votação, a urna imprime o boletim, e uma via fica afixada
          no local de votação. Fiscais de partidos podem receber cópias, e o QR Code impresso no boletim pode ser lido com o app
          Boletim na Mão, do TSE. Se os números do papel são os mesmos deste site, a sua urna está na soma oficial.
        </li>
      </ol>

      <h2>Estado por estado</h2>
      <p className="secundario">
        Soma dos boletins de urna e resultado oficial do TSE, para Presidente. A diferença soma comparecimento, votos
        válidos, brancos, nulos e os votos dos dois mais votados.
      </p>
      {c ? (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th className="num">Urnas</th>
                <th className="num">Urnas que conferem</th>
                <th className="num">Diferença</th>
                <th className="num">Votos válidos: soma dos boletins</th>
                <th className="num">Votos válidos: resultado oficial</th>
              </tr>
            </thead>
            <tbody>
              {c.ufs.map((u) => (
                <tr key={u.uf}>
                  <td>{u.nome}</td>
                  <td className="num">{inteiro(u.secoes)}</td>
                  <td className="num">{inteiro(u.conferem)}</td>
                  <td className="num">{inteiro(diferenca(u))}</td>
                  <td className="num">{inteiro(u.validos[0])}</td>
                  <td className="num">{inteiro(u.validos[1])}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 650 }}>
                <td>Brasil</td>
                <td className="num">{inteiro(c.brasil.secoes)}</td>
                <td className="num">{inteiro(c.brasil.conferem)}</td>
                <td className="num">{inteiro(diferenca(c.brasil))}</td>
                <td className="num">{inteiro(c.brasil.validos[0])}</td>
                <td className="num">{inteiro(c.brasil.validos[1])}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="carregando">Carregando…</p>
      )}

      <h2>O que foi conferido</h2>
      <p>
        Duas publicações do TSE no <a href={PORTAL_TSE}>Portal de Dados Abertos</a>, comparadas urna por urna:
      </p>
      <ul>
        <li>
          <strong>Os boletins de urna</strong> de cada seção, com a assinatura digital (SHA-512) conferida com a publicada
          pelo tribunal. É a base de todo este site.
        </li>
        <li>
          <strong>O resultado oficial por seção</strong> (detalhe da votação e votação por seção), que é o que a totalização
          soma para chegar ao resultado da eleição.
        </li>
      </ul>
      <p>
        Em cada seção, conferimos {c ? c.campos_conferidos.join(', ') : 'todos os campos do boletim'}. Os eleitores no
        exterior ficam fora, como no resto do site.
      </p>
      <div className="cartao destaque" style={{ marginTop: 16 }}>
        <h3>O nulo técnico</h3>
        <p>
          Uma candidatura a Presidente foi renunciada, mas o número dela continuou recebendo votos na urna. Esses votos
          aparecem no boletim, e a totalização os conta como nulos (o nulo técnico). A tabela oficial por seção mostra os
          nulos da urna e esses votos separados; somadas as duas partes, todas as seções batem.
        </p>
      </div>

      <h2>O que esta conferência não é</h2>
      <ul>
        <li>
          Não é uma auditoria da urna eletrônica. Ela mostra que os boletins publicados e o resultado oficial publicado
          contam a mesma coisa, sem nenhum voto a mais ou a menos, e indica como qualquer pessoa liga o boletim impresso da
          sua seção a essa soma.
        </li>
        <li>
          Não é uma opinião sobre candidatos. O site é independente e não tem vínculo com partidos ou campanhas.
        </li>
      </ul>

      <h2>Para reproduzir</h2>
      <p>
        O script <a href={`${REPOSITORIO}/blob/main/pipeline/09_totalizacao_oficial.py`}><code>09_totalizacao_oficial.py</code></a>{' '}
        monta o resultado oficial por seção e o <a href={`${REPOSITORIO}/blob/main/pipeline/03_validar_controle.py`}><code>03_validar_controle.py</code></a>{' '}
        compara as {c ? inteiro(c.brasil.secoes) : '…'} urnas campo a campo. Essa comparação roda automaticamente a cada
        publicação do site: se uma única urna divergir, o site não é publicado.
      </p>
    </div>
  )
}
