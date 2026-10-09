import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SeloExperimental } from '../components/SeloExperimental'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { useLocais } from '../lib/dados'
import { inteiro } from '../lib/formato'
import { RAIO_PERTO_KM, chaveLocal, escolasPerto, potencialSomado } from '../lib/virar'

// o exemplo: uma escola real da zona norte de São Paulo (zona 403, local 1554), a mesma conta para os dois candidatos
const EXEMPLO = { cd: 71072, uf: 'SP', zona: 403, local: 1554, secao: 411 }

/** Seções do guia: o `?ir=` abre direto em cada uma (o "Como calculamos" e a lei de outras páginas apontam para cá). */
const SECOES: [string, string][] = [
  ['minuto', 'Em 1 minuto'],
  ['conversas', 'As três conversas'],
  ['exemplo', 'Um exemplo real'],
  ['lista', 'O que fazer com a lista'],
  ['lei', 'Dentro da lei'],
  ['compartilhar', 'Compartilhar'],
  ['glossario', 'Glossário'],
  ['perguntas', 'Perguntas'],
]

/** O guia de uso da ferramenta, em linguagem simples: o que cada número quer dizer, o que fazer e o que a lei permite. */
export function ComoUsar() {
  const [params] = useSearchParams()
  const ir = params.get('ir')
  useEffect(() => {
    if (ir) document.getElementById(ir)?.scrollIntoView({ block: 'start' })
  }, [ir])

  return (
    <div className="conteudo como-usar">
      <section className="heroi" style={{ paddingBottom: 8 }}>
        <div className="rotulo-pequeno">Guia</div>
        <h1>Como usar o site para virar voto</h1>
        <p className="secundario">
          O site mostra, com o resultado oficial do 1º turno, em que bairros e escolas há mais gente para conversar antes do 2º
          turno. Aqui está como ler cada número, o que fazer com ele e o que a lei permite. A conta é a mesma para os dois
          candidatos; o site não pede voto para ninguém.
        </p>
      </section>

      <nav className="sumario" aria-label="Neste guia">
        {SECOES.map(([id, titulo]) => (
          <Link key={id} to={`/como-usar?ir=${id}`} replace>
            {titulo}
          </Link>
        ))}
      </nav>

      <section id="minuto" aria-labelledby="t-minuto">
        <h2 id="t-minuto">Em 1 minuto</h2>
        <ol className="passos-guia">
          <li>
            <strong>Escolha para quem.</strong> Lula ou Flávio Bolsonaro: a conta é a mesma para os dois.
          </li>
          <li>
            <strong>Escolha onde.</strong> A sua cidade (ou o Brasil inteiro, estado por estado), ou vá direto à sua urna com a
            zona e a seção do título de eleitor.
          </li>
          <li>
            <strong>Escolha a conversa.</strong> Lembrar quem faltou ou conversar com quem votou em outro candidato, branco ou
            nulo.
          </li>
          <li>
            <strong>Veja onde há mais gente.</strong> As escolas e os bairros da cidade, em ordem; na página da sua urna, as
            escolas a até {RAIO_PERTO_KM} km da sua.
          </li>
        </ol>
        <Link className="botao" to="/">
          Começar
        </Link>
      </section>

      <section id="conversas" aria-labelledby="t-conversas">
        <h2 id="t-conversas">As três conversas</h2>
        <div className="conversa-guia">
          <h3>Lembrar quem faltou</h3>
          <p>
            <strong>O número:</strong> o saldo possível. Em cada escola onde o seu candidato ficou à frente no 1º turno, é quanto
            ele ganharia a mais se quem faltou fosse votar e votasse como os vizinhos. Onde ele ficou atrás, o saldo é zero.
          </p>
          <p>
            <strong>O que fazer:</strong> lembrar a data (25 de outubro), o local de votação (está no e-Título) e o documento com
            foto. Quem não puder votar pode justificar a ausência.
          </p>
          <p>
            <strong>O que o número não diz:</strong> é um teto. Parte de quem faltou mudou de cidade, está fora do país ou não
            pode votar, e quem falta costuma ser diferente de quem vota (mais jovem, mais velho, mais pobre).
          </p>
        </div>
        <div className="conversa-guia">
          <h3>Conversar com quem votou em outro</h3>
          <p>
            <strong>O número:</strong> os votos em aberto, isto é, os votos do 1º turno nos outros dez candidatos, brancos e
            nulos. No 2º turno, todas essas pessoas escolhem entre os dois.
          </p>
          <p>
            <strong>O que fazer:</strong> ouvir antes de argumentar e levar informação com fonte.
          </p>
          <p>
            <strong>O que o número não diz:</strong> esses votos não têm lado. Ninguém sabe para onde vão; o site mostra só
            quantos são e como o lugar votou.
          </p>
        </div>
        <div className="conversa-guia conversa-avancada">
          <h3>
            Onde o perfil promete mais <SeloExperimental />
          </h3>
          <p>
            <strong>O número:</strong> os votos abaixo do esperado. Para cada escola, um modelo estima quanto o candidato teria,
            pela cidade e pela idade, o sexo e a escolaridade de quem vota ali. Onde ele teve menos, a diferença é o número.
          </p>
          <p>
            <strong>O que o número não diz:</strong> o modelo não conhece a renda do bairro nem a história do lugar. Muitas
            vezes, "abaixo do esperado" é um bairro onde o adversário é forte por esses motivos, e não gente esperando uma
            conversa. Por isso esta é uma opção avançada, só dentro da ferramenta: trate como pista, não como certeza.
          </p>
        </div>
        <p className="discreto">
          As fórmulas, os totais do Brasil e a conferência de cada conta estão em{' '}
          <Link to="/metodo">Método e dados</Link>.
        </p>
      </section>

      <Exemplo />

      <section id="lista" aria-labelledby="t-lista">
        <h2 id="t-lista">O que fazer com a lista</h2>
        <ul className="lista-guia">
          <li>
            <strong>Converse com quem você conhece</strong> no bairro: família, vizinhos, colegas. Escute antes de argumentar.
          </li>
          <li>
            <strong>Para quem faltou,</strong> lembre a data, o local e o documento. Quem não puder votar pode justificar.
          </li>
          <li>
            <strong>Leve só informação verdadeira</strong>, com fonte.
          </li>
          <li>
            <strong>A escola é referência, não palco.</strong> Ela indica o bairro de quem vota ali; não é lugar de propaganda
            (veja a lei, abaixo).
          </li>
          <li>
            <strong>Nunca exponha ninguém.</strong> Os números são de lugares: o voto é secreto, e nada aqui diz em quem cada
            pessoa votou.
          </li>
        </ul>
      </section>

      <section id="lei" className="cartao como-fazer" aria-labelledby="t-lei">
        <h2 id="t-lei" style={{ marginTop: 0 }}>
          Dentro da lei
        </h2>
        <ul>
          <li>
            <strong>Nada em troca do voto.</strong> Oferecer dinheiro, comida, emprego ou qualquer vantagem é crime (Código
            Eleitoral, art. 299).
          </li>
          <li>
            <strong>Não transporte eleitores no dia da eleição.</strong> Só é permitido levar a própria família no próprio carro
            (Lei 6.091/1974).
          </li>
          <li>
            <strong>Nada de propaganda em escolas e prédios públicos</strong> (Lei 9.504/1997, art. 37).
          </li>
          <li>
            <strong>No dia 25,</strong> pedir voto ou fazer propaganda perto das seções é crime (boca de urna, Lei 9.504/1997,
            art. 39, § 5º).
          </li>
          <li>
            <strong>Só informação verdadeira e com fonte.</strong> Divulgar fato que se sabe falso sobre candidato é crime
            (Código Eleitoral, art. 323).
          </li>
          <li>
            <strong>Não pague para impulsionar</strong> conteúdo eleitoral nas redes: só candidatos, partidos e coligações podem
            contratar impulsionamento (Lei 9.504/1997, art. 57-C). Este site não impulsiona nada.
          </li>
        </ul>
        <p className="discreto" style={{ marginBottom: 0 }}>
          Resumo para orientação, não é aconselhamento jurídico. Em caso de dúvida, consulte o TSE ou o TRE do seu estado.
        </p>
      </section>

      <section id="compartilhar" aria-labelledby="t-compartilhar">
        <h2 id="t-compartilhar">Compartilhar</h2>
        <p>
          Na página da sua urna, o cartão "perto de mim" mostra quantas pessoas faltaram e quantas votaram em outro candidato,
          branco ou nulo nas escolas a até {RAIO_PERTO_KM} km da sua. Só números sem lado: o cartão não cita candidato e não
          pede voto. Ele mostra o nome da sua escola; compartilhe só se quiser.
        </p>
      </section>

      <section id="glossario" aria-labelledby="t-glossario">
        <h2 id="t-glossario">Glossário</h2>
        <dl className="glossario">
          <dt>Escola</dt>
          <dd>O local de votação. Quase sempre é uma escola; as pessoas votam onde estão registradas, em geral perto de casa.</dd>
          <dt>Urna (seção)</dt>
          <dd>Cada seção eleitoral tem uma urna. Uma escola costuma ter várias.</dd>
          <dt>Zona</dt>
          <dd>A área da Justiça Eleitoral que reúne as seções de um pedaço da cidade. Está no título de eleitor.</dd>
          <dt>Quem faltou</dt>
          <dd>Eleitores aptos que não votaram no 1º turno.</dd>
          <dt>Votos em aberto</dt>
          <dd>Votos do 1º turno em outros candidatos, brancos e nulos.</dd>
          <dt>Saldo possível</dt>
          <dd>Quanto o candidato ganharia a mais se quem faltou votasse como os vizinhos, onde ele ficou à frente. É um teto.</dd>
          <dt>Votos abaixo do esperado</dt>
          <dd>Onde o candidato teve menos votos do que escolas de perfil parecido na mesma cidade. Experimental.</dd>
          <dt>Ponto</dt>
          <dd>1 ponto é 1 voto em cada 100 votos válidos.</dd>
        </dl>
      </section>

      <section id="perguntas" aria-labelledby="t-perguntas">
        <h2 id="t-perguntas">Perguntas</h2>
        <h3>Por que o site não mostra os lugares mais disputados?</h3>
        <p>
          Porque no 2º turno para presidente cada voto vale igual no país inteiro: um voto a mais na Bahia vale o mesmo que um em
          Santa Catarina. O que importa é quantas pessoas alcançáveis há perto de você.
        </p>
        <h3>O site pede voto para alguém?</h3>
        <p>Não. A conta é a mesma para os dois candidatos; quem escolhe o lado é quem usa.</p>
        <h3>Os números mostram em quem cada pessoa votou?</h3>
        <p>
          Não. O voto é secreto, e os números são somas por urna e por escola. Uma escola que votou num candidato não diz como
          votou cada pessoa.
        </p>
        <h3>Quem faltou no 1º turno vai votar no 2º?</h3>
        <p>Ninguém sabe. Por isso o saldo possível é um teto, não uma previsão.</p>
        <h3>Dá para confiar no terceiro número?</h3>
        <p>
          Com cuidado. Ele depende de um modelo que não vê a renda do bairro nem a história do lugar. É pista, não certeza, e
          por isso fica como opção avançada.
        </p>
        <h3>De onde vêm os números?</h3>
        <p>
          Dos boletins de urna do 1º turno, publicados pelo TSE. Cada uma das urnas foi conferida com o resultado oficial (
          <Link to="/conferencia">veja a conferência</Link>); as contas e os dados estão em <Link to="/metodo">Método e dados</Link>.
        </p>
      </section>

      <div className="acoes" style={{ marginTop: 32 }}>
        <Link className="botao" to="/">
          Encontre onde conversar
        </Link>
        <Link className="botao botao-secundario" to="/conferencia">
          Depois de votar, confira a sua urna
        </Link>
      </div>
    </div>
  )
}

