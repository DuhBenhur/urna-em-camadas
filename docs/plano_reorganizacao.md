# Plano: reorganizar o site em torno de "virar voto"

Escrito em 08/10/2026 para a sessão que vai implementar, e para o Eduardo revisar e decidir. Prazo duro: último deploy em **24/10**; nada novo no dia 25/10 (2º turno).

**Antes de começar:** ler o `HANDOFF.md`, o `CLAUDE.md` e este plano. **Confirmar com o usuário as decisões da seção 3** (D1 a D10). Implementar só o que estiver confirmado; se ele disser "pode seguir as recomendações", valem as recomendações. Este plano substitui o P2.3 e a pendência da 3ª ação do `docs/plano_virar_voto.md` (que está executado até o P2.2).

## 1. O pedido

Nas palavras do usuário (08/10): "Como o projeto mudou de estrutura, a ferramenta de virar voto e o objetivo precisam ser o principal no projeto. A parte mais técnica deve ficar concentrada e, de preferência, explicada de forma que técnicos e leigos entendam. Vamos reorganizar a ferramenta para deixar tudo coerente, fácil de pesquisar e de entender como usar para virar votos."

Em três metas:

1. **A ferramenta é o site.** Quem chega cai direto nela; todo o resto serve a ela.
2. **O técnico num lugar só,** explicado em camadas: primeiro a resposta curta (para todo mundo), depois como funciona, por último o detalhe técnico (para quem quer).
3. **Coerente e fácil de achar:** uma busca para lugares, um nome para cada coisa, um guia de uso.

## 2. Diagnóstico (medido em 08/10 com `site/scripts/inventario.py`)

| Página | Papel hoje | Palavras visíveis | Termos técnicos visíveis | Altura |
|---|---|---:|---:|---:|
| Início `#/` | porta de entrada da ferramenta | 757 | 0 | 3.041 px |
| Virar voto `#/virar` (Brasil / São Paulo) | a ferramenta | 721 / 1.046 | 0 | 3.238 / 5.197 px |
| Urna `#/urna/SP/403/411` | camadas da urna, depois a ação | 973 | 0 | 4.910 px |
| Município `#/municipio/71072` | resultado e seções da cidade | 519 | 0 | 2.950 px |
| Mapa `#/mapa` | 1 vista de ação + 5 de análise | 191 | 0 | 1.684 px |
| Análise `#/analise` | 7 capítulos | 3.214 | 17 | 15.034 px |
| Conferência `#/conferencia` | conferir a urna + parte técnica | 849 | 1 | 3.364 px |
| Método `#/metodo` | técnico | 3.232 | 79 | 9.085 px |
| Dados `#/dados` | técnico | 1.075 | 49 | 4.560 px |
| Sobre `#/sobre` | quem fez, o que não é | 323 | 1 | 1.398 px |

Problemas:

- **O menu tem 8 itens com o mesmo peso** (Início, Virar voto, Análise, Conferência, Mapa, Método, Dados, Sobre); a ferramenta é um deles. A inicial e o `#/virar` fazem a mesma coisa em dois lugares (dois "Para quem?").
- **O técnico está em cinco lugares:** Análise (a página mais longa do site: 15 mil px), Método, Dados, a parte "O que foi conferido / Para reproduzir" da Conferência e o "Como calculamos" do Virar.
- **A urna mostra primeiro a análise** (camadas) e só depois a ação ("Daqui até o dia 25").
- **A cidade está em duas páginas:** `#/municipio/{cd}` (resultado, locais e seções) e `#/virar?m={cd}` (onde conversar), com mapas e tabelas parecidos.
- **Não há um "como usar":** a lei completa fica no pé do Virar; as explicações das contas, em "Como calculamos", nos avisos e no Método.
- **Três buscas diferentes** (zona e seção; município → página do município; município → Virar) e nenhuma por escola ou bairro fora da página do município.
- **O mesmo conceito com nomes diferentes** (seção 8): escola / local / local de votação; cidade / município; quem ficou de fora / votos em aberto / votaram em outro candidato, branco ou nulo; ação / tipo de conversa.

## 3. Decisões para o usuário confirmar

> **Confirmadas em 08/10:** o usuário disse "pode seguir com as recomendações". Valem as recomendações da tabela, inclusive a (b) na D9. A implementação começou na mesma sessão.

