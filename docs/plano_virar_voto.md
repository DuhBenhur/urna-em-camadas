# Plano: "Onde virar voto" no centro do projeto

Escrito em 08/10/2026 para a sessão que vai implementar (e para o Eduardo revisar). Decisão do usuário: **"Onde virar voto" passa a ser a história central do Urna em Camadas, amarrada a tudo o que já existe.** Prazo duro: o 2º turno é em **25/10/2026**. Último deploy até **24/10**; nenhum push no dia 25.

Antes de começar, leia o `HANDOFF.md` (estado do projeto) e o `CLAUDE.md` (convenções). Este arquivo diz **o que mudar, em que ordem e como saber que ficou pronto**.

---

## 1. A história nova

**Espinha, em uma frase:** no 2º turno, cada voto conta igual no país inteiro; o lugar diz muito sobre como se vota, e é por lugar que dá para agir. Escolha o candidato, comece pela sua urna, encontre as escolas e os bairros perto de você onde uma conversa rende mais. Depois de votar, confira a urna.

**Arco do site:**

| Papel na história | O que já existe e passa a cumprir esse papel |
|---|---|
| **1. Agir** (o centro) | `#/virar` (ferramenta), destaque na inicial, busca por zona/seção como porta de entrada pessoal |
| **2. Por que agir por lugar** (a evidência) | capítulos da `#/analise`: o lugar diz muito (cap. 1–2), vizinhos votam parecido (cap. 3), composição x contexto (cap. 4), bolsões e surpresas (cap. 5); o modelo de 4 níveis (local de votação 20% da variação, a urna em si 3%) justifica agir por **escola e bairro** |
| **3. Confiar** | `#/conferencia`: as 497.897 urnas batem com o resultado oficial; "depois de votar, confira o boletim da sua seção" |
| **4. Transparência** | `#/metodo`, `#/dados`, `#/sobre`, repositório |

A inicial deixa de ser "a sua urna, conferida e explicada" e passa a ser **"Onde a sua conversa pode virar voto"**. A urna individual, as camadas, o mapa e a análise continuam, mas a serviço da ação.

## 2. Decisões tomadas (podem ser revistas pelo usuário)

1. **Nome:** continua "Urna em Camadas" (a URL já circulou). Muda o subtítulo: "Onde virar voto no 2º turno, bairro a bairro".
2. **Neutralidade:** os dois candidatos sempre lado a lado, mesma conta, nenhum pedido de voto. Texto padrão em toda tela da ação: "A mesma conta para os dois candidatos. O site não pede voto para ninguém."
3. **Unidade da ação: escola (local de votação) e bairro**, nunca pessoas. Evidência: 4 níveis (`HANDOFF.md`, "Modelos explicativos").
4. **Não priorizar lugares apertados:** no 2º turno presidencial todo voto vale igual. Fica explicado no site.
5. **Três ações com contas separadas, sem índice composto.** Um índice único seria uma caixa-preta; três números simples dão para conferir.
   - *Lembrar quem faltou:* saldo possível = faltosos × vantagem, só onde o candidato ficou à frente, escola por escola, somado para cima. **Já feito.**
   - *Conversar com quem ficou de fora:* outros candidatos + brancos + nulos. **Já feito.**
   - *Onde o perfil promete mais* (nova, experimental): votos abaixo do esperado pelo modelo = max(0, −surpresa) × válidos, escola por escola. Ou seja, escolas onde o candidato teve menos votos que escolas de perfil parecido **na mesma cidade**.
6. **Promessa de previsão do 2º turno: retirar.** O usuário decidiu em 07/10 "deixar a parte do segundo turno para o segundo turno". Trocar por "Depois de 25/10: comparar os turnos, urna por urna".
7. **Candidato escolhido viaja pelo site:** escolhido na inicial, vale na urna, no município, no mapa e na análise. Fica no parâmetro `?c=` da URL, com cópia em `sessionStorage`.
8. **Congelamento:** último deploy em 24/10. Em 25/10, nada novo (Lei 9.504/97, art. 39, § 5º, IV). Depois de 25/10, a página vira registro e entra a comparação dos turnos.

