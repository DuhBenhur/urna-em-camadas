import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { carregar, registros, type ArquivoZona, type IndiceMunicipios, type Municipio, type Resumo, type Secao } from '../lib/dados'
import { inteiro, pct, pontos } from '../lib/formato'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { useLargura } from '../lib/useLargura'
import { comPreposicao } from '../lib/ufs'

type Sorteio = {
  uf: string
  zona: number
  secao: Secao
  municipio: Municipio
  local: string
  bairro: string
  /** as outras urnas do mesmo local de votação */
  escola: { urnas: number; validos: number; v13: number; v22: number }
}

type Palpite = { rotulo: string; detalhe: string; valor: number }

const BOTOES = ['Pista 1: o estado', 'Pista 2: a cidade', 'Pista 3: a escola', 'Abrir a urna']

/** Palpite de cada pista = resultado somado das OUTRAS urnas do grupo (a sorteada fica de fora). */
function palpites(s: Sorteio, resumo: Resumo, n: NumeroCandidato): Palpite[] {
  const v = n === 13 ? s.secao.v13 : s.secao.v22
  const val = s.secao.validos
  const uf = resumo.ufs.find((u) => u.uf === s.uf)!
  const m = s.municipio
  const votosBr = resumo.candidatos.find((c) => c.numero === n)!.votos
  const brasil = (votosBr - v) / (resumo.totais.validos - val)
  const estado = ((n === 13 ? uf.v13 : uf.v22) - v) / (uf.validos - val)
  const sozinhaMun = m.validos - val <= 0
  const municipio = sozinhaMun ? estado : ((n === 13 ? m.v13 : m.v22) - v) / (m.validos - val)
  const sozinhaEsc = s.escola.validos <= 0
  const escola = sozinhaEsc ? municipio : (n === 13 ? s.escola.v13 : s.escola.v22) / s.escola.validos
  return [
    { rotulo: 'Sem pista', detalhe: 'o resultado do Brasil', valor: brasil },
    { rotulo: 'Sabendo o estado', detalhe: `o resultado ${comPreposicao('de', uf.uf, uf.nome)}`, valor: estado },
    {
      rotulo: 'Sabendo a cidade',
      detalhe: sozinhaMun ? 'é a única urna da cidade: o palpite não muda' : `o resultado de ${m.nome}`,
      valor: municipio,
    },
    {
      rotulo: 'Sabendo a escola',
      detalhe: sozinhaEsc
        ? 'é a única urna da escola: o palpite não muda'
        : `${s.escola.urnas === 1 ? 'a outra urna' : `as outras ${s.escola.urnas} urnas`} da mesma escola`,
      valor: escola,
    },
  ]
}

