# Handoff: estado do projeto

Atualizado em 08/10/2026. Lido automaticamente pelo Claude Code (importado no `CLAUDE.md`). Ao terminar uma sessão de trabalho, atualizar este arquivo.

> **Próxima sessão: siga o [`docs/plano_reorganizacao.md`](docs/plano_reorganizacao.md) a partir do R3.** Em 08/10 o usuário pediu para reorganizar o site em torno da ferramenta: "virar voto" como o principal, o técnico concentrado num lugar só e explicado para técnicos e leigos, tudo coerente, fácil de pesquisar e de entender como usar. O plano traz o diagnóstico medido, a estrutura nova, o que muda em cada página, para onde vai cada conteúdo, os endereços antigos a manter, o vocabulário, o padrão de explicação em camadas, o calendário (R0 a R3) e a verificação. As decisões D1 a D10 **foram confirmadas em 08/10** ("pode seguir com as recomendações"). R0, R1 e R2 estão publicados (seção "Reorganização", logo abaixo). O R3 é o teste com 5 a 8 pessoas, que depende do usuário, e a revisão final. O plano anterior ([`docs/plano_virar_voto.md`](docs/plano_virar_voto.md)) está executado até o P2.2; o teste com 5 a 8 pessoas (P2.3) e a decisão sobre a 3ª ação passaram para o novo plano (R3 e D9). Testes: `python site/scripts/testes.py` (local e ao vivo) e `python site/scripts/inventario.py` (palavras e jargão por página). Prazo duro: último deploy em 24/10; nada novo no dia 25.

## Onde paramos

**Reorganização em torno da ferramenta (08/10; `docs/plano_reorganizacao.md`)**
- R0 (publicado, commit 32f1f0a): a inicial `#/` é a ferramenta (`pages/Virar.tsx`; `#/virar?...` redireciona com os mesmos parâmetros); menu de 6 itens (Virar voto · Como usar · Confira sua urna · Entenda · Método e dados · Sobre); guia `#/como-usar` (`pages/ComoUsar.tsx`, `?ir=`), com a lei completa e um exemplo calculado na hora; urna com a ação primeiro (D6); a 3ª conversa só dentro da ferramenta, como opção avançada (D9); vocabulário único (D8); o mapa da cidade (MapLibre) só carrega quando aparece uma cidade.
- R1 (publicado): `#/entenda` (`pages/Entenda.tsx`) responde em 5 perguntas curtas, sem jargão, por que agir por lugar (`?ir=lugar|estado|vizinhos|escola|surpresas|conversa`); cada resposta tem "Para quem vai conversar" e o link "Detalhe técnico" para o bloco certo de Método e dados. Medido: 1.109 palavras, 0 termos técnicos, 5.744 px (a análise antiga tinha 3.214 palavras, 17 termos e 15.034 px). `#/metodo` (`pages/Metodo.tsx`) virou "Método e dados": 9 blocos no padrão `components/BlocoTecnico.tsx` (pergunta, resposta curta, como funciona e, fechado, o "Detalhe técnico", que a busca do navegador encontra e abre); `?sec=simples|fontes|contas|modelo|explicacoes|espaco|numeros|dados|reproduzir` rola até o bloco e abre o detalhe. Sem abrir nada, 2 termos técnicos visíveis (meta: até 15; Método e Dados somavam 128). O bloco "simples" traz a tabela "Do nome simples ao nome técnico". Componentes: `MetodoExplicativo.tsx` exporta `MetodoModelos` e `MetodoEspaco`; `MetodoVirar` e `CapituloExplicacoes` viraram conteúdo de detalhe; `ComoFoiFeito` é o "site em uma tela"; `DadosParaBaixar.tsx` saiu da página Dados. A Conferência ficou só com o que serve a quem vota (o técnico foi para `?sec=fontes`). `#/analise` (com `?cap=` ou o antigo `?c=c-...`, levando o `c=13|22`) e `#/dados` redirecionam (`App.tsx`). Saíram `pages/Analise.tsx`, `pages/Dados.tsx` e `components/ComoSabemos.tsx`.
- R2 (publicado): busca única de lugares (`components/BuscaLugar.tsx`, fase 1 da D10): no passo 2, sem cidade, procura cidades; com a cidade aberta, também escolas e bairros dela (no `locais/{cd}.json` que a ferramenta já carrega), em combobox acessível (setas, Enter, Esc, `aria-activedescendant`, contagem para leitor de tela). Escola abre "Perto de você" (`perto=`); bairro, a seção "No bairro" (`bairro=`, novo; os nomes da tabela de bairros também abrem). A cidade numa página só (D7): `?aba=resultado|secao` (sem aba, "Onde conversar"), com `components/CidadeAbas.tsx` (`ResultadoCidade`, `SecoesCidade`); `#/municipio/{cd}` redireciona (`RedirecionarMunicipio` em `App.tsx`) e `pages/Municipio.tsx` saiu. "Ver no mapa do Brasil" no nível Brasil e estado carrega o mapa só quando pedido (teste de rede na bateria `publico`). Mapa (`#/mapa`) com as vistas em dois grupos ("Para agir", "Para entender"), abrindo na da ferramenta, sem jargão e com "Como foi calculado" para o bloco certo de Método e dados. Rodapé com links e a frase da neutralidade; Sobre com "Achou um erro?" (issues) e a inspiração metodológica. Vocabulário: "cidade" nas legendas e dicas dos mapas. A busca fase 2 (escola em qualquer cidade do estado, arquivos novos por UF) não foi feita: é opcional no plano.
- Próximo: R3 (teste com 5 a 8 pessoas na estrutura nova, tarefa "ache a sua escola e diga onde você conversaria", que depende do usuário; correções; revisão final). Último deploy em 24/10.
- As seções abaixo descrevem também a estrutura anterior (inicial em `pages/Inicio.tsx`, análise em `#/analise`); onde divergirem, vale esta.