## 3. Estado de partida (fatos conferidos em 08/10)

- `#/virar` no ar (commit `d31956d`): candidato → ação → Brasil/estado/município → bairros e escolas, com mapa; destaque no topo da inicial; item "Virar voto" no menu; `#/municipio/{cd}?local={zona}-{local}` abre com a escola selecionada.
- Totais que fecham entre estados, municípios e escolas: faltosos **32.894.899** (= abstenções oficiais); em aberto **15.251.315**; saldo possível Lula **3.888.389**, Flávio **4.656.407**; abaixo do perfil (não exportado ainda) Lula **2.421.341**, Flávio **2.080.426**.
- Cobertura: 99,4% das 94.087 escolas têm coordenada; 99,7% têm surpresa (`s13`/`s22` em `locais/{cd}.json`).
- Teste de "perto de você" (escola do usuário: SP, zona 403, local 1554, EMEI Conj. Res. Elísio Teixeira Leite): 35 escolas num raio de 2 km; Lula: saldo 5.539, em aberto 17.290; Flávio: saldo 0 (perdeu em todas), em aberto 17.290, abaixo do perfil 3.460.
- Em SP capital, a escola nº 1 de Lula em "lembrar quem faltou" é a E.E. Caetano de Campos (Consolação/Bela Vista); o bairro nº 1 é a Bela Vista.

## 4. Mudanças, por prioridade

Cada item: arquivos, o que fazer e o critério de pronto. Depois de cada bloco: build, `telas.py`, commit e push (o usuário autorizou publicar).

### P0: até sábado, 10/10

**P0.1 Retirar a promessa de previsão** (honestidade antes de tudo)
- `site/src/components/ComoFoiFeito.tsx:63-65`: etapa "A previsão" vira "Depois do 2º turno": comparar os turnos urna por urna e conferir o 2º turno com o resultado oficial.
- `site/src/lib/decisoes.ts:52`: a decisão "Previsão do 2º turno pré-registrada" vira "Sem previsão do 2º turno", com o porquê: o foco foi a ferramenta de ação; uma previsão publicada antes da eleição pareceria pesquisa.
- `site/src/pages/Analise.tsx:322`: tirar a frase da previsão.
- `site/src/pages/Metodo.tsx:267`: a mesma troca em "Próximas etapas".
- Pronto quando: `grep -rni "pré-regist\|previsão do 2" site/src` só encontra o texto novo.

**P0.2 Candidato que viaja pelo site**
- Novo `site/src/lib/candidato.ts`: hook `useCandidato()` → `[n | null, definir]`. Lê `?c=13|22` e, na falta, o `sessionStorage` (com try/catch). `definir` grava os dois.
- Usar em `Virar.tsx` (já lê `?c`), `Urna.tsx`, `Municipio.tsx`, `Mapa.tsx`, `Analise.tsx` e `SeletorCandidato` (aceitar estado externo).
- `Busca.tsx`: ao ir para a urna, levar o `?c=` se houver candidato escolhido.
- Pronto quando: escolher Flávio na inicial, buscar uma urna e abrir o município mantém Flávio em tudo, e recarregar a página não perde a escolha.

**P0.3 Inicial nova** (`site/src/pages/Inicio.tsx`). Estrutura, nesta ordem:
1. **Topo:** rótulo "2º turno · 25 de outubro"; h1 "Onde a sua conversa pode virar voto"; uma frase: "Com o resultado oficial do 1º turno, urna por urna, o site mostra em que bairros e escolas há mais gente para conversar, para o candidato que você escolher. A mesma conta para os dois."
2. **Passo 1, "Para quem?":** os dois botões (o atual `.destaque-virar` vira este bloco, sem a moldura de banner).
3. **Passo 2, "Por onde começar?":** duas portas lado a lado.
   - "Pela minha urna": a `Busca` atual (zona e seção) leva à urna com o bloco de ação aberto (P0.4).
   - "Por um lugar": estado e município levam ao `#/virar` naquele lugar.
   - Manter a ajuda "Não sabe a sua zona e a sua seção?…" e o exemplo da Bela Vista.
