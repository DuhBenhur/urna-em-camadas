import { Link } from 'react-router-dom'
import { REPOSITORIO } from '../lib/projeto'
import { TabelaRolagem } from '../components/TabelaRolagem'

type Arquivo = { caminho: string; conteudo: string; linhas: string; tamanho: string; script: string }

const PROCESSADOS: Arquivo[] = [
  { caminho: 'data/processed/base_secao_2026.parquet', conteudo: 'Base nacional: uma linha por seção (urna), com votos, comparecimento, perfil do eleitorado e coordenadas', linhas: '497.897', tamanho: '12,2 MB', script: '04' },
  { caminho: 'data/processed/totalizacao_secao_2026.parquet', conteudo: 'Resultado oficial do TSE por seção (Presidente), para a conferência', linhas: '497.897', tamanho: '4,8 MB', script: '09' },
  { caminho: 'data/processed/contexto_municipal.parquet', conteudo: 'Censo 2022, PIB e Bolsa Família por município', linhas: '5.571', tamanho: '0,5 MB', script: '06' },
  { caminho: 'data/processed/blups_hlm3_nulo.parquet', conteudo: 'Efeito do estado e do município no modelo nulo (logit)', linhas: '5.571', tamanho: '0,1 MB', script: '05' },
  { caminho: 'data/processed/efeitos_stepup.parquet', conteudo: 'Efeitos do estado e do município nos modelos nulo, de perfis e completo', linhas: '5.570', tamanho: '0,4 MB', script: '10' },
  { caminho: 'data/processed/espacial_municipios.parquet', conteudo: 'Bolsões (LISA) e região de voto (SKATER) de cada município', linhas: '5.570', tamanho: '< 0,1 MB', script: '11' },
  { caminho: 'data/processed/exposicao_tarifaco.parquet', conteudo: 'Exportações de 2024 para os EUA e no total, por município', linhas: '5.571', tamanho: '0,1 MB', script: '12' },
  { caminho: 'data/processed/locais_votacao_2026_brasil.parquet', conteudo: 'Locais de votação de cada seção, com bairro e coordenadas', linhas: '514.464', tamanho: '18,4 MB', script: '04' },
  { caminho: 'data/processed/bu_1t_2026_capital.parquet', conteudo: 'Boletins de urna da cidade de São Paulo (Presidente, Governador, Senador), um votável por linha', linhas: '696.506', tamanho: '4,7 MB', script: '02' },
  { caminho: 'data/processed/perfil_eleitor_secao_2026_capital.parquet', conteudo: 'Perfil do eleitorado por seção na cidade de São Paulo, em todas as categorias do TSE', linhas: '5.000.438', tamanho: '25,4 MB', script: '02' },
  { caminho: 'data/processed/locais_votacao_2026_capital.parquet', conteudo: 'Locais de votação da cidade de São Paulo, com endereço', linhas: '26.696', tamanho: '0,5 MB', script: '02' },
]

const RESULTADOS: Arquivo[] = [
  { caminho: 'resultados/05_hlm_nulo.json', conteudo: 'Modelo nulo de três níveis: variâncias, ICC, testes', linhas: '—', tamanho: '2 kB', script: '05' },
  { caminho: 'resultados/08_historia.json', conteudo: 'Números da análise (o jogo, a vizinhança, as surpresas)', linhas: '—', tamanho: '25 kB', script: '08' },
  { caminho: 'resultados/10_hlm_stepup.json', conteudo: 'Modelos explicativos: sequência, Shapley, efeitos, Mundlak, inclinação, interações, robustez', linhas: '—', tamanho: '34 kB', script: '10' },
  { caminho: 'resultados/11_espacial.json', conteudo: 'Moran, LISA, regiões de voto, degrau x rampa, São Paulo por local', linhas: '—', tamanho: '4 kB', script: '11' },
  { caminho: 'resultados/12_tarifaco.json', conteudo: 'Exposição ao tarifaço no modelo de efeitos', linhas: '—', tamanho: '1 kB', script: '12' },
]