| | Decisão | Recomendação |
|---|---|---|
| D1 | **A inicial vira a própria ferramenta**: `#/` mostra o "Onde virar voto"; `#/virar?...` redireciona para `#/?...` | Sim |
| D2 | **Menu com 6 itens**: Virar voto · Como usar · Confira sua urna · Entenda · Método e dados · Sobre. Saem do menu "Análise", "Mapa" e "Dados" (as páginas continuam existindo, ver seção 7) | Sim |
| D3 | **A Análise vira "Entenda"**: 5 respostas curtas sobre por que agir por lugar, sem jargão; o resto da análise vai para "Método e dados" | Sim |
| D4 | **"Método e dados" num lugar só**: Método + Dados + a parte técnica da Conferência + a análise completa, cada bloco no padrão da seção 9 | Sim |
| D5 | **Página nova "Como usar"**: passo a passo, exemplo real, o que fazer com a lista, a lei completa, glossário e perguntas | Sim |
| D6 | **Urna: a ação primeiro**, depois a conferência (boletim e selo), depois as camadas | Sim |
| D7 | **A cidade numa página só**, com três abas: onde conversar, resultado do 1º turno, ache a sua seção | Sim, mas é o primeiro corte se atrasar |
| D8 | **Um nome para cada coisa** (seção 8), inclusive renomear "Conversar com quem ficou de fora" para "Conversar com quem votou em outro" e usar "cidade" fora do técnico | Sim |
| D9 | **A 3ª ação ("onde o perfil promete mais")**: os dados mostraram que ela aponta, em boa parte, para bairros onde o adversário é forte por motivos que o modelo não vê (renda do bairro, história do lugar). Opções: (a) manter como está; (b) manter só dentro da ferramenta, como opção avançada, fora da inicial, do bloco da urna e do mapa do Brasil; (c) retirar | (b) |
| D10 | **Busca única de lugares**: fase 1 = cidade, depois escola ou bairro dentro da cidade (sem dados novos); fase 2 = escola em qualquer cidade do estado (arquivos novos por UF), só se sobrar tempo | Sim |

## 4. A estrutura nova

```
Virar voto  #/                    a ferramenta: para quem → onde (busca) → que conversa → resultado
 ├─ cidade  #/?c=&a=&m=           onde conversar · resultado do 1º turno · ache a sua seção (D7)
 │   └─ perto de uma escola  …&perto={zona}-{local}
 └─ urna    #/urna/UF/zona/seção  daqui até o dia 25 → confira esta urna → entenda esta urna (D6)
Como usar   #/como-usar           o guia (D5)
Confira sua urna  #/conferencia   só a parte de quem vota; o técnico vai para Método e dados
Entenda     #/entenda             por que agir por lugar, em 5 respostas curtas (D3)
Método e dados  #/metodo          tudo o que é técnico, em camadas (D4)
Sobre       #/sobre
(fora do menu) Mapa #/mapa        vista "Onde virar voto" + mapas da análise, com links da ferramenta e do técnico
```

Cada página termina com o próximo passo: o Entenda leva à ferramenta ("Agora, encontre onde conversar"); o Como usar, à busca; o Método, à ferramenta e ao repositório.

## 5. O que muda em cada página

### 5.1 Virar voto (a inicial é a ferramenta) — D1

- Arquivos: `pages/Inicio.tsx` e `pages/Virar.tsx` viram uma página; `App.tsx` (rotas); `components/Mapas.tsx` passa a carregar só quando aparece (`React.lazy` dentro da página), para a inicial não baixar o MapLibre (~800 kB) antes de a pessoa escolher uma cidade.
- Ordem: título ("Onde a sua conversa pode virar voto") e uma frase → **1 Para quem?** → **2 Onde?** (busca única, 5.2; com "Brasil inteiro" e "Tenho zona e seção") → **3 Que tipo de conversa?** (os cartões de ação com o número nacional de cada um, o que hoje são os "Três jeitos") → resultado (Brasil → estado → cidade, como hoje).
- Embaixo do resultado, curtos: "Como usar em 1 minuto" (3 linhas + link), a lei curta (+ link para a completa no Como usar), "Por que bairros e escolas?" (1 linha + link para o Entenda) e "Depois de votar, confira" (1 linha + link).
- No nível Brasil e estado, o mapa do Brasil na vista "Onde virar voto" (o da `#/mapa?v=virar`) aparece acima da lista (corte se atrasar).
- Pronto quando: de um navegador limpo, escolher o candidato, digitar "Curitiba" e escolher a sugestão mostra as escolas da cidade (3 interações); em 390 px, o passo 1 e o campo de busca aparecem sem rolar; a inicial não carrega o MapLibre antes de haver cidade escolhida (conferir na aba de rede).

