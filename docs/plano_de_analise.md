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

## Conexão entre técnicas

1. **Multinível** separa a variação por nível e estima os efeitos de cada contexto.
2. **Espacial:** Moran global e LISA nos efeitos aleatórios dos municípios (BLUPs). O HLM supõe municípios independentes. Se os vizinhos se parecem, sobra estrutura espacial, e o próximo passo é um multinível com efeito aleatório espacial.
3. **Clusterização:** k-means sobre interceptos e inclinações, como no artigo. Evolução: regionalização espacial (SKATER ou max-p, com `spopt`), que forma grupos de municípios contíguos.
4. **Zoom na capital:** resíduos do modelo nacional por local de votação em SP, mais LISA. A Bela Vista vota acima do que perfil, município e estado preveem?
5. **Previsão do 2º turno:** treinar a passagem do 1º para o 2º turno de 2022 (Lula x Bolsonaro) por seção, aplicar ao 1º turno de 2026, pré-registrar antes de 25/10 e validar depois.

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
8. Previsão do 2º turno e pré-registro (OSF, com embargo), **antes de 25/10**.
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
| 17–20/out | Etapa 8: previsão e pré-registro |
| 18–23/out | Etapa 9: site |
| 24/out | Publicação |
| 25/out | Site congelado |
| nov/2026 → | Etapa 10 |
