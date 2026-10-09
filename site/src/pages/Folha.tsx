import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { useLocais, useMunicipios } from '../lib/dados'
import { inteiro, pontos } from '../lib/formato'
import { linhaFolha, textoFolha, type LinhaFolha } from '../lib/folha'
import { CANDIDATOS } from '../lib/modelo'
import { RAIO_PERTO_KM, chaveLocal, escolasPerto, km, nomeBairro } from '../lib/virar'

/** Quantas escolas cabem na folha impressa (uma página A4); o resto fica na ferramenta. */
const NA_FOLHA = 15

type Conteudo = { erro: string } | { titulo: string; linhas: LinhaFolha[]; perto: boolean }

/** "Lula ficou à frente em 35 escolas (saldo possível somado: 5.539)" ou "Flávio não ficou à frente em nenhuma" */
function resumoLado(nome: string, linhas: LinhaFolha[]): string {
  if (!linhas.length) return `${nome} não ficou à frente em nenhuma`
  const saldo = inteiro(Math.round(linhas.reduce((s, l) => s + l.saldo, 0)))
  return `${nome} ficou à frente em ${linhas.length} ${linhas.length === 1 ? 'escola' : 'escolas'} (saldo possível somado: ${saldo})`
}

/** "Lula, 14 pontos"; abaixo de meio ponto, "por menos de 1 ponto" */
function frente(l: LinhaFolha): string {
  if (!l.frente) return 'empate'
  const nome = CANDIDATOS[l.frente].curto
  return l.pontos < 0.5 ? `${nome}, por menos de 1 ponto` : `${nome}, ${pontos(l.pontos, 0)}`
}

/**
 * A folha do bairro: uma página para imprimir, salvar em PDF ou mandar como texto ao grupo, com as escolas perto de uma
 * escola (`?perto={zona}-{local}`) ou de um bairro (`?bairro=`), as duas conversas, o que fazer, a lei e os limites. Sem
 * lado: para cada escola, quem ficou à frente e o saldo possível dele, então serve a quem apoia qualquer um dos dois.
 */
