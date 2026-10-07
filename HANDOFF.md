# Handoff: estado do projeto

Atualizado em 07/10/2026. Lido automaticamente pelo Claude Code (importado no `CLAUDE.md`). Ao terminar uma sessão de trabalho, atualizar este arquivo.

## Onde paramos

**Dados (pipeline/, validados)**
- Base nacional por seção do 1º turno de 2026: 497.897 urnas, 5.571 municípios, 27 UFs (`data/processed/base_secao_2026.parquet`). Bate exatamente com a totalização oficial do TSE para SP (7 totais) e com o g1 na 1ª ZE (Bela Vista). `pipeline/03_validar_controle.py` roda no CI.
- Contexto municipal (Censo 2022, PIB 2022, Bolsa Família ago/2026) em `data/processed/contexto_municipal.parquet`.
- Brutos do TSE (~20 GB) em `~/dados/tse` (fora do repo): zips conferidos por SHA-512 e `intermediario/` com Parquets por UF.

**Modelo**
- `pipeline/05_hlm_nulo.py`: OLS nulo → HLM2 → HLM3 para Lula (13) e Flávio (22), com `gpboost`. ICC Lula: UF 62,7%, município 21,7%, seção 15,6%. Flávio: 60,5% / 22,9% / 16,6%. Validado contra o `statsmodels` (log-verossimilhança −225.328,4 x −225.328,8).

**Site (site/, Vite + React + TypeScript + MapLibre)**
- Páginas: Início (busca, ICC, efeito dos estados), Urna (`#/urna/UF/zona/seção`: boletim de urna + camadas + perfil + seções do mesmo local), Município (mapa de locais OpenFreeMap + tabela), Mapa (coroplético dos municípios), Método, Sobre.
- Dados estáticos gerados por `pipeline/07_exportar_site.py` em `site/public/dados/` (fora do git; o CI gera).
- Verificado com screenshots (desktop/celular, claro/escuro) sem erros de console: `python site/scripts/telas.py`.
- Publicação: `.github/workflows/site.yml` (valida → exporta → build → GitHub Pages).

**Repositório**
- `git init` feito na branch `main`, **sem nenhum commit**. Commitar só com autorização do usuário.

## Decisões (e por quê)

- Nome **Urna em Camadas**; assinatura **Eduardo Ben Hur**; repo público; GitHub Pages; licença MIT (código) + CC BY 4.0 (dados e textos).
- Só Python. `gpboost` é o motor (o `statsmodels` leva ~5 min por modelo e quebra com `use_sparse`).
- Os dois candidatos do 2º turno são modelados, e o site deixa escolher: decompor só um lado pareceria partidário.
- Cores: Lula vermelho, Flávio azul (convenção dos mapas eleitorais = polos do par divergente validado). Braço vermelho calculado com a mesma luminosidade OKLCH da rampa azul (`site/src/lib/cores.ts`). Paleta validada com o `validate_palette.js` da skill de dataviz.
- Previsão do 2º turno: pré-registro com embargo; publicar só depois de 25/10.

## Pendências, em ordem de prioridade

1. **Publicar no GitHub.** Trocar `EDUARDO-GITHUB` pelo usuário real em `site/src/lib/projeto.ts` e `LICENSE-DADOS.md`. Primeiro commit (pedir autorização). Criar o repositório público: o `gh` não está instalado (`winget install GitHub.cli` ou criar pelo site). No repositório: Settings → Pages → Source: GitHub Actions.
2. **Previsão do 2º turno (tem prazo: registrar até ~20/10).** Baixar os boletins de urna de 2022 (1º e 2º turnos, conjunto `resultados-2022-boletim-de-urna` no Portal de Dados Abertos do TSE). Compatibilizar seções 2022 → 2026 (seções mudam; usar local de votação e coordenadas). Modelar a transição 1T → 2T de 2022 por seção, aplicar ao 1T de 2026 e pré-registrar no OSF com embargo.
3. **Step-up M2–M6 com `gpboost`.** Nível 1: % mulheres, 16–24, 60+, até fundamental incompleto, superior, abstenção. Nível 2: log da renda média, % pretos e pardos, % evangélicos, % urbana, % no Bolsa Família, log do PIB per capita (checar colinearidade). Nível 3: no máximo 2–3 variáveis (região, alinhamento do governador; a definir). Depois, inclinação aleatória da escolaridade por UF e interações entre níveis. Levar a camada "perfil do eleitorado" para a página da urna.
4. **Espacial.** Moran e LISA nos BLUPs dos municípios (pesos de contiguidade da malha do IBGE); regionalização (`spopt`: SKATER ou max-p); zoom por local de votação em SP.
5. **Site.** Imagem de compartilhamento (og:image 1200×630); página de Dados (downloads + dicionário); card da urna para compartilhar; página da previsão (depois de 25/10); exposição ao tarifaço (Comex Stat) no nível municipal; teste em celular real.

## Problemas conhecidos

- Boa Esperança do Norte (MT, IBGE 5101837) foi criado depois do Censo e da malha de 2022: sem geometria e sem variáveis do Censo, mas as urnas existem na base.
- A seção 228 da 1ª ZE de SP concentra eleitores de 60+ (seção agregada/acessibilidade). Não usar como exemplo; o exemplo do site é a 240.
- O estilo escuro do OpenFreeMap avisa que falta o ícone "circle-11" (externo, inofensivo).
- `gpboost` `get_cov_pars(std_err=True)` estoura a memória nessa escala: inferência das variâncias por LRT.
- O modelo não pondera as seções (nenhum dos dois motores aceita pesos no caso usado).

## Comandos

```bash
python pipeline/03_validar_controle.py     # tem que passar
python pipeline/05_hlm_nulo.py
python pipeline/07_exportar_site.py
cd site && npm run dev                     # http://localhost:5173
cd site && npm run build && npx vite preview --port 4173   # para os screenshots
python site/scripts/telas.py               # QA visual (Playwright + Chromium já instalados)
```

Ambiente: Windows 11, Anaconda (Python 3.13), Node 22. Pacotes Python em `requirements.txt`.
