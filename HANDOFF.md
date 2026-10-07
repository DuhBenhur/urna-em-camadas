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
- Commits na `main`: `13de6a0` (primeira versão) e `a94f767` (correção da tela preta). Remoto `origin` = https://github.com/DuhBenhur/urna-em-camadas.git, **mas o repositório ainda não foi criado no GitHub** e nada foi enviado. A história (sessão de 07/10) ainda não está commitada. Commitar só com autorização do usuário.

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

1. **Publicar no GitHub.** Usuário: `DuhBenhur` (já trocado no código). Commitar a história (pedir autorização). Criar o repositório público `urna-em-camadas`, vazio: o `gh` não está instalado e o acesso à credencial salva do Windows foi negado; o usuário cria pelo site (github.com/new) ou instala e loga o `gh` (`! winget install GitHub.cli`, `! gh auth login`). Depois `git push -u origin main` e Settings → Pages → Source: GitHub Actions (se o push vier antes, rodar o workflow de novo).
2. **Previsão do 2º turno (tem prazo: registrar até ~20/10).** Baixar os boletins de urna de 2022 (1º e 2º turnos, conjunto `resultados-2022-boletim-de-urna` no Portal de Dados Abertos do TSE). Compatibilizar seções 2022 → 2026 (seções mudam; usar local de votação e coordenadas). Modelar a transição 1T → 2T de 2022 por seção, aplicar ao 1T de 2026 e pré-registrar no OSF com embargo.
3. **Step-up M2–M6 com `gpboost`** (vira o capítulo 4 da história: quanto dos 63% do estado sobra depois da composição). Nível 1: % mulheres, 16–24, 60+, até fundamental incompleto, superior, abstenção. Nível 2: log da renda média, % pretos e pardos, % evangélicos, % urbana, % no Bolsa Família, log do PIB per capita (checar colinearidade). Nível 3: no máximo 2–3 variáveis (região, alinhamento do governador; a definir). Depois, inclinação aleatória da escolaridade por UF e interações entre níveis. Levar a camada "perfil do eleitorado" para a página da urna.
4. **Espacial** (completa o capítulo 5). Moran e LISA nos BLUPs dos municípios (pesos de contiguidade da malha do IBGE); regionalização (`spopt`: SKATER ou max-p); zoom por local de votação em SP.
5. **Site.** Imagem de compartilhamento (og:image 1200×630); página de Dados (downloads + dicionário); card da urna para compartilhar; página da previsão (depois de 25/10); exposição ao tarifaço (Comex Stat) no nível municipal; teste em celular real.

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
