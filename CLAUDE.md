# Urna em Camadas — instruções para o Claude Code

Projeto público de ciência de dados (portfólio de Eduardo Ben Hur), feito com Claude Code. Análise multinível e espacial do 1º turno presidencial de 2026 por seção eleitoral, publicada em site estático (GitHub Pages). Conversa e textos em português.

## Convenções

- **Só Python** no pipeline e na análise. Não propor R.
- Modelos multinível: `gpboost` é o motor principal (estimação ML, esparso, segundos em ~500 mil seções). `statsmodels` MixedLM só como validação cruzada (lento e com bug no modo `use_sparse`). Inferência de variâncias por LRT com correção de fronteira (½χ²₀ + ½χ²₁), não por teste Z.
- Dados brutos do TSE (~20 GB) ficam em `~/dados/tse` (variável `DADOS_RAW`), fora do repositório. No repo entram só Parquets processados em `data/processed/`.
- Todo script grava Parquet com `tse.salvar` (escrita atômica: `.part` e renomeia).
- `pipeline/03_validar_controle.py` tem que passar antes de qualquer análise: reproduz o g1 na 1ª ZE (Bela Vista) e a totalização oficial do TSE para SP. Votos de candidaturas indeferidas ou renunciadas são nulo técnico (`config.VOTOS_NAO_VALIDOS`), não voto válido.
- Unidade do nível 1 é a seção (agregado), não o eleitor: nada de interpretar resultados como comportamento individual (falácia ecológica).

## Regras do conteúdo público

- Projeto independente, sem vínculo partidário. Não é pesquisa eleitoral.
- Sem enquetes no site durante a campanha (Lei 9.504/97, art. 33, §5º). Sem deepfake; conteúdo gerado com IA é rotulado.
- A previsão do 2º turno (25/10/2026) é pré-registrada com embargo e só publicada depois da eleição. Nenhum conteúdo novo no dia 25/10.
- Só dados agregados (LGPD).

## Estrutura

- `pipeline/` scripts numerados (01 baixa, 02–04 recortes e base, 05+ modelos e contexto, 08 números da história da página inicial, 07 exporta o site e roda por último)
- `notebooks/` análise e figuras (renderizados no GitHub e na página de Metodologia)
- `site/` SPA Vite + React + MapLibre (GitHub Pages); `site/scripts/telas.py` faz a verificação visual com Playwright
- `data/processed/`, `data/geo/`, `resultados/` artefatos versionados
- `docs/plano_de_analise.md` plano de pesquisa

## Verificação

- Mudou dado ou modelo: rodar `pipeline/03_validar_controle.py`, recalcular `pipeline/08_historia.py` e reexportar com `pipeline/07_exportar_site.py`.
- Mudou o site: `npm run build` (inclui checagem de tipos) e olhar as telas com `site/scripts/telas.py` antes de dar por pronto. Gráficos seguem a skill de dataviz (paleta validada, sem eixo duplo, tabela equivalente).

## Estado atual e próximos passos

@HANDOFF.md
