# Handoff: estado do projeto

Atualizado em 29/10/2026. Lido automaticamente pelo Claude Code (importado no `CLAUDE.md`). Ao terminar uma sessão de trabalho, atualizar este arquivo.

> **Próxima sessão:** Lula foi reeleito em 25/10 e a inicial virou "Lula reeleito", o 2º turno por município ([`docs/plano_segundo_turno.md`](docs/plano_segundo_turno.md), onda 1). Por decisão do usuário (26/10), o site agora tem lado; a ferramenta da campanha fica em `#/ferramenta`, neutra, como registro. As escolas do 2º turno (a partir do resultado oficial por seção), o gráfico das 17h às 19h e a desistência da anulação foram publicados em 29/10 (testes ao vivo sem falhas). Feita em 29/10: a conta própria dos votos depois das 17h nos logs das urnas (`pipeline/15_votos_depois_17h.py`, desenho registrado em `docs/plano_de_analise.md` antes de rodar): 34.330, igual à da Setup News/CNN nos três números publicados, com o 1º turno ao lado (3.710.586, sem prorrogação). Pendências: a onda 3 (comparecimento por faixa etária, ainda só com o 1º turno) e, opcional, a conta das urnas que ficaram abertas até as 19h (ver Pendências). Boletins de urna do 2º turno: 26 estados em 29/10, falta RR. Para ver se o TSE publicou: a página do conjunto `resultados-2026-boletim-de-urna` no Portal de Dados Abertos. Antes e depois de mexer no site, rodar `python site/scripts/testes.py` (local e ao vivo).

## O site hoje

https://duhbenhur.github.io/urna-em-camadas/ · menu: 2º turno · Ferramenta · Confira sua urna · Entenda · Método e dados · Sobre.

| Endereço | O que é | Arquivos principais |
|---|---|---|
| `#/` | "Lula reeleito" (desde 26/10): a abertura com a foto (faixa panorâmica de ponta a ponta, 2000 px no computador e 1000 px no celular, com o título sobre a parte de baixo e o crédito no fim), o mapa das cidades com três vistas (`v=`: onde Lula ganhou e onde virou; `avanco`, quanto a diferença andou para Lula; `votar`, quanto a abstenção caiu), a cidade com os dois turnos (`cidade=`), as cidades que viraram, os estados (`e=`), a abstenção por estado, a cronologia das 17h às 19h com as fontes, os votos depois das 17h contados nos logs das urnas (a curva acumulada, o gráfico por minuto com o 1º turno ao lado, as tabelas e a conta por estado; `dados/horario.json`) e a conferência da soma; link para a ferramenta | `pages/SegundoTurno.tsx`, `components/MapaSegundoTurno.tsx`, `components/GraficoHorario.tsx`, `lib/segundo.ts`, `lib/horario.ts` |
| `#/ferramenta` | Registro da campanha (a inicial até 24/10), com um aviso no topo. A ferramenta "Onde a sua conversa pode virar voto": 1 para quem → 2 onde (estado e busca única) → 3 que conversa → limites em destaque → resultado (Brasil, estado, cidade). Todo o estado vai na URL: `?c=13\|22&a=faltosos\|abertos\|perfil&uf=&m=&perto={zona}-{local}&bairro=&aba=resultado\|secao&local=&vista=surpresa` | `pages/Virar.tsx`, `components/BuscaLugar.tsx`, `components/LimitesNumeros.tsx`, `lib/virar.ts` |
| cidade (`#/?m=`) | Três abas: Onde conversar (mapa, Perto de você, No bairro, bairros, escolas), Resultado do 1º turno (os dois candidatos e o mapa resultado/surpresa), Ache a sua seção (escolas com filtro e as seções de cada uma) | `components/CidadeAbas.tsx` |
| `#/folha?m=&perto=` ou `&bairro=` | Folha do bairro: uma página A4 (até 15 escolas) ou texto para o grupo, sem candidato (para cada escola, quem ficou à frente e o saldo dele) | `pages/Folha.tsx`, `lib/folha.ts` |
| `#/como-usar` | O guia: `?ir=minuto\|conversas\|exemplo\|lista\|limites\|lei\|compartilhar\|glossario\|perguntas` | `pages/ComoUsar.tsx` |
| `#/urna/UF/zona/seção` | "Daqui até o dia 25" primeiro, depois o boletim com o selo de conferência e as camadas da urna | `pages/Urna.tsx`, `components/AgirUrna.tsx` |
| `#/conferencia` | Como conferir a urna com o boletim impresso; a soma por estado; o nulo técnico | `pages/Conferencia.tsx` |
| `#/entenda` | Por que agir por lugar, em 5 respostas sem jargão: `?ir=lugar\|estado\|vizinhos\|escola\|surpresas\|conversa` | `pages/Entenda.tsx` |
| `#/metodo` | Método e dados: 9 blocos no padrão `BlocoTecnico` (pergunta, resposta curta, como funciona, detalhe técnico fechado): `?sec=simples\|fontes\|contas\|modelo\|explicacoes\|espaco\|numeros\|dados\|reproduzir` (e `inspiracao`) | `pages/Metodo.tsx`, `components/MetodoExplicativo.tsx`, `MetodoVirar.tsx`, `DadosParaBaixar.tsx`, `ComoFoiFeito.tsx` |
| `#/mapa?v=` | Mapa das cidades, com as vistas em dois grupos: para agir (`virar`) e para entender (`margem`, `efeito`, `semperfil`, `bolsoes`, `regioes`) | `pages/Mapa.tsx`, `components/Mapas.tsx` |
| `#/sobre` | Quem fez, transparência, como relatar erro, inspiração metodológica, o que o site não é | `pages/Sobre.tsx` |