export function Folha() {
  const [params] = useSearchParams()
  const cd = Number(params.get('m')) || null
  const perto = params.get('perto')
  const bairro = params.get('bairro')
  const { dados: indice } = useMunicipios()
  const { dados: locais, erro } = useLocais(cd)
  const municipio = cd ? indice?.porCodigo.get(cd) : undefined
  const [copiado, setCopiado] = useState(false)

  const conteudo = useMemo<Conteudo | null>(() => {
    if (!locais) return null
    if (perto) {
      const partida = locais.find((l) => chaveLocal(l) === perto)
      if (!partida) return { erro: 'Esta escola não está no cadastro desta cidade.' }
      if (partida.lat === null || partida.lon === null) {
        return { erro: `${partida.nome} não tem localização no cadastro do TSE, então não dá para achar as escolas perto dela.` }
      }
      return { titulo: `Perto de ${partida.nome}`, linhas: escolasPerto(locais, { lat: partida.lat, lon: partida.lon }).map(linhaFolha), perto: true }
    }
    if (bairro) {
      const doBairro = locais.filter((l) => nomeBairro(l) === bairro).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      if (!doBairro.length) return { erro: `Nenhuma escola encontrada no bairro ${bairro}.` }
      return { titulo: `Bairro ${bairro}`, linhas: doBairro.map(linhaFolha), perto: false }
    }
    return { erro: 'Escolha uma escola ou um bairro na ferramenta para montar a folha.' }
  }, [locais, perto, bairro])

  const naFerramenta = `/?${new URLSearchParams({ ...(cd ? { m: String(cd) } : {}), ...(perto ? { perto } : {}), ...(bairro ? { bairro } : {}) })}`
  const problema =
    !cd || (indice && !municipio)
      ? 'Não deu para montar esta folha: a cidade não foi encontrada.'
      : erro
        ? 'Não deu para carregar as escolas desta cidade. Tente de novo em instantes.'
        : conteudo && 'erro' in conteudo
          ? conteudo.erro
          : null
  if (problema) {
    return (
      <div className="conteudo">
        <h1 style={{ marginTop: 32 }}>Folha do bairro</h1>
        <p className="aviso">{problema}</p>
        <Link className="botao" to={cd ? naFerramenta : '/'}>
          Ir para a ferramenta
        </Link>
      </div>
    )
  }
  if (!conteudo || 'erro' in conteudo || !municipio) return <div className="conteudo carregando">Carregando…</div>

  const { titulo, linhas } = conteudo
  const lugar = `${municipio.nome} (${municipio.uf})`
  const site = `${window.location.origin}${window.location.pathname}`
  // o link mandado ao grupo não leva candidato, como tudo o que o site compartilha
  const url = `${site}#/folha?${new URLSearchParams({ m: String(municipio.cd), ...(perto ? { perto } : { bairro: bairro! }) })}`
  const texto = textoFolha({ titulo, lugar, linhas, url })
  const soma = (f: (l: LinhaFolha) => number) => linhas.reduce((s, l) => s + f(l), 0)
  const lula = linhas.filter((l) => l.frente === 13)
  const flavio = linhas.filter((l) => l.frente === 22)
  const mandar = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Folha do bairro', text: texto })
        return
      }
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // envio cancelado
    }
  }

  return (
    <div className="conteudo">
      <div className="folha-acoes nao-imprimir">
        <p className="secundario">
          Uma página para imprimir, salvar em PDF ou mandar ao grupo, com as escolas, as duas conversas, o que fazer, a lei e os
          limites. Sem lado: serve a quem apoia qualquer um dos dois candidatos.
        </p>
        <div className="acoes">
          <button className="botao" onClick={() => window.print()}>
            Imprimir ou salvar em PDF
          </button>
          <button className="botao botao-secundario" onClick={mandar}>
            {copiado ? 'Texto copiado' : 'Mandar como texto'}
          </button>
          <Link className="botao botao-secundario" to={naFerramenta}>
            Voltar à ferramenta
          </Link>
        </div>
        <details className="folha-texto">
          <summary>Ver o texto que vai para o grupo</summary>
          <pre>{texto}</pre>
        </details>
      </div>

      <article className="folha" aria-labelledby="t-folha">
        <div className="rotulo-pequeno">Folha do bairro · 2º turno, domingo, 25 de outubro</div>
        <h1 id="t-folha">{titulo}</h1>
        <p className="folha-lugar">
          {lugar}. Resultado oficial do 1º turno, escola por escola. A mesma conta para os dois candidatos; o site não pede voto
          para ninguém.
        </p>
        <p className="folha-total">
          Nas {linhas.length} escolas{conteudo.perto ? ` a até ${RAIO_PERTO_KM} km` : ' do bairro'}, no 1º turno:{' '}
          <strong>{inteiro(soma((l) => l.faltosos))}</strong> pessoas faltaram e <strong>{inteiro(soma((l) => l.abertos))}</strong>{' '}
          votaram em outro candidato, branco ou nulo. {resumoLado(CANDIDATOS[13].curto, lula)};{' '}
          {resumoLado(CANDIDATOS[22].curto, flavio)}.
        </p>
        <TabelaRolagem rotulo="Escolas da folha">
        <table className="folha-tabela">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Escola</th>
              {conteudo.perto && <th>Bairro</th>}
              {conteudo.perto && <th className="num">Distância</th>}
              <th className="num">Faltaram</th>
              <th className="num">Votos em aberto</th>
              <th>À frente no 1º turno</th>
              <th className="num">Saldo possível de quem ficou à frente</th>
            </tr>
          </thead>
          <tbody>
            {linhas.slice(0, NA_FOLHA).map((l, i) => (
              <tr key={l.chave}>
                <td className="num">{i + 1}</td>
                <td>{l.nome}</td>
                {conteudo.perto && <td>{l.bairro}</td>}
                {conteudo.perto && <td className="num">{l.km === 0 ? 'partida' : km(l.km ?? 0)}</td>}
                <td className="num">{inteiro(l.faltosos)}</td>
                <td className="num">{inteiro(l.abertos)}</td>
                <td className="folha-frente">{frente(l)}</td>
                <td className="num">{l.frente ? inteiro(Math.round(l.saldo)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </TabelaRolagem>
        {linhas.length > NA_FOLHA && (
          <p className="folha-nota">
            As {NA_FOLHA} {conteudo.perto ? 'mais perto' : 'primeiras, em ordem alfabética'}, de {linhas.length}. A lista completa
            está na ferramenta e no link do texto.
          </p>
        )}

        <div className="folha-colunas">
          <section aria-labelledby="t-folha-conversas">
            <h2 id="t-folha-conversas">As duas conversas</h2>
            <ul>
              <li>
                <strong>Onde o seu candidato ficou à frente:</strong> lembrar quem faltou, e também quem já votou nele, de votar no
                dia 25. Cada pessoa a mais tende a somar.
              </li>
              <li>
                <strong>Em qualquer escola:</strong> conversar com quem votou em outro candidato, branco ou nulo. No 2º turno, todos
                escolhem entre os dois.
              </li>
            </ul>
            <h2>O que fazer</h2>
            <ul>
              <li>Converse com quem você conhece no bairro e ouça antes de argumentar.</li>
              <li>
                Lembre a data (25 de outubro), o local (está no e-Título) e o documento com foto. Quem não puder votar pode
                justificar.
              </li>
              <li>Leve só informação verdadeira, com fonte. Nunca exponha ninguém.</li>
            </ul>
          </section>
          <section aria-labelledby="t-folha-lei">
            <h2 id="t-folha-lei">Dentro da lei</h2>
            <ul>
              <li>Nada em troca do voto: dinheiro, comida, emprego ou qualquer vantagem é crime.</li>
              <li>Não transporte eleitores no dia da eleição; só a própria família, no próprio carro.</li>
              <li>Nada de propaganda em escolas e prédios públicos, nem de boca de urna no dia 25.</li>
              <li>Não pague para impulsionar conteúdo nas redes.</li>
            </ul>
            <h2>O que estes números não dizem</h2>
            <ul>
              <li>Quem faltou é um teto: inclui quem mudou de cidade, está fora do país ou tem voto facultativo.</li>
              <li>Votos em aberto não têm lado; a lista é a mesma para os dois candidatos.</li>
              <li>Lembrar de votar costuma render mais do que tentar convencer.</li>
              <li>São números do 1º turno e de escolas: não preveem o 2º turno nem dizem em quem cada pessoa votou.</li>
            </ul>
          </section>
        </div>
        <p className="folha-pe">
          Fonte: boletins de urna do 1º turno de 2026, publicados pelo TSE e conferidos com o resultado oficial. Regras completas
          da lei e como cada número é calculado: {site}#/como-usar · Esta folha: {url}
        </p>
      </article>
    </div>
  )
}