const DICIONARIO: { arquivo: string; colunas: [string, string][] }[] = [
  {
    arquivo: 'base_secao_2026.parquet',
    colunas: [
      ['SG_UF, CD_MUNICIPIO, NM_MUNICIPIO', 'UF, código do município no TSE (não é o do IBGE) e nome'],
      ['NR_ZONA, NR_SECAO', 'Zona eleitoral e seção: a chave da urna dentro da UF'],
      ['NR_LOCAL_VOTACAO', 'Local de votação pelo cadastro do TSE (NR_LOCAL_VOTACAO_BU: o número que veio no boletim)'],
      ['QT_APTOS, QT_COMPARECIMENTO, QT_ABSTENCOES', 'Eleitores aptos, que votaram e que faltaram'],
      ['QT_VALIDOS, QT_BRANCOS, QT_NULOS', 'Votos válidos, brancos e nulos para Presidente; os nulos incluem o nulo técnico'],
      ['V_13, V_22, V_14, …', 'Votos de cada candidato, pelo número na urna'],
      ['ELEIT_PERFIL', 'Eleitores no perfil do eleitorado da seção (soma das seções agregadas à principal)'],
      ['ELEIT_MULHER, ELEIT_16_24, ELEIT_60_MAIS, ELEIT_ATE_FUND_INC, ELEIT_SUPERIOR', 'Eleitores mulheres, de 16 a 24 anos, de 60 anos ou mais, até o fundamental incompleto e com superior completo'],
      ['LAT, LON', 'Coordenadas do local de votação (vazias quando o TSE não geocodifica)'],
    ],
  },
  {
    arquivo: 'totalizacao_secao_2026.parquet',
    colunas: [
      ['SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO', 'A mesma chave da base'],
      ['QT_APTOS, QT_COMPARECIMENTO, QT_ABSTENCOES, QT_BRANCOS', 'Como na base, pelo resultado oficial'],
      ['QT_NULOS_URNA, QT_NULOS_TECNICOS', 'Nulos digitados na urna e votos em candidatura renunciada (nulo técnico)'],
      ['V_13, V_22, …', 'Votos de cada candidato pelo resultado oficial'],
    ],
  },
  {
    arquivo: 'contexto_municipal.parquet',
    colunas: [
      ['CD_MUNICIPIO, CD_MUNICIPIO_IBGE', 'Código do TSE e do IBGE, pela tabela oficial de correspondência'],
      ['pop_2022, pct_preta_parda, pct_urbana, pct_evangelicos', 'População e proporções do Censo 2022 (religião: pessoas de 10 anos ou mais)'],
      ['renda_pc_media, renda_pc_mediana', 'Rendimento domiciliar per capita (R$, Censo 2022)'],
      ['pib_pc_2022', 'PIB per capita (R$, IBGE)'],
      ['pessoas_pbf, familias_pbf, pct_pop_pbf', 'Bolsa Família em agosto de 2026 (MDS); a proporção usa a população do Censo e pode passar de 1'],
    ],
  },
  {
    arquivo: 'efeitos_stepup.parquet',
    colunas: [
      ['u_uf_{modelo}_{n}, u_mun_{modelo}_{n}', 'Efeito do estado e do município no logit, para o candidato n (13 ou 22), nos modelos nulo, perfis (perfil da seção e do município) e completo (+ região)'],
      ['ref_{modelo}_{n}', 'Logit da urna típica do modelo (média das previsões fixas), para converter os efeitos em pontos'],
    ],
  },
  {
    arquivo: 'espacial_municipios.parquet',
    colunas: [
      ['lisa_{nulo|completo}_{n}', 'Bolsão do município (0 sem padrão; 1 alto cercado de alto; 2 baixo cercado de alto; 3 baixo cercado de baixo; 4 alto cercado de baixo)'],
      ['regiao_voto', 'Região de voto do SKATER (0 a 26)'],
    ],
  },
]

const SITE = [
  ['resumo.json', 'Totais nacionais, candidatos, modelo nulo e estados'],
  ['conferencia.json', 'Soma dos boletins x resultado oficial, por estado'],
  ['historia.json, explicacao.json', 'Números da análise e dos modelos explicativos e espaciais'],
  ['municipios.json', 'Índice dos municípios (busca e mapa)'],
  ['zonas/{UF}-{zona}.json', 'O boletim de cada urna da zona, com a marcação da conferência e a camada do perfil'],
  ['locais/{código do município}.json', 'Locais de votação do município, com votos somados e a surpresa'],
  ['geo/', 'Malhas do IBGE e contorno das regiões de voto'],
]

