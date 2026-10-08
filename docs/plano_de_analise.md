# Camadas do voto: plano de análise

Projeto de portfólio de ciência de dados, sem vínculo partidário. Análise multinível e espacial do 1º turno presidencial de 2026 no Brasil, com zoom na cidade de São Paulo, publicada em site com método e código abertos. Tudo em Python.

Continuação de: Gomes, E.B.Q.; Tarantin Junior, W. *Efeitos das unidades federativas na renda disponível per capita por domicílio: uma análise multinível*. Quaestum 6: e2675824, 2025. https://doi.org/10.22167/2675-441X-2024824

## Pergunta

Quanto da variação do voto presidencial no 1º turno de 2026 está entre estados, entre municípios e dentro do município? O que explica cada nível, e onde o voto foge do que o contexto prevê?

Gancho: a 1ª ZE (Bela Vista, SP) deu 60,58% a Lula, contra 46,58% na capital. É efeito do perfil do eleitorado, do município, do estado ou de algo que o modelo não vê?

## O que o artigo deixou em aberto e como este projeto responde

| Artigo (limitações e sugestões) | Este projeto |
|---|---|
| Sem interação entre variáveis de contexto e da unidade | Interações entre níveis (ex.: escolaridade da seção × região) |
| Box-Cox aplicado globalmente | Y é proporção: logit com peso, e binomial como teste de robustez |
| Sem pesos amostrais | Não se aplica: resultado eleitoral é censo |
| Incluir serviços públicos e infraestrutura | Políticas públicas no nível município |
| Metodologias mais recentes | Ligação com análise espacial e regionalização |
| Dados longitudinais | Lula em 2022 e 2026, nas mesmas seções |

## Desenho multinível (HLM3)

- **Y:** logit da proporção de votos do Lula nos válidos da seção, com peso = votos válidos.
- **Nível 1, seção** (497.897 urnas; perfil do eleitorado do TSE): % mulheres, % 16–24 anos, % 60+, % até fundamental incompleto, % superior completo, abstenção.
- **Nível 2, município** (5.571): Censo 2022 (renda, % pretos e pardos, % evangélicos, urbanização), cobertura do Bolsa Família, PIB per capita, exposição ao tarifaço dos EUA (Comex Stat).
- **Nível 3, UF** (27): no máximo 2–3 variáveis (ex.: região e alinhamento do governador). Com 27 unidades não cabe mais que isso.

Raça/cor não entra no nível 1: no cadastro do TSE, 84% está como "não informado" (só quem se cadastrou recentemente declarou).

**Step-up**, como no artigo:

| Modelo | Conteúdo | O que testa |
|---|---|---|
| M0 | OLS nulo | referência |
| M1 | HLM3 nulo | ICC da UF e do município |
| M2 | + variáveis da seção | efeitos de composição |
| M3 | + variáveis do município | efeitos de contexto local |
| M4 | + variáveis da UF | efeitos de contexto estadual |
| M5 | + inclinação aleatória da escolaridade por UF | o gradiente educacional varia entre estados? |
| M6 | + interações entre níveis | o contexto modera o efeito da composição? |

**Testes:** razão de verossimilhança (ML) para efeitos fixos. Para variâncias, razão de verossimilhança com correção de fronteira (mistura ½χ²₀ + ½χ²₁) ou bootstrap paramétrico, em vez do teste Z. Estimativas finais por REML.

**Ferramenta:** `statsmodels` MixedLM (grupos = UF, componente de variância = município), na mesma linha do material do MBA, como referência. Os modelos pesados vão no `gpboost`, que ajusta o HLM3 nacional em segundos com álgebra esparsa. Os dois são comparados no modelo nulo antes de seguir.

## Step-up detalhado: composição ou contexto? (fixado em 07/10/2026, antes dos resultados)

Pergunta: quanto da camada do estado (ICC de 63% para Lula) se explica pelo perfil de quem vota (composição) e
quanto pelo lugar (contexto)? Decisão do usuário: fazer tudo agora, inclusive inclinações, interações e espacial;
só a parte do 2º turno fica para depois.

Piloto (Lula, gaussiano no logit, sem incerteza), só para calibrar o desenho: a variância do estado cai 15% com o
perfil das seções, 61% com o perfil dos municípios e 90% com a região; a região sozinha explica 87%. Renda e
Bolsa Família têm r = −0,91 (VIF 7,5 e 5,9).

**Blocos** (Shapley sobre todas as ordens, para a sobreposição entre blocos não depender da ordem de entrada):

| Bloco | Variáveis | Nível | Fonte |
|---|---|---|---|
| Idade e sexo | % mulheres, % 16–24, % 60+ | seção | TSE, perfil do eleitorado |
| Escolaridade | % até fundamental incompleto, % superior completo | seção | TSE, perfil do eleitorado |
| Renda e economia | log renda média per capita, log PIB per capita, % da população no Bolsa Família | município | IBGE, MDS |
| Cor ou raça | % pretos e pardos | município | Censo 2022 |
| Religião | % evangélicos | município | Censo 2022 |
| Urbanização | % urbana | município | Censo 2022 |
| Região | N, NE, CO, S (SE de referência) | UF | IBGE |

