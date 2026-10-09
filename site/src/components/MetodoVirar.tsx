import { Link } from 'react-router-dom'
import type { Resumo, UF } from '../lib/dados'
import { inteiro } from '../lib/formato'
import { RAIO_PERTO_KM } from '../lib/virar'
import { TabelaRolagem } from './TabelaRolagem'

const FORMULAS = `e = escola (local de votação), c = candidato, o = o adversário

faltosos(e)  = aptos(e) − comparecimento(e)
saldo(c, e)  = max(0, faltosos(e) × (votos_c(e) − votos_o(e)) ÷ válidos(e))

abertos(e)   = válidos(e) − votos_13(e) − votos_22(e) + brancos(e) + nulos(e)

surpresa(c, e) = votos_c(e) ÷ válidos(e) − esperado(c, e)
abaixo(c, e)   = max(0, −surpresa(c, e)) × válidos(e)

município, estado, Brasil = soma das escolas`

/**
 * Detalhe técnico das contas da ferramenta (o bloco "Como são feitas as contas da ferramenta?" de Método e dados): as três
 * fórmulas, os totais para conferir, por que somar escola por escola, o que é suposição e o que é limite.
 */
export function MetodoVirar({ resumo }: { resumo: Resumo | null }) {
  const soma = (f: (u: UF) => number | undefined) => (resumo ? inteiro(resumo.ufs.reduce((s, u) => s + (f(u) ?? 0), 0)) : '…')
  return (
    <>
      <h3>As fórmulas</h3>
      <p>
        Três contas sobre o resultado oficial do 1º turno, feitas por local de votação. Ficam separadas, para cada uma poder ser
        conferida sozinha; nenhuma vira índice. Trocar o candidato só troca quem é “à frente” e qual esperado é usado.
      </p>
      <pre className="cartao" tabIndex={0} aria-label="Fórmulas do Onde virar voto (role para os lados)" style={{ overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
        {FORMULAS}
      </pre>
      <p>
        O esperado da terceira conta é o do modelo explicativo (bloco “Por que os estados votam diferente?”): o efeito do estado
        e do município mais o perfil do eleitorado da escola (idade, sexo e escolaridade), com os coeficientes de dentro da
        cidade. É a mesma surpresa do mapa de locais de cada município.
      </p>
      <h3>Os totais, para conferir</h3>
      <TabelaRolagem rotulo="Totais do Onde virar voto no Brasil">
        <table aria-describedby="nota-totais-virar">
          <thead>
            <tr>
              <th>Conta</th>
              <th className="num">Lula</th>
              <th className="num">Flávio Bolsonaro</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Faltaram no 1º turno (igual às abstenções oficiais; não tem lado)</td>
              <td className="num" colSpan={2} style={{ textAlign: 'center' }}>
                {soma((u) => u.faltosos)}
              </td>
            </tr>
            <tr>
              <td>
                Saldo possível ao lembrar quem faltou<span aria-hidden="true">*</span>
              </td>
              <td className="num">{soma((u) => u.saldo13)}</td>
              <td className="num">{soma((u) => u.saldo22)}</td>
            </tr>
            <tr>
              <td>Votos em aberto: outros candidatos, brancos e nulos (não têm lado)</td>
              <td className="num" colSpan={2} style={{ textAlign: 'center' }}>
                {soma((u) => u.abertos)}
              </td>
            </tr>
            <tr>
              <td>Votos abaixo do esperado (experimental)</td>
              <td className="num">{soma((u) => u.gap13)}</td>
              <td className="num">{soma((u) => u.gap22)}</td>
            </tr>
          </tbody>
        </table>
      </TabelaRolagem>
      <p className="nota-tabela" id="nota-totais-virar">
        * Saldo possível: soma, escola por escola, de faltosos × vantagem do candidato, só nas escolas onde ele ficou à frente
        (fórmula acima). Teto, não previsão: supõe que quem faltou votaria como os vizinhos.
      </p>
      <h3>Suposições e limites</h3>
      <ul>
        <li>
          <strong>Por que somar escola por escola.</strong> O saldo de um estado é a soma dos saldos das suas escolas, não o
          saldo calculado com o total do estado: um estado onde o candidato perdeu ainda tem escolas onde ele ganhou, e o saldo
          calculado no total seria zero ali. Somando, o estado mostra a soma dos municípios, e cada município, a das escolas.
          Antes de publicar, a exportação (<code>pipeline/07_exportar_site.py</code>) confere que faltosos, votos em aberto,
          saldos e votos abaixo do esperado fecham entre estados, municípios e escolas (tolerância de 1 voto por município, por
          causa do arredondamento), que os faltosos são as abstenções oficiais e que, em cada município, aptos = faltosos +
          votos em aberto + votos dos dois finalistas. Se algo não fechar, nada é publicado.
        </li>
        <li>
          <strong>Por que não priorizar lugares apertados.</strong> No 2º turno para presidente, quem decide é o total do país:
          um voto a mais na Bahia vale o mesmo que um em Santa Catarina. Não há estado-pêndulo. O critério é quantas pessoas
          alcançáveis há perto, não a margem do lugar.
        </li>
        <li>
          <strong>Faltoso é teto.</strong> O cadastro inclui quem mudou de cidade, está fora do país ou não pode votar. Nem todo
          faltoso pode ser alcançado.
        </li>
        <li>
          <strong>A suposição do saldo.</strong> O saldo supõe que quem faltou votaria como os vizinhos que votaram na mesma
          escola. Quem falta costuma ser diferente de quem vota (mais jovem, mais velho, mais pobre), então o saldo é uma ordem
          de grandeza, não uma previsão.
        </li>
        <li>
          <strong>A terceira conta depende do modelo.</strong> O modelo não vê a renda do bairro (só a da cidade) nem a
          história política do lugar. Em São Paulo, as escolas mais abaixo do esperado para Lula ficam em bairros ricos, e as
          mais abaixo para Flávio, no centro expandido: parte do número é o que o modelo não mede. A surpresa vai para o site
          com 4 casas decimais, e as somas de municípios e estados usam esse valor arredondado, para bater com a conta que o
          navegador faz em cada escola. Escolas sem o perfil do eleitorado publicado ficam fora desta conta.
        </li>
        <li>
          <strong>Perto de você.</strong> Escolas do mesmo município com coordenada a até {RAIO_PERTO_KM} km da escola de
          partida, em linha reta. A escola é onde a pessoa vota, não onde mora: ela indica o bairro de quem vota ali, não o
          endereço de ninguém. Escolas sem coordenada no cadastro do TSE aparecem só nas tabelas.
        </li>
        <li>
          <strong>No mapa do Brasil,</strong> cada conta aparece por 100 eleitores aptos, em 5 classes fixas e iguais para os
          dois candidatos, para os mapas poderem ser comparados; os totais ficam na dica e nas tabelas.
        </li>
        <li>
          <strong>Lugares, não pessoas.</strong> Tudo são somas por escola; ninguém é identificado. O site não pede voto e não
          impulsiona nada; as regras da lei estão no guia <Link to="/como-usar?ir=lei">Como usar</Link>.
        </li>
      </ul>
    </>
  )
}