**Dados (pipeline/, validados)**
- Base nacional por seção do 1º turno de 2026: 497.897 urnas, 5.571 municípios, 27 UFs (`data/processed/base_secao_2026.parquet`). Bate exatamente com a totalização oficial do TSE para SP (7 totais) e com o g1 na 1ª ZE (Bela Vista). `pipeline/03_validar_controle.py` roda no CI.
- Contexto municipal (Censo 2022, PIB 2022, Bolsa Família ago/2026) em `data/processed/contexto_municipal.parquet`.
- Brutos do TSE (7,6 GB de zips, ~20 GB descompactados) em `~/dados/tse` (fora do repo): zips conferidos por SHA-512 e `intermediario/` com Parquets por UF.
- Nomes de município: a tabela TSE ↔ IBGE capitaliza preposições ("Santa Rosa Do Purus"); o 06 corrige (`nome_municipio`). Reexecutado em 07/10: só os nomes mudaram (1.307), o resto do Parquet saiu idêntico.

**Modelo**
- `pipeline/05_hlm_nulo.py`: OLS nulo → HLM2 → HLM3 para Lula (13) e Flávio (22), com `gpboost`. ICC Lula: UF 62,7%, município 21,7%, seção 15,6%. Flávio: 60,5% / 22,9% / 16,6%. Validado contra o `statsmodels` (log-verossimilhança −225.328,4 x −225.328,8).

**Acessibilidade e linguagem simples (07/10, depois de uma auditoria pedida pelo usuário)**
- Inicial curta (busca, conferência, 3 achados em frases simples, "como ler os números"); os 7 capítulos foram para `#/analise` (`?c=c-estado` abre num capítulo), cada um com uma frase "Em resumo". A urna abre com uma frase do tipo "Nesta urna, Lula teve 68 de cada 100 votos válidos, bem acima do que se esperava…".
- Unidade "pontos" no lugar de "p.p." (`lib/formato.ts`: 1 ponto = 1 voto em cada 100; "ponto" abaixo de 2); "desvio-padrão" virou "um lugar bem acima da média" fora do Método e dos "Como sabemos".
- Prosa ≥ 16 px, gráficos ≥ 14 px, linhas clicáveis ≥ 24 px, tabelas com rolagem focáveis (`components/TabelaRolagem.tsx`), mapas como `role="region"`, menu do celular em duas linhas.
- Auditoria (celular 390 px, CPU 4x, 4G ruim; axe-core): inicial de 20 para 3 telas; texto < 14 px na urna de 29% para 0%; alvos pequenos na inicial de 90 para 1; falhas WCAG de 6 para 0; jargão na inicial de 36 para 0 por mil palavras. Os alvos pequenos que sobram são links dentro de frases (exceção da WCAG 2.5.8) e os créditos do MapLibre.