/** O exemplo, calculado na hora com os mesmos arquivos e as mesmas contas da ferramenta. */
function Exemplo() {
  const { dados: locais } = useLocais(EXEMPLO.cd)
  const conta = useMemo(() => {
    const escola = locais?.find((l) => l.zona === EXEMPLO.zona && l.local === EXEMPLO.local)
    if (!locais || !escola || escola.lat === null || escola.lon === null) return null
    const perto = escolasPerto(locais, { lat: escola.lat, lon: escola.lon })
    return {
      escola,
      n: perto.length,
      faltaram: perto.reduce((s, l) => s + l.faltosos, 0),
      abertos: perto.reduce((s, l) => s + l.abertos, 0),
      saldo: { 13: potencialSomado(perto, 13, 'faltosos'), 22: potencialSomado(perto, 22, 'faltosos') },
      abaixo: { 13: potencialSomado(perto, 13, 'perfil'), 22: potencialSomado(perto, 22, 'perfil') },
    }
  }, [locais])

  return (
    <section id="exemplo" aria-labelledby="t-exemplo">
      <h2 id="t-exemplo">Um exemplo real</h2>
      {!conta ? (
        <p className="carregando">Calculando o exemplo…</p>
      ) : (
        <>
          <p>
            Quem vota na escola {conta.escola.nome}, na zona norte de São Paulo, tem {conta.n} escolas a até {RAIO_PERTO_KM} km,
            contando a sua. Nelas, no 1º turno:
          </p>
          <TabelaRolagem rotulo="O exemplo, para os dois candidatos">
            <table>
              <thead>
                <tr>
                  <th>Conta, nas {conta.n} escolas</th>
                  <th className="num">Lula</th>
                  <th className="num">Flávio Bolsonaro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Faltaram (não tem lado)</td>
                  <td className="num" colSpan={2} style={{ textAlign: 'center' }}>
                    {inteiro(conta.faltaram)}
                  </td>
                </tr>
                <tr>
                  <td>Saldo possível ao lembrar quem faltou</td>
                  <td className="num">{inteiro(Math.round(conta.saldo[13]))}</td>
                  <td className="num">{conta.saldo[22] > 0 ? inteiro(Math.round(conta.saldo[22])) : '0 (não ficou à frente em nenhuma)'}</td>
                </tr>
                <tr>
                  <td>Votos em aberto (não têm lado)</td>
                  <td className="num" colSpan={2} style={{ textAlign: 'center' }}>
                    {inteiro(conta.abertos)}
                  </td>
                </tr>
                <tr>
                  <td>Votos abaixo do esperado (experimental)</td>
                  <td className="num">{inteiro(Math.round(conta.abaixo[13]))}</td>
                  <td className="num">{inteiro(Math.round(conta.abaixo[22]))}</td>
                </tr>
              </tbody>
            </table>
          </TabelaRolagem>
          <p style={{ marginTop: 12 }}>
            Lendo:{' '}
            {([13, 22] as const)
              .map((c) => {
                const nome = c === 13 ? 'Lula' : 'Flávio'
                return conta.saldo[c] > 0
                  ? `para quem apoia ${nome}, lembrar quem faltou pode render até ${inteiro(Math.round(conta.saldo[c]))} votos`
                  : `para quem apoia ${nome}, que não ficou à frente em nenhuma dessas escolas, a conversa que rende é com quem votou em outro`
              })
              .join('; ')}
            . A mesma tabela serve aos dois.
          </p>
          <div className="acoes">
            {([13, 22] as const).map((c) => (
              <Link key={c} className="botao botao-secundario"
                to={`/?c=${c}&a=faltosos&uf=${EXEMPLO.uf}&m=${EXEMPLO.cd}&perto=${chaveLocal(conta.escola)}`}>
                Ver no mapa, para {c === 13 ? 'Lula' : 'Flávio Bolsonaro'}
              </Link>
            ))}
            <Link className="botao botao-secundario" to={`/urna/${EXEMPLO.uf}/${EXEMPLO.zona}/${EXEMPLO.secao}`}>
              Ver uma urna dessa escola
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
