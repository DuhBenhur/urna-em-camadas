import { useMemo, useState } from 'react'
import type { Resumo } from '../lib/dados'
import { pct, pp } from '../lib/formato'
import { CANDIDATOS, efeitoEstado, type NumeroCandidato } from '../lib/modelo'
import { useLargura } from '../lib/useLargura'

const ESPESSURA = 14
const PASSO = 20

/**
 * Barras divergentes: quanto cada estado empurra o voto do candidato em relação à urna típica do Brasil.
 * Polaridade = os dois lados do 2º turno: para Lula, barras positivas em vermelho e negativas em azul; para Flávio, o inverso.
 */
export function EfeitoEstados({ resumo, candidato }: { resumo: Resumo; candidato: NumeroCandidato }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [foco, setFoco] = useState<string | null>(null)
  const [verTabela, setVerTabela] = useState(false)

  const linhas = useMemo(
    () =>
      resumo.ufs
        .map((u) => ({ ...u, efeito: efeitoEstado(resumo, u, candidato), share: (candidato === 13 ? u.v13 : u.v22) / u.validos }))
        .sort((a, b) => b.efeito - a.efeito),
    [resumo, candidato],
  )
  const maximo = Math.max(...linhas.map((l) => Math.abs(l.efeito)))
  const margemRotulo = 34
  const margemValor = 72
  const centro = margemRotulo + (largura - margemRotulo - margemValor) / 2
  const escala = (largura - margemRotulo - margemValor) / 2 / maximo
  const altura = linhas.length * PASSO + 28
  const corMais = CANDIDATOS[candidato].cor
  const corMenos = CANDIDATOS[candidato === 13 ? 22 : 13].cor
  const destacados = new Set([linhas[0].uf, linhas[linhas.length - 1].uf, 'MG'])
  const focado = linhas.find((l) => l.uf === foco)

  return (
    <div>
      <div className="grafico" ref={ref} onPointerLeave={() => setFoco(null)}>
        <svg width={largura} height={altura} role="img" aria-label={`Efeito de cada estado no voto em ${CANDIDATOS[candidato].nome}`}>
          {linhas.map((l, i) => {
            const y = i * PASSO + 4
            const w = Math.max(1, Math.abs(l.efeito) * escala)
            const positivo = l.efeito >= 0
            const xBarra = positivo ? centro : centro - w
            // ponta arredondada de 4px na extremidade do dado, base reta no zero
            const r = Math.min(4, w / 2)
            const caminho = positivo
              ? `M${xBarra},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${ESPESSURA - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z`
              : `M${xBarra + w},${y} h${-(w - r)} a${r},${r} 0 0 0 ${-r},${r} v${ESPESSURA - 2 * r} a${r},${r} 0 0 0 ${r},${r} h${w - r} z`
            const ativo = foco === l.uf
            return (
              <g
                key={l.uf}
                tabIndex={0}
                onPointerEnter={() => setFoco(l.uf)}
                onFocus={() => setFoco(l.uf)}
                onBlur={() => setFoco(null)}
                style={{ cursor: 'default', outline: 'none' }}
                aria-label={`${l.nome}: ${pp(l.efeito)}`}
              >
                <rect x={0} y={y - 3} width={largura} height={PASSO} fill={ativo ? 'var(--borda)' : 'transparent'} />
                <text x={0} y={y + ESPESSURA - 3} style={{ fill: ativo ? 'var(--tinta)' : undefined, fontWeight: ativo ? 650 : undefined }}>
                  {l.uf}
                </text>
                <path d={caminho} fill={positivo ? corMais : corMenos} opacity={foco && !ativo ? 0.45 : 1} />
                {(destacados.has(l.uf) || ativo) && (
                  <text x={positivo ? centro + w + 6 : centro - w - 6} y={y + ESPESSURA - 3} textAnchor={positivo ? 'start' : 'end'} style={{ fill: 'var(--tinta)' }}>
                    {pp(l.efeito)}
                  </text>
                )}
              </g>
            )
          })}
          <line x1={centro} x2={centro} y1={0} y2={altura - 24} className="linha-base" />
          <text x={centro} y={altura - 6} textAnchor="middle">
            urna típica do Brasil
          </text>
        </svg>
        {focado && (
          <div className="dica" style={{ left: Math.min(Math.max(centro, 90), largura - 90), top: linhas.indexOf(focado) * PASSO + 4 }}>
            <strong>{pp(focado.efeito)}</strong>
            <span className="secundario">efeito de {focado.nome}</span>
            <div className="discreto">
              {CANDIDATOS[candidato].curto} teve {pct(focado.share)} dos válidos no estado
            </div>
          </div>
        )}
      </div>
      <div className="legenda">
        <span>
          <span className="chave" style={{ background: corMais }} aria-hidden="true" />
          empurra a favor de {CANDIDATOS[candidato].curto}
        </span>
        <span>
          <span className="chave" style={{ background: corMenos }} aria-hidden="true" />
          empurra contra {CANDIDATOS[candidato].curto}
        </span>
        <button className="botao botao-secundario" style={{ minHeight: 32, padding: '4px 12px', marginLeft: 'auto' }} onClick={() => setVerTabela((v) => !v)} aria-expanded={verTabela}>
          {verTabela ? 'Esconder tabela' : 'Ver como tabela'}
        </button>
      </div>
      {verTabela && (
        <div className="tabela-rolagem" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th className="num">Efeito do estado</th>
                <th className="num">Votos válidos em {CANDIDATOS[candidato].curto}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.uf}>
                  <td>{l.nome}</td>
                  <td className="num">{pp(l.efeito)}</td>
                  <td className="num">{pct(l.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
