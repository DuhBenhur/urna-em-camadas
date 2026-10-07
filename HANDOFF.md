# Handoff: estado do projeto

Atualizado em 07/10/2026. Lido automaticamente pelo Claude Code (importado no `CLAUDE.md`). Ao terminar uma sessão de trabalho, atualizar este arquivo.

## Onde paramos

**Dados (pipeline/, validados)**
- Base nacional por seção do 1º turno de 2026: 497.897 urnas, 5.571 municípios, 27 UFs (`data/processed/base_secao_2026.parquet`). Bate exatamente com a totalização oficial do TSE para SP (7 totais) e com o g1 na 1ª ZE (Bela Vista). `pipeline/03_validar_controle.py` roda no CI.
- Contexto municipal (Censo 2022, PIB 2022, Bolsa Família ago/2026) em `data/processed/contexto_municipal.parquet`.
- Brutos do TSE (7,6 GB de zips, ~20 GB descompactados) em `~/dados/tse` (fora do repo): zips conferidos por SHA-512 e `intermediario/` com Parquets por UF.
- Nomes de município: a tabela TSE ↔ IBGE capitaliza preposições ("Santa Rosa Do Purus"); o 06 corrige (`nome_municipio`). Reexecutado em 07/10: só os nomes mudaram (1.307), o resto do Parquet saiu idêntico.

**Modelo**
- `pipeline/05_hlm_nulo.py`: OLS nulo → HLM2 → HLM3 para Lula (13) e Flávio (22), com `gpboost`. ICC Lula: UF 62,7%, município 21,7%, seção 15,6%. Flávio: 60,5% / 22,9% / 16,6%. Validado contra o `statsmodels` (log-verossimilhança −225.328,4 x −225.328,8).

**Modelos explicativos e espaço (07/10; `pipeline/10_hlm_stepup.py`, `pipeline/11_espacial.py`)**
- Desenho fixado em `docs/plano_de_analise.md` antes dos resultados, com os desvios registrados lá (índice de escolaridade, Mundlak simples para a tabela, binomial descartado porque não convergia).
- Camada do estado (Shapley, 128 modelos, Lula; Flávio quase igual): região 46%, renda/PIB/Bolsa Família 22%, cor ou raça 10%, religião 8%, escolaridade da seção 4%, urbanização 1%, idade e sexo 0%; sobram 10%. Sem a região: perfis explicam 71%.
- Efeito médio do estado cai de 15,9 para 6,9 p.p. (Lula) com o perfil; SC −24,4 → −1,4; PI +28,1 → +12,3. Acre e Pará se afastam do zero (o perfil previa mais Lula).
- 4 níveis: estado 56%, município 20%, local de votação 20%, seção 3% (Lula): o que parecia da seção é do bairro.
- Espacial: Moran/LISA dos efeitos municipais, 27 regiões de voto (SKATER, ~2,5 min), processo gaussiano nas coordenadas (degrau x rampa), surpresa por local de votação em SP. A malha TopoJSON do IBGE não traz CRS: o 11 define EPSG:4674.
- Site: capítulo 4 completo (componentes `CapituloExplicacoes`, `PontosHorizontais`), mapa com 5 vistas (`#/mapa?v=...`: resultado, efeito, o que o perfil não explica, bolsões, regiões de voto), "Surpresa" no mapa de locais do município, camada "+ perfil do eleitorado" na urna, Método seções 5 e 6, notebook `notebooks/10_composicao_contexto.ipynb`.
- Bootstrap por UF (`--bootstrap 100`, ~1 h) dá os intervalos das quedas e dos efeitos.
- Tarifaço (`pipeline/12_tarifaco.py`, extensão): exportações de 2024 para os EUA por habitante (API do Comex Stat; o servidor de arquivos em lote recusa conexão daqui, a API funciona; respostas guardadas em `RAW_DIR`). Quase nada: Lula +0,17 p.p./DP (p = 0,13), Flávio −0,48 (p < 0,001), camada do estado não encolhe.

**Conferência cidadã (07/10)**
- `pipeline/09_totalizacao_oficial.py` → `data/processed/totalizacao_secao_2026.parquet` (versionado, 4,8 MB): resultado oficial de Presidente por seção, de `detalhe_votacao_secao_2026` (arquivo `_BR`) e `votacao_secao_2026_BR`. O conjunto por município e zona (`votacao_candidato_munzona_2026`) ainda não tem Presidente.
- O 03 compara as 497.897 seções campo a campo (aptos, comparecimento, abstenções, brancos, nulos, válidos, 12 candidatos): **todas idênticas**. Nulos = nulo da urna (96) + nulo técnico (28, renúncia), que a tabela de detalhe não soma. Roda no CI: uma divergência bloqueia a publicação.
- Site: página `#/conferencia` (como conferir com o boletim impresso, tabela por UF, o que a conferência não é), cartão na inicial, selo "Confere com o resultado oficial" na urna (`conf` nos arquivos de zona), título da inicial "A sua urna, conferida e explicada".

