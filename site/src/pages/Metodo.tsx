import { Link } from 'react-router-dom'
import { MetodoExplicativo } from '../components/MetodoExplicativo'
import { MetodoVirar } from '../components/MetodoVirar'
import { useExplicacao, useHistoria, useResumo } from '../lib/dados'
import { DECISOES } from '../lib/decisoes'
import { inteiro, pct } from '../lib/formato'
import { REPOSITORIO } from '../lib/projeto'
import { TabelaRolagem } from '../components/TabelaRolagem'

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
python pipeline/08_historia.py            # números da análise
python pipeline/07_exportar_site.py       # dados do site`

export function Metodo() {
  const { dados: resumo } = useResumo()
  const { dados: historia } = useHistoria()
  const { dados: explicacao } = useExplicacao()
  const m13 = resumo?.modelos['13']
  const m22 = resumo?.modelos['22']
  const regras = historia?.regras
  // seções numeradas a partir dos números da análise (5 sem os modelos explicativos, 7 com eles)
  const n = explicacao ? 7 : 5

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Método</h1>
      <p className="secundario">
        Como os dados foram obtidos, conferidos e modelados, e por que cada escolha foi feita. A versão curta está no capítulo
        “Como foi feito” da <Link to="/analise?cap=c-bastidores">análise</Link>. O código de cada etapa está no{' '}
        <a href={REPOSITORIO}>repositório</a>.
      </p>

      <h2>1. A pergunta e a unidade</h2>
      <p>
        Quanto do resultado de uma urna vem do estado, do município e da própria seção? Para responder, a unidade de análise é
        a <strong>seção eleitoral</strong>, ou seja, a urna: a menor unidade com resultado oficial público. São{' '}
        {resumo ? inteiro(resumo.totais.secoes) : '…'} urnas no 1º turno presidencial de 2026, em{' '}
        {resumo ? inteiro(resumo.totais.municipios) : '…'} municípios e 27 unidades da federação. Eleitores no exterior ficam
        fora, porque não têm município nem estado.
      </p>

      <h2>2. De onde vêm os dados</h2>
      <p>Só bases públicas, baixadas pelo próprio pipeline:</p>
      <TabelaRolagem>
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
      <p style={{ marginTop: 16 }}>Tratamentos que mudam resultados:</p>
      <ul>
        <li>
          <strong>Nulo técnico:</strong> votos em candidaturas renunciadas ou indeferidas aparecem como nominais no boletim de
          urna, mas a totalização oficial os conta como nulos.
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

      <h2>3. A conferência</h2>
      <p>Antes de qualquer análise, um teste automático confere a base contra fontes independentes:</p>
      <ul>
        <li>
          Os 7 totais de São Paulo para Presidente (seções, aptos, comparecimento, abstenção, válidos, brancos e nulos) batem{' '}
          <strong>exatamente</strong> com o Relatório de Resultado da Totalização do TSE.
        </li>
        <li>Os 4 percentuais da 1ª Zona (Bela Vista) para Presidente e Governador batem com o mapa de apuração do g1.</li>
        <li>
          Cada uma das {resumo ? inteiro(resumo.totais.secoes) : '…'} seções é idêntica ao resultado oficial da seção publicado
          pelo TSE, em aptos, comparecimento, abstenções, brancos, nulos e votos de cada candidato. Detalhes na{' '}
          <Link to="/conferencia">Conferência</Link>.
        </li>
      </ul>
      <p>
        Foi essa conferência que pegou o nulo técnico: sem o ajuste, os percentuais saíam errados na segunda casa decimal. O
        teste roda a cada publicação do site, no GitHub Actions.
      </p>

      <h2>4. O modelo de três níveis</h2>
      <p>
        Urnas do mesmo município se parecem, e municípios do mesmo estado também. Uma regressão comum trataria cada urna como
        independente e misturaria as camadas. Um modelo multinível (ou hierárquico) estima quanto da variação está em cada
        nível. Para a seção <em>i</em> do município <em>j</em> no estado <em>k</em>:
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
      {m13 && m22 && (
        <TabelaRolagem>
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
                <td className="num">{pct(m13.icc.UF)}</td>
                <td className="num">{pct(m22.icc.UF)}</td>
              </tr>
              <tr>
                <td>Município</td>
                <td className="num">{pct(m13.icc.município)}</td>
                <td className="num">{pct(m22.icc.município)}</td>
              </tr>
              <tr>
                <td>Seção</td>
                <td className="num">{pct(m13.icc.seção)}</td>
                <td className="num">{pct(m22.icc.seção)}</td>
              </tr>
            </tbody>
          </table>
        </TabelaRolagem>
      )}
      <p style={{ marginTop: 16 }}>
        A estratégia é a <em>step-up</em>: parte de um modelo sem níveis (regressão comum) e acrescenta um nível por vez. Cada
        passo é testado por razão de verossimilhança com a correção para variância na fronteira (mistura ½χ²₀ + ½χ²₁), porque
        uma variância não pode ser negativa e o teste Z erra justamente nesse limite. Os dois níveis são significativos com
        folga (p &lt; 10⁻¹⁰⁰).
      </p>
      <p>
        A estimação é por máxima verossimilhança com o pacote <code>gpboost</code>, que ajusta o modelo nacional em segundos.
        O mesmo modelo foi reestimado com o <code>statsmodels</code> como validação cruzada: as log-verossimilhanças diferem em
        0,4 numa escala de 225 mil.
      </p>

      {explicacao && <MetodoExplicativo e={explicacao} />}

      <h2>{n}. Os números da análise</h2>
      <p>
        São contas descritivas, feitas por <code>pipeline/08_historia.py</code> sobre a mesma base, para os dois candidatos.
      </p>
      <ul>
        <li>
          <strong>O jogo de adivinhar:</strong> o palpite de cada pista é o resultado somado das outras urnas do grupo (Brasil,
          estado, município ou local de votação), sem a urna adivinhada. Sem outra urna no grupo, vale o palpite anterior. O
          erro médio usa as urnas com {regras ? regras.min_validos_urna : '…'} votos válidos ou mais.
        </li>
        <li>
          <strong>Vizinhança:</strong> dois municípios são vizinhos quando os territórios se tocam na malha do IBGE
          (contiguidade). A diferença média entre pares quaisquer usa todos os pares possíveis, sem ponderar pelo tamanho.
        </li>
        <li>
          <strong>Cidades gêmeas:</strong> vizinhas, de estados diferentes, com o centro dos locais de votação a menos de{' '}
          {regras ? regras.dist_gemeas_km : '…'} km e {regras ? inteiro(regras.min_validos_gemea) : '…'} votos válidos ou
          mais cada. A regra é fixa: entram todos os pares que a cumprem.
        </li>
        <li>
          <strong>Diferença dentro da escola:</strong> entre a urna com mais e a com menos votos no candidato, nos locais com{' '}
          {regras ? regras.min_urnas_escola : '…'} urnas ou mais.
        </li>
        <li>
          <strong>Municípios que contrariam o estado:</strong> ordenados pelo efeito do município no modelo, entre os que têm{' '}
          {regras ? inteiro(regras.min_validos_contraria) : '…'} votos válidos ou mais.
        </li>
        <li>
          <strong>Surpresa de cada urna:</strong> a distância entre o resultado e o esperado pelo modelo para o município,
          comparada com a de todas as urnas do país.
        </li>
      </ul>

      <MetodoVirar numero={n + 1} resumo={resumo} />

      <h2>{n + 2}. Decisões e alternativas descartadas</h2>
      <TabelaRolagem>
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

      <h2>{n + 3}. Para reproduzir</h2>
      <p>
        Tudo roda em Python. A partir dos arquivos que já estão no repositório (<code>data/processed/</code>), dá para rodar só
        a validação, os modelos e a exportação.
      </p>
      <pre className="cartao" tabIndex={0} aria-label="Comandos para reproduzir (role para os lados)" style={{ overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
        {COMANDOS}
      </pre>

      <h2>{n + 4}. Próximas etapas</h2>
      <ul>
        <li>Depois de 25 de outubro: conferir o 2º turno com o resultado oficial, urna por urna, como no 1º turno.</li>
        <li>Comparar os dois turnos urna por urna, com a mesma decomposição em camadas.</li>
      </ul>

      <h2>{n + 5}. Limitações</h2>
      <ul>
        <li>
          A unidade é a seção, não o eleitor. Os resultados descrevem lugares, não pessoas: dizer que urnas com mais diplomados
          votam de certo jeito não diz como cada diplomado votou (falácia ecológica).
        </li>
        <li>O eleitor vota onde está registrado, não necessariamente onde mora.</li>
        <li>O Censo é de 2022; o eleitorado, de 2026.</li>
        <li>O modelo pesa todas as seções igualmente; o tamanho delas varia pouco (em geral de 200 a 450 eleitores).</li>
        <li>Boa Esperança do Norte (MT) foi criado depois do Censo e da malha de 2022: as urnas estão na base, mas o município fica fora das comparações entre vizinhos.</li>
      </ul>

      <h2>Origem</h2>
      <p>
        Este projeto continua o desenho de Gomes e Tarantin Junior,{' '}
        <a href="https://doi.org/10.22167/2675-441X-2024824">
          <em>Efeitos das unidades federativas na renda disponível per capita por domicílio: uma análise multinível</em>
        </a>{' '}
        (Quaestum, 2025), que aplicou a mesma estratégia a domicílios dentro dos estados.
      </p>
    </div>
  )
}
