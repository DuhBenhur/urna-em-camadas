import { REPOSITORIO } from '../lib/projeto'

export function Sobre() {
  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Sobre</h1>

      <p>
        <strong>Urna em Camadas</strong> mostra onde virar voto no 2º turno, bairro a bairro: com o resultado oficial do 1º turno,
        urna por urna, em que bairros e escolas há mais gente para conversar, com a mesma conta para os dois candidatos. Por
        trás, uma análise das 497.897 urnas do país, conferidas com o resultado oficial e separadas em camadas (estado,
        município, escola e urna).
      </p>
      <p>
        É um projeto de ciência de dados feito por <strong>Eduardo Ben Hur</strong> com{' '}
        <a href="https://claude.com/claude-code">Claude Code</a>, o assistente de programação da Anthropic. O código-fonte, os
        dados processados, as validações e o histórico de cada mudança estão <a href={REPOSITORIO}>no GitHub</a>.
      </p>

      <h2>Transparência</h2>
      <ul>
        <li>Todas as informações vêm de bases públicas: Tribunal Superior Eleitoral (TSE), IBGE e Ministério do Desenvolvimento e Assistência Social (MDS).</li>
        <li>
          Qualquer pessoa pode refazer a análise do zero: o pipeline baixa os dados oficiais, confere os hashes publicados pelo
          TSE e roda as mesmas validações descritas no Método.
        </li>
        <li>Erros encontrados podem ser relatados como <em>issue</em> no repositório. Correções ficam registradas no histórico.</li>
      </ul>

      <h2>O que este site não é</h2>
      <ul>
        <li>
          <strong>Não é pesquisa eleitoral.</strong> Não entrevista eleitores nem mede intenção de voto. Analisa resultados
          oficiais já apurados.
        </li>
        <li>Não tem vínculo com partidos, candidaturas ou campanhas, e não recebe dinheiro de ninguém.</li>
        <li>
          Não pede voto. A página “Onde virar voto” faz a mesma conta para os dois candidatos do 2º turno; quem escolhe o lado
          é quem usa. Ela aponta lugares (escolas e bairros), nunca pessoas, e traz as regras da lei eleitoral para conversar.
        </li>
        <li>
          Não faz enquetes nem coleta dados de quem visita. A busca pela sua zona e seção acontece só no seu navegador, e o
          candidato que você escolhe fica guardado só nesta aba, até ela ser fechada.
        </li>
        <li>Não publica conteúdo novo no dia da eleição (25 de outubro de 2026).</li>
      </ul>

      <h2>Licença</h2>
      <p>
        Código sob licença MIT. Dados processados e textos sob Creative Commons Atribuição 4.0 (CC BY 4.0): pode usar,
        adaptar e republicar, citando a fonte.
      </p>
    </div>
  )
}
