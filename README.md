# Urna em Camadas

**Lula reeleito, cidade por cidade.**

Com o resultado oficial do TSE, o 2º turno presidencial de 2026 (25/10) em cada um dos 5.571 municípios, ao lado do 1º turno: onde Lula ganhou (2.875 cidades), onde virou (211 cidades e Minas Gerais: Flávio Bolsonaro à frente no 1º turno, Lula no 2º), onde mais avançou e onde mais gente foi votar (abstenção de 21,08% para 19,22%: 2.960.239 pessoas a mais). No 1º turno, Flávio tinha 2,2 milhões de votos a mais; no 2º, Lula venceu por 4,4 milhões. A página traz também a cronologia da votação até as 19h, com as fontes, e a conferência: a soma das cidades e do exterior é igual ao total anunciado pelo TSE.

Durante a campanha, a inicial foi a ferramenta "Onde virar voto": com o 1º turno urna por urna, os bairros e as escolas onde havia mais gente para conversar, com a mesma conta para os dois candidatos e sem pedir voto. Ela continua no ar como registro. Depois do resultado, o autor tomou lado.

Por trás, uma análise multinível e espacial das 497.897 urnas do Brasil, com dados públicos do TSE, IBGE, MDS e MDIC: cada urna foi conferida com o resultado oficial e decomposta em camadas (a média do país, o efeito do estado, o efeito do município, o perfil dos eleitores da seção e o que nenhum dado explica). É ela que justifica agir por lugar: urnas vizinhas votam parecido, e dentro da cidade o que pesa é a escola e o bairro, não a urna.

> Site: <https://duhbenhur.github.io/urna-em-camadas/>

## Onde virar voto: as contas (ferramenta da campanha, 1º turno)

