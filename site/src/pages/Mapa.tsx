import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LegendaEscala, MapaBrasil, type VariavelMapa } from '../components/Mapas'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { useMunicipios, useResumo } from '../lib/dados'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'

export function Mapa() {
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const [variavel, setVariavel] = useState<VariavelMapa>('margem')
  const [candidato, setCandidato] = useState<NumeroCandidato>(13)
  const navegar = useNavigate()

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>O Brasil em camadas</h1>
      <p className="secundario">
        {variavel === 'margem'
          ? 'Diferença, em pontos percentuais dos votos válidos, entre Lula e Flávio Bolsonaro em cada município.'
          : `Quanto cada município empurra o voto em ${CANDIDATOS[candidato].nome} além do que o seu estado faria prever (efeito aleatório do município no modelo de três níveis).`}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="abas" role="group" aria-label="O que o mapa mostra">
          <button aria-pressed={variavel === 'margem'} onClick={() => setVariavel('margem')}>
            Resultado
          </button>
          <button aria-pressed={variavel === 'efeito'} onClick={() => setVariavel('efeito')}>
            Efeito do município
          </button>
        </div>
        {variavel === 'efeito' && <SeletorCandidato valor={candidato} aoMudar={setCandidato} />}
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
    </div>
  )
}
