import { useEffect, useState } from 'react'

/** Tabela compacta gerada por pipeline/07_exportar_site.py: colunas + linhas. */
export type Tabela = { colunas: string[]; linhas: (string | number | null)[][] }

export type Candidato = { numero: number; nome: string; partido: string; votos: number }

export type ModeloNulo = {
  intercepto: number
  icc: { UF: number; município: number; seção: number }
  icc_mesmo_municipio: number
  variancias: { UF: number; município: number; seção: number }
}

export type UF = {
  uf: string
  nome: string
  aptos: number
  validos: number
  v13: number
  v22: number
  u13: number
  u22: number
}

export type Resumo = {
  gerado_em: string
  eleicao: { ano: number; turno: number; data: string; cargo: string }
  totais: {
    secoes: number
    municipios: number
    zonas: number
    locais: number
    aptos: number
    comparecimento: number
    abstencoes: number
    validos: number
    brancos: number
    nulos: number
  }
  candidatos: Candidato[]
  modelos: Record<'13' | '22', ModeloNulo>
  ufs: UF[]
}

export type Municipio = {
  cd: number
  ibge: number
  nome: string
  uf: string
  secoes: number
  validos: number
  v13: number
  v22: number
  u13: number
  u22: number
  zonas: number[]
}

export type Local = {
  zona: number
  local: number
  nome: string
  bairro: string
  lat: number | null
  lon: number | null
  secoes: number
  validos: number
  v13: number
  v22: number
}

export type Secao = {
  secao: number
  local: number
  cd: number
  aptos: number
  comparecimento: number
  validos: number
  brancos: number
  nulos: number
  perfil: number | null
  mulher: number | null
  '16_24': number | null
  '60_mais': number | null
  ate_fund_inc: number | null
  superior: number | null
} & Record<`v${number}`, number>

export type ArquivoZona = Tabela & {
  uf: string
  zona: number
  /** chave "{código do município}-{número do local}": o número do local só é único dentro do município */
  locais: Record<string, [string, string, number | null, number | null]>
}

const cache = new Map<string, Promise<unknown>>()

export function carregar<T>(caminho: string): Promise<T> {
  let promessa = cache.get(caminho)
  if (!promessa) {
    promessa = fetch(`${import.meta.env.BASE_URL}dados/${caminho}`).then((r) => {
      if (!r.ok) throw new Error(r.status === 404 ? 'não encontrado' : `erro ${r.status}`)
      return r.json()
    })
    promessa.catch(() => cache.delete(caminho))
    cache.set(caminho, promessa)
  }
  return promessa as Promise<T>
}

export function registros<T>(t: Tabela): T[] {
  return t.linhas.map((linha) => Object.fromEntries(t.colunas.map((c, i) => [c, linha[i]])) as T)
}

type Estado<T> = { dados: T | null; erro: string | null }

/** Carrega um arquivo de dados; `caminho` nulo não carrega nada. */
export function useDados<T>(caminho: string | null, transformar?: (bruto: never) => T): Estado<T> {
  const [estado, setEstado] = useState<Estado<T> & { caminho: string | null }>({ dados: null, erro: null, caminho: null })
  useEffect(() => {
    if (!caminho) return
    let ativo = true
    carregar<never>(caminho)
      .then((bruto) => ativo && setEstado({ dados: transformar ? transformar(bruto) : (bruto as T), erro: null, caminho }))
      .catch((e: Error) => ativo && setEstado({ dados: null, erro: e.message, caminho }))
    return () => {
      ativo = false
    }
  }, [caminho])
  // enquanto o novo caminho carrega, não devolve dados do caminho anterior
  return estado.caminho === caminho ? estado : { dados: null, erro: null }
}

export const useResumo = () => useDados<Resumo>('resumo.json')

export type IndiceMunicipios = { lista: Municipio[]; porCodigo: Map<number, Municipio>; porIbge: Map<number, Municipio> }

function indexar(t: Tabela): IndiceMunicipios {
  const lista = registros<Municipio>(t)
  return {
    lista,
    porCodigo: new Map(lista.map((m) => [m.cd, m])),
    porIbge: new Map(lista.map((m) => [m.ibge, m])),
  }
}

export const useMunicipios = () => useDados<IndiceMunicipios>('municipios.json', indexar as (b: never) => IndiceMunicipios)

export const useLocais = (cd: number | null) =>
  useDados<Local[]>(cd ? `locais/${cd}.json` : null, registros as (b: never) => Local[])

export const useZona = (uf: string | null, zona: number | null) =>
  useDados<ArquivoZona>(uf && zona ? `zonas/${uf}-${zona}.json` : null)

/** Remove acentos e caixa, para busca. */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