**História da página inicial (`pipeline/08_historia.py` → `resultados/08_historia.json`, versionado)**
- Contas descritivas para os dois candidatos; roda local (geopandas/libpysal), o 07 só copia, então o CI não precisa delas.
- Achados (Lula; Flávio parecido): erro ao adivinhar uma urna 14,5 → 9,2 (estado) → 5,7 (município) → 3,5 p.p. (escola), deixando a própria urna de fora. Diferença média entre municípios: quaisquer do Brasil 21,8; quaisquer do mesmo estado 10,8; vizinhos com divisa 8,4; vizinhos do mesmo estado 6,5 p.p. Ou seja, o "efeito do estado" é em boa parte região.
- Cidades gêmeas (33 pares, regra fixa: vizinhas, UFs diferentes, centros < 20 km, 10 mil+ válidos): resultado misto (cidades diferem 6,3 p.p., estados 6,0; 37 de 66 cidades mais perto da gêmea). Por isso entram como ilustração, não como manchete.
- Também: amplitude dentro da mesma escola (mediana 9,7 p.p.), municípios que contrariam o estado (BLUP, 20 mil+ válidos) e percentis de "surpresa" de cada urna.

**Site (site/, Vite + React + TypeScript + MapLibre)**
- Início = história em 7 capítulos (decisão do usuário: na inicial, com a busca no topo): 1 jogo "Adivinhe uma urna" + escada de erro; 2 o estado (ICC + efeito dos estados); 3 vizinhança x divisa + cidades gêmeas; 4 "Quem mora ali ou onde fica?" (aviso: entra com o step-up); 5 surpresas (escolas, municípios que contrariam o estado); 6 "Como foi feito" (linha do tempo das etapas, o caso do nulo técnico, decisões); 7 por que importa. Cada capítulo tem um "Como sabemos" recolhível. Um seletor Lula/Flávio repete nos capítulos.
- Método reescrito como referência (fontes, conferência, modelo, como cada número da inicial é calculado, decisões e alternativas descartadas em `site/src/lib/decisoes.ts`, comandos). Urna ganhou "mais surpreendente/previsível que N% das urnas" e o aviso de falácia ecológica.
- Outras páginas: Urna (`#/urna/UF/zona/seção`: boletim de urna + camadas + perfil + seções do mesmo local), Município (mapa de locais OpenFreeMap + tabela), Mapa (coroplético dos municípios), Método, Sobre.
- Dados estáticos gerados por `pipeline/07_exportar_site.py` em `site/public/dados/` (fora do git; o CI gera).
- Verificado com screenshots (desktop/celular, claro/escuro) sem erros de console: `python site/scripts/telas.py`, que agora usa o Chrome instalado (o Chromium 145 do Playwright não pegou a tela preta do Chrome 154: `scrollTo` devolve Promise).
- Publicação: `.github/workflows/site.yml` (valida → exporta → build → GitHub Pages).

**Repositório**
- Repositório público https://github.com/DuhBenhur/urna-em-camadas (criado em 07/10 com uma LICENSE do GitHub em nome de "Eduardo Ben-Hur"; os commits do projeto foram rebaseados sobre ele e a LICENSE ficou com "Eduardo Ben Hur", a assinatura do projeto). Site no ar: https://duhbenhur.github.io/urna-em-camadas/ (Pages com Source = GitHub Actions). Commitar e enviar só com autorização do usuário.

## Decisões (e por quê)