Endereços antigos que redirecionam (`App.tsx`): `#/?…` com os parâmetros da ferramenta (`c, a, uf, m, perto, bairro, aba, local, vista`: cartões e folhas já compartilhados) → `#/ferramenta?…`; `#/virar?…` → `#/ferramenta?…`; `#/analise` (com `?cap=` ou o antigo `?c=c-…`) → a resposta certa do Entenda (os bastidores vão para `#/metodo?sec=simples`); `#/dados` → `#/metodo?sec=dados`; `#/municipio/{cd}` → a cidade na ferramenta, na aba do resultado (com `?local=`, na das seções; com `?a=`, em "Onde conversar").

O que vale para o site todo:
- **O site tem lado desde 26/10** (decisão do usuário): a inicial celebra a reeleição ("Viva o governo Lula!", assinado), a foto é a principal (Ricardo Stuckert / Lula Oficial, “24.10.2026 - Lula em São Paulo: O Brasil Pronto Pra Mais” (https://www.flickr.com/photos/lulaoficial/55610270110/), CC BY-SA 4.0; crédito na abertura, no Sobre e no README; as versões recortadas e a imagem de compartilhamento seguem sob a mesma licença), o mapa pinta de vermelho só onde Lula ganhou. O Sobre ("De que lado o site está") e o rodapé dizem que na campanha o site foi neutro e que depois do resultado o autor tomou lado. Os números continuam oficiais e conferidos, e o texto diz também o que não favorece (Uirapuru, GO, virou para Flávio; a abstenção subiu em 9 estados). A ferramenta continua neutra, como era.
- **Mapas do 2º turno** (`lib/cores.ts`, `segundoTurnoAtual`): cinza (Flávio ganhou ou empatou) · vermelho (Lula ganhou) · verde (virou: #0a5c2b no tema claro, #4fd17f no escuro; pedido do usuário, porque um vermelho mais claro parecia "menos votos"; validado contra o vermelho com --pairs all); avanço com cinza e três vermelhos; abstenção na rampa cinza. Validados com o `validate_palette.js` (cinza x primeiro vermelho, ΔE ≥ 10 para daltonismo, nos dois temas).
- **Candidato que viaja** (`lib/candidato.ts`, na ferramenta e nas páginas de análise): `?c=` na URL e cópia na sessionStorage da aba. Nas telas de ação, nada vem escolhido de antemão; nas de análise, sem escolha, aparece Lula (a ordem do site).
- **As três conversas** (`lib/virar.ts`, `LENTES`): lembrar quem faltou (saldo possível), conversar com quem votou em outro (votos em aberto) e, como opção avançada e experimental só dentro da ferramenta, votos abaixo do esperado (D9). Estados e cidades trazem os totais somados escola por escola (`pipeline/07`); nas escolas, o navegador calcula.
- **Nota com asterisco** embaixo de toda tabela com o número principal de uma conversa (`notaColuna`), com o nome do candidato escolhido; nos bairros, cidades e estados, explica por que um lugar onde ele ficou atrás no total ainda tem saldo.
- **Limites em destaque** na ferramenta, antes dos resultados, e a seção `limites` do guia, com as fontes (Gerber e Green; Kalla e Broockman, 2018).
- **O que o site compartilha não leva candidato:** o cartão "perto de mim" (`lib/cartao.ts`) e a folha do bairro.
- **O mapa em destaque** (12/10, pedido do usuário): no passo 1, cada candidato traz a miniatura do mapa do Brasil com o saldo possível dele (imagens de ~20 kB em `site/public/miniaturas/`, geradas do próprio mapa por `site/scripts/miniaturas.py`; regenerar se os dados ou as cores mudarem). Em cada nível, o resultado começa pelo mapa: no Brasil e no estado, o mapa das cidades (no estado, com o zoom nele, prop `foco`); na cidade, o mapa das escolas, antes dos totais e dos limites. Ao escolher um lugar (busca, estado, lista, mapa), a página rola até o resultado (`irPara` em `Virar.tsx`). Os mapas no meio da página usam gestos cooperativos (no celular, um dedo rola a página e dois mexem no mapa; textos em português); a página `#/mapa` não usa.
- **O MapLibre só carrega quando um mapa chega perto da tela** (`lib/useVisivel.ts`), para a inicial abrir rápido.
- **Contagem de visitas anônima** (10/10): GoatCounter, conta `urna-em-camadas` (painel em https://urna-em-camadas.goatcounter.com, do usuário). O script fica no `index.html` com `no_onload`; `components/ContarVisitas.tsx` conta cada página uma vez por caminho (`/`, `/estado/sp`, `/cidade/sao-paulo-sp[/perto|/bairro|/resultado|/secao]`, `/urna/sp`, `/folha/sao-paulo-sp`, `/metodo/{sec}`, `/mapa/{v}` etc.), e `lib/contagem.ts` manda os eventos (`folha-imprimir`, `folha-texto`, `cartao-compartilhar`, `cartao-baixar`, `mapa-cidade` (tocar numa cidade do mapa do Brasil), `busca-cidade|escola|bairro`). Nunca o candidato, a zona, a seção, a escola ou o texto da busca. Em navegador automatizado nada sai (fica em `window.__contagens`; bateria `contagem` dos testes). `?naocontar=1` em qualquer endereço tira o navegador da contagem; `?naocontar=0` devolve.
- **Vocabulário:** cidade, escola, urna (seção), quem faltou, votos em aberto, saldo possível, pontos (1 ponto = 1 voto em cada 100). Jargão só dentro do "Detalhe técnico" de Método e dados.
- **Medidas** (`site/scripts/inventario.py`, 09/10): nenhum termo técnico visível fora de Método e dados (lá, 2 sem abrir os detalhes); Entenda com 1.093 palavras; guia com 1.792.

## Dados e validação

- **2º turno** (`pipeline/13_segundo_turno.py`, 26/10): resultado oficial por município do site de resultados do TSE (eleição 6258; 5.571 municípios + 186 do exterior; cache em `~/dados/tse/resultados_2t`). Conferido: soma = total do Brasil em 13 campos ("aptos" = eleitores das seções instaladas, a base da abstenção e dos boletins; o total anunciado, 158.745.502, inclui 423 eleitores de 41 seções do exterior não instaladas), soma = total de cada UF, 100% totalizado, comparecimento e abstenção iguais aos do arquivo de abrangência de cada UF; o `03` confere os totais contra o anunciado e o `07` só grava `segundo_turno.json` se país + exterior = Brasil. Os boletins de urna do 2º turno (bweb_2t) e os arquivos de urna não estavam publicados em 26/10.

- **Votos depois das 17h** (`pipeline/15_votos_depois_17h.py`, 29/10): os logs das urnas do 2º turno ("arquivos transmitidos para totalização", 123 GB; cada log guarda também o 1º turno), um estado por vez, apagando o zip (`--manter` guarda; `--so-juntar` refaz só a junção a partir de `~/dados/tse/votos_horario`). Voto = linha "O voto do eleitor foi computado" da VOTA; fuso do município = 8 − hora local mais comum de "Urna pronta para receber votos". Cerca de 2% dos `.jez` trazem dentro outro `.jez` (log da urna substituída ou da carga anterior): o script lê todos e conta uma vez a linha repetida (a primeira rodada só abria o primeiro arquivo e perdia 11.672 urnas; correção registrada no plano de análise). Conferência: no 2º turno, 497.889 das 497.896 urnas com log têm votos iguais ao comparecimento oficial (as 7 que não conferem não têm voto depois das 17h); 1 urna sem log. No 1º turno, 496.306 com log, 496.208 conferem. O `07` copia `resultados/15_votos_depois_17h.json` para `site/public/dados/horario.json`.
- Base nacional por seção do 1º turno de 2026: 497.897 urnas, 5.571 municípios, 27 UFs (`data/processed/base_secao_2026.parquet`). Reproduz a totalização oficial do TSE para SP (7 totais) e o g1 na 1ª ZE (Bela Vista).
- Conferência (`pipeline/09_totalizacao_oficial.py` → `data/processed/totalizacao_secao_2026.parquet`; comparação no `pipeline/03_validar_controle.py`): as 497.897 seções são idênticas ao resultado oficial por seção, em todos os campos e para os 12 candidatos. Nulos = nulo da urna + nulo técnico (renúncia), que a tabela de detalhe não soma. Roda no CI: uma divergência bloqueia a publicação.
- Contexto municipal (Censo 2022, PIB 2022, Bolsa Família ago/2026) em `data/processed/contexto_municipal.parquet`; o 06 corrige os nomes de município da tabela TSE ↔ IBGE (`nome_municipio`). Exportações de 2024 para os EUA (Comex Stat) entram só no tarifaço (`12`).
- Brutos do TSE (7,6 GB de zips, ~20 GB descompactados) em `~/dados/tse`, fora do repositório; zips conferidos por SHA-512.
- Exportação do site (`pipeline/07_exportar_site.py`): a trava `conferir_virar` roda antes de gravar qualquer arquivo (faltosos, abertos, saldos e gaps fecham entre estados, municípios e escolas, com tolerância de 1 voto por município; faltosos = abstenções; aptos = faltosos + abertos + Lula + Flávio). Saída idêntica byte a byte entre execuções; `allow_nan=False` (um `NaN` derruba a exportação em vez de publicar arquivo quebrado).

## Números de referência

- 2º turno (TSE, 100%): Lula 64.256.232 (51,79%), Flávio 59.826.041 (48,21%); 1º turno: Flávio 56.104.503, Lula 53.879.538. Abstenção 21,08% → 19,22% (com o exterior): 2.960.239 pessoas a mais. Lula ganhou em 2.875 das 5.571 cidades; virou em 211 (10,9 milhões de eleitores); 1 virou para Flávio (Uirapuru, GO); 1 empate; Minas Gerais virou (Flávio +4,9 → Lula +0,9 ponto). A abstenção subiu em 9 estados: os 7 do Norte, o Maranhão e o Piauí.
- Votos depois das 17h (`15`, logs das urnas): 2º turno 34.330 (13.961 no 1º minuto, 29.001 até 17h05, 5.329 depois, em 3.850 urnas; último às 19h06:21, na cidade de São Paulo), igual à Setup News/CNN; o G1 publicou 35.521, sem detalhar. A diferença de Lula (4.430.191) é 129 vezes maior. 1º turno, sem prorrogação: 3.710.586 (108 vezes mais; 3.225.371 depois das 17h05), o último às 23h47.

- Contas da ferramenta (Brasil): faltaram 32.894.899 (= abstenções oficiais); votos em aberto 15.251.315; saldo possível Lula 3.888.389 e Flávio 4.656.407; votos abaixo do esperado Lula 2.421.342 e Flávio 2.080.423.
- Modelo nulo de três níveis (`05`, `gpboost`, validado com `statsmodels`: log-verossimilhança −225.328,4 x −225.328,8): Lula estado 62,7%, município 21,7%, seção 15,6%; Flávio 60,5%, 22,9%, 16,6%. Com quatro níveis (Lula): estado 56%, município 21%, escola 20%, seção 3%.
- Modelos explicativos (`10`, desenho fixado em `docs/plano_de_analise.md` antes dos resultados): camada do estado repartida pelo valor de Shapley (128 modelos; Lula, Flávio quase igual): região 46%, renda/PIB/Bolsa Família 22%, cor ou raça 10%, religião 8%, escolaridade da seção 4%, urbanização 1%, idade e sexo 0%; sobram 10%. Bootstrap (100 reamostragens de estados dentro das regiões): o modelo completo explica 90% [87%, 93%] da camada do estado.
- Espaço (`11`): Moran dos efeitos municipais depois do modelo completo 0,47; 27 regiões de voto (SKATER) explicam 84% da variação entre municípios, contra 74% dos estados; o processo gaussiano nas coordenadas absorve cerca de 94% da variância do estado (rampa mais que degrau); em São Paulo, Moran da surpresa por local de votação 0,71 (Lula).
- Entenda (`08`): erro ao adivinhar uma urna (Lula) 14,5 → 9,2 (estado) → 5,7 (cidade) → 3,5 pontos (escola); vizinhos com divisa diferem 8,4 pontos, contra 10,8 de duas cidades quaisquer do mesmo estado; 33 pares de cidades gêmeas, com resultado misto (ilustração, não manchete).
- Tarifaço (`12`, extensão registrada depois do desenho): quase nada (Lula +0,17 ponto por desvio-padrão, p = 0,13; Flávio −0,48, p < 0,001); a camada do estado não encolhe.
- Exemplo usado no site e nos testes: `#/urna/SP/403/411` (EMEI Conj. Res. Elísio Teixeira Leite): 35 escolas a até 2 km; saldo de Lula 5.539; Flávio sem escola à frente; abaixo do esperado para Flávio 3.460; votos em aberto 17.290.

## Verificação

- `python site/scripts/testes.py [endereço]`: seis baterias no navegador (segundo, candidato, acao, perfil, publico, contagem), local ou ao vivo. A `segundo` confere a inicial contra os números oficiais, as três vistas (cada legenda soma 5.571 cidades), a busca, Minas Gerais e o Rio de Janeiro virando, a cronologia com as 11 fontes, os votos depois das 17h contra `dados/horario.json` (as faixas e os estados somam o total, o 1º turno ao lado, a frase sobre a Setup News só se os três números baterem, os ponteiros dos dois gráficos), as escolas da cidade, a soma da conferência linha a linha e que um link antigo da ferramenta abre a ferramenta. Cobre, entre outros, a busca pelo teclado, as abas da cidade, os redirecionamentos, o mapa do Brasil só sob pedido, a nota de toda tabela com saldo, a folha em uma página A4 (gerando o PDF) e a regra de não citar a previsão. Muda junto com o site.
- `python site/scripts/inventario.py`: palavras e jargão visíveis por página.
- `python site/scripts/telas.py`: telas no computador (claro) e no celular (escuro), com os erros de console.
- Publicação: `.github/workflows/site.yml` (valida → exporta → compila → GitHub Pages). **O CI instala versões fixas** (duckdb 2.0.0, pandas 3.1.0, pyarrow 26.0.0): em 26/10 o DuckDB 2.0 tirou o `fetchone()` das relações e derrubou a publicação. Para subir uma versão, rodar `03` e `07` com ela num ambiente limpo e conferir que os arquivos do site saem idênticos byte a byte; no código, usar `.fetchall()[0]`, nunca `.fetchone()` em `duckdb.sql(...)`. Depois do push, acompanhar o deploy pela API pública do GitHub (`/repos/DuhBenhur/urna-em-camadas/actions/runs`; o `gh` não está instalado) e rodar os testes ao vivo.

## Decisões (e por quê)

- Nome **Urna em Camadas**; assinatura **Eduardo Ben Hur**; repositório público (https://github.com/DuhBenhur/urna-em-camadas); GitHub Pages; MIT para o código e CC BY 4.0 para dados e textos. Commitar e enviar só com autorização do usuário (dada para os planos em curso).
- Só Python no pipeline. `gpboost` é o motor (o `statsmodels` leva ~5 min por modelo e quebra com `use_sparse`).
- **Lado (26/10):** depois do resultado, o usuário decidiu que o site toma lado (celebra a reeleição, foto principal, mapa só vermelho onde Lula ganhou), contra a recomendação de manter a neutralidade (o argumento: quem fala em golpe descarta um site com lado). O registro da campanha fica neutro.
- **Neutralidade (na campanha, até 25/10):** os dois candidatos do 2º turno são modelados, aparecem com o mesmo peso e a conta é a mesma para os dois ("A mesma conta para os dois candidatos. O site não pede voto para ninguém."). Reconfirmada em 09/10: o usuário divulga a ferramenta com o lado dele, mas o site fica neutro e com os dois nomes (não "adversário"), porque é a neutralidade que protege o site.
- **Centro do projeto (08/10):** a ferramenta "Onde virar voto"; a inicial é a ferramenta e o resto do site serve a ela.
- **3ª conversa (D9, opção b):** "votos abaixo do esperado" fica só dentro da ferramenta, como opção avançada e experimental, com aviso: em boa parte, ela aponta bairros onde o adversário é forte por motivos que o modelo não vê (em São Paulo, bairros ricos para Lula; o centro expandido para Flávio).
- **Previsão do 2º turno:** não será feita (07/10), e o site não fala dela (08/10): o que não foi entregue ao público não aparece para o público. O desvio está registrado em `docs/plano_de_analise.md`.
- O artigo de Gomes e Tarantin Junior (Quaestum, 2025) é **inspiração metodológica**, não origem nem continuação; a citação em ABNT está no Método e dados, no README e no plano de análise.
- O que o site compartilha não leva candidato; sem candidato escolhido, o mapa e a cidade abrem na conta sem lado (votos em aberto).
- Cores: Lula vermelho, Flávio azul, cinza para o que não tem lado; braço vermelho com a mesma luminosidade OKLCH da rampa azul (`site/src/lib/cores.ts`); no modo escuro, extremos `#ff716b` / `#5fa7ff`. Paletas validadas com o `validate_palette.js` da skill de dataviz. No mapa da ferramenta, 5 classes fixas e iguais para os dois candidatos.
- Linguagem: jargão só no detalhe técnico; números em pontos e "de cada 100"; lugares, nunca pessoas; prosa ≥ 16 px; artigo dos estados via `site/src/lib/ufs.ts` ("no Paraná", "na Bahia").

## Pendências

1. **Onda 2: escolas publicadas em 29/10,** com o resultado oficial por seção (`14 --fonte totalizacao`; 4.704 escolas viraram para Lula, 97 para Flávio); **votos depois das 17h contados nos logs em 29/10** (`15`). Opcional: as urnas que ficaram abertas até as 19h. A conta "urnas encerradas depois das 17h" do plano não serve como está: o encerramento começa depois do último eleitor, e quase todas as urnas fecham depois das 17h (497.891 das 497.896 no 2º turno). O que diz algo é o início do encerramento depois das 19h (6.766 urnas no 2º turno, 8.965 no 1º) ou depois das 17h05 (151.863 e 333.621); se for usar, registrar o desenho no plano de análise antes e dizer que a hora depende do mesário. Notas antigas da preparação: Quando o TSE publicar os bweb_2t: `python pipeline/14_secoes_segundo_turno.py` (baixa, confere o SHA-512 e a soma das urnas contra cada município) → `07` (escolas com o 2º turno, com trava) → build → testes → publicar. Na inicial, o cartão da cidade passa a mostrar "As escolas de …" (mapa com quem ganhou e onde virou, as que viraram, todas). Ensaiado em 26/10 com os boletins do 1º turno: 497.897 urnas e 94.087 escolas fecham sem diferença, e a trava pega um voto a mais. 
2. **Onda 3:** comparecimento por faixa etária (perfil_comparecimento_abstencao) quando sair o 2º turno.
3. O R3 (teste com pessoas) não chegou a rodar antes do 2º turno.
3. **Opcionais:** busca fase 2 (escola em qualquer cidade do estado, com arquivos novos por UF); teste em celular real; alcance (vídeo de 60–90 s, CSV com DOI no Zenodo e resumo em inglês, gráficos para embutir).
4. Previsão: não será feita. Se o usuário mudar de ideia, a receita era: boletins de 2022 (1º e 2º turnos), compatibilizar seções 2022 → 2026 por local e coordenadas, transição 1T → 2T por seção, registro no OSF com embargo antes de 25/10.

## Problemas conhecidos

- Boa Esperança do Norte (MT, IBGE 5101837) foi criado depois do Censo e da malha de 2022: sem geometria e sem variáveis do Censo, mas as urnas estão na base.
- A seção 228 da 1ª ZE de SP concentra eleitores de 60+ (seção agregada/acessibilidade). Não usar como exemplo; a urna de exemplo do site é a 240.
- O estilo do OpenFreeMap avisa que falta o ícone "circle-11" e que um filtro de fronteira tem valor nulo (externos, inofensivos).
- `gpboost` `get_cov_pars(std_err=True)` estoura a memória nessa escala: a inferência das variâncias é por LRT.
- O modelo não pondera as seções (nenhum dos dois motores aceita pesos no caso usado).
- Gráficos SVG só desenham depois de medir a largura (`useLargura` devolve 0 até lá).
- `site/scripts/telas.py`: nas rotas com mapa, a foto é só da janela, crescida até a altura da página (a captura de página inteira deixava o canvas WebGL pela metade).
- Playwright: depois de `emulate_media(media="screen")`, o `page.pdf()` sai com o estilo de tela. Para conferir a impressão, gerar o PDF numa página nova.
- No Chrome do computador, "Compartilhar" abre a folha de compartilhamento do sistema (Web Share); onde não há, o link ou o texto é copiado.

## Comandos

```bash
python pipeline/03_validar_controle.py     # tem que passar
python pipeline/13_segundo_turno.py        # 2º turno por município (baixa do TSE e confere a soma)
python pipeline/14_secoes_segundo_turno.py --fonte totalizacao  # 2º turno por urna (resultado oficial por seção); sem --fonte, os boletins (código 3 enquanto não saem)
python pipeline/15_votos_depois_17h.py     # votos depois das 17h nos logs das urnas (123 GB, um estado por vez; --manter guarda o zip; --so-juntar)
python pipeline/07_exportar_site.py        # dados do site (com a trava das contas)
cd site && npm run dev                     # http://localhost:5173
cd site && npm run build && npx vite preview --port 4173
python site/scripts/testes.py              # testes no navegador; com o endereço do site, ao vivo
python site/scripts/inventario.py          # palavras e jargão por página
python site/scripts/telas.py               # telas para olhar
python site/scripts/og.py                  # regenera a imagem de compartilhamento (site/public/og.jpg, abaixo de 300 kB por causa do WhatsApp)
```

Ambiente: Windows 11, Anaconda (Python 3.13), Node 22; os scripts do site usam o Chrome instalado (Playwright). Pacotes Python em `requirements.txt`.

## Histórico curto

- 07/10: base nacional, conferência urna por urna, modelos (05, 10, 11, 12), site com a análise em capítulos, repositório público e publicação automática.
- 08/10: "Onde virar voto" no centro (`docs/plano_virar_voto.md`, executado até o P2.2); plano de reorganização (`docs/plano_reorganizacao.md`); R0 e R1 publicados.
- 09/10: R2 publicado; folha do bairro, limites em destaque, lembrar quem já votou e nota com asterisco nas tabelas; neutralidade do site reconfirmada; README, CLAUDE.md e docs revisados.
- 26/10: Lula reeleito. Inicial nova com o 2º turno por município (onda 1), a foto como imagem principal e o site com lado (decisão do usuário); a ferramenta vai para `#/ferramenta`. CI com versões fixas (o DuckDB 2.0 derrubou a primeira publicação).
- 27/10: escolas do 2º turno (resultado oficial por seção); gráfico das 17h às 19h com a cronologia numerada e os votos depois das 17h (34.330, Setup News/CNN). Publicados em 29/10.
- 29/10: o texto "Quem fala em golpe" passa a dizer que Flávio desistiu da anulação e pediu a cassação da chapa de Lula; os logs de urna do 2º turno (123 GB) estão no portal.
- 29/10: a conta própria dos votos depois das 17h nos logs das urnas (123 GB, os 27 estados): 34.330, igual à da Setup News; a inicial ganha o gráfico por minuto com o 1º turno ao lado, as tabelas e a conta por estado.
