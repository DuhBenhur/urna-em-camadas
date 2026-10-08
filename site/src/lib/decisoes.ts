/** Escolhas de método, com o motivo e a alternativa descartada. A inicial mostra as marcadas como `inicio`. */
export const DECISOES: { escolha: string; porque: string; descartada: string; inicio?: boolean }[] = [
  {
    escolha: 'A urna (seção eleitoral) como unidade',
    porque: 'É a menor unidade com resultado oficial público: são quase 500 mil.',
    descartada: 'Analisar por município, que esconde a variação dentro de cada cidade.',
    inicio: true,
  },
  {
    escolha: 'Conferir o SHA-512 de cada arquivo',
    porque: 'Garante que o arquivo baixado é exatamente o que o TSE publicou.',
    descartada: 'Confiar no download.',
  },
  {
    escolha: 'Validar a base antes de modelar',
    porque: 'Um erro na base contamina tudo o que vem depois. Foi assim que apareceu o nulo técnico.',
    descartada: 'Conferir só no fim, quando o erro já se espalhou.',
    inicio: true,
  },
  {
    escolha: 'Modelo multinível (seção, município, estado)',
    porque: 'Urnas da mesma cidade não são independentes. O modelo separa quanto da variação está em cada camada.',
    descartada: 'Regressão comum, que mistura as camadas e subestima a incerteza.',
    inicio: true,
  },
  {
    escolha: 'Repartir a explicação pela média de todas as ordens (valor de Shapley)',
    porque: 'Os grupos de características se sobrepõem: o crédito de cada um mudaria conforme a ordem de entrada no modelo.',
    descartada: 'Uma ordem fixa, que dá o crédito da sobreposição a quem entra primeiro.',
  },
  {
    escolha: 'Renda, PIB e Bolsa Família num índice socioeconômico',
    porque: 'Andam juntos demais (correlação de −0,91 entre renda e Bolsa Família) para separar o efeito de cada um.',
    descartada: 'Interpretar cada coeficiente sozinho.',
  },
  {
    escolha: 'Logit da proporção de votos',
    porque: 'O percentual fica sempre entre 0% e 100%.',
    descartada: 'Modelar o percentual direto, que pode prever valores impossíveis.',
  },
  {
    escolha: 'gpboost, conferido com o statsmodels',
    porque: 'Ajusta o modelo nas 500 mil urnas em segundos. Os dois pacotes chegam ao mesmo resultado.',
    descartada: 'Só o statsmodels: uns 5 minutos por modelo e falha no modo esparso.',
  },
  {
    escolha: 'Teste de razão de verossimilhança com correção de fronteira',
    porque: 'Uma variância não pode ser negativa, e o teste precisa levar isso em conta.',
    descartada: 'Teste Z, que fica errado justamente nesse limite.',
  },
  {
    escolha: 'Somar o saldo escola por escola',
    porque:
      'Um estado onde o candidato perdeu ainda tem escolas onde ele ganhou. Somando as escolas, estado, município e escola contam a mesma história.',
    descartada: 'Calcular o saldo com o total do estado ou do município, que zera o saldo onde o candidato perdeu no total.',
  },
  {
    escolha: 'Não priorizar lugares apertados',
    porque:
      'No 2º turno para presidente, cada voto conta igual no país inteiro. O que importa é quantas pessoas alcançáveis há perto, não a margem do lugar.',
    descartada: 'Ordenar os lugares pela margem do 1º turno, como se houvesse estado-pêndulo.',
  },
  {
    escolha: 'Três ações com contas separadas',
    porque: 'Três números simples podem ser conferidos um a um. A terceira, que depende do modelo, leva o selo de experimental.',
    descartada: 'Um índice único que misturasse as três contas: uma caixa-preta.',
  },
  {
    escolha: 'Sem previsão do 2º turno',
    porque:
      'O foco ficou na ferramenta de ação (Onde virar voto). Uma previsão publicada antes da eleição pareceria pesquisa eleitoral, e o site não é pesquisa.',
    descartada: 'Prever o 2º turno urna por urna e registrar a previsão antes da eleição.',
    inicio: true,
  },
]
