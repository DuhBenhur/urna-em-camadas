import type { Candidato, Secao } from '../lib/dados'
import { inteiro } from '../lib/formato'

type Props = {
  secao: Secao
  candidatos: Candidato[]
  uf: string
  municipio: string
  zona: number
  local: string
  bairro: string
}

/** Reprodução do boletim de urna (BU) impresso ao fim da votação, só para o cargo de Presidente. */
export function BoletimUrna({ secao, candidatos, uf, municipio, zona, local, bairro }: Props) {
  const linhas = candidatos
    .map((c) => ({ ...c, votos: secao[`v${c.numero}`] ?? 0 }))
    .sort((a, b) => b.votos - a.votos || a.numero - b.numero)
  const nominais = linhas.reduce((s, c) => s + c.votos, 0)

  return (
    <article className="bu" aria-label={`Boletim de urna da seção ${secao.secao}, zona ${zona}`}>
      <div className="bu-titulo">BOLETIM DE URNA</div>
      <div className="bu-sub">Eleição Geral Federal 2026 · 1º turno · 04/10/2026</div>
      <hr />
      <div>Município: {municipio} ({uf})</div>
      <div className="linha">
        <span>Zona: {String(zona).padStart(4, '0')}</span>
        <span>Seção: {String(secao.secao).padStart(4, '0')}</span>
      </div>
      <div>Local: {local}</div>
      {bairro && <div>Bairro: {bairro}</div>}
      <hr />
      <div className="linha"><span>Eleitores aptos</span><span>{inteiro(secao.aptos)}</span></div>
      <div className="linha"><span>Comparecimento</span><span>{inteiro(secao.comparecimento)}</span></div>
      <div className="linha"><span>Faltosos</span><span>{inteiro(secao.aptos - secao.comparecimento)}</span></div>
      <hr />
      <div className="destaque">PRESIDENTE</div>
      {linhas.map((c) => (
        <div className={`linha${c.numero === 13 || c.numero === 22 ? ' destaque' : ''}`} key={c.numero}>
          <span>
            {c.numero} {c.nome}
          </span>
          <span>{inteiro(c.votos)}</span>
        </div>
      ))}
      <hr />
      <div className="linha"><span>Nominais</span><span>{inteiro(nominais)}</span></div>
      <div className="linha"><span>Brancos</span><span>{inteiro(secao.brancos)}</span></div>
      <div className="linha"><span>Nulos</span><span>{inteiro(secao.nulos)}</span></div>
      <div className="linha destaque"><span>Total apurado</span><span>{inteiro(nominais + secao.brancos + secao.nulos)}</span></div>
      <div className="rodape-bu">Fonte: boletim de urna publicado pelo TSE (dados abertos)</div>
    </article>
  )
}
