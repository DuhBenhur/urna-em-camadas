# Urna em Camadas

**Onde virar voto no 2º turno, bairro a bairro.**

Com o resultado oficial do 1º turno presidencial de 2026, urna por urna, o site mostra em que bairros e escolas há mais gente para conversar, para o candidato que você escolher: quem faltou, quem votou em outro candidato, branco ou nulo e, em caráter experimental, onde o candidato ficou abaixo do que o perfil do lugar fazia esperar. A mesma conta para os dois candidatos; o site não pede voto para ninguém. Dá para começar pela sua urna (zona e seção) ou por um lugar.

Por trás, uma análise multinível e espacial das 497.897 urnas do Brasil, com dados públicos do TSE, IBGE e MDS: cada urna foi conferida com o resultado oficial e decomposta em camadas (a média do país, o efeito do estado, o efeito do município, o perfil dos eleitores da seção e o que nenhum dado explica). É ela que justifica agir por lugar: urnas vizinhas votam parecido, e dentro da cidade o que pesa é a escola e o bairro, não a urna.

> Site: <https://duhbenhur.github.io/urna-em-camadas/>

## Onde virar voto: as contas

Três contas separadas, sem índice composto, calculadas escola por escola (local de votação) e somadas para cima ([método](https://duhbenhur.github.io/urna-em-camadas/#/metodo)):

| Conta | Lula | Flávio Bolsonaro |
|---|---|---|
| Faltaram no 1º turno (= abstenções oficiais; não tem lado) | 32.894.899 | 32.894.899 |
| Saldo possível ao lembrar quem faltou (teto, não previsão) | 3.888.389 | 4.656.407 |
| Votos em aberto: outros candidatos, brancos e nulos (não têm lado) | 15.251.315 | 15.251.315 |
| Votos abaixo do esperado pelo perfil (experimental) | 2.421.342 | 2.080.423 |

A exportação do site ([`pipeline/07_exportar_site.py`](pipeline/07_exportar_site.py)) só publica se essas contas fecharem entre estados, municípios e escolas.

## O que já se sabe

Modelo nulo de três níveis (seção → município → UF), com o logit da proporção de votos do Lula nos válidos como variável dependente:

| Nível | Parcela da variação |
|---|---|
| Estado (UF) | 62,7% |
| Município | 21,7% |
| Seção | 15,6% |

A maior parte da diferença entre urnas vem do estado onde elas ficam. Duas seções do mesmo município têm correlação esperada de 84%. Detalhes e testes em [`resultados/05_hlm_nulo.json`](resultados/05_hlm_nulo.json).

Em linguagem simples ([`resultados/08_historia.json`](resultados/08_historia.json)): quem tenta adivinhar o percentual do Lula numa urna erra em média 14,5 p.p. sem saber nada, 9,2 sabendo o estado, 5,7 sabendo o município e 3,5 sabendo a escola. Mas o estado é em boa parte região: dois municípios vizinhos em estados diferentes diferem 8,4 p.p., menos que dois municípios quaisquer do mesmo estado (10,8 p.p.).

**Composição ou contexto?** ([`resultados/10_hlm_stepup.json`](resultados/10_hlm_stepup.json), [notebook](notebooks/10_composicao_contexto.ipynb)) Repartindo a camada do estado entre grupos de características pelo valor de Shapley (128 modelos), para Lula: região 46%, renda/PIB/Bolsa Família do município 22%, cor ou raça 10%, religião 8%, escolaridade da seção 4%, urbanização 1%, idade e sexo 0%; sobram 10%. O perfil de quem vota em cada urna explica pouco da diferença entre estados; o perfil dos lugares explica muito mais; e o resto é quase todo regional. Com quatro níveis, o que parecia ser da seção é do local de votação (20% da variação, contra 3% da urna em si).

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
python pipeline/08_historia.py            # números da história da página inicial
python pipeline/07_exportar_site.py       # dados estáticos do site
```

Os passos 01, 02, 04 e 06 precisam da internet e dos brutos. A partir dos Parquets que já estão em [`data/processed/`](data/processed/), dá para rodar só 03, 05, 10, 11, 08 e 07 (08 e 11 precisam de geopandas, libpysal, esda e spopt). Os resultados de 10 e 11 estão em [`notebooks/10_composicao_contexto.ipynb`](notebooks/10_composicao_contexto.ipynb).

## O site

SPA em Vite + React + TypeScript, com mapas em MapLibre (malha do IBGE; ruas do [OpenFreeMap](https://openfreemap.org/)). Os dados são arquivos JSON estáticos divididos por zona eleitoral e por município, então cada página baixa só o que mostra. A cada push na `main`, o [GitHub Actions](.github/workflows/site.yml) roda a validação, gera os dados e publica no GitHub Pages.

```bash
python pipeline/07_exportar_site.py
cd site && npm install && npm run dev
```

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`pipeline/`](pipeline/) | scripts numerados: download, recortes, base nacional, validação, modelos, contexto, exportação |
| [`data/processed/`](data/processed/) | base por seção, locais de votação, contexto municipal, efeitos aleatórios (Parquet) |
| [`data/geo/`](data/geo/) | malhas municipal e estadual do IBGE (TopoJSON) |
| [`resultados/`](resultados/) | saídas dos modelos (JSON) |
| [`site/`](site/) | código do site |
| [`docs/`](docs/) | plano de análise |

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

## Sobre

Projeto feito por **Eduardo Ben Hur** com [Claude Code](https://claude.com/claude-code). Código-fonte e dados neste repositório. Todas as informações vêm de bases públicas do TSE, do IBGE e do MDS. Projeto independente, sem vínculo com partidos ou candidaturas. **Não é pesquisa eleitoral.**

Continuação metodológica de: Gomes, E. B. Q.; Tarantin Junior, W. *Efeitos das unidades federativas na renda disponível per capita por domicílio: uma análise multinível*. Quaestum, v. 6, e2675824, 2025. https://doi.org/10.22167/2675-441X-2024824

Código sob [MIT](LICENSE). Dados processados e textos sob [CC BY 4.0](LICENSE-DADOS.md).
