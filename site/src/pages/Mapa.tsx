import { useNavigate, useSearchParams } from 'react-router-dom'
import { LegendaEscala, MapaBrasil, type VariavelMapa } from '../components/Mapas'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { useMunicipios, useResumo } from '../lib/dados'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

const VISTAS: { chave: VariavelMapa; rotulo: string }[] = [
  { chave: 'margem', rotulo: 'Resultado' },
  { chave: 'efeito', rotulo: 'Efeito do município' },
  { chave: 'semperfil', rotulo: 'O que o perfil não explica' },
  { chave: 'bolsoes', rotulo: 'Bolsões' },
  { chave: 'regioes', rotulo: 'Regiões de voto' },
]

export function Mapa() {
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const [params, setParams] = useSearchParams()
  const pedida = params.get('v') as VariavelMapa | null
  const variavel: VariavelMapa = VISTAS.some((v) => v.chave === pedida) ? pedida! : 'margem'
  const candidato: NumeroCandidato = params.get('c') === '22' ? 22 : 13
  const mudar = (v: VariavelMapa, c: NumeroCandidato = candidato) => setParams({ v, c: String(c) }, { replace: true })
  const navegar = useNavigate()
  const nome = CANDIDATOS[candidato].nome
  const porCandidato = variavel === 'efeito' || variavel === 'semperfil' || variavel === 'bolsoes'

  const descricao: Record<VariavelMapa, string> = {
    margem: 'Diferença entre Lula e Flávio Bolsonaro em cada município, em pontos (1 ponto é 1 voto em cada 100 votos válidos).',
    efeito: `Quanto cada município empurra o voto em ${nome} além do que o seu estado faria prever (efeito do município no modelo de três níveis).`,
    semperfil: `Quanto cada município se afasta do voto em ${nome} que o perfil do eleitorado, o perfil do município (renda, cor ou raça, religião, urbanização) e a região fariam prever. É o que o modelo completo não explica.`,
    bolsoes: `Grupos de municípios vizinhos que votam acima (ou abaixo) do que o perfil e a região preveem para ${nome}, mais do que o acaso explicaria (LISA, p < 0,05).`,
    regioes: '27 regiões de municípios vizinhos desenhadas só pelo voto (SKATER), o mesmo número de estados. A cor é a diferença entre Lula e Flávio na região; o contorno escuro, a borda de cada região.',
  }

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>O Brasil em camadas</h1>
      <p className="secundario">{descricao[variavel]}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="abas" role="group" aria-label="O que o mapa mostra">
          {VISTAS.map((v) => (
            <button key={v.chave} aria-pressed={variavel === v.chave} onClick={() => mudar(v.chave)}>
              {v.rotulo}
            </button>
          ))}
        </div>
        {porCandidato && <SeletorCandidato valor={candidato} aoMudar={(c) => mudar(variavel, c)} />}
      </div>
      {resumo && indice ? (
        <MapaBrasil resumo={resumo} indice={indice} variavel={variavel} candidato={candidato} aoClicar={(cd) => navegar(`/municipio/${cd}`)} />
      ) : (
        <p className="carregando">Carregando…</p>
      )}
      <LegendaEscala variavel={variavel} candidato={candidato} />
      <p className="discreto" style={{ marginTop: 16 }}>
        Clique em um município para ver seus locais de votação e urnas. A malha é a do IBGE (2022); Boa Esperança do Norte (MT),
        instalado depois, aparece dentro do território de origem, mas suas urnas estão na busca.
      </p>
      {variavel === 'efeito' && (
        <p className="aviso">
          O efeito do município é medido em relação ao próprio estado: um município vermelho em Santa Catarina pode ter dado
          menos votos a Lula que um azul no Piauí. É isso que separar as camadas revela.
        </p>
      )}
      {(variavel === 'semperfil' || variavel === 'bolsoes') && (
        <p className="aviso">
          O que sobra depois do perfil é a parte do voto ligada a coisas que o modelo não mede: a história política do lugar,
          lideranças locais, a economia regional, o acaso. Descreve lugares, não pessoas.
        </p>
      )}
    </div>
  )
}