**Modelos explicativos e espaço (07/10; `pipeline/10_hlm_stepup.py`, `pipeline/11_espacial.py`)**
- Desenho fixado em `docs/plano_de_analise.md` antes dos resultados, com os desvios registrados lá (índice de escolaridade, Mundlak simples para a tabela, binomial descartado porque não convergia).
- Camada do estado (Shapley, 128 modelos, Lula; Flávio quase igual): região 46%, renda/PIB/Bolsa Família 22%, cor ou raça 10%, religião 8%, escolaridade da seção 4%, urbanização 1%, idade e sexo 0%; sobram 10%. Sem a região: perfis explicam 71%.
- Efeito médio do estado cai de 15,9 para 6,9 p.p. (Lula) com o perfil; SC −24,4 → −1,4; PI +28,1 → +12,3. Acre e Pará se afastam do zero (o perfil previa mais Lula).
- 4 níveis: estado 56%, município 20%, local de votação 20%, seção 3% (Lula): o que parecia da seção é do bairro.
- Espacial: Moran/LISA dos efeitos municipais, 27 regiões de voto (SKATER, ~2,5 min), processo gaussiano nas coordenadas (degrau x rampa), surpresa por local de votação em SP. A malha TopoJSON do IBGE não traz CRS: o 11 define EPSG:4674.
- Site: capítulo 4 completo (componentes `CapituloExplicacoes`, `PontosHorizontais`), mapa com 5 vistas (`#/mapa?v=...`: resultado, efeito, o que o perfil não explica, bolsões, regiões de voto), "Surpresa" no mapa de locais do município, camada "+ perfil do eleitorado" na urna, Método seções 5 e 6, notebook `notebooks/10_composicao_contexto.ipynb`.
- Bootstrap feito em 07/10 (`--bootstrap 100`, estados reamostrados dentro de cada região; ~45 s por reamostragem, ~2,5 h no total; 0 falhas): o modelo completo explica 90% [87%, 93%] da camada do estado (Lula); % de 60+ e % urbana não se distinguem de zero. Se os modelos forem refeitos, rodar o bootstrap de novo (ele só acrescenta ao JSON).
- Tarifaço (`pipeline/12_tarifaco.py`, extensão): exportações de 2024 para os EUA por habitante (API do Comex Stat; o servidor de arquivos em lote recusa conexão daqui, a API funciona; respostas guardadas em `RAW_DIR`). Quase nada: Lula +0,17 p.p./DP (p = 0,13), Flávio −0,48 (p < 0,001), camada do estado não encolhe.

