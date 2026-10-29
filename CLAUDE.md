# Urna em Camadas — instruções para o Claude Code

Projeto público de ciência de dados (portfólio de Eduardo Ben Hur), feito com Claude Code. Análise multinível e espacial do 1º turno presidencial de 2026 por seção eleitoral, publicada em site estático (GitHub Pages). Conversa e textos em português.

**Centro do projeto desde 26/10/2026: o 2º turno.** Lula foi reeleito em 25/10; a página inicial (`#/`) é "Lula reeleito": o resultado oficial do TSE cidade por cidade, ao lado do 1º turno (onde Lula ganhou e onde virou, onde mais avançou, onde mais gente foi votar), a cronologia da votação até as 19h e a conferência da soma. O plano em curso é `docs/plano_segundo_turno.md`: onda 1 (por município) feita; onda 2 feita (escolas, pelo resultado oficial por seção, e os votos depois das 17h, contados nos logs das urnas); a onda 3 (comparecimento por faixa etária) espera o TSE publicar. A ferramenta "Onde virar voto" (o centro de 08/10 a 25/10, `docs/plano_reorganizacao.md` e `docs/plano_virar_voto.md`) fica em `#/ferramenta`, como registro da campanha.

## Convenções

- **Só Python** no pipeline e na análise. Não propor R.
- Modelos multinível: `gpboost` é o motor principal (estimação ML, esparso, segundos em ~500 mil seções). `statsmodels` MixedLM só como validação cruzada (lento e com bug no modo `use_sparse`). Inferência de variâncias por LRT com correção de fronteira (½χ²₀ + ½χ²₁), não por teste Z.
- Dados brutos do TSE (~20 GB) ficam em `~/dados/tse` (variável `DADOS_RAW`), fora do repositório. No repo entram só Parquets processados em `data/processed/`.
- Todo script grava Parquet com `tse.salvar` (escrita atômica: `.part` e renomeia).
- `pipeline/03_validar_controle.py` tem que passar antes de qualquer análise: reproduz o g1 na 1ª ZE (Bela Vista), a totalização oficial do TSE para SP e confere cada uma das 497.897 seções com o resultado oficial por seção (`09`). Votos de candidaturas indeferidas ou renunciadas são nulo técnico (`config.VOTOS_NAO_VALIDOS`), não voto válido.
- Unidade do nível 1 é a seção (agregado), não o eleitor: nada de interpretar resultados como comportamento individual (falácia ecológica).

## Regras do conteúdo público

- Projeto independente, sem vínculo partidário. Não é pesquisa eleitoral.
- **O site tem lado desde 26/10 (decisão do usuário):** celebra a reeleição de Lula ("Viva o governo Lula!", assinado pelo autor), a foto da abertura é a principal e o mapa da inicial pinta de vermelho só onde Lula ganhou (em verde onde virou; cinza onde Flávio ganhou). Durante a campanha o site foi neutro, e o Sobre e o rodapé dizem isso. O lado não muda os números: são os oficiais, conferidos, e o texto diz o que os dados mostram, inclusive o que não favorece (a cidade que virou para Flávio, os estados onde a abstenção subiu). Nada de inventar ou esconder número.
- **A ferramenta da campanha (`#/ferramenta`) fica como era:** neutra, a mesma conta para os dois, a lei e os limites em destaque (`LimitesNumeros`, `notaColuna` em `site/src/lib/virar.ts`), e o que ela compartilha (cartão "perto de mim", folha do bairro) não leva candidato. Não reescrever o registro com lado.
- Falar de lugares (cidades, escolas, bairros) e de pessoas só no agregado ("quem faltou", "mais gente foi votar"); nunca de indivíduos. Uma cidade que virou não diz quem mudou de voto (falácia ecológica). Sobre idosos: "onde mais pessoas de 70 anos ou mais votaram", nunca "levaram idosos" (transporte de eleitores é crime).
- Vocabulário fora de Método e dados: cidade, escola, urna (seção), quem faltou, votos em aberto, saldo possível, pontos, virou, avançou, abstenção. Jargão (lista em `site/scripts/inventario.py`) só dentro do "Detalhe técnico" de Método e dados.
- Sem impulsionamento pago. Sem deepfake; conteúdo gerado com IA é rotulado. Imagem de terceiros só com licença que permita o uso e com o crédito: a foto da abertura é de Ricardo Stuckert / Lula Oficial (Flickr), CC BY-SA 4.0 (`FOTO` em `site/src/pages/SegundoTurno.tsx`); as versões recortadas e a imagem de compartilhamento ficam sob a mesma licença.
- Sem previsão (decisão de 07/10), e o site não fala dela: o que não foi entregue ao público não aparece para o público. Fatos sobre o dia da eleição (a prorrogação até as 19h) sempre com as fontes.
- Só dados agregados (LGPD).
- Visitas contadas de forma anônima com o GoatCounter (`site/src/lib/contagem.ts`, `components/ContarVisitas.tsx`): só o tipo de página, a cidade e eventos de uso. Nunca enviar o candidato escolhido (opinião política é dado sensível), a zona, a seção, a escola ou o texto da busca. Testes automatizados não enviam nada (`window.__contagens`).

