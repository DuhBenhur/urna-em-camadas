# Handoff: estado do projeto

Atualizado em 09/10/2026. Lido automaticamente pelo Claude Code (importado no `CLAUDE.md`). Ao terminar uma sessão de trabalho, atualizar este arquivo.

> **Próxima sessão:** o site está reorganizado em torno da ferramenta e publicado ([`docs/plano_reorganizacao.md`](docs/plano_reorganizacao.md): decisões D1 a D10 confirmadas em 08/10; R0, R1 e R2 no ar). Falta o **R3**: o teste com 5 a 8 pessoas, que depende do usuário (roteiro em [`docs/roteiro_teste_pessoas.md`](docs/roteiro_teste_pessoas.md)), e as correções que saírem dele. Antes e depois de mexer no site, rodar `python site/scripts/testes.py` (local e ao vivo). Prazo duro: último deploy em 24/10; nada novo no dia 25.

## O site hoje

https://duhbenhur.github.io/urna-em-camadas/ · menu: Virar voto · Como usar · Confira sua urna · Entenda · Método e dados · Sobre.

| Endereço | O que é | Arquivos principais |
|---|---|---|
| `#/` | A ferramenta "Onde a sua conversa pode virar voto": 1 para quem → 2 onde (estado e busca única) → 3 que conversa → limites em destaque → resultado (Brasil, estado, cidade). Todo o estado vai na URL: `?c=13\|22&a=faltosos\|abertos\|perfil&uf=&m=&perto={zona}-{local}&bairro=&aba=resultado\|secao&local=&vista=surpresa` | `pages/Virar.tsx`, `components/BuscaLugar.tsx`, `components/LimitesNumeros.tsx`, `lib/virar.ts` |
| cidade (`#/?m=`) | Três abas: Onde conversar (mapa, Perto de você, No bairro, bairros, escolas), Resultado do 1º turno (os dois candidatos e o mapa resultado/surpresa), Ache a sua seção (escolas com filtro e as seções de cada uma) | `components/CidadeAbas.tsx` |
| `#/folha?m=&perto=` ou `&bairro=` | Folha do bairro: uma página A4 (até 15 escolas) ou texto para o grupo, sem candidato (para cada escola, quem ficou à frente e o saldo dele) | `pages/Folha.tsx`, `lib/folha.ts` |
| `#/como-usar` | O guia: `?ir=minuto\|conversas\|exemplo\|lista\|limites\|lei\|compartilhar\|glossario\|perguntas` | `pages/ComoUsar.tsx` |
| `#/urna/UF/zona/seção` | "Daqui até o dia 25" primeiro, depois o boletim com o selo de conferência e as camadas da urna | `pages/Urna.tsx`, `components/AgirUrna.tsx` |
| `#/conferencia` | Como conferir a urna com o boletim impresso; a soma por estado; o nulo técnico | `pages/Conferencia.tsx` |
| `#/entenda` | Por que agir por lugar, em 5 respostas sem jargão: `?ir=lugar\|estado\|vizinhos\|escola\|surpresas\|conversa` | `pages/Entenda.tsx` |
| `#/metodo` | Método e dados: 9 blocos no padrão `BlocoTecnico` (pergunta, resposta curta, como funciona, detalhe técnico fechado): `?sec=simples\|fontes\|contas\|modelo\|explicacoes\|espaco\|numeros\|dados\|reproduzir` (e `inspiracao`) | `pages/Metodo.tsx`, `components/MetodoExplicativo.tsx`, `MetodoVirar.tsx`, `DadosParaBaixar.tsx`, `ComoFoiFeito.tsx` |
| `#/mapa?v=` | Mapa das cidades, com as vistas em dois grupos: para agir (`virar`) e para entender (`margem`, `efeito`, `semperfil`, `bolsoes`, `regioes`) | `pages/Mapa.tsx`, `components/Mapas.tsx` |
| `#/sobre` | Quem fez, transparência, como relatar erro, inspiração metodológica, o que o site não é | `pages/Sobre.tsx` |

