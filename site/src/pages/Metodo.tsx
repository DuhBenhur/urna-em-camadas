import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BlocoTecnico } from '../components/BlocoTecnico'
import { CapituloExplicacoes } from '../components/CapituloExplicacoes'
import { CidadesGemeas } from '../components/CidadesGemeas'
import { ComoFoiFeito } from '../components/ComoFoiFeito'
import { DadosParaBaixar } from '../components/DadosParaBaixar'
import { EfeitoEstados } from '../components/EfeitoEstados'
import { MetodoEspaco, MetodoModelos } from '../components/MetodoExplicativo'
import { MetodoVirar } from '../components/MetodoVirar'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { TabelaRolagem } from '../components/TabelaRolagem'
import { comCandidato, useCandidato } from '../lib/candidato'
import { useConferencia, useExplicacao, useHistoria, useResumo, type Explicacao } from '../lib/dados'
import { DECISOES } from '../lib/decisoes'
import { inteiro, milhoes, pct, pontos } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { REPOSITORIO } from '../lib/projeto'

const PORTAL_TSE = 'https://dadosabertos.tse.jus.br/'
const SHA = `${REPOSITORIO}/blob/main/pipeline/01_baixar_tse.py`
const AGREGADOS_IBGE = 'https://servicodados.ibge.gov.br/api/docs/agregados?versao=3'
const MALHAS_IBGE = 'https://servicodados.ibge.gov.br/api/docs/malhas?versao=3'
const MI_SOCIAL = 'https://aplicacoes.mds.gov.br/sagi/'

// acesso: onde baixar e, quando há, o código que confere o arquivo
const FONTES: { fonte: string; traz: string; nivel: string; acesso: [string, string][] }[] = [
  { fonte: 'TSE: boletins de urna (27 UFs)', traz: 'Votos de cada urna no 1º turno', nivel: 'Seção', acesso: [['Portal de Dados Abertos', PORTAL_TSE], ['SHA-512 conferido', SHA]] },
  { fonte: 'TSE: perfil do eleitorado por seção', traz: 'Gênero, idade e escolaridade dos eleitores cadastrados', nivel: 'Seção', acesso: [['Portal de Dados Abertos', PORTAL_TSE], ['SHA-512 conferido', SHA]] },
  { fonte: 'TSE: locais de votação', traz: 'Escola, bairro e coordenadas de cada local', nivel: 'Seção', acesso: [['Portal de Dados Abertos', PORTAL_TSE], ['SHA-512 conferido', SHA]] },
  { fonte: 'TSE: resultado oficial por seção', traz: 'Detalhe da votação e votos de cada candidato em cada seção (Presidente)', nivel: 'Seção', acesso: [['Portal de Dados Abertos', PORTAL_TSE]] },
  { fonte: 'TSE: códigos de municípios', traz: 'Tabela oficial TSE ↔ IBGE', nivel: 'Município', acesso: [['Portal de Dados Abertos', PORTAL_TSE]] },
  { fonte: 'IBGE: Censo 2022 e PIB dos Municípios', traz: 'Renda, cor ou raça, religião, urbanização, PIB', nivel: 'Município', acesso: [['API de agregados do IBGE', AGREGADOS_IBGE]] },
  { fonte: 'MDS: Bolsa Família (ago/2026)', traz: 'Pessoas beneficiárias', nivel: 'Município', acesso: [['MI Social (MDS)', MI_SOCIAL]] },
  { fonte: 'MDIC: Comex Stat (2024)', traz: 'Exportações por município, para os EUA e no total', nivel: 'Município', acesso: [['API do Comex Stat', 'https://api-comexstat.mdic.gov.br/docs']] },
  { fonte: 'IBGE: malhas territoriais', traz: 'Fronteiras de municípios e estados', nivel: 'Município e UF', acesso: [['API de malhas do IBGE', MALHAS_IBGE]] },
]

const COMANDOS = `pip install -r requirements.txt
python pipeline/01_baixar_tse.py          # dados do TSE, com SHA-512 conferido
python pipeline/02_recortar_capital.py
python pipeline/04_base_nacional.py
python pipeline/09_totalizacao_oficial.py # resultado oficial por seção (conferência)
python pipeline/03_validar_controle.py    # tem que passar
python pipeline/05_hlm_nulo.py            # modelo de três níveis
python pipeline/06_contexto_municipal.py
python pipeline/10_hlm_stepup.py          # modelos explicativos (--bootstrap 100 para os intervalos)
python pipeline/11_espacial.py            # Moran, LISA, regiões de voto, degrau x rampa
python pipeline/12_tarifaco.py            # extensão: exposição ao tarifaço (API do Comex Stat)
python pipeline/08_historia.py            # números do Entenda
python pipeline/07_exportar_site.py       # dados do site (com a trava das contas da ferramenta)`