4. **"Três jeitos de fazer diferença":** três cartões com o número nacional (e do candidato, se escolhido) e um link para a ação no `#/virar`: quem faltou (32,9 milhões), quem ficou de fora (15,3 milhões), onde o perfil promete mais (P1.1; até lá, só dois cartões).
5. **"Por que pensar em bairros":** os três achados atuais reescritos como argumento para a ação, apontando para os capítulos:
   - "O lugar diz muito": cap. 1–2.
   - "Vizinhos votam parecido": cap. 3. Daí faz sentido conversar no bairro.
   - "Dentro da cidade, o que pesa é o bairro, não a urna": modelo de 4 níveis. Daí a ferramenta fala de escolas, não de seções.
6. **"Dentro da lei":** quatro linhas (nada em troca do voto; não transportar eleitores; nada de boca de urna; só informação verdadeira) e um link para a lista completa no `#/virar`.
7. **"Depois de votar, confira":** o cartão atual da conferência, reescrito como ação ("fotografe o boletim da sua seção; as 497.897 urnas do 1º turno batiam com o resultado oficial").
8. `ComoLer` e os links para Análise e Mapa, como hoje.

- O h1 antigo e o texto "conferida e explicada" saem da inicial. O texto da conferência vai para o item 7.
- Pronto quando: em 390 px, o passo 1 aparece sem rolar; os dois candidatos estão lado a lado (ou empilhados com o mesmo peso); nenhum texto menor que 16 px na prosa; zero erros de console.

**P0.4 "Agir a partir desta urna"** (`site/src/pages/Urna.tsx`)
- Bloco novo logo depois da grade boletim + camadas, antes de "Quem vota nesta seção". Título "Daqui até o dia 25". Seletor de candidato (o do P0.2).
- Conteúdo:
  - Na sua escola: faltaram X; ficaram de fora Y; saldo possível Z (ou "{candidato} não ficou à frente aqui").
  - Perto de você (2 km, mesmo município): N escolas, totais das ações e as 3 primeiras da ação escolhida.
  - Botão "Ver as escolas perto daqui no mapa" → `#/virar?c=..&uf=..&m=..&perto={zona}-{local}`.
- Dados: `locais/{cd}.json` (já tem `faltosos`, `abertos`, `lat`, `lon`, `s13`, `s22`). Distância por haversine em `lib/virar.ts` (`distanciaKm`). Escola sem coordenada: mostrar só "na sua escola" e explicar que a escola não tem coordenada no cadastro do TSE.
- Pronto quando: `#/urna/SP/403/411` mostra a EMEI Elísio Teixeira Leite com 35 escolas perto; Lula com saldo ~5.500; Flávio com a frase de que não ficou à frente.

**P0.5 `?perto=` no `#/virar`** (`site/src/pages/Virar.tsx`, `NivelMunicipio`)
- Com `perto={zona}-{local}`: o mapa abre com essa escola selecionada e um anel de 2 km. O anel pode ser uma camada de linha GeoJSON gerada no navegador; se complicar, basta a seleção com zoom.
- Ganha uma tabela "Perto de você" acima de "Bairros", com as escolas a até 2 km ordenadas pela ação e a distância em km.
- Pronto quando: o botão do P0.4 leva a essa vista e o "voltar" do navegador volta à urna.

**P0.6 Trava de conferência no exportador** (`pipeline/07_exportar_site.py`)
- Asserts antes de gravar: soma de `faltosos`/`abertos`/`saldo13`/`saldo22` por estado = soma por município = soma por escola (tolerância de 1 voto por município para o arredondamento do saldo); faltosos = `totais.abstencoes`.
- Pronto quando: exportação passa, e quebrar um número de propósito derruba a exportação.

### P1: até terça, 13/10

