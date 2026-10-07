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

type PorCandidato<T> = Record<'13' | '22', T>

export type Pista = 'nada' | 'estado' | 'municipio' | 'escola'

export type CidadeGemea = { cd: number; nome: string; uf: string; validos: number; p13: number; p22: number; uf13: number; uf22: number }

export type Contraria = { cd: number; nome: string; uf: string; estado: string; efeito: number; p: number; p_uf: number }

/** Números da história (pipeline/08_historia.py). Diferenças em pontos percentuais (0–100). */
export type Historia = {
  regras: { min_validos_urna: number; min_validos_gemea: number; dist_gemeas_km: number; min_urnas_escola: number; min_validos_contraria: number }
  adivinhacao: { n_urnas: number } & PorCandidato<{ pista: Pista; erro_medio: number; ate_5pp: number }[]>
  pares: { n_municipios: number; n_vizinhos_divisa: number; n_vizinhos_mesmo_estado: number } & PorCandidato<{
    quaisquer_brasil: number
    quaisquer_mesmo_estado: number
    vizinhos_divisa: number
    vizinhos_mesmo_estado: number
  }>
  gemeas: { km: number; a: CidadeGemea; b: CidadeGemea }[]
  resumo_gemeas: { n_pares: number } & PorCandidato<{ dif_cidades: number; dif_estados: number; mais_perto_da_gemea: number; n_cidades: number }>
  escolas: PorCandidato<{ n_escolas: number; amplitude_mediana: number; pct_10pp_ou_mais: number }>
  contrariam: PorCandidato<{ a_favor: Contraria[]; contra: Contraria[] }>
  /** 101 percentis (0 a 100) de |resultado da urna − esperado para o município|, em p.p. */
  surpresa: PorCandidato<number[]>
}

/** Cada par é [soma dos boletins de urna, resultado oficial do TSE]. */
type Pares = { comparecimento: [number, number]; validos: [number, number]; brancos: [number, number]; nulos: [number, number]; v13: [number, number]; v22: [number, number] }

export type LinhaConferencia = { secoes: number; conferem: number } & Pares

export type Conferencia = {
  fonte: string
  campos_conferidos: string[]
  brasil: LinhaConferencia
  ufs: ({ uf: string; nome: string } & LinhaConferencia)[]
}

type Variancias = { secao: number; uf: number; mun: number }
type Queda = { uf: number; mun: number; secao: number }
type Shapley = { blocos: Record<string, number>; total: number }

export type ExplicacaoCandidato = {
  n_secoes: number
  fator_pp: number
  sequencia: Record<string, Variancias & { loglik: number; k: number; queda: Queda }>
  testes: Record<string, { LR: number; gl: number; p: number }>
  shapley: Record<'uf' | 'mun', Record<'com_regiao' | 'sem_regiao', Shapley>>
  efeito_estado_pp: Record<'nulo' | 'perfis' | 'completo', Record<string, number>>
  efeitos: Record<string, { rotulo: string; logit: number; ep_logit: number; pp: number; pp_ic: [number, number] }>
  mundlak: Record<string, { dentro: number; entre: number; pp_dentro: number; pp_entre: number }>
  /** versão sem o contexto municipal, a que o site mostra (idade, sexo, índice de escolaridade e região) */
  mundlak_simples: Record<'mulher' | '16_24' | '60_mais' | 'escol', { pp_dentro: number; pp_entre: number }>
  inclinacao_escolaridade: { variancia: number; LR: number; p: number; fixo_pp: number; por_uf_pp: Record<string, number> }
  interacoes: { LR: number; gl: number; p: number; escolaridade_por_regiao_pp: Record<string, number>; escolaridade_x_socio_pp: number }
  quatro_niveis: { variancias: Record<string, number>; icc: Record<'uf' | 'mun' | 'local' | 'secao', number> }
  robustez: Record<string, { queda?: Queda; queda_uf?: number; queda_mun?: number; n?: number; erro?: string }>
  surpresa_perfil: number[]
  bootstrap?: { repeticoes: number; queda_uf: Record<string, [number, number]>; queda_mun: Record<string, [number, number]>; efeitos_pp: Record<string, [number, number]> }
}

export type EspacialCandidato = {
  nulo: { moran_I: number; p: number; lisa: Record<string, number> }
  completo: { moran_I: number; p: number; lisa: Record<string, number> }
  degrau_gradiente: { sem_gp: { uf: number }; com_gp: { uf: number; gp: number; alcance_km: number }; queda_uf: number }
}

/** Exposição ao tarifaço dos EUA (pipeline/12), extensão do modelo de efeitos. */
export type Tarifaco = {
  ano_exportacoes: number
  municipios_exportam_eua: number
  candidatos: Record<'13' | '22', { efeito_pp: number; ic_pp: [number, number]; LR: number; p: number; queda_extra_uf: number; queda_extra_mun: number }>
}

/** Modelos explicativos (pipeline/10), análise espacial (pipeline/11) e tarifaço (pipeline/12). */
export type Explicacao = {
  tarifaco?: Tarifaco
  stepup: {
    n_secoes: number
    n_municipios: number
    rotulos_blocos: Record<string, string>
    pca_socioeconomico: { cargas: Record<string, number>; variancia_explicada: number }
    candidatos: Record<'13' | '22', ExplicacaoCandidato>
  }
  espacial: {
    n_municipios: number
    classes_lisa: Record<string, string>
    candidatos: Record<'13' | '22', EspacialCandidato>
    regioes: { n: number; estados_por_regiao: { mean: number; max: number } } & Record<'13' | '22', { r2_regioes: number; r2_estados: number }>
    sao_paulo: { n_locais: number } & Record<'13' | '22', { moran_I: number; p: number; lisa: Record<string, number>; surpresa_dp_pp: number }>
  }
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
  /** o que o perfil não explica (p.p.), bolsão espacial (LISA, 0–4) e região de voto (pipeline/10, 11) */
  sp13?: number | null
  sp22?: number | null
  lisa13?: number | null
  lisa22?: number | null
  regiao?: number | null
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
  /** surpresa: resultado − esperado pelo município e pelo perfil do eleitorado do local (proporção) */
  s13?: number | null
  s22?: number | null
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
  /** 1 se a seção é idêntica ao resultado oficial do TSE em todos os campos (pipeline/03 e 07) */
  conf: number | null
  /** perfil do eleitorado da seção em relação ao município, no logit × 10.000 (pipeline/10 e 07) */
  d13?: number | null
  d22?: number | null
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

export const useHistoria = () => useDados<Historia>('historia.json')

export const useConferencia = () => useDados<Conferencia>('conferencia.json')

export const useExplicacao = () => useDados<Explicacao>('explicacao.json')

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