Endereços antigos que redirecionam (`App.tsx`): `#/virar?…` → `#/?…`; `#/analise` (com `?cap=` ou o antigo `?c=c-…`) → a resposta certa do Entenda (os bastidores vão para `#/metodo?sec=simples`); `#/dados` → `#/metodo?sec=dados`; `#/municipio/{cd}` → a cidade na aba do resultado (com `?local=`, na das seções; com `?a=`, em "Onde conversar").

O que vale para o site todo:
- **Candidato que viaja** (`lib/candidato.ts`): `?c=` na URL e cópia na sessionStorage da aba. Nas telas de ação, nada vem escolhido de antemão; nas de análise, sem escolha, aparece Lula (a ordem do site).
- **As três conversas** (`lib/virar.ts`, `LENTES`): lembrar quem faltou (saldo possível), conversar com quem votou em outro (votos em aberto) e, como opção avançada e experimental só dentro da ferramenta, votos abaixo do esperado (D9). Estados e cidades trazem os totais somados escola por escola (`pipeline/07`); nas escolas, o navegador calcula.
- **Nota com asterisco** embaixo de toda tabela com o número principal de uma conversa (`notaColuna`), com o nome do candidato escolhido; nos bairros, cidades e estados, explica por que um lugar onde ele ficou atrás no total ainda tem saldo.
- **Limites em destaque** na ferramenta, antes dos resultados, e a seção `limites` do guia, com as fontes (Gerber e Green; Kalla e Broockman, 2018).
- **O que o site compartilha não leva candidato:** o cartão "perto de mim" (`lib/cartao.ts`) e a folha do bairro.
- **O MapLibre só carrega quando um mapa aparece** (cidade aberta ou "Ver no mapa do Brasil"), para a inicial abrir rápido.
- **Vocabulário:** cidade, escola, urna (seção), quem faltou, votos em aberto, saldo possível, pontos (1 ponto = 1 voto em cada 100). Jargão só dentro do "Detalhe técnico" de Método e dados.
- **Medidas** (`site/scripts/inventario.py`, 09/10): nenhum termo técnico visível fora de Método e dados (lá, 2 sem abrir os detalhes); Entenda com 1.093 palavras; guia com 1.792.

## Dados e validação

- Base nacional por seção do 1º turno de 2026: 497.897 urnas, 5.571 municípios, 27 UFs (`data/processed/base_secao_2026.parquet`). Reproduz a totalização oficial do TSE para SP (7 totais) e o g1 na 1ª ZE (Bela Vista).
- Conferência (`pipeline/09_totalizacao_oficial.py` → `data/processed/totalizacao_secao_2026.parquet`; comparação no `pipeline/03_validar_controle.py`): as 497.897 seções são idênticas ao resultado oficial por seção, em todos os campos e para os 12 candidatos. Nulos = nulo da urna + nulo técnico (renúncia), que a tabela de detalhe não soma. Roda no CI: uma divergência bloqueia a publicação.
- Contexto municipal (Censo 2022, PIB 2022, Bolsa Família ago/2026) em `data/processed/contexto_municipal.parquet`; o 06 corrige os nomes de município da tabela TSE ↔ IBGE (`nome_municipio`). Exportações de 2024 para os EUA (Comex Stat) entram só no tarifaço (`12`).
- Brutos do TSE (7,6 GB de zips, ~20 GB descompactados) em `~/dados/tse`, fora do repositório; zips conferidos por SHA-512.
- Exportação do site (`pipeline/07_exportar_site.py`): a trava `conferir_virar` roda antes de gravar qualquer arquivo (faltosos, abertos, saldos e gaps fecham entre estados, municípios e escolas, com tolerância de 1 voto por município; faltosos = abstenções; aptos = faltosos + abertos + Lula + Flávio). Saída idêntica byte a byte entre execuções; `allow_nan=False` (um `NaN` derruba a exportação em vez de publicar arquivo quebrado).