/** Os blocos da página, na ordem. O `?sec=` abre direto num deles, já com o detalhe técnico aberto. */
const BLOCOS: [string, string][] = [
  ['simples', 'O site em uma tela'],
  ['fontes', 'De onde vêm os números'],
  ['contas', 'As contas da ferramenta'],
  ['modelo', 'As camadas de uma urna'],
  ['explicacoes', 'Por que os estados votam diferente'],
  ['espaco', 'O voto pelo mapa'],
  ['numeros', 'As contas do Entenda'],
  ['dados', 'Dados para baixar'],
  ['reproduzir', 'Refazer e limites'],
]
const TITULO_BLOCO = Object.fromEntries(BLOCOS)

/** Do nome simples, usado no site, ao nome técnico, para quem lê o detalhe ou o código; e o bloco onde ele aparece. */
const NOMES: [string, string, string?][] = [
  ['escola', 'local de votação (cadastro de locais do TSE)', 'fontes'],
  ['urna', 'seção eleitoral; o boletim de urna é o resultado dela', 'fontes'],
  ['quem faltou', 'abstenção: aptos − comparecimento', 'contas'],
  ['votos em aberto', 'votos em outros candidatos + brancos + nulos', 'contas'],
  ['saldo possível', 'faltosos × margem do candidato na escola, só onde ela é positiva, somado escola por escola', 'contas'],
  ['votos abaixo do esperado', 'resíduo negativo (resultado − previsto pelo modelo) × votos válidos', 'contas'],
  ['as camadas (“vem do estado, da cidade, da urna”)', 'modelo multinível de três níveis, no logit; correlação intraclasse (ICC)', 'modelo'],
  ['quanto o estado empurra o voto', 'efeito aleatório do estado (BLUP), convertido para pontos', 'modelo'],
  ['o que explica a camada do estado', 'queda da variância do nível estado entre modelos; valor de Shapley', 'explicacoes'],
  ['dentro da cidade e entre cidades', 'decomposição de Mundlak (variável centrada na média do município, ao lado da média)', 'explicacoes'],
  ['bem acima da média', 'um desvio-padrão acima', 'explicacoes'],
  ['vizinhos se parecem mais que o acaso', 'autocorrelação espacial (I de Moran)', 'espaco'],
  ['bolsões', 'LISA significativo a 5%', 'espaco'],
  ['regiões de voto', 'regionalização SKATER', 'espaco'],
  ['degrau ou rampa', 'efeito do estado ao lado de um processo gaussiano nas coordenadas', 'espaco'],
  ['pontos', 'pontos percentuais (1 ponto = 1 voto em cada 100 votos válidos)'],
]

/** A camada do estado repartida entre o perfil das cidades, a região e o perfil de quem vota (média de todas as ordens). */
function reparticao(e: Explicacao, n: '13' | '22') {
  const b = e.stepup.candidatos[n].shapley.uf.com_regiao.blocos
  return { cidades: b.renda_economia + b.cor_raca + b.religiao + b.urbanizacao, regiao: b.regiao, urnas: b.idade_sexo + b.escolaridade }
}

/**
 * Método e dados: tudo o que é técnico, num lugar só. Cada bloco segue o padrão de `BlocoTecnico` (pergunta, resposta curta,
 * como funciona e, fechado, o detalhe técnico). Reúne o que eram o Método, a página Dados, o técnico da Conferência e a
 * análise completa (docs/plano_reorganizacao.md, 5.8).
 */