### 5.2 Busca única de lugares — D10

- Componente novo `components/BuscaLugar.tsx`, no passo 2 da ferramenta e no topo da página da cidade. Substitui o `Busca` (zona e seção vira um link "Tenho zona e seção" que abre os três campos) e o `CampoMunicipio` da porta "Por um lugar".
- Fase 1 (sem dados novos): o texto busca cidades no `municipios.json` (já carregado). Com a cidade escolhida, o mesmo campo busca **escolas e bairros** no `locais/{cd}.json`. Escolher uma escola abre a cidade com `perto={zona}-{local}` (anel e tabela "Perto de você"); escolher um bairro abre a cidade com o bairro destacado (parâmetro novo `bairro=`).
- Fase 2 (opcional): `pipeline/07` grava `busca/{UF}.json` (cidade, zona, local, nome, bairro) e a busca acha escolas do estado inteiro. Tamanho medido em 08/10: São Paulo, o maior estado, tem 11.072 escolas, cerca de 0,8 MB sem compressão.
- Pronto quando: "Elisio" com São Paulo escolhida sugere a EMEI Conj. Res. Elísio Teixeira Leite e abre o "perto de você" dela; "Bela Vista" sugere o bairro; tudo funciona com o teclado (setas e Enter) e é anunciado por leitor de tela (`role="combobox"`).

### 5.3 Cidade numa página — D7

- A cidade da ferramenta ganha três abas: **Onde conversar** (padrão: o que hoje é o nível município do Virar), **Resultado do 1º turno** (os cartões e o mapa resultado/surpresa do `Municipio.tsx`) e **Ache a sua seção** (a tabela de locais com filtro e as seções de cada local).
- `#/municipio/{cd}` redireciona para a cidade na aba "Resultado"; `?local={zona}-{local}` abre "Ache a sua seção" com a escola escolhida.
- Pronto quando: os links "seções" das tabelas de escolas abrem a aba certa; o "voltar" do navegador volta de aba em aba só quando a pessoa trocou de aba (decidir: troca de aba com `replace`).

### 5.4 Urna — D6

- `pages/Urna.tsx`: cabeçalho e a frase-resumo → **Daqui até o dia 25** (`AgirUrna`) → **Confira esta urna** (boletim, selo, link para a Conferência) → **Entenda esta urna** (camadas, perfil de quem vota, comparação, outras urnas do local). Sai o link "Daqui até o dia 25 ↓" (a ação já vem primeiro).
- Pronto quando: em 390 px, o título "Daqui até o dia 25" aparece na primeira tela.

### 5.5 Como usar (página nova `#/como-usar`) — D5

Arquivo novo `pages/ComoUsar.tsx`, com âncoras por seção (`?ir=`):

1. **Em 1 minuto:** escolha o candidato; ache a sua cidade, escola ou bairro; escolha a conversa; olhe as escolas perto.
2. **As três conversas:** para cada uma, o que é, o número que aparece, o que fazer, o que o número não diz (hoje espalhado em "Como calculamos", avisos e Método).
3. **Um exemplo real:** a EMEI Conj. Res. Elísio Teixeira Leite (SP), para os dois candidatos: 35 escolas a até 2 km; Lula, saldo possível de 5.539; Flávio, nenhuma escola à frente, 3.460 votos abaixo do esperado; 17.290 votos em aberto (os dois).
4. **O que fazer com a lista:** conversar com quem você conhece no bairro; ouvir antes de argumentar; lembrar data, local (e-Título) e documento com foto; justificativa para quem não puder votar; só informação com fonte; nunca expor ninguém.
5. **Dentro da lei:** a lista completa que hoje fica no pé do Virar (`ComoFazer`), com os artigos (inclusive o impulsionamento pago, art. 57-C). A ferramenta fica com a `LeiCurta` e um link para cá.
6. **Compartilhar:** o cartão "perto de mim" (o que mostra e o que não mostra).
7. **Glossário:** escola (local de votação), urna (seção), zona, quem faltou, votos em aberto, saldo possível, votos abaixo do esperado, ponto.
8. **Perguntas:** Por que não os lugares disputados? O site pede voto? Os números mostram em quem cada pessoa votou? Quem faltou vai votar? Dá para confiar no terceiro número? De onde vêm os números?

