import type { Camada } from './modelo'

/** Cores do tema claro (o cartão é sempre claro: vai para redes e conversas, fora do tema do site). */
const COR = { fundo: '#f9f9f7', tinta: '#0b0b0b', tinta2: '#52514e', tinta3: '#6f6d68', grade: '#e1e0d9', lula: '#e34948', flavio: '#2a78d6' }
const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const pct = (x: number) => `${(x * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export type DadosCartao = {
  titulo: string // "Zona 1, seção 240"
  lugar: string // "EE. Caetano de Campos · São Paulo (SP)"
  lula: number
  flavio: number
  candidato: string // de quem são as camadas
  corCandidato: 'lula' | 'flavio'
  camadas: Camada[]
  surpresa: string | null // "Mais surpreendente que 99% das urnas do Brasil"
}

/** Corta o texto para caber na largura, com reticências. */
function caber(ctx: CanvasRenderingContext2D, texto: string, largura: number): string {
  if (ctx.measureText(texto).width <= largura) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > largura) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Quebra o texto em linhas que cabem na largura. */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(' ')) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width > largura && atual) {
      linhas.push(atual)
      atual = palavra
    } else atual = tentativa
  }
  if (atual) linhas.push(atual)
  return linhas
}

/** "+ efeito do estado" → "Efeito do estado · São Paulo"; "= sua urna" → "Sua urna". */
function rotuloCamada(c: Camada): string {
  const base = c.rotulo.replace(/^[+=] /, '')
  const texto = base.charAt(0).toUpperCase() + base.slice(1)
  return c.chave === 'estado' || c.chave === 'municipio' ? `${texto} · ${c.detalhe}` : texto
}

/** Desenha o cartão da urna (1200×630): a urna e o resultado à esquerda, as camadas à direita. Devolve um PNG. */
export function gerarCartao(d: DadosCartao): Promise<Blob> {
  const L = 1200
  const A = 630
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = A
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = COR.fundo
  ctx.fillRect(0, 0, L, A)
  const m = 64
  const colunaEsq = 500

  // a urna
  ctx.fillStyle = COR.tinta2
  ctx.font = `700 24px ${FONTE}`
  ctx.fillText('Urna em Camadas', m, 88)
  ctx.fillStyle = COR.tinta
  ctx.font = `750 52px ${FONTE}`
  ctx.fillText(caber(ctx, d.titulo, colunaEsq), m, 160)
  ctx.fillStyle = COR.tinta2
  ctx.font = `400 22px ${FONTE}`
  quebrar(ctx, d.lugar, colunaEsq).slice(0, 2).forEach((linha, i) => ctx.fillText(linha, m, 200 + i * 30))

  // o resultado da urna, os dois candidatos
  ;([['Lula', d.lula, COR.lula], ['Flávio Bolsonaro', d.flavio, COR.flavio]] as const).forEach(([nome, valor, cor], i) => {
    const x = m + i * 250
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.arc(x + 8, 300, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COR.tinta2
    ctx.font = `400 22px ${FONTE}`
    ctx.fillText(nome, x + 24, 308)
    ctx.fillStyle = COR.tinta
    ctx.font = `700 50px ${FONTE}`
    ctx.fillText(pct(valor), x, 366)
  })

  // a surpresa
  if (d.surpresa) {
    ctx.fillStyle = COR.tinta
    ctx.font = `650 26px ${FONTE}`
    quebrar(ctx, d.surpresa, colunaEsq).slice(0, 3).forEach((linha, i) => ctx.fillText(linha, m, 440 + i * 36))
  }

  // as camadas do candidato escolhido: rótulo em cima, linha de 0% a 100% embaixo
  const x0 = 640
  const x1 = L - m
  const x = (v: number) => x0 + Math.max(0, Math.min(1, v)) * (x1 - x0)
  const topo = 128
  const passo = Math.min(84, 400 / d.camadas.length)
  ctx.fillStyle = COR.tinta3
  ctx.font = `400 18px ${FONTE}`
  ctx.fillText(`Camadas do voto em ${d.candidato}`, x0, topo - 24)
  d.camadas.forEach((c, i) => {
    const yRotulo = topo + i * passo + 20
    const y = yRotulo + 26
    const final = c.chave === 'secao'
    ctx.fillStyle = final ? COR.tinta : COR.tinta2
    ctx.font = `${final ? 700 : 400} 19px ${FONTE}`
    ctx.fillText(caber(ctx, rotuloCamada(c), x1 - x0 - 90), x0, yRotulo)
    ctx.textAlign = 'right'
    ctx.fillText(pct(c.valor), x1, yRotulo)
    ctx.textAlign = 'left'
    ctx.strokeStyle = COR.grade
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.stroke()
    const anterior = i > 0 ? d.camadas[i - 1].valor : null
    if (anterior !== null) {
      ctx.strokeStyle = COR.tinta3
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x(anterior), y)
      ctx.lineTo(x(c.valor), y)
      ctx.stroke()
    }
    ctx.fillStyle = COR[d.corCandidato]
    ctx.beginPath()
    ctx.arc(x(c.valor), y, final ? 10 : 7, 0, Math.PI * 2)
    ctx.fill()
  })

  // rodapé
  ctx.fillStyle = COR.tinta3
  ctx.font = `400 20px ${FONTE}`
  ctx.fillText('duhbenhur.github.io/urna-em-camadas · dados públicos do TSE', m, A - 40)

  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('sem imagem'))), 'image/png'))
}