- Nome **Urna em Camadas**; assinatura **Eduardo Ben Hur**; repo público; GitHub Pages; licença MIT (código) + CC BY 4.0 (dados e textos).
- Só Python. `gpboost` é o motor (o `statsmodels` leva ~5 min por modelo e quebra com `use_sparse`).
- Os dois candidatos do 2º turno são modelados, e o site deixa escolher: decompor só um lado pareceria partidário.
- Cores: Lula vermelho, Flávio azul (convenção dos mapas eleitorais = polos do par divergente validado). Braço vermelho calculado com a mesma luminosidade OKLCH da rampa azul (`site/src/lib/cores.ts`). Paleta validada com o `validate_palette.js` da skill de dataviz.
- Previsão do 2º turno: pré-registro com embargo; publicar só depois de 25/10.
- Ordem combinada com o usuário (07/10): história do site primeiro e publicação logo, previsão em seguida (prazo ~20/10).
- Escala divergente no modo escuro: extremos `#ff716b` / `#5fa7ff` (L 0,72, croma máximo) no lugar do degrau 200 (croma 0,08, lia como pastel/"fraco"). Cada braço validado com `validate_palette.js --ordinal --mode dark`.
- **Em aberto (07/10):** o usuário questionou a história ("qual a ação possível? o que faz cada lugar votar como vota? qual o ganho para a sociedade?"). A história atual responde "quanto" e "onde", não "por quê". Direções propostas: (A) espinha "por que cada lugar vota como vota", puxada pelo step-up M2–M4; (B) "confira você mesmo": soma das urnas x totalização oficial nas 27 UFs. Aguardando a escolha antes de mexer de novo na inicial.
- Linguagem do site: jargão (ICC, logit, BLUP) só no Método e nos "Como sabemos"; números em p.p.; falar de urnas e lugares, nunca de eleitores; os dois candidatos sempre lado a lado; artigo dos estados via `site/src/lib/ufs.ts` ("no Paraná", "na Bahia").

## Pendências, em ordem de prioridade

1. **2º turno** (decisão do usuário em 07/10: "deixar a parte do segundo turno para o segundo turno").
   - Previsão pré-registrada: se for feita, registrar antes de 25/10 no OSF com embargo; o site promete isso em 4 lugares (capítulo 7, "Como foi feito", decisões e Método). Receita: boletins de urna de 2022 (1º e 2º turnos, `resultados-2022-boletim-de-urna`), compatibilizar seções 2022 → 2026 por local de votação e coordenadas, modelar a transição 1T → 2T de 2022 por seção e aplicar ao 1T de 2026.
   - Depois de 25/10: baixar o 2º turno, repetir a conferência e a decomposição, comparar os turnos. Nenhum conteúdo novo no dia 25/10.
2. **Site.** Feito em 07/10: imagem de compartilhamento (`site/scripts/og.py` → `site/public/og.png`), página de Dados (`#/dados`), cartão da urna para compartilhar (`site/src/lib/cartao.ts`, canvas 1200×630; no celular vai junto no compartilhamento, no computador é baixado), tarifaço (`12`). Falta: teste em celular real.
3. **Intervalos do bootstrap**: `python pipeline/10_hlm_stepup.py --bootstrap 100` (estratificado por região; ~45 s por reamostragem, ~2,5 h para os dois candidatos) acrescenta `bootstrap` ao JSON; depois reexportar (07) e publicar. O site usa o erro-padrão do modelo enquanto não houver bootstrap.
4. Para enviar: `git push` (o Git Credential Manager autentica; o `gh` não está instalado).

## Problemas conhecidos

- Boa Esperança do Norte (MT, IBGE 5101837) foi criado depois do Censo e da malha de 2022: sem geometria e sem variáveis do Censo, mas as urnas existem na base.
- A seção 228 da 1ª ZE de SP concentra eleitores de 60+ (seção agregada/acessibilidade). Não usar como exemplo; o exemplo do site é a 240.
- O estilo escuro do OpenFreeMap avisa que falta o ícone "circle-11" (externo, inofensivo).
- `gpboost` `get_cov_pars(std_err=True)` estoura a memória nessa escala: inferência das variâncias por LRT.
- Gráficos SVG só desenham depois de medir a largura (`useLargura` devolve 0 até lá); desenhar com largura provisória fazia os pontos deslizarem na carga.
- Uma vez, no Playwright, o "Sortear uma urna" não mostrou as pistas em 30 s; não se repetiu em 6 execuções e as 6.106 combinações município × zona têm urnas válidas. Observar.
- O modelo não pondera as seções (nenhum dos dois motores aceita pesos no caso usado).

## Comandos

```bash
python pipeline/03_validar_controle.py     # tem que passar
python pipeline/05_hlm_nulo.py
python pipeline/08_historia.py             # números da história (geopandas, libpysal)
python pipeline/07_exportar_site.py
cd site && npm run dev                     # http://localhost:5173
cd site && npm run build && npx vite preview --port 4173   # para os screenshots
python site/scripts/telas.py               # QA visual (Playwright + Chromium já instalados)
```

Ambiente: Windows 11, Anaconda (Python 3.13), Node 22. Pacotes Python em `requirements.txt`.