const SCRIPTS: Record<string, string> = {
  '02': '02_recortar_capital.py', '04': '04_base_nacional.py', '05': '05_hlm_nulo.py', '06': '06_contexto_municipal.py',
  '08': '08_historia.py', '09': '09_totalizacao_oficial.py', '10': '10_hlm_stepup.py', '11': '11_espacial.py', '12': '12_tarifaco.py',
}
const bruto = (caminho: string) => `${REPOSITORIO}/raw/main/${caminho}`
const script = (n: string) => `${REPOSITORIO}/blob/main/pipeline/${SCRIPTS[n]}`

function TabelaArquivos({ arquivos }: { arquivos: Arquivo[] }) {
  return (
    <TabelaRolagem>
      <table>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>O que tem</th>
            <th className="num">Linhas</th>
            <th className="num">Tamanho</th>
            <th className="num">Script</th>
          </tr>
        </thead>
        <tbody>
          {arquivos.map((a) => (
            <tr key={a.caminho}>
              <td>
                <a href={bruto(a.caminho)}>
                  <code>{a.caminho.split('/').pop()}</code>
                </a>
              </td>
              <td>{a.conteudo}</td>
              <td className="num">{a.linhas}</td>
              <td className="num">{a.tamanho}</td>
              <td className="num">
                <a href={script(a.script)}>{a.script}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaRolagem>
  )
}

export function Dados() {
  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Dados</h1>
      <p className="secundario">
        Tudo o que o site usa é aberto: os arquivos processados ficam no repositório, em Parquet, e os resultados dos modelos, em
        JSON. Só dados agregados (por seção, local de votação ou município); nenhum dado de eleitor individual. Para ler um Parquet em Python:{' '}
        <code>pandas.read_parquet</code> ou DuckDB.
      </p>

      <h2>Arquivos processados</h2>
      <TabelaArquivos arquivos={PROCESSADOS} />

      <h2>Resultados dos modelos</h2>
      <TabelaArquivos arquivos={RESULTADOS} />
      <p style={{ marginTop: 12 }}>
        Os mesmos resultados, com tabelas e figuras, estão no{' '}
        <a href={`${REPOSITORIO}/blob/main/notebooks/10_composicao_contexto.ipynb`}>notebook de composição e contexto</a>.
      </p>

      <h2>Dicionário</h2>
      {DICIONARIO.map((d) => (
        <section key={d.arquivo}>
          <h3 style={{ marginTop: 24 }}>
            <code>{d.arquivo}</code>
          </h3>
          <TabelaRolagem>
            <table>
              <thead>
                <tr>
                  <th>Coluna</th>
                  <th>Significado</th>
                </tr>
              </thead>
              <tbody>
                {d.colunas.map(([c, s]) => (
                  <tr key={c}>
                    <td>
                      <code>{c}</code>
                    </td>
                    <td>{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelaRolagem>
        </section>
      ))}

      <h2>Os arquivos do site</h2>
      <p className="secundario">
        JSON estáticos gerados por <code>pipeline/07_exportar_site.py</code> a cada publicação, no endereço{' '}
        <code>/urna-em-camadas/dados/</code>. São tabelas compactas: uma lista de colunas e uma lista de linhas.
      </p>
      <TabelaRolagem>
        <table>
          <tbody>
            {SITE.map(([a, s]) => (
              <tr key={a}>
                <td>
                  <code>{a}</code>
                </td>
                <td>{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolagem>

      <h2>Licença e citação</h2>
      <p>
        Dados processados, resultados e textos sob <a href="https://creativecommons.org/licenses/by/4.0/deed.pt-br">CC BY 4.0</a>:
        pode copiar, adaptar e republicar, inclusive para fins comerciais, citando a fonte. Código sob licença MIT.
      </p>
      <pre className="cartao" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>
        Ben Hur, Eduardo. Urna em Camadas: o voto de 2026 em seção, município e estado. 2026. {REPOSITORIO}
      </pre>
      <p className="discreto">
        Os dados de origem são públicos e pertencem ao TSE, ao IBGE, ao MDS e ao MDIC. Como foram obtidos e conferidos está no{' '}
        <Link to="/metodo">Método</Link>.
      </p>
    </div>
  )
}