**P1.1 Terceira ação: "Onde o perfil promete mais" (experimental)**
- Conta, por escola: `max(0, −s{n}) × validos` (`s{n}` = resultado − esperado pela cidade e pelo perfil do eleitorado do local; já existe). Exportador: somar escola por escola em `gap13`/`gap22` para municípios e estados, como o saldo.
- `lib/virar.ts`: `Lente = 'faltosos' | 'abertos' | 'perfil'`. Na escola, calcula a partir de `s13`/`s22`; acima dela, usa o somado.
- Texto: "Escolas onde {candidato} teve menos votos do que escolas de perfil parecido na mesma cidade (idade, sexo e escolaridade de quem vota ali). Pode indicar onde há mais gente parecida com quem vota nele, mas que não votou. Depende do modelo; trate como pista, não como certeza." Selo "experimental".
- "Como calculamos": de onde vem o esperado (modelo do capítulo 4), link para o Método e o aviso de falácia ecológica.
- Pronto quando: totais nacionais ~2,42 mi (Lula) e ~2,08 mi (Flávio); a página mostra o selo; escolas sem surpresa ficam fora sem quebrar nada.

**P1.2 Mapa nacional com a vista "Onde virar voto"** (`site/src/pages/Mapa.tsx`, `components/Mapas.tsx`)
- Vista `?v=virar`: coroplético de **saldo possível por 100 eleitores aptos** (taxa, não total, para cidade grande não dominar), na rampa sequencial da cor do candidato (uma cor, claro → escuro). Exige `aptos` em `municipios.json`; o exportador ainda não grava, então acrescentar.
- Seletor de ação (faltosos | abertos | perfil). Legenda com 5 classes. Dica com os números absolutos.
- Clique leva ao `#/virar` do município. Antes de escolher as cores, carregar a skill de dataviz e validar a rampa com `validate_palette.js --ordinal` nos dois modos.

**P1.3 Página do município** (`site/src/pages/Municipio.tsx`)
- Terceira vista no mapa de locais, "Virar voto", com tamanho = ação escolhida (o `MapaLocais` já aceita `tamanho`/`linhaExtra`/`chave`) e um link "Ver o ranking de bairros e escolas" para o `#/virar` do município.

**P1.4 Método, decisões e dados**
- `Metodo.tsx`: seção nova "Onde virar voto: contas, suposições e limites", com as três fórmulas, por que somar escola por escola, por que não lugares apertados, faltoso como teto, suposição sobre quem falta e a dependência do modelo na 3ª ação.
- `decisoes.ts`: três decisões novas:
  - somar o saldo escola por escola (descartada: calcular no total do estado);
  - não priorizar lugares apertados (descartada: ranking por margem);
  - três ações separadas (descartada: índice único).
- `Dados.tsx`: dicionário das colunas novas (`faltosos`, `abertos`, `saldo13/22`, `gap13/22`, `aptos`).

**P1.5 Vitrine**
- `site/index.html` (title, description, og:*): "Urna em Camadas: onde virar voto no 2º turno, bairro a bairro".
- `site/scripts/og.py`: gerar a imagem nova com a frase central e os dois candidatos com o mesmo peso.
- `site/public/llms.txt`, `README.md` (abertura), `Sobre.tsx`: atualizar a frase do projeto.

### P2: até domingo, 18/10

**P2.1 Análise a serviço da ação** (`site/src/pages/Analise.tsx`)
- Cada capítulo ganha, depois do "Em resumo", uma linha "**Para quem vai conversar:**". Exemplos:
  - cap. 3: "converse no bairro: vizinhos votam parecido";
  - cap. 4: "o perfil explica pouco dentro da cidade; o bairro e a história do lugar pesam mais";
  - cap. 5: "os bolsões mostram onde o voto foge do esperado; a 3ª ação parte deles".
- Cap. 7 "Por que importa" reescrito em torno de participação: agir por lugar, sem expor pessoas, e conferir a urna.

**P2.2 Cartão para compartilhar "perto de mim"** (opcional)
- Mesmo mecanismo de `site/src/lib/cartao.ts`. Mostra números do lugar e da ação (ex.: "Nas 35 escolas perto da minha, 17 mil pessoas votaram em outro candidato, branco ou nulo no 1º turno"), com o rodapé "A mesma conta para os dois candidatos · Urna em Camadas".
- Nada de "vote em": o cartão informa, não pede voto.