## Números de referência

- Contas da ferramenta (Brasil): faltaram 32.894.899 (= abstenções oficiais); votos em aberto 15.251.315; saldo possível Lula 3.888.389 e Flávio 4.656.407; votos abaixo do esperado Lula 2.421.342 e Flávio 2.080.423.
- Modelo nulo de três níveis (`05`, `gpboost`, validado com `statsmodels`: log-verossimilhança −225.328,4 x −225.328,8): Lula estado 62,7%, município 21,7%, seção 15,6%; Flávio 60,5%, 22,9%, 16,6%. Com quatro níveis (Lula): estado 56%, município 21%, escola 20%, seção 3%.
- Modelos explicativos (`10`, desenho fixado em `docs/plano_de_analise.md` antes dos resultados): camada do estado repartida pelo valor de Shapley (128 modelos; Lula, Flávio quase igual): região 46%, renda/PIB/Bolsa Família 22%, cor ou raça 10%, religião 8%, escolaridade da seção 4%, urbanização 1%, idade e sexo 0%; sobram 10%. Bootstrap (100 reamostragens de estados dentro das regiões): o modelo completo explica 90% [87%, 93%] da camada do estado.
- Espaço (`11`): Moran dos efeitos municipais depois do modelo completo 0,47; 27 regiões de voto (SKATER) explicam 84% da variação entre municípios, contra 74% dos estados; o processo gaussiano nas coordenadas absorve cerca de 94% da variância do estado (rampa mais que degrau); em São Paulo, Moran da surpresa por local de votação 0,71 (Lula).
- Entenda (`08`): erro ao adivinhar uma urna (Lula) 14,5 → 9,2 (estado) → 5,7 (cidade) → 3,5 pontos (escola); vizinhos com divisa diferem 8,4 pontos, contra 10,8 de duas cidades quaisquer do mesmo estado; 33 pares de cidades gêmeas, com resultado misto (ilustração, não manchete).
- Tarifaço (`12`, extensão registrada depois do desenho): quase nada (Lula +0,17 ponto por desvio-padrão, p = 0,13; Flávio −0,48, p < 0,001); a camada do estado não encolhe.
- Exemplo usado no site e nos testes: `#/urna/SP/403/411` (EMEI Conj. Res. Elísio Teixeira Leite): 35 escolas a até 2 km; saldo de Lula 5.539; Flávio sem escola à frente; abaixo do esperado para Flávio 3.460; votos em aberto 17.290.

## Verificação

- `python site/scripts/testes.py [endereço]`: quatro baterias no navegador (candidato, acao, perfil, publico), local ou ao vivo. Cobre, entre outros, a busca pelo teclado, as abas da cidade, os redirecionamentos, o mapa do Brasil só sob pedido, a nota de toda tabela com saldo, a folha em uma página A4 (gerando o PDF) e a regra de não citar a previsão. Muda junto com o site.
- `python site/scripts/inventario.py`: palavras e jargão visíveis por página.
- `python site/scripts/telas.py`: telas no computador (claro) e no celular (escuro), com os erros de console.
- Publicação: `.github/workflows/site.yml` (valida → exporta → compila → GitHub Pages). Depois do push, acompanhar o deploy pela API pública do GitHub (`/repos/DuhBenhur/urna-em-camadas/actions/runs`; o `gh` não está instalado) e rodar os testes ao vivo.

## Decisões (e por quê)

