# Urna em Camadas — instruções para o Claude Code

Projeto público de ciência de dados (portfólio de Eduardo Ben Hur), feito com Claude Code. Análise multinível e espacial do 1º turno presidencial de 2026 por seção eleitoral, publicada em site estático (GitHub Pages). Conversa e textos em português.

**Centro do projeto desde 08/10/2026: a ferramenta "Onde virar voto"**, que é a página inicial (`#/`): para o candidato escolhido, em que bairros e escolas uma conversa pode render mais no 2º turno (25/10). O resto do site (Como usar, Confira sua urna, Entenda, Método e dados, a página de cada urna e a folha do bairro) serve a ela. O plano em curso é `docs/plano_reorganizacao.md`: decisões D1 a D10 confirmadas em 08/10; R0, R1 e R2 publicados; falta o R3 (teste com pessoas, que depende do usuário). `docs/plano_virar_voto.md` é o plano anterior, executado até o P2.2.

## Convenções

- **Só Python** no pipeline e na análise. Não propor R.
- Modelos multinível: `gpboost` é o motor principal (estimação ML, esparso, segundos em ~500 mil seções). `statsmodels` MixedLM só como validação cruzada (lento e com bug no modo `use_sparse`). Inferência de variâncias por LRT com correção de fronteira (½χ²₀ + ½χ²₁), não por teste Z.
- Dados brutos do TSE (~20 GB) ficam em `~/dados/tse` (variável `DADOS_RAW`), fora do repositório. No repo entram só Parquets processados em `data/processed/`.
- Todo script grava Parquet com `tse.salvar` (escrita atômica: `.part` e renomeia).
- `pipeline/03_validar_controle.py` tem que passar antes de qualquer análise: reproduz o g1 na 1ª ZE (Bela Vista), a totalização oficial do TSE para SP e confere cada uma das 497.897 seções com o resultado oficial por seção (`09`). Votos de candidaturas indeferidas ou renunciadas são nulo técnico (`config.VOTOS_NAO_VALIDOS`), não voto válido.
- Unidade do nível 1 é a seção (agregado), não o eleitor: nada de interpretar resultados como comportamento individual (falácia ecológica).

## Regras do conteúdo público

- Projeto independente, sem vínculo partidário. Não é pesquisa eleitoral.
- Neutralidade na ação: os dois candidatos sempre lado a lado, a mesma conta para os dois, nenhum pedido de voto ("A mesma conta para os dois candidatos. O site não pede voto para ninguém.").
- Falar de lugares (escolas, bairros) e de pessoas só no agregado ("quem faltou"); nunca de indivíduos.
- Toda tela de ação traz a lei (compra de voto, transporte de eleitores, propaganda em prédio público, boca de urna, notícia falsa) e o que os números não dizem: os limites ficam em destaque na ferramenta, antes dos resultados (`LimitesNumeros`), e toda tabela com o número principal de uma conversa tem embaixo a nota com asterisco, com o nome do candidato escolhido (`notaColuna` em `site/src/lib/virar.ts`).
- O que o site compartilha (cartão "perto de mim", folha do bairro) não leva candidato. O site não troca o nome de nenhum candidato por "adversário" (decisão do usuário, 09/10): quem divulga pode ter lado, o site não.
- Vocabulário fora de Método e dados: cidade, escola, urna (seção), quem faltou, votos em aberto, saldo possível, pontos. Jargão (lista em `site/scripts/inventario.py`) só dentro do "Detalhe técnico" de Método e dados.
- Sem enquetes no site durante a campanha (Lei 9.504/97, art. 33, §5º). Sem impulsionamento pago. Sem deepfake; conteúdo gerado com IA é rotulado.
- Sem previsão do 2º turno (decisão de 07/10), e o site não fala dela (08/10): o que não foi entregue ao público não aparece para o público. Último deploy até 24/10; nenhum conteúdo novo no dia 25/10.
- Só dados agregados (LGPD).

## Estrutura

- `pipeline/` scripts numerados (01 baixa, 02–04 recortes e base, 05 modelo nulo, 06 contexto municipal, 08 números da história, 09 resultado oficial por seção para a conferência, 10 modelos explicativos (step-up, Shapley, Mundlak), 11 espacial (Moran, LISA, SKATER, processo gaussiano), 12 tarifaço (Comex Stat), 07 exporta o site e roda por último)
- `notebooks/` análise e figuras (renderizados no GitHub; o bloco de dados de Método e dados aponta para eles)
- `site/` SPA Vite + React + MapLibre (GitHub Pages). Páginas em `site/src/pages/` (`Virar.tsx` é a inicial e a ferramenta; `ComoUsar`, `Urna`, `Conferencia`, `Entenda`, `Metodo`, `Folha`, `Mapa`, `Sobre`); endereços antigos redirecionam em `App.tsx`. `site/scripts/`: `testes.py` (testes no navegador), `inventario.py` (palavras e jargão), `telas.py` (verificação visual), `og.py` (imagem de compartilhamento)
- `data/processed/`, `data/geo/`, `resultados/` artefatos versionados
- `docs/`: `plano_de_analise.md` (plano de pesquisa, com os desvios registrados), `plano_virar_voto.md` (plano anterior), `plano_reorganizacao.md` (plano em curso), `roteiro_teste_pessoas.md` (roteiro do R3)

## Verificação

- Mudou dado ou modelo: rodar `pipeline/03_validar_controle.py`, recalcular o que depende dele (`05` → `10` → `11` → `08`) e reexportar com `pipeline/07_exportar_site.py`. Os JSON de `resultados/` são versionados: o CI só copia, sem rodar modelos.
- Mudou o site: `npm run build` (inclui checagem de tipos), `site/scripts/testes.py` (testes no navegador, local e ao vivo; atualizar junto com a mudança) e olhar as telas com `site/scripts/telas.py` antes de dar por pronto. `site/scripts/inventario.py` mede palavras e jargão visíveis por página. Gráficos seguem a skill de dataviz (paleta validada, sem eixo duplo, tabela equivalente).

## Estado atual e próximos passos

@HANDOFF.md