## Estrutura

- `pipeline/` scripts numerados (01 baixa, 02–04 recortes e base, 05 modelo nulo, 06 contexto municipal, 08 números da história, 09 resultado oficial por seção para a conferência, 10 modelos explicativos (step-up, Shapley, Mundlak), 11 espacial (Moran, LISA, SKATER, processo gaussiano), 12 tarifaço (Comex Stat), 13 2º turno por município (resultado oficial do TSE, com a conferência da soma), 14 2º turno por urna (`--fonte totalizacao`: o resultado oficial por seção, publicado em 26/10; sem `--fonte`, os boletins de urna, quando o TSE publicar; `--ensaio` testa com os do 1º), 15 votos depois das 17h (os logs das urnas do 2º turno, 123 GB, um estado por vez; a conta é conferida urna por urna com o comparecimento oficial), 07 exporta o site e roda por último)
- `notebooks/` análise e figuras (renderizados no GitHub; o bloco de dados de Método e dados aponta para eles)
- `site/` SPA Vite + React + MapLibre (GitHub Pages). Páginas em `site/src/pages/` (`SegundoTurno.tsx` é a inicial; `Virar.tsx` é a ferramenta, em `#/ferramenta`; `ComoUsar`, `Urna`, `Conferencia`, `Entenda`, `Metodo`, `Folha`, `Mapa`, `Sobre`); endereços antigos redirecionam em `App.tsx` (um link com os parâmetros da ferramenta, `#/?c=...&m=...`, abre a ferramenta). `site/scripts/`: `testes.py` (testes no navegador), `inventario.py` (palavras e jargão), `telas.py` (verificação visual), `og.py` (imagem de compartilhamento)
- `data/processed/`, `data/geo/`, `resultados/` artefatos versionados
- `docs/`: `plano_de_analise.md` (plano de pesquisa, com os desvios registrados), `plano_segundo_turno.md` (plano em curso), `plano_reorganizacao.md` e `plano_virar_voto.md` (planos da ferramenta), `roteiro_teste_pessoas.md` (roteiro do R3, que não chegou a rodar)

## Verificação

- Mudou dado ou modelo: rodar `pipeline/03_validar_controle.py`, recalcular o que depende dele (`05` → `10` → `11` → `08`; o 2º turno, `13` → `14`) e reexportar com `pipeline/07_exportar_site.py`. Os JSON de `resultados/` são versionados: o CI só copia, sem rodar modelos.
- Mudou o site: `npm run build` (inclui checagem de tipos), `site/scripts/testes.py` (testes no navegador, local e ao vivo; atualizar junto com a mudança) e olhar as telas com `site/scripts/telas.py` antes de dar por pronto. `site/scripts/inventario.py` mede palavras e jargão visíveis por página. Gráficos seguem a skill de dataviz (paleta validada, sem eixo duplo, tabela equivalente).

## Estado atual e próximos passos

@HANDOFF.md
