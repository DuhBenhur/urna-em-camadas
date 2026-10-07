import { Link } from 'react-router-dom'
import type { Explicacao, Resumo } from '../lib/dados'
import { inteiro, pct } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { comPreposicao } from '../lib/ufs'
import { BarrasHorizontais } from './BarrasHorizontais'
import { ComoSabemos } from './ComoSabemos'
import { PontosHorizontais } from './PontosHorizontais'

// ordem de leitura dos blocos: seção, município, região
const ORDEM = ['idade_sexo', 'escolaridade', 'renda_economia', 'cor_raca', 'religiao', 'urbanizacao', 'regiao']
const CURTOS: Record<string, string> = {
  idade_sexo: 'Idade e sexo do eleitorado da seção',
  escolaridade: 'Escolaridade do eleitorado da seção',
  renda_economia: 'Renda, PIB e Bolsa Família do município',
  cor_raca: 'Cor ou raça no município',
  religiao: 'Religião no município',
  urbanizacao: 'Urbanização do município',
  regiao: 'Região do país',
}
const MUNDLAK: Record<'escol' | '60_mais' | '16_24' | 'mulher', string> = {
  escol: 'Escolaridade (superior completo − até o fundamental incompleto)',
  '60_mais': '60 anos ou mais',
  '16_24': '16 a 24 anos',
  mulher: 'Mulheres',
}
const REGIOES: Record<string, string> = { N: 'Norte', NE: 'Nordeste', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul' }

/** p.p. já em pontos percentuais (0–100) → "+3,2 p.p."; o que arredonda para zero sai sem sinal */
const ppNum = (v: number) =>
  Math.abs(v) < 0.05
    ? '0,0 p.p.'
    : `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`
/** proporção → "22%"; o que arredonda para zero sai sem sinal */
const pctSemSinalNoZero = (v: number) => pct(Math.abs(v) < 0.005 ? 0 : v, 0)

export function CapituloExplicacoes({ explicacao, resumo, candidato }: { explicacao: Explicacao; resumo: Resumo; candidato: NumeroCandidato }) {
  const n = String(candidato) as '13' | '22'
  const e = explicacao.stepup.candidatos[n]
  const cand = CANDIDATOS[candidato]
  const icc = resumo.modelos[n].icc.UF
  const com = e.shapley.uf.com_regiao
  const sem = e.shapley.uf.sem_regiao
  const perfilSecao = com.blocos.idade_sexo + com.blocos.escolaridade
  const perfilMun = com.blocos.renda_economia + com.blocos.cor_raca + com.blocos.religiao + com.blocos.urbanizacao
  const regiao = com.blocos.regiao
  const sobra = 1 - com.total
  const nomeUf = (uf: string) => resumo.ufs.find((u) => u.uf === uf)?.nome ?? uf
  const boot = e.bootstrap

  const barras = [
    ...ORDEM.map((b) => ({
      rotulo: CURTOS[b],
      valor: com.blocos[b],
      dica: b === 'regiao' ? 'só existe no modelo com região' : `sem a região no modelo: ${pctSemSinalNoZero(sem.blocos[b] ?? 0)}`,
    })),
    { rotulo: 'Não explicado', valor: sobra, dica: `sem a região no modelo: ${pctSemSinalNoZero(1 - sem.total)}` },
  ]
  const estados = Object.keys(e.efeito_estado_pp.nulo)
    .map((uf) => ({ chave: uf, rotulo: uf, valor: e.efeito_estado_pp.perfis[uf] * 100, antes: e.efeito_estado_pp.nulo[uf] * 100 }))
    .sort((a, b) => b.antes - a.antes)
  const efeitos = Object.entries(e.efeitos)
    .map(([chave, v]) => ({ chave, rotulo: v.rotulo, valor: v.pp, ic: (boot?.efeitos_pp[chave] ?? v.pp_ic) as [number, number] }))
    .sort((a, b) => b.valor - a.valor)
  const inclinacoes = Object.entries(e.inclinacao_escolaridade.por_uf_pp)
    .map(([uf, v]) => ({ chave: uf, rotulo: uf, valor: v }))
    .sort((a, b) => b.valor - a.valor)
  const maisInclinado = inclinacoes[0]
  const menosInclinado = inclinacoes[inclinacoes.length - 1]
  const piUf = estados[0]
  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const antesMedio = media(estados.map((x) => Math.abs(x.antes)))
  const depoisMedio = media(estados.map((x) => Math.abs(x.valor)))
  const encolheram = estados.filter((x) => Math.abs(x.valor) < Math.abs(x.antes)).length
  // os que mais se afastaram do zero: o perfil previa outra coisa
  const afastaram = estados
    .filter((x) => Math.abs(x.valor) > Math.abs(x.antes) + 1)
    .sort((a, b) => Math.abs(b.valor) - Math.abs(b.antes) - (Math.abs(a.valor) - Math.abs(a.antes)))
    .slice(0, 2)

  return (
    <>
      <p>
        Um estado pode votar diferente porque a sua população é diferente (mais jovem, mais escolarizada, mais evangélica) ou
        porque o lugar pesa por si. O modelo põe essas características em cada camada e mede quanto dos {pct(icc, 0)} do estado
        elas explicam no voto em {cand.nome}.
      </p>
      <div className="grade-3">
        <div className="cartao tile">
          <div className="rotulo">explicado pelo perfil dos municípios</div>
          <div className="valor">{pct(perfilMun, 0)}</div>
          <p className="nota">renda e economia, cor ou raça, religião, urbanização</p>
        </div>
        <div className="cartao tile">
          <div className="rotulo">explicado pela região do país</div>
          <div className="valor">{pct(regiao, 0)}</div>
          <p className="nota">o que sobra em comum entre estados vizinhos</p>
        </div>
        <div className="cartao tile">
          <div className="rotulo">explicado pelo perfil das seções</div>
          <div className="valor">{pct(perfilSecao, 0)}</div>
          <p className="nota">idade, sexo e escolaridade de quem vota em cada urna</p>
        </div>
      </div>
      <p style={{ marginTop: 16 }}>
        Sobram <strong>{pct(sobra, 0)}</strong> da camada do estado sem explicação. O perfil de quem vota em cada urna explica
        pouco da diferença entre estados; o perfil dos lugares explica muito mais; e boa parte do resto é regional, o que
        combina com o capítulo da vizinhança.
      </p>

      <h3>O que explica a camada do estado</h3>
      <p className="secundario">
        Parte da variação entre estados no voto em {cand.nome} explicada por cada grupo de características, na média de todas as
        ordens em que os grupos podem entrar no modelo.
      </p>
      <BarrasHorizontais
        barras={barras}
        formatar={pctSemSinalNoZero}
        rotuloAria={`Parte da camada do estado explicada por cada grupo de características, voto em ${cand.nome}`}
        cabecalho={['Grupo de características', 'Parte da camada do estado', 'Sem a região no modelo']}
      />

      <h3 style={{ marginTop: 32 }}>Estado a estado, antes e depois do perfil</h3>
      <p className="secundario">
        Quanto cada estado empurra o voto em {cand.nome} em relação a uma urna típica, antes (anel) e depois (ponto) de considerar
        o perfil do eleitorado e dos municípios. Em média, o efeito cai de {ppNum(antesMedio).slice(1)} para{' '}
        {ppNum(depoisMedio).slice(1)} e encolhe em {encolheram} dos {estados.length} estados: boa parte do “efeito do estado” era
        perfil.{piUf && ` ${nomeUf(piUf.chave)}: de ${ppNum(piUf.antes)} para ${ppNum(piUf.valor)}`}
        {afastaram.length > 0 &&
          ` A exceção vai no sentido contrário: ${afastaram.map((x) => `${nomeUf(x.chave)} (${ppNum(x.antes)} → ${ppNum(x.valor)})`).join(' e ')} ficam mais longe do zero, porque o perfil faria esperar outro resultado.`}
      </p>
      <PontosHorizontais
        pontos={estados}
        formatar={ppNum}
        cor={cand.cor}
        rotuloAria={`Efeito de cada estado no voto em ${cand.nome}, antes e depois do perfil`}
        cabecalho={['Estado', 'Antes do perfil', 'Depois do perfil']}
        legenda={{ ponto: 'depois do perfil', anel: 'antes (modelo sem explicações)' }}
      />

      <h3 style={{ marginTop: 32 }}>O que mais pesa</h3>
      <p className="secundario">
        Diferença no voto em {cand.nome}, em pontos percentuais, quando cada característica sobe um desvio-padrão e as demais
        ficam iguais, comparando lugares da mesma região. Renda, PIB e Bolsa Família entram juntos como nível socioeconômico,
        porque andam juntos demais para separar.
      </p>
      <PontosHorizontais
        pontos={efeitos}
        formatar={ppNum}
        cor={cand.cor}
        rotuloAria={`Efeito de cada característica no voto em ${cand.nome}`}
        cabecalho={['Característica', 'Efeito (+1 desvio-padrão)', 'Intervalo de 95%']}
        legenda={{ ponto: 'efeito', intervalo: boot ? `intervalo de 95% (bootstrap, ${boot.repeticoes} reamostragens)` : 'intervalo de 95%' }}
        rotulosLongos
      />

      {explicacao.tarifaco && (
        <>
          <h3 style={{ marginTop: 32 }}>E o tarifaço?</h3>
          <p>
            {inteiro(explicacao.tarifaco.municipios_exportam_eua)} municípios exportaram para os Estados Unidos em{' '}
            {explicacao.tarifaco.ano_exportacoes}, o ano antes das tarifas de 50% sobre produtos brasileiros. Acrescentar ao
            modelo a exposição de cada um (exportações para os EUA por habitante) quase não muda nada: +1 desvio-padrão de
            exposição está associado a {ppNum(explicacao.tarifaco.candidatos[n].efeito_pp)} no voto em {cand.nome} (intervalo de{' '}
            {ppNum(explicacao.tarifaco.candidatos[n].ic_pp[0])} a {ppNum(explicacao.tarifaco.candidatos[n].ic_pp[1])}), e a camada do
            estado não encolhe.{' '}
            {explicacao.tarifaco.candidatos[n].p < 0.05
              ? 'A associação é estatisticamente clara, mas pequena perto das outras características.'
              : 'A diferença não se distingue do acaso.'}{' '}
            É uma comparação entre lugares, com a exposição medida antes das tarifas: não diz o que cada eleitor pensou delas.
          </p>
        </>
      )}

      <h3 style={{ marginTop: 32 }}>A urna ou a cidade?</h3>
      <p className="secundario">
        A mesma característica pode pesar diferente dentro da cidade (urnas mais ou menos escolarizadas que a média local) e
        entre cidades (cidades mais ou menos escolarizadas). Efeito de +1 desvio-padrão, em p.p., comparando lugares da mesma
        região:
      </p>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Eleitorado da seção</th>
              <th className="num">Dentro da cidade</th>
              <th className="num">Entre cidades</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(MUNDLAK) as (keyof typeof MUNDLAK)[]).map((k) => (
              <tr key={k}>
                <td>{MUNDLAK[k]}</td>
                <td className="num">{ppNum(e.mundlak_simples[k].pp_dentro)}</td>
                <td className="num">{ppNum(e.mundlak_simples[k].pp_entre)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 32 }}>A escolaridade pesa diferente em cada estado</h3>
      <p className="secundario">
        Diferença no voto em {cand.nome} quando a escolaridade do eleitorado da seção sobe um desvio-padrão, estado a
        estado. Vai de {ppNum(menosInclinado.valor)} {comPreposicao('em', menosInclinado.chave, nomeUf(menosInclinado.chave))} a{' '}
        {ppNum(maisInclinado.valor)} {comPreposicao('em', maisInclinado.chave, nomeUf(maisInclinado.chave))}. Por região:{' '}
        {Object.entries(e.interacoes.escolaridade_por_regiao_pp)
          .map(([r, v]) => `${REGIOES[r]} ${ppNum(v)}`)
          .join(', ')}
      </p>
      <PontosHorizontais
        pontos={inclinacoes}
        formatar={ppNum}
        cor={cand.cor}
        rotuloAria={`Efeito da escolaridade da seção no voto em ${cand.nome}, por estado`}
        cabecalho={['Estado', 'Efeito de +1 desvio-padrão na escolaridade']}
      />

      <ComoSabemos>
        <p>
          Modelos multinível com a mesma estrutura do modelo nulo (seção, município, estado), acrescentando grupos de
          características um de cada vez. A parte explicada é quanto a variância do estado cai em relação ao modelo sem
          explicações. Como os grupos se sobrepõem (o Nordeste é, em média, mais pobre), a ordem de entrada mudaria o crédito de
          cada um: por isso a conta é a média de todas as ordens possíveis (valor de Shapley, 128 modelos).
        </p>
        <p>
          “Dentro da cidade” e “entre cidades” vêm do modelo de Mundlak, que separa as duas coisas. A escolaridade da seção é um
          índice (% com superior completo menos % até o fundamental incompleto), porque as duas medidas andam juntas. A diferença
          por estado vem de uma inclinação aleatória (testada contra o modelo sem ela), e a por região, de interações entre
          níveis.
          Tudo descreve lugares, não pessoas: urnas com mais diplomados votarem de um jeito não diz como votou cada diplomado.{' '}
          <Link to="/metodo">Método completo</Link>.
        </p>
      </ComoSabemos>
    </>
  )
}
