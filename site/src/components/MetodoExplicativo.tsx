import { Link } from 'react-router-dom'
import type { Explicacao } from '../lib/dados'
import { inteiro, pct } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { TabelaRolagem } from './TabelaRolagem'

const ROTULOS_SEQUENCIA: Record<string, string> = {
  'M0 nulo': 'M0: sem explicações',
  'M1 perfil da seção': 'M1: + perfil da seção',
  'M2 + perfil do município': 'M2: + perfil do município',
  'M3 + região': 'M3: + região',
}
const TESTES: Record<string, string> = { 'M1 perfil da seção': 'M0 → M1', 'M2 + perfil do município': 'M1 → M2', 'M3 + região': 'M2 → M3' }
const num = (v: number, casas = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const valorP = (p: number) => (p < 1e-15 ? '< 10⁻¹⁵' : p < 0.001 ? '< 0,001' : num(p, 3))

/** Detalhe técnico dos modelos explicativos (pipeline/10), para os dois candidatos: o bloco "Por que os estados votam diferente". */
export function MetodoModelos({ e }: { e: Explicacao }) {
  const c13 = e.stepup.candidatos['13']
  const c22 = e.stepup.candidatos['22']
  const pca = e.stepup.pca_socioeconomico

  return (
    <>
      <h3>Os modelos, passo a passo</h3>
      <p>
        A mesma estrutura do modelo nulo recebe grupos de características, um de cada vez (estratégia <em>step-up</em>), em{' '}
        {inteiro(e.stepup.n_secoes)} seções de {inteiro(e.stepup.n_municipios)} municípios. Ficam de fora as seções sem perfil do
        eleitorado publicado e Boa Esperança do Norte (MT), sem dados do Censo. A parte explicada de cada nível é quanto a
        variância dele cai em relação ao modelo sem explicações.
      </p>
      <TabelaRolagem>
        <table>
          <thead>
            <tr>
              <th>Modelo</th>
              <th className="num">Lula: variância do estado</th>
              <th className="num">Queda</th>
              <th className="num">Flávio: variância do estado</th>
              <th className="num">Queda</th>
              <th className="num">Teste (Lula)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(ROTULOS_SEQUENCIA).map((k) => (
              <tr key={k}>
                <td>{ROTULOS_SEQUENCIA[k]}</td>
                <td className="num">{num(c13.sequencia[k].uf, 3)}</td>
                <td className="num">{k === 'M0 nulo' ? '—' : pct(c13.sequencia[k].queda.uf, 0)}</td>
                <td className="num">{num(c22.sequencia[k].uf, 3)}</td>
                <td className="num">{k === 'M0 nulo' ? '—' : pct(c22.sequencia[k].queda.uf, 0)}</td>
                <td className="num">
                  {TESTES[k] ? `χ² = ${inteiro(Math.round(c13.testes[TESTES[k]].LR))}, p ${valorP(c13.testes[TESTES[k]].p)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolagem>
      <p style={{ marginTop: 16 }}>
        <strong>Repartição sem depender da ordem.</strong> Os grupos se sobrepõem (região e renda andam juntas), então a queda
        atribuída a cada um depende de quando ele entra. O valor de Shapley faz a média da contribuição de cada grupo em todas as
        ordens possíveis: com 7 grupos, são 2⁷ = 128 modelos por candidato, todos ajustados.
      </p>
      <p>
        <strong>Índice socioeconômico.</strong> Renda média per capita (log), PIB per capita (log) e o % da população no Bolsa
        Família têm correlações de até −0,91. No gráfico de efeitos, entram como o 1º componente principal das três (cargas{' '}
        {Object.entries(pca.cargas)
          .map(([k, v]) => `${k.replace('log_renda', 'renda').replace('log_pib', 'PIB').replace('pct_pbf', 'Bolsa Família')} ${num(v)}`)
          .join(', ')}
        ), que resume {pct(pca.variancia_explicada, 0)} da variação conjunta. Na repartição de Shapley, as três ficam no mesmo
        grupo. “Bem acima da média”, nos gráficos, é um desvio-padrão acima: mais alto que cerca de 5 em cada 6 lugares.
      </p>
      <p>
        <strong>Dentro e entre cidades.</strong> No modelo de Mundlak, cada variável da seção entra centrada na média do
        município, ao lado dessa média: o primeiro coeficiente compara urnas da mesma cidade; o segundo, cidades entre si. Os
        coeficientes de dentro da cidade formam a camada “perfil do eleitorado” da página de cada urna.
      </p>
      <p>
        <strong>Escolaridade por estado e interações.</strong> A escolaridade da seção entra como um índice (% com superior
        completo menos % até o fundamental incompleto; correlação de −0,67 entre os dois). Uma inclinação aleatória deixa o
        efeito dela variar por estado (Lula: χ² = {inteiro(Math.round(c13.inclinacao_escolaridade.LR))}, p {valorP(c13.inclinacao_escolaridade.p)}, com a
        correção de fronteira). As interações com a região e com o índice socioeconômico mostram onde o efeito é maior (Lula: χ² ={' '}
        {inteiro(Math.round(c13.interacoes.LR))} com {c13.interacoes.gl} graus de liberdade).
      </p>
      <p>
        <strong>Quatro níveis.</strong> Com o local de votação entre a seção e o município, a variação do voto em Lula se divide em
        estado {pct(c13.quatro_niveis.icc.uf, 0)}, município {pct(c13.quatro_niveis.icc.mun, 0)}, local de votação{' '}
        {pct(c13.quatro_niveis.icc.local, 0)} e seção {pct(c13.quatro_niveis.icc.secao, 0)}; a do voto em Flávio, em{' '}
        {pct(c22.quatro_niveis.icc.uf, 0)}, {pct(c22.quatro_niveis.icc.mun, 0)}, {pct(c22.quatro_niveis.icc.local, 0)} e{' '}
        {pct(c22.quatro_niveis.icc.secao, 0)}: boa parte do que parecia ser da seção é do bairro.
      </p>
      <p>
        <strong>Robustez.</strong> O modelo completo explica {pct(c13.sequencia['M3 + região'].queda.uf, 0)} da variância do estado
        para Lula. Na escala de proporção, sem o logit, {pct(c13.robustez.escala_proporcao.queda!.uf, 0)}; só com seções de 100 ou
        mais votos válidos, {pct(c13.robustez.secoes_100_validos.queda!.uf, 0)}. A verossimilhança binomial do <code>gpboost</code>{' '}
        não saiu dos valores iniciais nesta escala e foi descartada.
        {c13.bootstrap && (
          <>
            {' '}
            Reamostrando os estados dentro de cada região ({c13.bootstrap.repeticoes} vezes), o intervalo de 95% da parte explicada pelo modelo completo
            vai de {pct(c13.bootstrap.queda_uf.M3[0], 0)} a {pct(c13.bootstrap.queda_uf.M3[1], 0)} (Lula).
          </>
        )}
      </p>

      {e.tarifaco && (
        <p>
          <strong>Tarifaço (extensão).</strong> Registrada depois do desenho dos modelos: a exposição de cada município ao tarifaço
          dos EUA, medida como log(1 + exportações para os EUA por habitante, em US$ de {e.tarifaco.ano_exportacoes}), pela API
          do Comex Stat, entra no modelo de efeitos. {inteiro(e.tarifaco.municipios_exportam_eua)} municípios exportaram para os
          EUA; os demais ficam com zero. Lula: χ² = {num(e.tarifaco.candidatos['13'].LR, 1)} (p {valorP(e.tarifaco.candidatos['13'].p)});
          Flávio: χ² = {num(e.tarifaco.candidatos['22'].LR, 1)} (p {valorP(e.tarifaco.candidatos['22'].p)}). Em nenhum dos dois a
          variância do estado cai.
        </p>
      )}
    </>
  )
}

/**
 * Detalhe técnico do espaço (pipeline/11): o bloco "O voto muda aos poucos pelo mapa?". Junta o que era o capítulo da
 * vizinhança e os bolsões da análise com a seção de espaço do método, para os dois candidatos.
 */
export function MetodoEspaco({ e, candidato }: { e: Explicacao; candidato: NumeroCandidato }) {
  const esp = e.espacial
  const n = String(candidato) as '13' | '22'
  const c = esp.candidatos[n]
  const cand = CANDIDATOS[candidato]
  const regioes = esp.regioes
  const sp = esp.sao_paulo

  return (
    <>
      <h3>Vizinhos e acaso</h3>
      <p>
        Vizinhos são municípios cujos territórios se tocam na malha do IBGE (ilhas ligadas ao município mais próximo). O índice de
        Moran mede o quanto o efeito de cada município se parece com o dos vizinhos: 0 seria acaso. Antes das explicações, ele é{' '}
        {num(esp.candidatos['13'].nulo.moran_I)} para Lula e {num(esp.candidatos['22'].nulo.moran_I)} para Flávio; depois do modelo
        completo, {num(esp.candidatos['13'].completo.moran_I)} e {num(esp.candidatos['22'].completo.moran_I)} (p{' '}
        {valorP(esp.candidatos['13'].completo.p)}, {inteiro(999)} permutações). Mesmo depois do perfil e da região, o que sobra em
        cada município não se espalha ao acaso.
      </p>

      <h3>Bolsões</h3>
      <p>
        Os bolsões do mapa são os municípios com LISA significativo a 5%. No voto em {cand.nome}, são{' '}
        {inteiro(c.completo.lisa['alto cercado de alto'])} municípios em bolsões acima do esperado (“alto cercado de alto”) e{' '}
        {inteiro(c.completo.lisa['baixo cercado de baixo'])} em bolsões abaixo (“baixo cercado de baixo”).{' '}
        <Link to={`/mapa?v=bolsoes&c=${candidato}`}>Veja os bolsões no mapa</Link>.
      </p>

      <h3>Degrau ou rampa?</h3>
      <p>
        Se o voto mudasse só aos poucos pelo mapa, como uma rampa, a divisa não faria diferença. Num modelo dos municípios com
        efeito do estado e um processo gaussiano nas coordenadas (covariância exponencial; a semelhança cai pela metade a cada
        cerca de {inteiro(Math.round((c.degrau_gradiente.com_gp.alcance_km * Math.LN2) / 10) * 10)} km, no voto em {cand.nome}), a
        variância do estado cai {pct(esp.candidatos['13'].degrau_gradiente.queda_uf, 0)} para Lula e{' '}
        {pct(esp.candidatos['22'].degrau_gradiente.queda_uf, 0)} para Flávio: essa parte do “efeito do estado” é gradiente
        regional, não degrau na divisa.
      </p>
      <p>
        Degrau e rampa não se separam por completo: estados são blocos contíguos, e um modelo espacial também consegue imitar
        blocos. Por isso o número é uma indicação, confirmada pela comparação entre vizinhos e pelas cidades gêmeas (bloco “As
        contas do Entenda”).
      </p>

      <h3>Regiões de voto</h3>
      <p>
        O SKATER (biblioteca <code>spopt</code>) corta a árvore geradora mínima dos municípios vizinhos em {regioes.n} regiões
        parecidas no voto em Lula e em Flávio (mínimo de 10 municípios cada). No voto em {cand.nome}, elas explicam{' '}
        {pct(regioes[n].r2_regioes, 0)} da variação do logit entre municípios; os {regioes.n} estados,{' '}
        {pct(regioes[n].r2_estados, 0)}.{' '}
        {regioes[n].r2_regioes > regioes[n].r2_estados
          ? 'O mapa desenhado pelo voto separa melhor que as divisas.'
          : 'As divisas ainda separam o voto melhor que qualquer recorte só geográfico.'}{' '}
        <Link to="/mapa?v=regioes">Veja as regiões de voto no mapa</Link>.
      </p>

      <h3>Dentro de São Paulo</h3>
      <p>
        A surpresa de cada um dos {inteiro(sp.n_locais)} locais de votação (resultado menos o esperado pelo município e pelo perfil
        do eleitorado) tem Moran de {num(sp['13'].moran_I)} no voto em Lula e {num(sp['22'].moran_I)} no voto em Flávio, entre os
        8 locais mais próximos: bairros vizinhos se parecem além do que o perfil explica.{' '}
        <Link to="/municipio/71072">Veja o mapa da cidade na opção “Surpresa”</Link>.
      </p>
    </>
  )
}