- Pronto quando: ≤ 1.500 palavras visíveis, zero termos técnicos (inventário), toda pergunta com resposta de até 3 frases, e os links "Como calculamos" e "Todas as regras" da ferramenta e da urna levam a este guia.

### 5.6 Confira sua urna

- `pages/Conferencia.tsx` fica com o que serve a quem vota: os três números, "Como conferir a sua urna", "Estado por estado" e "O que esta conferência não é", mais a história do nulo técnico (hoje no capítulo 6 da Análise), contada em linguagem simples.
- "O que foi conferido" e "Para reproduzir" vão para Método e dados; fica um link "Como a conferência foi feita (técnico)".

### 5.7 Entenda (`#/entenda`) — D3

- Arquivo `pages/Entenda.tsx` (a partir do `Analise.tsx`), com 5 respostas curtas. Cada uma: pergunta no título, resposta de 2 a 3 frases com um número, um gráfico (componentes que já existem), a linha "Para quem vai conversar" e "Detalhe técnico →" (link para o bloco certo em Método e dados).
  1. O lugar diz muito? (o jogo de adivinhar e a escada de erro, do capítulo 1)
  2. O estado pesa? Pesa, mas no 2º turno todo voto vale igual (do capítulo 2, só o resumo)
  3. Vizinhos votam parecido? (os pares de municípios, do capítulo 3)
  4. Dentro da cidade, o que pesa? A escola, mais que a urna (os quatro níveis, do capítulo 4)
  5. Onde o voto foge do esperado? (os bolsões, do capítulo 5, com o aviso da 3ª ação)
- O seletor de candidato fica uma vez só, no topo.
- Pronto quando: ≤ 1.200 palavras visíveis (hoje 3.214), zero termos técnicos visíveis (hoje 17), altura ≤ 6.000 px no desktop (hoje 15.034).

### 5.8 Método e dados (`#/metodo`) — D4

- Junta `pages/Metodo.tsx`, `pages/Dados.tsx`, `components/MetodoExplicativo.tsx`, `components/MetodoVirar.tsx` e o que sai da Análise e da Conferência. Sumário no topo com âncoras (`?sec=`). Blocos, nesta ordem, todos no padrão da seção 9:
  - **A. Em linguagem simples:** o site numa tela (o que faz, de onde vêm os dados, como foi conferido, o que é conta e o que é modelo).
  - **B. Fontes e conferência** (seções 2 e 3 do Método, mais o técnico da Conferência).
  - **C. As contas do Onde virar voto** (seção 8, a trava da exportação).
  - **D. O modelo de camadas e a análise completa** (seções 4 a 7, e o que sai da Análise: efeito dos estados, o que explica o estado, efeitos, dentro x entre cidades, escolaridade por estado, tarifaço, cidades gêmeas, degrau ou rampa, cidades que contrariam o estado, regiões de voto e links para os mapas da análise).
  - **E. Dados para baixar** (a página Dados inteira: arquivos, dicionário, arquivos do site, licença e citação).
  - **F. Reproduzir, decisões, limitações, próximas etapas e inspiração metodológica.**
- Componente novo `components/BlocoTecnico.tsx` para o padrão: pergunta, resposta curta, como funciona e `<details>` "Detalhe técnico".
- Pronto quando: sem abrir nenhum detalhe, o texto visível traz no máximo 15 termos técnicos (hoje 79 + 49 nas duas páginas); cada bloco começa com uma resposta curta que leigos entendem; nada do Método, da Dados e da Análise se perdeu (conferir com a tabela da seção 6).

### 5.9 Mapa

- Sai do menu; continua em `#/mapa`, com as abas em dois grupos: **Para agir** (Onde virar voto) e **Para entender** (Resultado, Efeito do município, O que o perfil não explica, Bolsões, Regiões de voto). Links a partir da ferramenta (nível Brasil) e do bloco D de Método e dados.

