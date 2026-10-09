# Roteiro do teste com pessoas (R3)

Para o Eduardo conduzir entre 18 e 22/10, na estrutura nova do site (`docs/plano_reorganizacao.md`, R3). Correções até 22/10; último deploy em 24/10.

## O que se quer saber

Uma pessoa comum, sem ajuda, consegue achar a escola onde vota e dizer onde, perto dela, conversaria? Entende o que os números querem dizer e o que não dizem? Percebe o site como neutro?

## Quem

- 5 a 8 pessoas, misturando idade (18–29, 30–49, 50+), escolaridade (fundamental, médio, superior) e aparelho (a maioria no próprio celular).
- Pelo menos 2 que usam pouco a internet e, se der, gente com simpatias pelos dois lados (para testar a neutralidade).

## Como conduzir

- No celular da pessoa, com o endereço do site aberto. Cerca de 20 minutos.
- Peça que ela pense em voz alta. Não ajude; se ela ficar parada mais de 2 minutos numa tarefa, anote "travou" e passe para a próxima.
- **Não pergunte em quem ela vota** e não anote nome, zona, seção nem nada que identifique alguém. Peça licença antes e diga que o teste é do site, não dela.

## As tarefas

| # | Diga assim | Deu certo quando |
|---|---|---|
| 1 | "Imagine que você quer ajudar um candidato no 2º turno, qualquer um. Ache a escola onde você vota e me diga onde, perto dela, você conversaria." | Chega à tabela "Perto de você" da escola (pela busca ou pela zona e seção) ou às escolas do bairro, e aponta lugares |
| 2 | "Quantas pessoas faltaram no 1º turno perto da sua escola? O que esse número quer dizer?" | Acha o número e diz, com as palavras dela, que é um teto, e não uma previsão |
| 3 | "O site pede voto para alguém? Por que você acha isso?" | Diz que não, ou que a conta é a mesma para os dois |
| 4 | "O que é proibido fazer para pedir voto? Ache no site." | Chega à lei (no fim da ferramenta ou em "Como usar") |
| 5 | "Abra a página da sua urna e me diga se o resultado dela confere com o oficial." | Acha o selo de conferência |
| 6 | Só para quem se interessar: "Onde está explicado como esse número foi calculado?" | Chega a "Método e dados" pelo link certo |

## Depois das tarefas

- De 1 a 5: foi fácil? Confia nos números? Compartilharia com alguém?
- "O que mais confundiu?" e "Que palavra você não entendeu?"

## O que anotar (uma linha por pessoa e tarefa)

| Pessoa (idade, escolaridade, aparelho) | Tarefa | Conseguiu? | Tempo | Onde travou | Frase que disse |
|---|---|---|---|---|---|

## Depois do teste

1. Junte os problemas e ordene por quantas pessoas tiveram e pela gravidade (impede a tarefa, atrasa, só incomoda).
2. Corrija primeiro o que impede a tarefa 1. Cada correção ganha um teste em `site/scripts/testes.py`.
3. Registre o resumo (quantas pessoas, o que mudou) no `HANDOFF.md`.