export function Adivinhe({
  resumo,
  indice,
  candidato,
  minValidos,
}: {
  resumo: Resumo
  indice: IndiceMunicipios
  candidato: NumeroCandidato
  minValidos: number
}) {
  const [sorteio, setSorteio] = useState<Sorteio | null>(null)
  const [passo, setPasso] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [ref, largura] = useLargura<HTMLDivElement>()

  // sorteio proporcional ao número de urnas: cada urna do país tem a mesma chance
  const acumulado = useMemo(() => {
    let soma = 0
    return indice.lista.map((m) => (soma += m.secoes))
  }, [indice])

  const sortear = async () => {
    setCarregando(true)
    setErro(false)
    try {
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        const alvo = Math.random() * acumulado[acumulado.length - 1]
        const m = indice.lista[acumulado.findIndex((a) => a > alvo)]
        const zona = m.zonas[Math.floor(Math.random() * m.zonas.length)]
        const arquivo = await carregar<ArquivoZona>(`zonas/${m.uf}-${zona}.json`)
        const secoes = registros<Secao>(arquivo).filter((x) => x.cd === m.cd)
        const candidatas = secoes.filter((x) => x.validos >= minValidos)
        if (!candidatas.length) continue
        const secao = candidatas[Math.floor(Math.random() * candidatas.length)]
        const outras = secoes.filter((x) => x.local === secao.local && x.secao !== secao.secao && x.validos > 0)
        const [local, bairro] = arquivo.locais[`${m.cd}-${secao.local}`] ?? ['local não informado', '']
        setSorteio({
          uf: m.uf,
          zona,
          secao,
          municipio: m,
          local,
          bairro,
          escola: {
            urnas: outras.length,
            validos: outras.reduce((a, x) => a + x.validos, 0),
            v13: outras.reduce((a, x) => a + x.v13, 0),
            v22: outras.reduce((a, x) => a + x.v22, 0),
          },
        })
        setPasso(0)
        return
      }
      setErro(true)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }

  const cand = CANDIDATOS[candidato]

  if (!sorteio) {
    return (
      <div className="cartao adivinhe">
        <p style={{ marginTop: 0 }}>
          O site sorteia uma das {inteiro(resumo.totais.secoes)} urnas e esconde o resultado. A cada pista sobre o lugar, o
          palpite para o voto em {cand.nome} se ajusta. No fim, você abre a urna e vê o quanto cada pista ajudou.
        </p>
        <button className="botao" onClick={sortear} disabled={carregando}>
          {carregando ? 'Sorteando…' : 'Sortear uma urna'}
        </button>
        {erro && <p className="aviso" style={{ marginTop: 12 }}>Não deu para carregar a urna. Tente de novo.</p>}
      </div>
    )
  }

  const lista = palpites(sorteio, resumo, candidato)
  const aberta = passo >= 4
  const atual = lista[Math.min(passo, 3)]
  const real = (candidato === 13 ? sorteio.secao.v13 : sorteio.secao.v22) / sorteio.secao.validos
  const s = sorteio

  const x0 = 12
  const x1 = largura - 12
  const x = (v: number) => x0 + Math.max(0, Math.min(1, v)) * (x1 - x0)
  const yTrilho = 44

  return (
    <div className="cartao adivinhe">
      <div className="rotulo-pequeno">Urna sorteada</div>
      <p className="adivinhe-onde" aria-live="polite">
        {passo === 0 && <>Uma urna qualquer do Brasil. Onde ela fica?</>}
        {passo >= 1 && <strong>{resumo.ufs.find((u) => u.uf === s.uf)!.nome}</strong>}
        {passo >= 2 && <> › {s.municipio.nome}</>}
        {passo >= 3 && (
          <>
            {' '}
            › {s.local}
            {s.bairro ? ` (${s.bairro})` : ''}
          </>
        )}
        {aberta && (
          <>
            {' '}
            › zona {s.zona}, seção {s.secao.secao}
          </>
        )}
      </p>

      <div className="grafico" ref={ref}>
        {largura > 0 && <svg width={largura} height={92} role="img" aria-label={`Palpite atual: ${pct(atual.valor)}${aberta ? `; resultado: ${pct(real)}` : ''}`}>
          <g className="grade">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={yTrilho - 10} y2={yTrilho + 10} className={t === 0.5 ? 'linha-base' : undefined} />
                <text x={x(t)} y={yTrilho + 28} textAnchor="middle">
                  {pct(t, 0)}
                </text>
              </g>
            ))}
          </g>
          <line x1={x0} x2={x1} y1={yTrilho} y2={yTrilho} className="linha-base" />
          {lista.slice(0, Math.min(passo, 3)).map((p) => (
            <circle key={p.rotulo} cx={x(p.valor)} cy={yTrilho} r={4} fill="var(--superficie)" stroke="var(--tinta-3)" strokeWidth={1.5} />
          ))}
          {aberta && <line className="mov" x1={x(atual.valor)} x2={x(real)} y1={yTrilho} y2={yTrilho} stroke="var(--tinta)" strokeWidth={2} />}
          <circle cx={x(atual.valor)} cy={yTrilho} r={7} fill={cand.cor} stroke="var(--superficie)" strokeWidth={2} />
          <text x={x(atual.valor)} y={yTrilho - 16} textAnchor="middle" className="valor-forte">
            palpite {pct(atual.valor)}
          </text>
          {aberta && (
            <>
              {/* traço vertical: continua visível mesmo em cima do ponto do palpite */}
              <rect x={x(real) - 2} y={yTrilho - 13} width={4} height={26} rx={2} fill="var(--tinta)" stroke="var(--superficie)" strokeWidth={1.5} />
              <text x={x(real)} y={yTrilho + 46} textAnchor="middle" className="valor-forte">
                resultado {pct(real)}
              </text>
            </>
          )}
        </svg>}
      </div>

      <ol className="pistas">
        {lista.slice(0, Math.min(passo, 3) + 1).map((p) => (
          <li key={p.rotulo}>
            <span>
              <strong>{p.rotulo}</strong> <span className="secundario">· {p.detalhe}</span>
            </span>
            <span className="numeros">
              {pct(p.valor)}
              <span className="discreto"> · erro {aberta ? pontos(Math.abs(p.valor - real) * 100) : '?'}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="acoes">
        {!aberta ? (
          <button className="botao" onClick={() => setPasso((p) => p + 1)}>
            {BOTOES[passo]}
          </button>
        ) : (
          <>
            <Link className="botao" to={`/urna/${s.uf}/${s.zona}/${s.secao.secao}`}>
              Ver esta urna em camadas
            </Link>
          </>
        )}
        <button className="botao botao-secundario" onClick={sortear} disabled={carregando}>
          {carregando ? 'Sorteando…' : 'Sortear outra'}
        </button>
      </div>
      {aberta && (
        <p className="discreto" style={{ marginTop: 12, marginBottom: 0 }}>
          {cand.nome} teve {pct(real)} dos {inteiro(s.secao.validos)} votos válidos desta urna. O erro caiu de{' '}
          {pontos(Math.abs(lista[0].valor - real) * 100)} sem pista para {pontos(Math.abs(lista[3].valor - real) * 100)} com as três pistas.
          Uma urna só pode fugir da regra; a média de todas está logo abaixo.
        </p>
      )}
      {erro && <p className="aviso" style={{ marginTop: 12 }}>Não deu para carregar a urna. Tente de novo.</p>}
    </div>
  )
}