- v(S) = 1 − σ²(S)/σ²(nulo) para a UF e para o município; Shapley com e sem o bloco de região. Região é rótulo,
  não explicação: entra por último na narrativa ("o que sobra é regional").
- Sequência para os testes: M1 = perfil da seção; M2 = M1 + perfil do município; M3 = M2 + região. LRT (ML).
- Renda, PIB e Bolsa Família só são interpretados juntos. No gráfico de efeitos, entram como um índice
  socioeconômico (1º componente principal).
- Mundlak: variáveis da seção centradas no município + médias do município, para separar o efeito dentro da
  cidade (composição) do efeito entre cidades (contexto). Os coeficientes "dentro" alimentam a camada
  "perfil da seção" da página da urna.
- 4 níveis no modelo nulo: seção < local de votação < município < UF.
- Inclinação aleatória do % superior por UF (LRT com correção de fronteira) e interações superior × região e
  superior × renda municipal.
- Incerteza: bootstrap por UF (reamostra os 27 estados) para as reduções de variância e os efeitos.
- Robustez: Flávio (22) em tudo; verossimilhança binomial com o número de válidos como tentativas; só seções com
  100+ válidos.
- Exclusões: 389 seções sem perfil do eleitorado e Boa Esperança do Norte (MT), sem dados do Censo.

**Espacial**: Moran global e LISA nos efeitos dos municípios (nulo e completo), contiguidade da malha do IBGE;
regionalização (SKATER, `spopt`); modelo municipal com efeito do estado + processo gaussiano nas coordenadas,
para separar a divisa (degrau) da região (gradiente suave); "surpresa" de cada local de votação (resultado menos
o esperado pelo município e pelo perfil das seções) para os mapas de cidade.

**Linguagem**: lugares, nunca pessoas (falácia ecológica); nada causal; os dois candidatos lado a lado.

**Desvios do plano (07/10, depois da primeira rodada, registrados aqui):**
- Inclinação aleatória, interações e gráfico de efeitos usam um índice de escolaridade da seção (% superior − % até o
  fundamental incompleto; r = −0,67 entre os dois), e não o % superior sozinho. Com as duas medidas no mesmo modelo, o
  efeito do % superior é parcial (mantido fixo o % com pouca escolaridade) e ia de −5 a +5,5 p.p. entre estados, sem uma
  leitura clara. Os blocos do Shapley continuam com as duas variáveis.
- A tabela "dentro da cidade x entre cidades" usa um Mundlak simples (perfil + região). Com renda, cor ou raça e religião
  no mesmo modelo, o efeito "entre cidades" da escolaridade trocava de sinal por colinearidade. A versão completa continua
  no JSON e dá os coeficientes da camada "perfil" da página da urna.
- A verossimilhança binomial do `gpboost` não saiu dos valores iniciais das variâncias (testado com três inícios
  diferentes). No lugar, a robustez repete a decomposição na escala de proporção, sem o logit.
- Extensão acrescentada depois dos resultados (`pipeline/12_tarifaco.py`): exposição ao tarifaço dos EUA, medida como
  log(1 + exportações para os EUA por habitante em 2024, API do Comex Stat), no modelo de efeitos. Estava na lista do
  nível 2 do plano original; ficou fora dos blocos do Shapley, que já estavam fixados.
- **Previsão do 2º turno retirada (decisão do usuário em 07/10, registrada em 08/10).** O item 5 abaixo e a etapa 8 do
  pipeline não serão feitos. O foco passou a ser a ferramenta "Onde virar voto" (`docs/plano_virar_voto.md`), e uma
  previsão divulgada antes da eleição pareceria pesquisa eleitoral. Depois de 25/10: conferir o 2º turno com o resultado
  oficial e comparar os turnos urna por urna, sem previsão.

## Conexão entre técnicas

1. **Multinível** separa a variação por nível e estima os efeitos de cada contexto.
2. **Espacial:** Moran global e LISA nos efeitos aleatórios dos municípios (BLUPs). O HLM supõe municípios independentes. Se os vizinhos se parecem, sobra estrutura espacial, e o próximo passo é um multinível com efeito aleatório espacial.
3. **Clusterização:** k-means sobre interceptos e inclinações, como no artigo. Evolução: regionalização espacial (SKATER ou max-p, com `spopt`), que forma grupos de municípios contíguos.
4. **Zoom na capital:** resíduos do modelo nacional por local de votação em SP, mais LISA. A Bela Vista vota acima do que perfil, município e estado preveem?
5. ~~**Previsão do 2º turno:** treinar a passagem do 1º para o 2º turno de 2022 (Lula x Bolsonaro) por seção, aplicar ao 1º turno de 2026, pré-registrar antes de 25/10 e validar depois.~~ Retirada (ver os desvios acima).