- Nome **Urna em Camadas**; assinatura **Eduardo Ben Hur**; repositório público (https://github.com/DuhBenhur/urna-em-camadas); GitHub Pages; MIT para o código e CC BY 4.0 para dados e textos. Commitar e enviar só com autorização do usuário (dada para os planos em curso).
- Só Python no pipeline. `gpboost` é o motor (o `statsmodels` leva ~5 min por modelo e quebra com `use_sparse`).
- **Neutralidade:** os dois candidatos do 2º turno são modelados, aparecem com o mesmo peso e a conta é a mesma para os dois ("A mesma conta para os dois candidatos. O site não pede voto para ninguém."). Reconfirmada em 09/10: o usuário divulga a ferramenta com o lado dele, mas o site fica neutro e com os dois nomes (não "adversário"), porque é a neutralidade que protege o site.
- **Centro do projeto (08/10):** a ferramenta "Onde virar voto"; a inicial é a ferramenta e o resto do site serve a ela.
- **3ª conversa (D9, opção b):** "votos abaixo do esperado" fica só dentro da ferramenta, como opção avançada e experimental, com aviso: em boa parte, ela aponta bairros onde o adversário é forte por motivos que o modelo não vê (em São Paulo, bairros ricos para Lula; o centro expandido para Flávio).
- **Previsão do 2º turno:** não será feita (07/10), e o site não fala dela (08/10): o que não foi entregue ao público não aparece para o público. O desvio está registrado em `docs/plano_de_analise.md`.
- O artigo de Gomes e Tarantin Junior (Quaestum, 2025) é **inspiração metodológica**, não origem nem continuação; a citação em ABNT está no Método e dados, no README e no plano de análise.
- O que o site compartilha não leva candidato; sem candidato escolhido, o mapa e a cidade abrem na conta sem lado (votos em aberto).
- Cores: Lula vermelho, Flávio azul, cinza para o que não tem lado; braço vermelho com a mesma luminosidade OKLCH da rampa azul (`site/src/lib/cores.ts`); no modo escuro, extremos `#ff716b` / `#5fa7ff`. Paletas validadas com o `validate_palette.js` da skill de dataviz. No mapa da ferramenta, 5 classes fixas e iguais para os dois candidatos.
- Linguagem: jargão só no detalhe técnico; números em pontos e "de cada 100"; lugares, nunca pessoas; prosa ≥ 16 px; artigo dos estados via `site/src/lib/ufs.ts` ("no Paraná", "na Bahia").

## Pendências

1. **R3** (18–22/10): teste com 5 a 8 pessoas (roteiro em `docs/roteiro_teste_pessoas.md`, com as tarefas da folha e dos limites), correções e revisão final. Último deploy em 24/10; nada novo no dia 25.
2. **Depois de 25/10:** baixar o 2º turno, repetir a conferência e a decomposição, comparar os turnos urna por urna; decidir o que fazer com a ferramenta (manter como registro).
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
python pipeline/07_exportar_site.py        # dados do site (com a trava das contas)
cd site && npm run dev                     # http://localhost:5173
cd site && npm run build && npx vite preview --port 4173
python site/scripts/testes.py              # testes no navegador; com o endereço do site, ao vivo
python site/scripts/inventario.py          # palavras e jargão por página
python site/scripts/telas.py               # telas para olhar
python site/scripts/og.py                  # regenera a imagem de compartilhamento (site/public/og.png)
```

Ambiente: Windows 11, Anaconda (Python 3.13), Node 22; os scripts do site usam o Chrome instalado (Playwright). Pacotes Python em `requirements.txt`.

## Histórico curto

- 07/10: base nacional, conferência urna por urna, modelos (05, 10, 11, 12), site com a análise em capítulos, repositório público e publicação automática.
- 08/10: "Onde virar voto" no centro (`docs/plano_virar_voto.md`, executado até o P2.2); plano de reorganização (`docs/plano_reorganizacao.md`); R0 e R1 publicados.
- 09/10: R2 publicado; folha do bairro, limites em destaque, lembrar quem já votou e nota com asterisco nas tabelas; neutralidade do site reconfirmada; README, CLAUDE.md e docs revisados.