**Onde virar voto: o centro do site (08/10; plano em `docs/plano_virar_voto.md`, executado até o P2.2)**
- Inicial (`pages/Inicio.tsx`): "Onde a sua conversa pode virar voto". Passo 1 "Para quem?" (`components/EscolhaCandidato.tsx`: os dois com o mesmo peso, nenhum escolhido de antemão); passo 2 "Por onde começar?" (pela minha urna = `Busca`; por um lugar = estado e cidade → `#/virar`); três jeitos de fazer diferença, com os números nacionais; por que pensar em bairros (os achados como argumento); a lei curta (`components/LeiCurta.tsx`); "depois de votar, confira". Em 390 px o passo 1 aparece sem rolar.
- Candidato que viaja (`lib/candidato.ts`, `useCandidato`): `?c=13|22` na URL e cópia na sessionStorage da aba. Sem escolha, as páginas de análise mostram Lula (a ordem do site); as telas de ação não escolhem ninguém (bloco da urna) ou abrem na conta sem lado (votos em aberto, no mapa e no município). O capítulo da análise passou para `?cap=` (links antigos `?c=c-...` continuam abrindo).
- Três ações (`lib/virar.ts`, `LENTES`): lembrar quem faltou (saldo), conversar com quem ficou de fora (abertos) e onde o perfil promete mais (experimental: max(0, −surpresa) × válidos). Estados e municípios trazem `saldo13/22` e `gap13/22` somados escola por escola (`pipeline/07`); nas escolas, o navegador calcula. Totais: faltosos 32.894.899 (= abstenções), abertos 15.251.315, saldo Lula 3.888.389 / Flávio 4.656.407, abaixo do perfil Lula 2.421.342 / Flávio 2.080.423.
- Trava da exportação (`conferir_virar` no 07): antes de gravar o primeiro arquivo, confere que faltosos, abertos, saldos e gaps fecham entre estados, municípios e escolas (tolerância de 1 voto por município), que faltosos = abstenções e que aptos = faltosos + abertos + Lula + Flávio em cada estado e município. Testada quebrando números de propósito. A saída agora é idêntica byte a byte entre execuções (os locais saem ordenados).
- Urna (`components/AgirUrna.tsx`): bloco "Daqui até o dia 25" com a escola da urna e as escolas a até 2 km (totais, as 3 primeiras da ação, botão para o mapa e o cartão "perto de mim", que só traz os números sem lado). Referência conferida: `#/urna/SP/403/411` (EMEI Elísio Teixeira Leite) = 35 escolas perto, saldo de Lula 5.539, Flávio sem escola à frente, abaixo do perfil para Flávio 3.460.
- `#/virar?...&perto={zona}-{local}`: anel de 2 km no mapa (prop `anel` do `MapaLocais`) e tabela "Perto de você"; `?ir=como-fazer` ou `?ir=como-calculamos` abre a lei completa ou o "Como calculamos". A lei completa ganhou o impulsionamento pago (Lei 9.504/1997, art. 57-C).
- Mapa nacional `#/mapa?v=virar&a=...`: cada conta por 100 eleitores aptos, 5 classes fixas e iguais para os dois (`CORTES_VIRAR` em `components/Mapas.tsx`); rampas sequenciais em `lib/cores.ts` (vermelho Lula, azul Flávio, cinza para os votos em aberto), validadas com `validate_palette.js --ordinal` nos dois modos. Município: vista "Virar voto" no mapa de locais.
- Análise: cada capítulo tem "Para quem vai conversar"; o capítulo 4 ganhou os quatro níveis (a escola pesa mais que a urna); o 7 virou "Do mapa à conversa". Método seção 8 (`components/MetodoVirar.tsx`), três decisões novas em `lib/decisoes.ts`, colunas novas no dicionário de Dados. Vitrine: título, og:*, `og.png` (os dois candidatos com o mesmo peso), llms.txt, README, Sobre.
- **A 3ª ação precisa de uma decisão do usuário.** Os dados mostram que ela aponta, em boa parte, para bairros onde o adversário é forte por motivos que o modelo não vê (renda do bairro, história política): em São Paulo, as escolas mais abaixo do esperado para Lula ficam em bairros ricos (Campo Belo, Cidade Jardim); para Flávio, no centro expandido (Consolação, Perdizes). O site diz isso no aviso, no "Como calculamos" e no Método. Opções: manter como está (experimental, com o aviso), tirar da inicial ou retirar.
- Depois de 25/10: decidir o que fazer com a página (registro ou comparação dos turnos). Nenhum conteúdo novo no dia 25.
- Referência metodológica (08/10): o artigo de Gomes e Tarantin Junior (Quaestum, 2025) é **inspiração metodológica**, não origem nem continuação (correção do usuário). A citação em ABNT, passada por ele, está no Método ("Inspiração metodológica"), no README e no plano de análise.
- O site só fala do que foi entregue (08/10): a decisão "sem previsão do 2º turno" saiu do site e do README; o registro fica no plano de análise e no histórico.
- Verificação no repositório (08/10): `site/scripts/testes.py` (4 baterias no navegador: candidato, ação, perfil e conteúdo público; local ou ao vivo) e `site/scripts/inventario.py` (palavras e jargão visíveis por página: a linha de base da reorganização).

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
- Análise (`#/analise`; até 07/10 ficava na inicial) = história em 7 capítulos: 1 jogo "Adivinhe uma urna" + escada de erro; 2 o estado (ICC + efeito dos estados); 3 vizinhança x divisa + cidades gêmeas; 4 "Quem mora ali ou onde fica?" (aviso: entra com o step-up); 5 surpresas (escolas, municípios que contrariam o estado); 6 "Como foi feito" (linha do tempo das etapas, o caso do nulo técnico, decisões); 7 por que importa. Cada capítulo tem um "Como sabemos" recolhível. Um seletor Lula/Flávio repete nos capítulos.
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
- Previsão do 2º turno: não será feita; a promessa saiu do site em 08/10 (P0.1), e o desvio está registrado em `docs/plano_de_analise.md`. Por decisão do usuário (08/10), o site também não fala dela, nem como decisão nem como próxima etapa: o público nunca viu a previsão, então a menção só ocupava espaço. O registro fica no plano de análise e no histórico do repositório.
- Ações sem candidato escolhido: o bloco da urna não escolhe ninguém; o mapa e o município abrem na conta sem lado (votos em aberto). O cartão "perto de mim" só traz números sem lado, e o link compartilhado não leva candidato.
- Cores do "Onde virar voto" no mapa: uma cor por candidato, cinza para os votos em aberto; 5 classes fixas e iguais para os dois candidatos, para os mapas poderem ser comparados.
- **Centro do projeto (08/10):** "Onde virar voto". O resto do site serve a essa história (`docs/plano_virar_voto.md`).
- Ordem combinada com o usuário (07/10): história do site primeiro e publicação logo, previsão em seguida (prazo ~20/10).
- Escala divergente no modo escuro: extremos `#ff716b` / `#5fa7ff` (L 0,72, croma máximo) no lugar do degrau 200 (croma 0,08, lia como pastel/"fraco"). Cada braço validado com `validate_palette.js --ordinal --mode dark`.
- **Respondido em 08/10 pela centralidade do "Onde virar voto"** (a ação possível que o usuário pedia). Registro anterior: o usuário questionou a história ("qual a ação possível? o que faz cada lugar votar como vota? qual o ganho para a sociedade?"). A história atual responde "quanto" e "onde", não "por quê". Direções propostas: (A) espinha "por que cada lugar vota como vota", puxada pelo step-up M2–M4; (B) "confira você mesmo": soma das urnas x totalização oficial nas 27 UFs. Aguardando a escolha antes de mexer de novo na inicial.
- Linguagem do site: jargão só dentro do "Detalhe técnico" de Método e dados (fora dele, nenhum termo da lista do `site/scripts/inventario.py`); números em pontos; falar de urnas e lugares, nunca de eleitores; os dois candidatos sempre lado a lado; artigo dos estados via `site/src/lib/ufs.ts` ("no Paraná", "na Bahia").