## Dados

| Fonte | Conteúdo | Nível | Situação |
|---|---|---|---|
| TSE, boletim de urna 1T 2026 (27 UFs) | votos por seção | 1 | baixado, SHA-512 ok |
| TSE, perfil do eleitorado por seção 2026 | gênero, idade, escolaridade | 1 | baixado |
| TSE, locais de votação 2026 | lat/long e seções agregadas | 1 | baixado |
| TSE, tabela oficial de municípios TSE ↔ IBGE | junção com dados do IBGE | 2 | baixado |
| IBGE, Censo 2022 | renda, cor/raça, religião, urbanização | 2 | a baixar |
| MDS, Bolsa Família | famílias beneficiárias | 2 | a baixar |
| IBGE, PIB dos municípios | PIB per capita | 2 | a baixar |
| Comex Stat | exportações aos EUA por município | 2 | a baixar |
| TSE, boletim de urna 1T e 2T 2022 | longitudinal e previsão | 1 | a baixar |
| TSE, boletim de urna 2T 2026 | validação da previsão | 1 | após 25/10 |

Os brutos ficam em `~/dados/tse` (variável `DADOS_RAW`), fora do OneDrive. No projeto entram só Parquets processados.

## Pipeline

1. ✅ `pipeline/01_baixar_tse.py`: baixa os brutos e confere o SHA-512.
2. ✅ `pipeline/02_recortar_capital.py`: recorte da capital (Presidente, Governador, Senador) com a coluna `VOTO_VALIDO`.
3. ✅ `pipeline/03_validar_controle.py`: reproduz os 4 percentuais do g1 para a 1ª ZE. Só bateu depois de excluir os nulos técnicos (candidaturas indeferidas ou renunciadas, em `config.VOTOS_NAO_VALIDOS`).
4. ✅ `pipeline/04_base_nacional.py`: base nacional por seção (votos + perfil + coordenadas). Validada contra a totalização oficial de SP (7 totais exatos).
5. 🟡 `pipeline/06_contexto_municipal.py`: Censo 2022 e PIB via API do IBGE, ligados pela tabela oficial TSE ↔ IBGE (feito). Faltam Bolsa Família, Comex Stat e as variáveis de UF.
6. 🟡 `pipeline/05_hlm_nulo.py`: OLS nulo → HLM2 → HLM3 (Lula e Flávio), ICC e BLUPs; validado contra o statsmodels. Faltam M2–M6 (notebooks).
6b. ✅ `pipeline/07_exportar_site.py`: dados estáticos do site (zonas, locais, municípios, resumo, malhas).
7. Espacial: Moran e LISA nos BLUPs, regionalização, zoom em SP.
8. ~~Previsão do 2º turno e pré-registro (OSF, com embargo), antes de 25/10.~~ Retirada (ver os desvios acima).
9. 🟡 Site (`site/`, Vite + React + MapLibre): busca por zona e seção, boletim de urna, camadas, efeito dos estados, mapa nacional, mapa de locais por município, Método e Sobre. Publicação por GitHub Actions no Pages.
10. Depois de 25/10: validação, análise longitudinal e artigo.

## Validação

- **Controle:** totais por zona e município batem com o g1 e com a totalização oficial.
- **Modelos:** validação cruzada deixando uma UF de fora por vez (não aleatória, para não vazar contexto).
- **Previsão:** MAE por município e por seção, cobertura dos intervalos e mapa de erros após o 2º turno.

## Limitações declaradas

- O nível 1 é agregado (a seção), não o eleitor. As conclusões valem para lugares, não para pessoas (falácia ecológica).
- O eleitor vota onde está registrado, não necessariamente onde mora.
- Os BLUPs são estimativas encolhidas, e clusterizá-los é exploratório.
- Censo 2022 x eleitorado 2026: quatro anos de defasagem.

## Regras para o site

- Sem enquetes durante a campanha (Lei 9.504/97, art. 33, §5º).
- Autoria identificada. Nada de deepfake, e conteúdo com IA rotulado (Res. TSE 23.610/2019, alterada em 2024).
- Sem impulsionamento pago.
- Nenhum conteúdo novo em 25/10.
- Só dados agregados (LGPD).

## Cronograma

| Datas | Entrega |
|---|---|
| 7–9/out | Etapas 4–5: base nacional e variáveis de contexto |
| 10–14/out | Etapa 6: step-up multinível |
| 15–17/out | Etapa 7: espacial, regionalização e zoom em SP |
| 17–20/out | ~~Etapa 8: previsão e pré-registro~~ (retirada) |
| 18–23/out | Etapa 9: site |
| 24/out | Publicação |
| 25/out | Site congelado |
| nov/2026 → | Etapa 10 |