Três contas separadas, sem índice composto, calculadas escola por escola (local de votação) e somadas para cima ([método](https://duhbenhur.github.io/urna-em-camadas/#/metodo?sec=contas)):

| Conta | Lula | Flávio Bolsonaro |
|---|---|---|
| Faltaram no 1º turno (= abstenções oficiais; não tem lado) | 32.894.899 | 32.894.899 |
| Saldo possível ao lembrar quem faltou (teto, não previsão) | 3.888.389 | 4.656.407 |
| Votos em aberto: outros candidatos, brancos e nulos (não têm lado) | 15.251.315 | 15.251.315 |
| Votos abaixo do esperado pelo perfil (experimental) | 2.421.342 | 2.080.423 |

A exportação do site ([`pipeline/07_exportar_site.py`](pipeline/07_exportar_site.py)) só publica se essas contas fecharem entre estados, municípios e escolas.

## O que já se sabe

Modelo nulo de três níveis (seção → município → UF), com o logit da proporção de votos de cada candidato nos válidos como variável dependente:

| Nível | Lula | Flávio Bolsonaro |
|---|---|---|
| Estado (UF) | 62,7% | 60,5% |
| Município | 21,7% | 22,9% |
| Seção | 15,6% | 16,6% |

A maior parte da diferença entre urnas vem do estado onde elas ficam. Duas seções do mesmo município têm correlação esperada de 84% (Lula) e 83% (Flávio). Detalhes e testes em [`resultados/05_hlm_nulo.json`](resultados/05_hlm_nulo.json).

Em linguagem simples ([`resultados/08_historia.json`](resultados/08_historia.json)): quem tenta adivinhar o percentual de um candidato numa urna erra em média, para Lula, 14,5 p.p. sem saber nada, 9,2 sabendo o estado, 5,7 sabendo o município e 3,5 sabendo a escola (Flávio: 13,3; 9,0; 5,4; 3,5). Mas o estado é em boa parte região: dois municípios vizinhos em estados diferentes diferem 8,4 p.p. no voto em Lula (7,9 em Flávio), menos que dois municípios quaisquer do mesmo estado (10,8 e 10,4 p.p.).

**Composição ou contexto?** ([`resultados/10_hlm_stepup.json`](resultados/10_hlm_stepup.json), [notebook](notebooks/10_composicao_contexto.ipynb)) Repartindo a camada do estado entre grupos de características pelo valor de Shapley (128 modelos), para Lula (Flávio quase igual): região 46%, renda/PIB/Bolsa Família do município 22%, cor ou raça 10%, religião 8%, escolaridade da seção 4%, urbanização 1%, idade e sexo 0%; sobram 10%. O perfil de quem vota em cada urna explica pouco da diferença entre estados; o perfil dos lugares explica muito mais; e o resto é quase todo regional. Com quatro níveis, o que parecia ser da seção é do local de votação (20% da variação, contra 3% da urna em si).

**Espaço** ([`resultados/11_espacial.json`](resultados/11_espacial.json)): o que perfil e região não explicam forma bolsões de municípios vizinhos (Moran 0,47); 27 regiões desenhadas só pelo voto explicam 84% da variação entre municípios, contra 74% dos 27 estados.

**Conferência**: as 497.897 urnas são idênticas ao resultado oficial por seção do TSE, em todos os campos e para cada candidato.

## Como funciona

1. **Dados** ([`pipeline/`](pipeline/)): baixa os boletins de urna das 27 UFs, o perfil do eleitorado por seção e os locais de votação do TSE, conferindo o SHA-512 publicado pelo tribunal. Junta Censo 2022 e PIB (IBGE) e Bolsa Família (MDS) por município, pela tabela oficial de códigos TSE ↔ IBGE.
2. **Validação** ([`pipeline/03_validar_controle.py`](pipeline/03_validar_controle.py)): a base reproduz exatamente a totalização oficial do TSE para SP (seções, aptos, comparecimento, abstenção, válidos, brancos e nulos) e os percentuais da 1ª Zona (Bela Vista) publicados pelo g1. E cada uma das 497.897 seções é idêntica ao resultado oficial da seção publicado pelo TSE, em todos os campos e para cada candidato ([conferência cidadã](https://duhbenhur.github.io/urna-em-camadas/#/conferencia)).
3. **Modelos**: regressão multinível com estratégia *step-up* (modelo nulo → perfil da seção → perfil do município → região → inclinação aleatória da escolaridade → interações entre níveis), estimada com `gpboost`. A explicação da camada do estado é repartida entre os grupos de características pelo valor de Shapley (média de todas as 128 ordens de entrada); um modelo de Mundlak separa o efeito dentro da cidade do efeito entre cidades.
4. **Espaço**: autocorrelação espacial (Moran, LISA) nos efeitos de cada município, 27 regiões de voto desenhadas pelo SKATER e um modelo com processo gaussiano nas coordenadas, que separa o degrau da divisa do gradiente regional.

O desenho completo, com hipóteses e limitações, está em [`docs/plano_de_analise.md`](docs/plano_de_analise.md).

## Reproduzir

```bash
pip install -r requirements.txt
python pipeline/01_baixar_tse.py          # ~8 GB de dados do TSE em ~/dados/tse (DADOS_RAW)
python pipeline/02_recortar_capital.py
python pipeline/04_base_nacional.py
python pipeline/09_totalizacao_oficial.py # resultado oficial por seção (conferência)
python pipeline/03_validar_controle.py    # tem que passar
python pipeline/05_hlm_nulo.py
python pipeline/06_contexto_municipal.py
python pipeline/10_hlm_stepup.py          # modelos explicativos (--bootstrap 100 para os intervalos)
python pipeline/11_espacial.py            # Moran, LISA, regiões de voto, degrau x rampa
python pipeline/12_tarifaco.py            # extensão: exposição ao tarifaço (API do Comex Stat)
python pipeline/08_historia.py            # números do Entenda (o jogo de adivinhar, vizinhos, cidades gêmeas)
python pipeline/13_segundo_turno.py       # 2º turno por município (resultado oficial do TSE, conferido com o total)
python pipeline/14_secoes_segundo_turno.py # 2º turno por urna e por escola, quando o TSE publicar os boletins (--ensaio testa com o 1º turno)
python pipeline/07_exportar_site.py       # dados estáticos do site (só grava se as contas fecharem)
```

Os passos 01, 06, 12, 13 e 14 baixam dados da internet; 02, 04 e 09 leem os brutos do TSE baixados pelo 01. A partir dos Parquets que já estão em [`data/processed/`](data/processed/), dá para rodar só 03, 05, 10, 11, 08 e 07 (08 e 11 precisam de geopandas, libpysal, esda e spopt). Os resultados de 10 e 11 estão em [`notebooks/10_composicao_contexto.ipynb`](notebooks/10_composicao_contexto.ipynb).

## O site

| Página | O que tem |
|---|---|
| [2º turno](https://duhbenhur.github.io/urna-em-camadas/) (a inicial) | Lula reeleito: o mapa das cidades (onde ganhou e onde virou, onde mais avançou, onde mais gente foi votar), a cidade com os dois turnos, as cidades que viraram, os estados, a abstenção, a cronologia das 17h às 19h e a conferência da soma |
| [Ferramenta](https://duhbenhur.github.io/urna-em-camadas/#/ferramenta) (registro da campanha) | a ferramenta: para quem (com a miniatura do mapa de cada candidato) → onde (uma busca para cidade, escola ou bairro) → que conversa → o mapa e a lista de estados, cidades, bairros e escolas; na cidade, as abas "Onde conversar", "Resultado do 1º turno" e "Ache a sua seção" |
| [Como usar](https://duhbenhur.github.io/urna-em-camadas/#/como-usar) | o guia: as três conversas, um exemplo real, o que fazer com a lista, os limites dos números, a lei completa, glossário e perguntas |
| Folha do bairro | uma página A4 (ou texto para o grupo) com as escolas perto de uma escola ou de um bairro, sem candidato; sai da ferramenta e da página de cada urna |
| [Confira sua urna](https://duhbenhur.github.io/urna-em-camadas/#/conferencia) | como conferir a sua urna com o boletim impresso e a soma por estado |
| [Entenda](https://duhbenhur.github.io/urna-em-camadas/#/entenda) | por que agir por lugar, em cinco respostas curtas |
| [Método e dados](https://duhbenhur.github.io/urna-em-camadas/#/metodo) | todo o técnico, em blocos (pergunta, resposta curta, como funciona e o detalhe técnico), com os dados para baixar |

SPA em Vite + React + TypeScript, com mapas em MapLibre (malha do IBGE; ruas do [OpenFreeMap](https://openfreemap.org/)). Os dados são arquivos JSON estáticos divididos por zona eleitoral e por município, então cada página baixa só o que mostra. A cada push na `main`, o [GitHub Actions](.github/workflows/site.yml) roda a validação, gera os dados e publica no GitHub Pages.

```bash
python pipeline/07_exportar_site.py
cd site && npm install && npm run dev
```

As visitas são contadas de forma anônima com o [GoatCounter](https://www.goatcounter.com/), sem cookies: só o tipo de página, a cidade e ações como imprimir a folha; nunca o candidato escolhido, a zona, a seção ou a escola ([`site/src/lib/contagem.ts`](site/src/lib/contagem.ts)).

Verificação (com `pip install playwright`; usa o Chrome instalado): `python site/scripts/testes.py` roda os testes no navegador, no preview local ou, com o endereço do site, ao vivo; `site/scripts/inventario.py` mede palavras e jargão visíveis por página; `site/scripts/telas.py` tira as telas para conferir.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`pipeline/`](pipeline/) | scripts numerados: download, recortes, base nacional, validação, modelos, contexto, espaço, exportação |
| [`data/processed/`](data/processed/) | base por seção, locais de votação, resultado oficial por seção, 2º turno por município, contexto municipal, efeitos aleatórios (Parquet) |
| [`data/geo/`](data/geo/) | malhas municipal e estadual do IBGE (TopoJSON) |
| [`resultados/`](resultados/) | saídas dos modelos (JSON) |
| [`notebooks/`](notebooks/) | resultados dos modelos explicativos e do espaço, com figuras |
| [`site/`](site/) | código do site; em [`site/scripts/`](site/scripts/), os testes no navegador e a verificação visual |
| [`docs/`](docs/) | plano de análise (com os desvios registrados), planos do site e roteiro do teste com pessoas |

## Fontes

| Fonte | Dados |
|---|---|
| [TSE, Portal de Dados Abertos](https://dadosabertos.tse.jus.br/) | boletins de urna, perfil do eleitorado por seção, locais de votação, candidaturas, totalização, resultado oficial por seção (detalhe e votação), códigos de municípios |
| [IBGE, API de agregados](https://servicodados.ibge.gov.br/api/docs/agregados?versao=3) | Censo 2022 (cor ou raça, situação do domicílio, religião, rendimento) e PIB dos Municípios |
| [MDS, MI Social](https://aplicacoes.mds.gov.br/sagi/) | pessoas no Bolsa Família por município (agosto de 2026) |
| [IBGE, API de malhas](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) | malhas municipal e estadual |
| [MDIC, API do Comex Stat](https://api-comexstat.mdic.gov.br/docs) | exportações de 2024 por município, para os EUA e no total (exposição ao tarifaço) |

### Tratamentos que afetam resultados

- **Nulos técnicos:** votos em candidaturas renunciadas ou indeferidas aparecem como nominais no boletim de urna, mas a totalização oficial não os conta como válidos (`config.VOTOS_NAO_VALIDOS`).
- **Local de votação:** em 6.588 seções (1,3%) o boletim traz o número de um local substituído; vale o do cadastro de locais.
- **Coordenadas:** 1.650 seções (0,3%) ficam sem coordenada. O TSE usa (−1, −1) para locais não geocodificados, inclusive presídios e unidades de internação, e há alguns valores impossíveis.
- **Seções agregadas:** o perfil do eleitorado das seções agregadas é somado ao da seção principal, que é a urna onde elas votam.
- **Raça/cor:** fica fora do nível da seção (84% "não informado" no cadastro) e entra pelo Censo, no município.

## Limitações

- A unidade de análise é a seção, não o eleitor: os resultados descrevem lugares, não pessoas (falácia ecológica).
- O eleitor vota onde está registrado, não necessariamente onde mora.
- Censo de 2022 e eleitorado de 2026 têm quatro anos de distância.
- Eleitores no exterior ficam fora do modelo (não têm município nem UF).
- Na ferramenta: quem faltou é um teto (inclui quem mudou de cidade, está fora do país ou tem voto facultativo); votos em aberto não têm lado; o saldo supõe que quem faltou votaria como os vizinhos; e, pelos experimentos de campo, lembrar de votar rende mais do que tentar convencer. O site mostra esses limites em destaque e explica cada um no guia ([os limites](https://duhbenhur.github.io/urna-em-camadas/#/como-usar?ir=limites)).

## Sobre

Projeto feito por **Eduardo Ben Hur** com [Claude Code](https://claude.com/claude-code). Código-fonte e dados neste repositório. Todas as informações vêm de bases públicas do TSE, do IBGE, do MDS e do MDIC. Projeto independente, sem vínculo com partidos ou candidaturas. **Não é pesquisa eleitoral.**

Inspiração metodológica (a ideia de separar o resultado em camadas com um modelo multinível): GOMES, E. B. H. de Q.; TARANTIN JUNIOR, W. Efeitos das unidades federativas na renda disponível per capita por domicílio: uma análise multinível : Effects of federative units on per capita household disposable income: A multilevel analysis. **Quaestum**, [S. l.], v. 6, p. 1–21, 2025. DOI: [10.22167/2675-441X-2024824](https://doi.org/10.22167/2675-441X-2024824). Disponível em: https://ipecege.emnuvens.com.br/quaestum/article/view/824. Acesso em: 8 out. 2026.

Código sob [MIT](LICENSE). Dados processados e textos sob [CC BY 4.0](LICENSE-DADOS.md). A foto da página inicial é de Ricardo Stuckert / Lula Oficial ([“24.10.2026 - Lula em São Paulo: O Brasil Pronto Pra Mais”](https://www.flickr.com/photos/lulaoficial/55610270110/)), sob [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br); as versões redimensionadas e recortadas em [`site/public/foto/`](site/public/foto/) e a imagem de compartilhamento ([`site/public/og.jpg`](site/public/og.jpg)), que a usa, seguem sob a mesma licença.