export function Metodo() {
  const { dados: resumo } = useResumo()
  const { dados: historia } = useHistoria()
  const { dados: explicacao } = useExplicacao()
  const { dados: conferencia } = useConferencia()
  const [escolhido, definirCandidato] = useCandidato()
  const candidato: NumeroCandidato = escolhido ?? 13
  const n = String(candidato) as '13' | '22'
  const cand = CANDIDATOS[candidato]
  const [params] = useSearchParams()
  const sec = params.get('sec')
  const pronto = Boolean(resumo && historia && explicacao && conferencia)
  const rep = explicacao ? reparticao(explicacao, n) : null

  useEffect(() => {
    if (pronto && sec) document.getElementById(`m-${sec}`)?.scrollIntoView({ block: 'start' })
  }, [pronto, sec])

  const seletor = <SeletorCandidato valor={candidato} aoMudar={definirCandidato} rotulo="Números e gráficos pelo voto em" />

  return (
    <div className="conteudo">
      <section className="heroi" style={{ paddingBottom: 8 }}>
        <div className="rotulo-pequeno">Método e dados</div>
        <h1>Como os números foram feitos</h1>
        <p className="secundario">
          Tudo o que é técnico no site está aqui, em nove blocos. Cada um começa com uma pergunta e uma resposta curta, para
          qualquer pessoa; depois vem como funciona; por fim, fechado, o detalhe técnico, para quem quer conferir. O código de
          cada etapa está no <a href={REPOSITORIO}>repositório</a>.
        </p>
      </section>
      <nav className="sumario" aria-label="Nesta página">
        {BLOCOS.map(([id, titulo]) => (
          <Link key={id} to={`/metodo?sec=${id}`} replace>
            {titulo}
          </Link>
        ))}
      </nav>
      {seletor}

      {resumo && historia && explicacao && conferencia && rep ? (
        <>
          <BlocoTecnico id="m-simples" pergunta="Como o site foi feito, em uma tela?" aberto={sec === 'simples'}
            resposta={
              <>
                Com dados públicos, conferidos antes de qualquer conta:{' '}
                {conferencia.brasil.conferem === conferencia.brasil.secoes
                  ? `todas as ${inteiro(conferencia.brasil.secoes)} urnas do 1º turno de 2026 são idênticas`
                  : `${inteiro(conferencia.brasil.conferem)} das ${inteiro(conferencia.brasil.secoes)} urnas do 1º turno de 2026 são idênticas`}{' '}
                ao resultado oficial do TSE. Sobre essa base vêm as contas da ferramenta e a análise.
              </>
            }
            comoFunciona={<ComoFoiFeito resumo={resumo} conferencia={conferencia} explicacao={explicacao} candidato={candidato} />}>
            <h3>Do nome simples ao nome técnico</h3>
            <p>O site usa palavras do dia a dia. Para quem vai ler o detalhe técnico ou o código, esta é a correspondência:</p>
            <TabelaRolagem rotulo="Do nome simples ao nome técnico">
              <table>
                <thead>
                  <tr>
                    <th>No site</th>
                    <th>Nome técnico</th>
                    <th>Bloco</th>
                  </tr>
                </thead>
                <tbody>
                  {NOMES.map(([simples, tecnico, bloco]) => (
                    <tr key={simples}>
                      <td>{simples}</td>
                      <td>{tecnico}</td>
                      <td>{bloco ? <Link to={`/metodo?sec=${bloco}`}>{TITULO_BLOCO[bloco]}</Link> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolagem>
          </BlocoTecnico>

          <BlocoTecnico id="m-fontes" pergunta="De onde vêm os números, e como saber se estão certos?" aberto={sec === 'fontes'}
            resposta="Só de bases públicas, baixadas pelo próprio código: TSE, IBGE, MDS e MDIC. Antes de qualquer conta, cada urna foi comparada com o resultado oficial do TSE, em todos os números do boletim."
            comoFunciona={
              <>
                <p>
                  Funciona como conferir um extrato: a soma dos boletins de urna tem de dar o resultado oficial, urna por urna. Foi
                  essa conferência que pegou um detalhe: votos numa candidatura renunciada aparecem no boletim como votos no
                  candidato, mas a contagem oficial os trata como nulos. Sem o ajuste, os percentuais saíam errados na segunda casa
                  decimal.
                </p>
                <p>
                  A conferência roda de novo a cada publicação: se uma única urna divergir, o site não é publicado. Qualquer pessoa
                  pode fazer a sua parte com o boletim impresso da sua urna, em <Link to="/conferencia">Confira sua urna</Link>.
                </p>
              </>
            }>
            <h3>As fontes</h3>
            <p>Só bases públicas, baixadas pelo próprio pipeline:</p>
            <TabelaRolagem rotulo="Fontes dos dados">
              <table>
                <thead>
                  <tr>
                    <th>Fonte</th>
                    <th>O que traz</th>
                    <th>Nível</th>
                    <th>Acesso e conferência</th>
                  </tr>
                </thead>
                <tbody>
                  {FONTES.map((f) => (
                    <tr key={f.fonte}>
                      <td>
                        <strong>{f.fonte}</strong>
                      </td>
                      <td>{f.traz}</td>
                      <td>{f.nivel}</td>
                      <td>
                        {f.acesso.map(([rotulo, url], i) => (
                          <span key={url}>
                            {i > 0 && '; '}
                            <a href={url}>{rotulo}</a>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolagem>
            <h3>Tratamentos que mudam resultados</h3>
            <ul>
              <li>
                <strong>Nulo técnico:</strong> votos em candidaturas renunciadas ou indeferidas aparecem como nominais no boletim
                de urna, mas a totalização oficial os conta como nulos.
              </li>
              <li>
                <strong>Local de votação:</strong> em 1,3% das seções o boletim traz o número de um local substituído; vale o do
                cadastro de locais.
              </li>
              <li>
                <strong>Raça/cor</strong> fica fora do nível da seção (84% do cadastro do TSE está como “não informado”) e entra
                pelo Censo, no município.
              </li>
            </ul>
            <h3>A conferência da base</h3>
            <p>Antes de qualquer análise, um teste automático confere a base contra fontes independentes:</p>
            <ul>
              <li>
                Os 7 totais de São Paulo para Presidente (seções, aptos, comparecimento, abstenção, válidos, brancos e nulos)
                batem <strong>exatamente</strong> com o Relatório de Resultado da Totalização do TSE.
              </li>
              <li>Os 4 percentuais da 1ª Zona (Bela Vista) para Presidente e Governador batem com o mapa de apuração do g1.</li>
              <li>
                Cada uma das {inteiro(conferencia.brasil.secoes)} seções é idêntica ao resultado oficial da seção publicado pelo
                TSE.
              </li>
            </ul>
            <p>
              Foi essa conferência que pegou o nulo técnico: sem o ajuste, os percentuais saíam errados na segunda casa decimal. O
              teste roda a cada publicação do site, no GitHub Actions.
            </p>
            <h3>Urna por urna: o que foi comparado</h3>
            <p>
              Duas publicações do TSE no <a href={PORTAL_TSE}>Portal de Dados Abertos</a>, comparadas urna por urna:
            </p>
            <ul>
              <li>
                <strong>Os boletins de urna</strong> de cada seção, com a assinatura digital (SHA-512) conferida com a publicada
                pelo tribunal. É a base de todo este site.
              </li>
              <li>
                <strong>O resultado oficial por seção</strong> (detalhe da votação e votação por seção), que é o que a
                totalização soma para chegar ao resultado da eleição.
              </li>
            </ul>
            <p>
              Em cada seção, conferimos {conferencia.campos_conferidos.join(', ')}. Os eleitores no exterior ficam fora, como no
              resto do site. Uma candidatura a Presidente foi renunciada, mas o número dela continuou recebendo votos na urna:
              esses votos aparecem no boletim, e a totalização os conta como nulos (o nulo técnico). A tabela oficial por seção
              mostra os nulos da urna e esses votos separados; somadas as duas partes, todas as seções batem.
            </p>
            <h3>Para refazer a conferência</h3>
            <p>
              O script{' '}
              <a href={`${REPOSITORIO}/blob/main/pipeline/09_totalizacao_oficial.py`}>
                <code>09_totalizacao_oficial.py</code>
              </a>{' '}
              monta o resultado oficial por seção e o{' '}
              <a href={`${REPOSITORIO}/blob/main/pipeline/03_validar_controle.py`}>
                <code>03_validar_controle.py</code>
              </a>{' '}
              compara as {inteiro(conferencia.brasil.secoes)} urnas campo a campo. Essa comparação roda automaticamente a cada
              publicação do site: se uma única urna divergir, o site não é publicado.
            </p>
          </BlocoTecnico>

          <BlocoTecnico id="m-contas" pergunta="Como são feitas as contas da ferramenta?" aberto={sec === 'contas'}
            resposta={
              <>
                São três contas separadas, feitas escola por escola com o resultado oficial do 1º turno e somadas para a cidade, o
                estado e o Brasil. No Brasil, {milhoes(resumo.totais.abstencoes)} de pessoas faltaram, e{' '}
                {milhoes(resumo.ufs.reduce((s, u) => s + u.abertos, 0))} de votos foram para outros candidatos, brancos ou nulos.
              </>
            }
            comoFunciona={
              <>
                <p>
                  A conta é a mesma para os dois candidatos. Somar escola por escola importa: num estado onde um candidato perdeu,
                  ainda há escolas onde ele ganhou. Calculado com o total do estado, o saldo de quem faltou daria zero ali; somado
                  escola por escola, aparece.
                </p>
                <p>
                  Antes de publicar, um teste confere que as somas fecham entre escolas, cidades e estados, e que quem faltou bate
                  com as abstenções oficiais. Se algo não fechar, nada é publicado. O que cada número quer dizer, e o que ele não
                  diz, está no guia <Link to="/como-usar?ir=conversas">Como usar</Link>.
                </p>
              </>
            }>
            <MetodoVirar resumo={resumo} />
          </BlocoTecnico>

          <BlocoTecnico id="m-modelo" pergunta="De onde vem cada parte do resultado de uma urna?" aberto={sec === 'modelo'}
            resposta={
              <>
                No voto em {cand.nome}, da diferença entre as urnas do país, {pct(resumo.modelos[n].icc.UF, 0)} vem do estado onde
                elas ficam, {pct(resumo.modelos[n].icc.município, 0)} da cidade e {pct(resumo.modelos[n].icc.seção, 0)} da própria
                urna.
              </>
            }
            comoFunciona={
              <p>
                É o <Link to="/entenda?ir=lugar">jogo de adivinhar uma urna</Link>: saber o estado já reduz muito o erro do
                palpite; saber a cidade, mais um pouco; o que sobra é da própria urna. O modelo faz essa conta para todas as urnas
                de uma vez, e a página de cada urna mostra as suas camadas: o Brasil, quanto o estado empurra, quanto a cidade
                empurra e o que é só dela.
              </p>
            }>
            {seletor}
            <h3>A pergunta e a unidade</h3>
            <p>
              Quanto do resultado de uma urna vem do estado, do município e da própria seção? Para responder, a unidade de análise
              é a <strong>seção eleitoral</strong>, ou seja, a urna: a menor unidade com resultado oficial público. São{' '}
              {inteiro(resumo.totais.secoes)} urnas no 1º turno presidencial de 2026, em {inteiro(resumo.totais.municipios)}{' '}
              municípios e 27 unidades da federação. Eleitores no exterior ficam fora, porque não têm município nem estado.
            </p>
            <h3>O modelo de três níveis</h3>
            <p>
              Urnas do mesmo município se parecem, e municípios do mesmo estado também. Uma regressão comum trataria cada urna
              como independente e misturaria as camadas. Um modelo multinível (ou hierárquico) estima quanto da variação está em
              cada nível. Para a seção <em>i</em> do município <em>j</em> no estado <em>k</em>:
            </p>
            <pre className="cartao" tabIndex={0} aria-label="Fórmula do modelo" style={{ overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: '0.9375rem' }}>
              logit(p<sub>ijk</sub>) = γ<sub>000</sub> + u<sub>k</sub> + u<sub>jk</sub> + e<sub>ijk</sub>
            </pre>
            <p>
              em que <em>p</em> é a proporção de votos do candidato nos válidos, γ<sub>000</sub> é a urna típica do Brasil,{' '}
              <em>u<sub>k</sub></em> é o efeito do estado, <em>u<sub>jk</sub></em> o efeito do município e <em>e<sub>ijk</sub></em> o
              que sobra na seção. O logit mantém o percentual entre 0% e 100%. As camadas de cada urna no site são esses termos
              somados um a um e convertidos de volta para percentual.
            </p>
            <p>
              A parcela de cada nível na variância total é a <strong>correlação intraclasse (ICC)</strong>:
            </p>
            <TabelaRolagem rotulo="Correlação intraclasse por nível">
              <table>
                <thead>
                  <tr>
                    <th>Nível</th>
                    <th className="num">Lula</th>
                    <th className="num">Flávio Bolsonaro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Estado</td>
                    <td className="num">{pct(resumo.modelos['13'].icc.UF)}</td>
                    <td className="num">{pct(resumo.modelos['22'].icc.UF)}</td>
                  </tr>
                  <tr>
                    <td>Município</td>
                    <td className="num">{pct(resumo.modelos['13'].icc.município)}</td>
                    <td className="num">{pct(resumo.modelos['22'].icc.município)}</td>
                  </tr>
                  <tr>
                    <td>Seção</td>
                    <td className="num">{pct(resumo.modelos['13'].icc.seção)}</td>
                    <td className="num">{pct(resumo.modelos['22'].icc.seção)}</td>
                  </tr>
                </tbody>
              </table>
            </TabelaRolagem>
            <p style={{ marginTop: 16 }}>
              A estratégia é a <em>step-up</em>: parte de um modelo sem níveis (regressão comum) e acrescenta um nível por vez. Cada
              passo é testado por razão de verossimilhança com a correção para variância na fronteira (mistura ½χ²₀ + ½χ²₁), porque
              uma variância não pode ser negativa e o teste Z erra justamente nesse limite. Os dois níveis são significativos com
              folga (p &lt; 10⁻¹⁰⁰).
            </p>
            <p>
              A estimação é por máxima verossimilhança com o pacote <code>gpboost</code>, que ajusta o modelo nacional em segundos.
              O mesmo modelo foi reestimado com o <code>statsmodels</code> como validação cruzada: as log-verossimilhanças diferem
              em 0,4 numa escala de 225 mil. A conta do jogo de adivinhar é a versão intuitiva da mesma decomposição, por isso os
              números se parecem mas não são idênticos (o modelo trabalha na escala do logit).
            </p>
            <h3>Quanto cada estado empurra o voto</h3>
            <p className="secundario">
              A estimativa do modelo para cada estado, convertida para pontos, em relação a uma urna típica do Brasil, no voto em{' '}
              {cand.nome}. Passe o mouse ou o dedo sobre as barras.
            </p>
            <EfeitoEstados resumo={resumo} candidato={candidato} />
            <p style={{ marginTop: 16 }}>
              O efeito de cada cidade, em relação ao seu estado, está no <Link to={`/mapa?v=efeito&c=${candidato}`}>mapa</Link>.
            </p>
          </BlocoTecnico>

          <BlocoTecnico id="m-explicacoes" pergunta="Por que os estados votam diferente?" aberto={sec === 'explicacoes'}
            resposta={
              <>
                Mais pelo perfil das cidades e pela região do que por quem vota em cada urna. Da camada do estado no voto em{' '}
                {cand.nome}, o perfil das cidades (renda, cor ou raça, religião, urbanização) explica {pct(rep.cidades, 0)}, a
                região do país, {pct(rep.regiao, 0)}, e a idade, o sexo e a escolaridade de quem vota em cada urna,{' '}
                {pct(rep.urnas, 0)}.
              </>
            }
            comoFunciona={
              <p>
                Um estado pode votar diferente porque a sua população é diferente (mais jovem, mais escolarizada, mais evangélica)
                ou porque o lugar pesa por si. O modelo recebe essas características, um grupo de cada vez, e mede quanto a camada
                do estado encolhe. Como renda e região andam juntas, o crédito de cada grupo é a média de todas as ordens em que
                eles podem entrar. Tudo descreve lugares, não pessoas: urnas com mais diplomados votarem de um jeito não diz como
                votou cada diplomado.
              </p>
            }>
            {seletor}
            <CapituloExplicacoes explicacao={explicacao} resumo={resumo} candidato={candidato} />
            <p style={{ marginTop: 16 }}>
              O que o modelo completo não explica, cidade a cidade, está no{' '}
              <Link to={`/mapa?v=semperfil&c=${candidato}`}>mapa</Link>.
            </p>
            <MetodoModelos e={explicacao} />
          </BlocoTecnico>

          <BlocoTecnico id="m-espaco" pergunta="O voto muda aos poucos pelo mapa?" aberto={sec === 'espaco'}
            resposta={
              <>
                Em boa parte, sim: o voto muda pelo país mais como uma rampa do que em degraus nas divisas dos estados. E o que o
                modelo não explica forma bolsões de cidades vizinhas: no voto em {cand.nome},{' '}
                {inteiro(explicacao.espacial.candidatos[n].completo.lisa['alto cercado de alto'])} cidades em bolsões acima do
                esperado e {inteiro(explicacao.espacial.candidatos[n].completo.lisa['baixo cercado de baixo'])} abaixo.
              </>
            }
            comoFunciona={
              <p>
                Se o voto dependesse só do estado, a divisa seria um muro. Não é: cidades vizinhas se parecem mesmo de lados
                diferentes da divisa, e o degrau que sobra é pequeno. Para achar bolsões, cada cidade é comparada com as vizinhas:
                um bolsão é um grupo de vizinhas que fogem do esperado para o mesmo lado. Dentro das cidades acontece o mesmo, entre
                bairros.
              </p>
            }>
            {seletor}
            <MetodoEspaco e={explicacao} candidato={candidato} />
          </BlocoTecnico>

          <BlocoTecnico id="m-numeros" pergunta="Como foram feitas as contas do Entenda?" aberto={sec === 'numeros'}
            resposta={
              <>
                São contas simples sobre a mesma base, para os dois candidatos: o jogo de adivinhar uma urna, a comparação entre
                cidades vizinhas, as cidades gêmeas, a diferença entre urnas da mesma escola e as cidades que contrariam o próprio
                estado (<Link to="/entenda">Entenda</Link>).
              </>
            }
            comoFunciona={
              <p>
                No jogo de adivinhar, o palpite de cada pista é o resultado somado das outras urnas do grupo: a urna sorteada fica
                de fora da conta, senão seria trapaça. O erro é a distância entre o palpite e o resultado, em pontos. As outras
                contas seguem regras fixas: entram todos os casos que cumprem a regra, sem escolha a dedo.
              </p>
            }>
            {seletor}
            <h3>As regras de cada conta</h3>
            <ul>
              <li>
                <strong>O jogo de adivinhar:</strong> o palpite de cada pista é o resultado somado das outras urnas do grupo (Brasil,
                estado, município ou local de votação), sem a urna adivinhada. Sem outra urna no grupo, vale o palpite anterior. O
                erro médio usa as urnas com {historia.regras.min_validos_urna} votos válidos ou mais.
              </li>
              <li>
                <strong>Vizinhança:</strong> dois municípios são vizinhos quando os territórios se tocam na malha do IBGE
                (contiguidade). A diferença média entre pares quaisquer usa todos os pares possíveis, sem ponderar pelo tamanho. São{' '}
                {inteiro(historia.pares.n_vizinhos_divisa)} pares de vizinhos com uma divisa estadual no meio e{' '}
                {inteiro(historia.pares.n_vizinhos_mesmo_estado)} do mesmo estado.
              </li>
              <li>
                <strong>Cidades gêmeas:</strong> vizinhas, de estados diferentes, com o centro dos locais de votação a menos de{' '}
                {historia.regras.dist_gemeas_km} km e {inteiro(historia.regras.min_validos_gemea)} votos válidos ou mais cada.
              </li>
              <li>
                <strong>Diferença dentro da escola:</strong> entre a urna com mais e a com menos votos no candidato, nos locais com{' '}
                {historia.regras.min_urnas_escola} urnas ou mais.
              </li>
              <li>
                <strong>Municípios que contrariam o estado:</strong> ordenados pelo efeito do município no modelo, entre os que têm{' '}
                {inteiro(historia.regras.min_validos_contraria)} votos válidos ou mais. O modelo puxa para a média os efeitos de
                cidades com poucas urnas, porque ali a estimativa é instável; por isso a lista segue o efeito, não o resultado bruto.
              </li>
              <li>
                <strong>Surpresa de cada urna:</strong> a distância entre o resultado e o esperado pelo modelo para o município,
                comparada com a de todas as urnas do país.
              </li>
            </ul>
            <h3>Cidades gêmeas</h3>
            <p>
              São {historia.resumo_gemeas.n_pares} pares de cidades coladas uma na outra, com uma divisa no meio. No voto em{' '}
              {cand.nome}, as duas cidades diferem em média {pontos(historia.resumo_gemeas[n].dif_cidades)}, quase o mesmo que os
              seus estados ({pontos(historia.resumo_gemeas[n].dif_estados)}). Em {historia.resumo_gemeas[n].mais_perto_da_gemea} das{' '}
              {historia.resumo_gemeas[n].n_cidades} cidades, o resultado fica mais perto da gêmea do outro lado do que da média do
              próprio estado.
            </p>
            <CidadesGemeas historia={historia} resumo={resumo} candidato={candidato} />
            <h3>Urnas da mesma escola</h3>
            <p>
              Até na mesma escola as urnas diferem. Na escola típica com {historia.regras.min_urnas_escola} urnas ou mais, a
              distância entre a urna com mais e a com menos votos em {cand.nome} é de{' '}
              {pontos(historia.escolas[n].amplitude_mediana)}. Em {pct(historia.escolas[n].pct_10pp_ou_mais, 0)} das escolas, passa
              de 10 pontos.
            </p>
          </BlocoTecnico>

          <BlocoTecnico id="m-dados" pergunta="Dá para baixar os dados?" aberto={sec === 'dados'}
            resposta="Sim. Tudo o que o site usa é aberto: os arquivos processados, os resultados dos modelos e os arquivos que o site carrega, com dicionário. São só números somados por urna, escola ou cidade; nenhum dado de eleitor."
            comoFunciona={
              <p>
                Os arquivos ficam no <a href={REPOSITORIO}>repositório do projeto</a>, com licença aberta: dá para copiar, adaptar e
                republicar, citando a fonte. O detalhe lista cada arquivo, o que ele traz e como citar.
              </p>
            }>
            <DadosParaBaixar />
          </BlocoTecnico>

          <BlocoTecnico id="m-reproduzir" pergunta="Como refazer tudo, e o que estes números não dizem?" aberto={sec === 'reproduzir'}
            resposta="Tudo roda em Python, com código aberto: do download dos dados à exportação do site, cada etapa é um comando. E os números descrevem lugares, não pessoas."
            comoFunciona={
              <>
                <p>O que os números não dizem:</p>
                <ul>
                  <li>
                    <strong>Como votou cada pessoa.</strong> Eles descrevem urnas e escolas, não eleitores.
                  </li>
                  <li>
                    <strong>Onde a pessoa mora.</strong> O eleitor vota onde está registrado, que pode não ser perto de casa.
                  </li>
                  <li>
                    <strong>Como será o 2º turno.</strong> Tudo vem do resultado do 1º turno.
                  </li>
                </ul>
              </>
            }>
            <h3>Para reproduzir</h3>
            <p>
              A partir dos arquivos que já estão no repositório (<code>data/processed/</code>), dá para rodar só a validação, os
              modelos e a exportação.
            </p>
            <pre className="cartao" tabIndex={0} aria-label="Comandos para reproduzir (role para os lados)" style={{ overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
              {COMANDOS}
            </pre>
            <h3>Decisões e alternativas descartadas</h3>
            <TabelaRolagem rotulo="Decisões e alternativas descartadas">
              <table>
                <thead>
                  <tr>
                    <th>Escolha</th>
                    <th>Por quê</th>
                    <th>O que ficou de fora</th>
                  </tr>
                </thead>
                <tbody>
                  {DECISOES.map((d) => (
                    <tr key={d.escolha}>
                      <td>
                        <strong>{d.escolha}</strong>
                      </td>
                      <td>{d.porque}</td>
                      <td className="secundario">{d.descartada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolagem>
            <h3>Limitações</h3>
            <ul>
              <li>
                A unidade é a seção, não o eleitor. Os resultados descrevem lugares, não pessoas: dizer que urnas com mais
                diplomados votam de certo jeito não diz como cada diplomado votou (falácia ecológica).
              </li>
              <li>O eleitor vota onde está registrado, não necessariamente onde mora.</li>
              <li>O Censo é de 2022; o eleitorado, de 2026.</li>
              <li>O modelo pesa todas as seções igualmente; o tamanho delas varia pouco (em geral de 200 a 450 eleitores).</li>
              <li>
                Boa Esperança do Norte (MT) foi criado depois do Censo e da malha de 2022: as urnas estão na base, mas o município
                fica fora das comparações entre vizinhos.
              </li>
            </ul>
            <h3>Próximas etapas</h3>
            <ul>
              <li>Depois de 25 de outubro: conferir o 2º turno com o resultado oficial, urna por urna, como no 1º turno.</li>
              <li>Comparar os dois turnos urna por urna, com a mesma decomposição em camadas.</li>
            </ul>
          </BlocoTecnico>

          <section className="bloco-tecnico" id="m-inspiracao" aria-labelledby="m-inspiracao-t">
            <h2 id="m-inspiracao-t">Inspiração metodológica</h2>
            <p>
              A ideia de separar o resultado em camadas (o que é do estado, da cidade e da urna) com um modelo multinível foi
              inspirada num estudo que separou da mesma forma a renda dos domicílios nos estados brasileiros:
            </p>
            <p className="referencia">
              GOMES, E. B. H. de Q.; TARANTIN JUNIOR, W. Efeitos das unidades federativas na renda disponível per capita por
              domicílio: uma análise multinível : Effects of federative units on per capita household disposable income: A
              multilevel analysis. <strong>Quaestum</strong>, [S. l.], v. 6, p. 1–21, 2025. DOI:{' '}
              <a href="https://doi.org/10.22167/2675-441X-2024824">10.22167/2675-441X-2024824</a>. Disponível em:{' '}
              <a href="https://ipecege.emnuvens.com.br/quaestum/article/view/824">https://ipecege.emnuvens.com.br/quaestum/article/view/824</a>.
              Acesso em: 8 out. 2026.
            </p>
            <p>
              <strong>Bastidores.</strong> Este site foi construído por Eduardo Ben Hur com o Claude Code, o assistente de
              programação da Anthropic, do download dos dados à verificação visual de cada página. Cada decisão e cada correção
              estão no <a href={REPOSITORIO}>histórico do repositório</a>.
            </p>
            <div className="acoes" style={{ marginTop: 24 }}>
              <Link className="botao" to={`/${comCandidato(escolhido)}`}>
                Agora, encontre onde conversar
              </Link>
              <Link className="botao botao-secundario" to="/entenda">
                Entenda, sem a parte técnica
              </Link>
            </div>
          </section>
        </>
      ) : (
        <p className="carregando">Carregando…</p>
      )}
    </div>
  )
}