### 5.10 Sobre, cabeçalho e rodapé

- `components/Estrutura.tsx`: menu de 6 itens (D2), "Virar voto" primeiro; no celular, continua em duas linhas e sem nada escondido.
- Rodapé: links para Como usar, Confira sua urna, Método e dados e Sobre; a frase "A mesma conta para os dois candidatos. O site não pede voto para ninguém." e "Não é pesquisa eleitoral".
- `pages/Sobre.tsx`: quem fez, a inspiração metodológica (link para o Método), como relatar erro (issues), o que o site não é.

## 6. Para onde vai cada conteúdo (nada se perde)

| Hoje | Vai para |
|---|---|
| Início: título, passos 1 e 2, "Três jeitos" | Virar voto (5.1): título, passo 1, passo 2 (busca), passo 3 (cartões de conversa) |
| Início: "Por que pensar em bairros" | Entenda (5.7) |
| Início: lei curta; "Depois de votar, confira" | Virar voto, curtos, com links |
| Virar: "Como fazer, dentro da lei" | Como usar, "Dentro da lei" (5.5) |
| Virar: "Como calculamos" | Como usar, "As três conversas"; o detalhe, em Método e dados C |
| Análise caps. 1 a 5 | Entenda (o essencial) e Método e dados D (o resto) |
| Análise cap. 6 "Como foi feito" | Método e dados A e F; a história do nulo técnico, na Confira |
| Análise cap. 7 "Do mapa à conversa" | fechamento do Entenda e Como usar |
| Conferência: "O que foi conferido", "Para reproduzir" | Método e dados B e F |
| Método seções 1 a 12 e inspiração | Método e dados (A a F) |
| Dados (página inteira) | Método e dados E |
| Município: resultado, mapa resultado/surpresa, locais e seções | Cidade, abas "Resultado" e "Ache a sua seção" (5.3) |

## 7. Endereços antigos que continuam funcionando

Todos já circularam (inclusive no `llms.txt`). Cada um vira um redirecionamento (`<Navigate replace>`) ou uma âncora:

| Antigo | Novo |
|---|---|
| `#/virar?…` | `#/?…` (mesmos parâmetros) |
| `#/analise`, `#/analise?cap=c-jogo` e os demais capítulos, `#/analise?c=c-…` | `#/entenda`, na resposta correspondente; capítulos que saíram vão para o bloco de Método e dados |
| `#/dados` | `#/metodo?sec=dados` |
| `#/municipio/{cd}`, `…?local={zona}-{local}`, `…?a=…` | cidade na aba certa (5.3) |
| `#/mapa?v=…`, `#/urna/…`, `#/conferencia`, `#/metodo`, `#/sobre` | iguais |
| `#/virar?ir=como-fazer`, `?ir=como-calculamos` | `#/como-usar?ir=lei` e `?ir=conversas` |

## 8. Vocabulário: um nome para cada coisa

| Conceito | Na tela (fora do técnico) | Evitar fora do técnico | Explicado em |
|---|---|---|---|
| local de votação | escola | "local", "locais de votação" | glossário |
| seção eleitoral | urna (seção) | "seção" sozinha | glossário |
| município | cidade | "município" | — |
| ação / lente | conversa ("Que tipo de conversa?") | "ação", "lente" | — |
| faltosos | quem faltou / faltaram | "faltosos", "abstenção" | Como usar |
| abertos | votos em aberto ("votaram em outro candidato, branco ou nulo") | "ficou de fora" (pode ser lido como "não votou") | Como usar |
| saldo | saldo possível | — | Como usar |
| gap / surpresa | votos abaixo do esperado | "gap", "surpresa", "resíduo" | Como usar e Método C |
| diferença de percentual | pontos (1 ponto = 1 voto em cada 100) | "p.p." | glossário |

As três conversas ficam: **Lembrar quem faltou** · **Conversar com quem votou em outro** (subtítulo: outros candidatos, branco ou nulo) · **Onde o perfil promete mais** (experimental, se D9 mantiver). Mudar em `lib/virar.ts` (`LENTES`) e procurar os textos soltos com `grep`.

## 9. O padrão "técnico para os dois públicos"

Todo conteúdo técnico vira blocos assim (`components/BlocoTecnico.tsx`):

