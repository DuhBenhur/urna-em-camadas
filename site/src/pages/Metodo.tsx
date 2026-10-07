import { useResumo } from '../lib/dados'
import { inteiro, pct } from '../lib/formato'
import { REPOSITORIO } from '../lib/projeto'

export function Metodo() {
  const { dados: resumo } = useResumo()
  const m13 = resumo?.modelos['13']
  const m22 = resumo?.modelos['22']

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Método</h1>
      <p className="secundario">
        Como os dados foram montados, conferidos e modelados. O código de cada etapa está no{' '}
        <a href={REPOSITORIO}>repositório</a>; aqui vai a explicação.
      </p>

      <h2>1. Dados</h2>
      <p>
        A unidade de análise é a <strong>seção eleitoral</strong>, ou seja, a urna. Para cada uma das{' '}
        {resumo ? inteiro(resumo.totais.secoes) : '…'} seções do 1º turno presidencial de 2026 no Brasil, a base junta:
      </p>
      <ul>
        <li>
          <strong>Boletins de urna</strong> das 27 UFs, publicados pelo TSE no Portal de Dados Abertos. O pipeline confere o
          SHA-512 que o próprio tribunal publica para cada arquivo.
        </li>
        <li>
          <strong>Perfil do eleitorado por seção</strong> (TSE): gênero, faixa etária e escolaridade dos eleitores cadastrados.
          Raça/cor fica de fora porque 84% do cadastro está como &quot;não informado&quot;; ela entra pelo Censo, no nível do
          município.
        </li>
        <li>
          <strong>Locais de votação</strong> (TSE), com coordenadas. Em 1,3% das seções o boletim traz o número de um local
          substituído; nesses casos vale o local do cadastro.
        </li>
        <li>
          <strong>Contexto municipal</strong>: Censo 2022 e PIB dos Municípios (IBGE) e Bolsa Família (MDS, agosto de 2026),
          ligados pela tabela oficial de códigos TSE ↔ IBGE.
        </li>
      </ul>
      <p>Eleitores no exterior ficam fora, porque não têm município nem estado para o modelo.</p>

      <h2>2. Validação</h2>
      <p>Antes de qualquer análise, um teste automático confere a base contra fontes independentes:</p>
      <ul>
        <li>
          Totais de São Paulo para Presidente (seções, aptos, comparecimento, abstenção, válidos, brancos e nulos) batem{' '}
          <strong>exatamente</strong> com o Relatório de Resultado da Totalização do TSE.
        </li>
        <li>Os percentuais da 1ª Zona (Bela Vista) para Presidente e Governador batem com o mapa de apuração do g1.</li>
      </ul>
      <p>
        A validação pegou um detalhe que muda resultados: votos em candidaturas renunciadas ou indeferidas aparecem como
        nominais no boletim de urna, mas a totalização oficial os conta como <em>nulo técnico</em>. Sem esse ajuste, os
        percentuais ficam errados na segunda casa decimal.
      </p>

      <h2>3. O modelo de três níveis</h2>
      <p>
        Urnas do mesmo município se parecem, e municípios do mesmo estado também. Um modelo multinível (ou hierárquico) estima
        quanto da variação está em cada nível. Para a seção <em>i</em> do município <em>j</em> no estado <em>k</em>:
      </p>
      <pre className="cartao" style={{ overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
        logit(p<sub>ijk</sub>) = γ<sub>000</sub> + u<sub>k</sub> + u<sub>jk</sub> + e<sub>ijk</sub>
      </pre>
      <p>
        em que <em>p</em> é a proporção de votos do candidato nos válidos, γ<sub>000</sub> é a urna típica do Brasil,{' '}
        <em>u<sub>k</sub></em> é o efeito do estado, <em>u<sub>jk</sub></em> o efeito do município e <em>e<sub>ijk</sub></em> o
        que sobra na seção. As camadas de cada urna no site são esses termos somados um a um e convertidos de volta para
        percentual.
      </p>
      <p>
        A parcela de cada nível na variância total é a <strong>correlação intraclasse (ICC)</strong>:
      </p>
      {m13 && m22 && (
        <div className="tabela-rolagem">
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
        </div>
      )}
      <p>
        A estratégia é a <em>step-up</em>: parte de um modelo sem níveis (regressão comum) e acrescenta um nível por vez. Cada
        passo é testado por razão de verossimilhança com a correção para variância na fronteira (mistura ½χ²₀ + ½χ²₁). Os dois
        níveis são significativos com folga (p &lt; 10⁻¹⁰⁰).
      </p>
      <p>
        A estimação é por máxima verossimilhança com o pacote <code>gpboost</code>, que ajusta o modelo nacional em segundos.
        O mesmo modelo foi reestimado com o <code>statsmodels</code> como validação cruzada: as log-verossimilhanças diferem em
        0,4 numa escala de 225 mil.
      </p>

      <h2>4. Próximas etapas</h2>
      <ul>
        <li>Variáveis de cada nível: perfil do eleitorado (seção); renda, cor ou raça, religião, Bolsa Família (município); variáveis estaduais.</li>
        <li>Inclinações aleatórias: o efeito da escolaridade muda de estado para estado?</li>
        <li>Autocorrelação espacial (Moran, LISA) nos efeitos dos municípios e regionalização espacial.</li>
        <li>Previsão do 2º turno por seção, pré-registrada antes de 25 de outubro e publicada só depois da eleição, com a conferência dos acertos.</li>
      </ul>

      <h2>5. Limitações</h2>
      <ul>
        <li>
          A unidade é a seção, não o eleitor. Os resultados descrevem lugares, não pessoas: dizer que urnas com mais diplomados
          votam de certo jeito não diz como cada diplomado votou (falácia ecológica).
        </li>
        <li>O eleitor vota onde está registrado, não necessariamente onde mora.</li>
        <li>O Censo é de 2022; o eleitorado, de 2026.</li>
        <li>O modelo pesa todas as seções igualmente; o tamanho delas varia pouco (em geral de 200 a 450 eleitores).</li>
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
