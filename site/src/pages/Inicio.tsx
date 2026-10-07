import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Busca } from '../components/Busca'
import { EfeitoEstados } from '../components/EfeitoEstados'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { useResumo } from '../lib/dados'
import { inteiro, pct } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

// Uma urna real da 1ª Zona de São Paulo (Bela Vista), na E.E. Caetano de Campos
const EXEMPLO = '/urna/SP/1/240'

export function Inicio() {
  const { dados: resumo } = useResumo()
  const [candidato, setCandidato] = useState<NumeroCandidato>(13)
  const modelo = resumo?.modelos[String(candidato) as '13' | '22']

  return (
    <div className="conteudo">
      <section className="heroi">
        <h1>Quanto do voto da sua urna é do seu estado?</h1>
        <p className="secundario">
          O 1º turno presidencial de 2026 em {resumo ? inteiro(resumo.totais.secoes) : '…'} urnas. Digite sua zona e seção e veja o
          resultado da sua urna separado em camadas: Brasil, estado, município e o que é só da sua seção.
        </p>
      </section>

      <Busca />
      <p style={{ marginTop: 12 }}>
        Sem o título à mão? <Link to={EXEMPLO}>Veja um exemplo: uma urna da Bela Vista, em São Paulo</Link>.
      </p>

      <h2>De onde vem a diferença entre as urnas</h2>
      <p>
        Um modelo de regressão multinível separa a variação do voto entre urnas em três camadas. Escolha o candidato:
      </p>
      <SeletorCandidato valor={candidato} aoMudar={setCandidato} />
      {modelo && (
        <div className="grade-3">
          <div className="cartao tile">
            <div className="rotulo">vem do estado</div>
            <div className="valor">{pct(modelo.icc.UF, 0)}</div>
            <p className="nota">da variação do voto em {CANDIDATOS[candidato].curto} entre urnas</p>
          </div>
          <div className="cartao tile">
            <div className="rotulo">vem do município</div>
            <div className="valor">{pct(modelo.icc.município, 0)}</div>
            <p className="nota">dentro do mesmo estado</p>
          </div>
          <div className="cartao tile">
            <div className="rotulo">é da própria seção</div>
            <div className="valor">{pct(modelo.icc.seção, 0)}</div>
            <p className="nota">dentro do mesmo município</p>
          </div>
        </div>
      )}
      <p className="discreto" style={{ marginTop: 12 }}>
        Correlação intraclasse (ICC) do modelo nulo de três níveis, na escala logit. <Link to="/metodo">Como isso é calculado</Link>.
      </p>

      <h2>O peso de cada estado</h2>
      <p>
        Quanto cada estado empurra o voto em {CANDIDATOS[candidato].nome}, em pontos percentuais, em relação a uma urna típica do
        Brasil. Passe o mouse ou o dedo sobre as barras.
      </p>
      {resumo ? <EfeitoEstados resumo={resumo} candidato={candidato} /> : <p className="carregando">Carregando…</p>}

      <h2>Explore</h2>
      <div className="grade-2">
        <Link to="/mapa" className="cartao" style={{ textDecoration: 'none' }}>
          <h3>Mapa dos 5.571 municípios</h3>
          <p className="secundario" style={{ marginBottom: 0 }}>
            Quem ficou à frente em cada cidade e quanto cada município se afasta do que o seu estado faria prever.
          </p>
        </Link>
        <Link to="/metodo" className="cartao" style={{ textDecoration: 'none' }}>
          <h3>Como o modelo funciona</h3>
          <p className="secundario" style={{ marginBottom: 0 }}>
            Dados, validação contra a totalização oficial do TSE, o modelo multinível e as limitações.
          </p>
        </Link>
      </div>

      {resumo && (
        <>
          <h2>Os números da base</h2>
          <div className="grade-3">
            <div className="cartao tile">
              <div className="rotulo">urnas (seções)</div>
              <div className="valor">{inteiro(resumo.totais.secoes)}</div>
            </div>
            <div className="cartao tile">
              <div className="rotulo">locais de votação</div>
              <div className="valor">{inteiro(resumo.totais.locais)}</div>
            </div>
            <div className="cartao tile">
              <div className="rotulo">votos válidos para presidente</div>
              <div className="valor">{inteiro(resumo.totais.validos)}</div>
              <p className="nota">sem os eleitores no exterior</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