**P2.3 Teste com pessoas** (pendência antiga do `HANDOFF.md`)
- 5–8 pessoas de idades diferentes, tarefa "ache a sua urna e diga onde você conversaria". Anotar onde travam e corrigir até 22/10.

### Depois de 25/10 (não implementar antes)

- Baixar o 2º turno, repetir a conferência e a decomposição, comparar os turnos por escola.
- Na `#/virar`, um aviso: "Ferramenta usada no 2º turno de 2026; números do 1º turno."
- Uma análise honesta, sem causalidade: o comparecimento subiu mais onde havia mais faltosos?

## 5. Dados e pipeline (resumo do que muda)

| Arquivo | Mudança |
|---|---|
| `pipeline/07_exportar_site.py` | asserts de conferência (P0.6); `gap13`/`gap22` somados escola por escola (P1.1); `aptos` em `municipios.json` (P1.2) |
| `site/public/dados/*` | gerado pelo CI; nada versionado |
| Modelos (`05`, `10`, `11`) | **não mudam**. A 3ª ação usa a surpresa já calculada. |

## 6. Regras que valem para todo texto novo

- Os dois candidatos sempre juntos, Lula primeiro (ordem do resto do site), com o mesmo peso visual.
- Falar de **lugares** (escolas, bairros) e de **pessoas no agregado** ("quem faltou"), nunca de indivíduos. Nada que permita achar uma pessoa.
- Números em "pontos" e "de cada 100" (`lib/formato.ts`). Jargão (ICC, logit, BLUP) só no Método e nos "Como sabemos".
- Sempre o par: o número **e** o que ele não diz (faltoso é teto; em aberto não tem lado; perfil é pista).
- A lei, em toda tela de ação (versão curta) e completa no `#/virar`:
  - compra de voto (Código Eleitoral, art. 299);
  - transporte de eleitores (Lei 6.091/1974);
  - propaganda em prédio público (Lei 9.504/1997, art. 37);
  - boca de urna (Lei 9.504/1997, art. 39, § 5º);
  - notícia falsa (Código Eleitoral, art. 323).
  - Novo: pessoa física **não pode pagar impulsionamento** (só candidatos e partidos). O site não impulsiona nada e não deve sugerir que alguém impulsione.
- Sem enquete, sem formulário, sem coleta de dados de quem visita.

## 7. Verificação (antes de cada push)

1. `python pipeline/03_validar_controle.py` e `python pipeline/07_exportar_site.py` (com os asserts do P0.6).
2. `cd site && npm run build` (inclui checagem de tipos).
3. `npx vite preview --port 4173` e `python site/scripts/telas.py` com as rotas novas: acrescentar ao `PADRAO` `#/virar?c=13`, `#/virar?c=22&a=abertos&uf=SP&m=71072`, `#/urna/SP/403/411?c=13` e `#/virar?c=13&uf=SP&m=71072&perto=403-1554`.
4. Olhar as telas (desktop claro e celular escuro): candidato mantido entre páginas, nada cortado, tabelas legíveis em 390 px.
5. Depois do push, conferir o site ao vivo com o Chrome (como em 08/10): os dados novos chegam em ~2–3 min.

## 8. Ordem sugerida para a nova sessão

1. Ler `HANDOFF.md`, este plano e `site/src/pages/Virar.tsx`, `site/src/lib/virar.ts` e `site/src/pages/Inicio.tsx`.
2. P0.1 → commit "Retira a promessa de previsão do 2º turno".
3. P0.6 → P0.2 → commit.
4. P0.3 + P0.4 + P0.5 (a nova porta de entrada) → telas → commit e push → conferir ao vivo.
5. P1.1 → P1.2 → P1.3 → P1.4 → P1.5, com commit e push por item.
6. P2 conforme o tempo. Atualizar o `HANDOFF.md` ao fim de cada sessão.