## Pendências, em ordem de prioridade

1. **Reorganizar o site em torno da ferramenta** ([`docs/plano_reorganizacao.md`](docs/plano_reorganizacao.md)): D1 a D10 confirmadas; R0, R1 e R2 publicados entre 08 e 09/10. Falta o R3 (18–22/10): o teste com 5 a 8 pessoas (antigo P2.3) na estrutura nova, que depende do usuário, e a revisão final. A 3ª ação ficou como opção avançada só dentro da ferramenta (D9, opção b). Opcional: busca fase 2.
   - Depois de 25/10: baixar o 2º turno, repetir a conferência e a decomposição, comparar os turnos. Nenhum conteúdo novo no dia 25/10.
   - Previsão do 2º turno: **não será feita** (decisão de 07/10; plano de 08/10). Se o usuário mudar de ideia, a receita era: boletins de 2022 (1º e 2º turnos), compatibilizar seções 2022 → 2026 por local e coordenadas, transição 1T → 2T por seção, registro no OSF com embargo antes de 25/10.
2. **Próximos passos de alcance** (análise de 07/10): vídeo de 60–90 s com legenda (roteiro com o Claude, produção do usuário); CSV, DOI no Zenodo e resumo em inglês; gráficos para embutir; teste com 5–8 pessoas de idades e escolaridades diferentes ("ache sua urna", "explique o 63%").
3. **Site.** Feito em 07/10: imagem de compartilhamento (`site/scripts/og.py` → `site/public/og.png`), página de Dados (`#/dados`), cartão da urna para compartilhar (`site/src/lib/cartao.ts`, canvas 1200×630; no celular vai junto no compartilhamento, no computador é baixado), tarifaço (`12`). Falta: teste em celular real.
4. Para enviar: `git push` (o Git Credential Manager autentica; o `gh` não está instalado).

## Problemas conhecidos

- Boa Esperança do Norte (MT, IBGE 5101837) foi criado depois do Censo e da malha de 2022: sem geometria e sem variáveis do Censo, mas as urnas existem na base.
- A seção 228 da 1ª ZE de SP concentra eleitores de 60+ (seção agregada/acessibilidade). Não usar como exemplo; o exemplo do site é a 240.
- O estilo escuro do OpenFreeMap avisa que falta o ícone "circle-11" (externo, inofensivo).
- `gpboost` `get_cov_pars(std_err=True)` estoura a memória nessa escala: inferência das variâncias por LRT.
- Gráficos SVG só desenham depois de medir a largura (`useLargura` devolve 0 até lá); desenhar com largura provisória fazia os pontos deslizarem na carga.
- Corrigido em 08/10: 258 das 2.640 zonas não abriam no site ("Zona não encontrada"). As coordenadas anuladas dos locais (sentinela −1 do TSE) saíam como `NaN` no JSON, que o navegador não lê. Agora `07_exportar_site.py` converte para `null` e grava com `allow_nan=False` (um `NaN` novo derruba a exportação em vez de publicar arquivo quebrado). O site distingue zona inexistente (404) de falha de leitura. Isso provavelmente explica o "Sortear uma urna" que, uma vez no Playwright, não mostrou as pistas: o sorteio caía numa zona quebrada em cerca de 10% das vezes.
- O modelo não pondera as seções (nenhum dos dois motores aceita pesos no caso usado).
- `site/scripts/telas.py`: nas rotas com mapa, a foto é só da janela, crescida até a altura da página. A foto de página inteira redimensionava a janela no meio da captura e o canvas do mapa (WebGL) saía desenhado pela metade (não era defeito do site).
- No Chrome de desktop, "Compartilhar" abre a folha de compartilhamento do sistema (Web Share); onde não há, o link é copiado.

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
