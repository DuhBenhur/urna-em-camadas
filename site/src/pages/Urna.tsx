import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoletimUrna } from '../components/BoletimUrna'
import { GraficoCamadas } from '../components/GraficoCamadas'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { registros, useMunicipios, useResumo, useZona, type Secao } from '../lib/dados'
import { pct, pp } from '../lib/formato'
import { CANDIDATOS, camadas, type NumeroCandidato } from '../lib/modelo'

// Perfil médio do eleitorado brasileiro nas seções (TSE, 2026), para comparação
const PERFIL = [
  { chave: 'superior', rotulo: 'com ensino superior completo' },
  { chave: 'ate_fund_inc', rotulo: 'com até o fundamental incompleto' },
  { chave: '16_24', rotulo: 'com 16 a 24 anos' },
  { chave: '60_mais', rotulo: 'com 60 anos ou mais' },
  { chave: 'mulher', rotulo: 'mulheres' },
] as const

export function Urna() {
  const { uf = '', zona = '', secao = '' } = useParams()
  const nZona = Number(zona)
  const nSecao = Number(secao)
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const { dados: arquivo, erro } = useZona(uf.toUpperCase(), nZona)
  const [candidato, setCandidato] = useState<NumeroCandidato>(13)
  const [copiado, setCopiado] = useState(false)

  const secoes = useMemo(() => (arquivo ? registros<Secao>(arquivo) : []), [arquivo])
  const s = secoes.find((x) => x.secao === nSecao)

  if (erro) {
    return (
      <div className="conteudo">
        <h1>Zona não encontrada</h1>
        <p>
          Não existe a zona {zona} em {uf.toUpperCase()} na eleição de 2026. Confira o título de eleitor ou{' '}
          <Link to="/">procure pelo município</Link>.
        </p>
      </div>
    )
  }
  if (!resumo || !indice || !arquivo) return <div className="conteudo carregando">Abrindo a urna…</div>
  if (!s) {
    return (
      <div className="conteudo">
        <h1>Seção não encontrada</h1>
        <p>
          A zona {nZona} ({arquivo.uf}) não tem a seção {secao}. As seções desta zona vão de {secoes[0]?.secao} a{' '}
          {secoes[secoes.length - 1]?.secao}. Algumas seções são agregadas a outras e votam na mesma urna.
        </p>
      </div>
    )
  }

  const municipio = indice.porCodigo.get(s.cd)!
  const ufDados = resumo.ufs.find((u) => u.uf === arquivo.uf)!
  const [nomeLocal, bairro] = arquivo.locais[`${s.cd}-${s.local}`] ?? ['Local não informado', '']
  const cs = camadas(resumo, ufDados, municipio, s[`v${candidato}`], s.validos, candidato)
  const mesmaEscola = secoes.filter((x) => x.local === s.local && x.cd === s.cd)
  const cand = CANDIDATOS[candidato]
  const nacional = {
    lula: resumo.candidatos.find((c) => c.numero === 13)!.votos / resumo.totais.validos,
    flavio: resumo.candidatos.find((c) => c.numero === 22)!.votos / resumo.totais.validos,
  }
  const residuo = cs[3].delta ?? 0

  const compartilhar = async () => {
    const url = window.location.href
    const texto = `Minha urna em camadas: zona ${nZona}, seção ${nSecao} (${municipio.nome}-${arquivo.uf})`
    try {
      if (navigator.share) await navigator.share({ title: 'Urna em Camadas', text: texto, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      }
    } catch {
      /* compartilhamento cancelado */
    }
  }

  return (
    <div className="conteudo">
      <nav className="migalhas" aria-label="Você está em">
        <Link to="/">Início</Link> › <Link to={`/municipio/${municipio.cd}`}>{municipio.nome} ({arquivo.uf})</Link> › Zona {nZona} › Seção{' '}
        {nSecao}
      </nav>
      <header style={{ marginTop: 16 }}>
        <h1>
          Zona {nZona}, seção {nSecao}
        </h1>
        <p className="secundario">
          {nomeLocal}
          {bairro ? ` · ${bairro}` : ''} · {municipio.nome} ({arquivo.uf})
        </p>
      </header>

      <div className="grade-2" style={{ marginTop: 24 }}>
        <BoletimUrna secao={s} candidatos={resumo.candidatos} uf={arquivo.uf} municipio={municipio.nome.toUpperCase()} zona={nZona} local={nomeLocal} bairro={bairro} />
        <section className="cartao" aria-labelledby="t-camadas">
          <h2 id="t-camadas" style={{ marginTop: 0 }}>
            A urna em camadas
          </h2>
          <SeletorCandidato valor={candidato} aoMudar={setCandidato} />
          <GraficoCamadas camadas={cs} cor={cand.cor} candidato={cand.nome} />
          <p style={{ marginTop: 16 }}>
            Uma urna qualquer do Brasil daria {pct(cs[0].valor)} a {cand.curto}. Só por estar em {ufDados.nome}, o modelo espera{' '}
            {pct(cs[1].valor)} ({pp(cs[1].delta!)}). Em {municipio.nome}, {pct(cs[2].valor)} ({pp(cs[2].delta!)}). Esta seção deu{' '}
            <strong>{pct(cs[3].valor)}</strong>: {Math.abs(residuo) < 0.02 ? 'praticamente o esperado para o município' : `${pp(residuo)} em relação ao esperado para o município`}.
          </p>
          <p className="discreto">
            A última camada é o que estado e município não explicam: o perfil de quem vota nesta seção, a vizinhança, o acaso.
            Na próxima versão, o modelo separa o perfil do eleitorado dessa sobra.
          </p>
          <button className="botao botao-secundario" onClick={compartilhar}>
            {copiado ? 'Link copiado' : 'Compartilhar esta urna'}
          </button>
        </section>
      </div>

      <h2>Quem vota nesta seção</h2>
      <p className="secundario">
        Perfil do eleitorado cadastrado no TSE ({s.perfil?.toLocaleString('pt-BR') ?? '—'} eleitores). É o cadastro, não quem
        compareceu.
      </p>
      {s.perfil ? (
        <div className="grade-3">
          {PERFIL.map((p) => (
            <div className="cartao tile" key={p.chave}>
              <div className="rotulo">{p.rotulo}</div>
              <div className="valor">{pct((s[p.chave] ?? 0) / s.perfil!, 0)}</div>
            </div>
          ))}
          <div className="cartao tile">
            <div className="rotulo">comparecimento</div>
            <div className="valor">{pct(s.comparecimento / s.aptos, 0)}</div>
          </div>
        </div>
      ) : (
        <p className="aviso">Perfil indisponível para esta seção (seções especiais, como as de presídios, não têm o perfil publicado).</p>
      )}

      <h2>Comparação rápida</h2>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Onde</th>
              <th className="num">Lula</th>
              <th className="num">Flávio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Esta seção</td>
              <td className="num">{pct(s.v13 / s.validos)}</td>
              <td className="num">{pct(s.v22 / s.validos)}</td>
            </tr>
            <tr>
              <td>{municipio.nome} (município)</td>
              <td className="num">{pct(municipio.v13 / municipio.validos)}</td>
              <td className="num">{pct(municipio.v22 / municipio.validos)}</td>
            </tr>
            <tr>
              <td>{ufDados.nome} (estado)</td>
              <td className="num">{pct(ufDados.v13 / ufDados.validos)}</td>
              <td className="num">{pct(ufDados.v22 / ufDados.validos)}</td>
            </tr>
            <tr>
              <td>Brasil (sem o exterior)</td>
              <td className="num">{pct(nacional.lula)}</td>
              <td className="num">{pct(nacional.flavio)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {mesmaEscola.length > 1 && (
        <>
          <h2>Outras urnas no mesmo local</h2>
          <p className="secundario">Mesma escola, mesmo bairro: quanto as urnas variam entre si?</p>
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Seção</th>
                  <th className="num">Lula</th>
                  <th className="num">Flávio</th>
                  <th className="num">Votos válidos</th>
                </tr>
              </thead>
              <tbody>
                {mesmaEscola.map((x) => (
                  <tr key={x.secao} aria-current={x.secao === nSecao ? 'true' : undefined} style={x.secao === nSecao ? { fontWeight: 650 } : undefined}>
                    <td>
                      <Link to={`/urna/${arquivo.uf}/${nZona}/${x.secao}`}>{x.secao}</Link>
                    </td>
                    <td className="num">{pct(x.v13 / x.validos)}</td>
                    <td className="num">{pct(x.v22 / x.validos)}</td>
                    <td className="num">{x.validos.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