1. **Pergunta no título**, em linguagem comum: "De onde vem cada parte do resultado de uma urna?"
2. **Resposta curta** (até 3 frases, com um número): "No voto em Lula, da diferença entre as urnas do país, 63% vem do estado onde elas ficam, 22% da cidade e 16% da própria urna."
3. **Como funciona** (um parágrafo, com exemplo ou comparação, sem jargão): "É o jogo de adivinhar uma urna: saber o estado já reduz muito o erro; saber a cidade, mais um pouco; o que sobra é da própria urna."
4. **Detalhe técnico** (fechado por padrão): o nome do método (correlação intraclasse de um modelo multinível de três níveis, no logit), a fórmula, os testes e o link para o código.

Regra: jargão só dentro do "Detalhe técnico". Fora de Método e dados, nenhum termo da lista do `inventario.py`.

## 10. Prioridades e calendário

| Etapa | Datas | O que entra | Deploy |
|---|---|---|---|
| R0 | sex 09 a dom 11/10 | Confirmar D1 a D10. Menu, rotas e redirecionamentos (seção 7). Inicial = ferramenta (5.1, sem a busca nova). Como usar (5.5). Urna na ordem nova (5.4). Vocabulário nas telas de ação (8). D9. Testes atualizados | sim |
| R1 | seg 12 (feriado) a qua 14/10 | Método e dados no padrão de camadas (5.8). Entenda (5.7). Confira simplificada (5.6) | sim |
| R2 | qui 15 a sáb 17/10 | Busca única, fase 1 (5.2). Cidade numa página (5.3). Mapa do Brasil dentro da ferramenta (5.1). Mapa em dois grupos, Sobre e rodapé (5.9, 5.10) | sim |
| R3 | dom 18 a qui 22/10 | Teste com 5 a 8 pessoas de idades e escolaridades diferentes, na estrutura nova (tarefa: "ache a sua escola e diga onde você conversaria"); correções; revisão final | sim |
| — | sex 23/10 | Folga para imprevistos | — |
| — | sáb 24/10 | Último deploy | sim |
| — | dom 25/10 | Nada novo | não |

Se atrasar, cortar nesta ordem: busca fase 2 → cidade numa página (D7) → mapa do Brasil dentro da ferramenta → gráficos do Entenda (fica o texto).

**Andamento:** R0 publicado em 08/10 (commit 32f1f0a). R1 publicado em 08/10: Entenda com 1.109 palavras, 0 termos técnicos e 5.744 px; Método e dados com 2 termos técnicos visíveis sem abrir os detalhes. Próximo: R2.

## 11. Verificação (antes de cada push)

1. Se mexer em dados: `python pipeline/03_validar_controle.py` e `python pipeline/07_exportar_site.py` (a trava tem que passar).
2. `cd site && npm run build` (inclui a checagem de tipos).
3. `npx vite preview --port 4173` e, em outro terminal:
   - `python site/scripts/testes.py` (atualizar as baterias junto com cada mudança: rotas novas, redirecionamentos, rótulos);
   - `python site/scripts/inventario.py`: nenhum termo técnico visível fora de `#/metodo`; em `#/metodo`, no máximo 15 sem abrir os detalhes;
   - `python site/scripts/telas.py` com as rotas novas no `PADRAO` (`#/como-usar`, `#/entenda`, `#/?c=13&m=71072`, os redirecionamentos da seção 7); olhar desktop claro e celular escuro.
4. Depois do push: esperar o deploy (API pública do GitHub: `/repos/DuhBenhur/urna-em-camadas/actions/runs`) e rodar `python site/scripts/testes.py https://duhbenhur.github.io/urna-em-camadas/`.
5. Atualizar `site/public/llms.txt` e o `README.md` quando mudar endereço ou nome.

## 12. O que continua valendo

- As regras do `CLAUDE.md`: os dois candidatos sempre juntos e com o mesmo peso; o site não pede voto; lugares, nunca pessoas; a lei em toda tela de ação; o site só fala do que foi entregue (nada de previsão); números em pontos e "de cada 100"; prosa ≥ 16 px; nada novo no dia 25.
- Não mudam: os dados, os modelos, as contas, as cores validadas, a trava da exportação.
- Commit e push por etapa (o usuário autorizou publicar o plano em curso); atualizar o `HANDOFF.md` ao fim de cada sessão.
