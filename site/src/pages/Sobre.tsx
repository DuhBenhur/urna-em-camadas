import { Link } from 'react-router-dom'
import { REPOSITORIO } from '../lib/projeto'

export function Sobre() {
  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>Sobre</h1>

      <p>
        <strong>Urna em Camadas</strong> mostra onde virar voto no 2º turno, bairro a bairro: com o resultado oficial do 1º turno,
        urna por urna, em que bairros e escolas há mais gente para conversar, com a mesma conta para os dois candidatos. Por
        trás, uma análise das 497.897 urnas do país, conferidas com o resultado oficial e separadas em camadas (estado, cidade,
        escola e urna).
      </p>
      <p>
        É um projeto de ciência de dados feito por <strong>Eduardo Ben Hur</strong> com{' '}
        <a href="https://claude.com/claude-code">Claude Code</a>, o assistente de programação da Anthropic. O código-fonte, os
        dados processados, as conferências e o histórico de cada mudança estão <a href={REPOSITORIO}>no GitHub</a>.
      </p>

      <h2>Transparência</h2>
      <ul>
        <li>
          Todas as informações vêm de bases públicas: Tribunal Superior Eleitoral (TSE), IBGE, Ministério do Desenvolvimento e
          Assistência Social (MDS) e Ministério do Desenvolvimento, Indústria, Comércio e Serviços (MDIC).
        </li>
        <li>
          Qualquer pessoa pode refazer tudo do zero: o código baixa os dados oficiais, confere as assinaturas digitais
          publicadas pelo TSE e roda as mesmas conferências descritas em <Link to="/metodo?sec=fontes">Método e dados</Link>.
        </li>
      </ul>

      <h2>Achou um erro?</h2>
      <p>
        Abra um aviso (<em>issue</em>) <a href={`${REPOSITORIO}/issues`}>no repositório do projeto</a>, dizendo a página e o que
        viu. Cada correção fica registrada no histórico, com a data.
      </p>

      <h2>Inspiração metodológica</h2>
      <p>
        A ideia de separar o resultado em camadas (o que é do estado, da cidade e da urna) foi inspirada num estudo de Gomes e
        Tarantin Junior sobre a renda dos domicílios nos estados brasileiros (Quaestum, 2025). A referência completa está em{' '}
        <Link to="/metodo?sec=inspiracao">Método e dados</Link>.
      </p>

      <h2>O que este site não é</h2>
      <ul>
        <li>
          <strong>Não é pesquisa eleitoral.</strong> Não entrevista eleitores nem mede intenção de voto. Analisa resultados
          oficiais já apurados.
        </li>
        <li>Não tem vínculo com partidos, candidaturas ou campanhas, e não recebe dinheiro de ninguém.</li>
        <li>
          Não pede voto. A ferramenta faz a mesma conta para os dois candidatos do 2º turno; quem escolhe o lado é quem usa. Ela
          aponta lugares (escolas e bairros), nunca pessoas, e traz as regras da lei eleitoral para conversar.
        </li>
        <li>
          Não faz enquetes. Conta as visitas de forma anônima, com o <a href="https://www.goatcounter.com/">GoatCounter</a>:
          sem cookies, sem guardar dados pessoais e sem enviar o candidato que você escolhe, a zona, a seção ou a escola (só o
          tipo de página, a cidade e ações como imprimir a folha). A busca pela sua zona e seção acontece no seu navegador, e
          o candidato escolhido fica guardado só nesta aba, até ela ser fechada.
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
