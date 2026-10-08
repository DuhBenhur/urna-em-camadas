import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LegendaEscala, LegendaSequencial, MapaBrasil, type VariavelMapa } from '../components/Mapas'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { SeloExperimental } from '../components/SeloExperimental'
import { comCandidato, useCandidato } from '../lib/candidato'
import { useMunicipios, useResumo } from '../lib/dados'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { LENTES, TODAS_LENTES, lerLente, rotuloValor, type Lente } from '../lib/virar'

const VISTAS: { chave: VariavelMapa; rotulo: string }[] = [
  { chave: 'virar', rotulo: 'Onde virar voto' },
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
  const [escolhido, definirCandidato] = useCandidato()
  const candidato: NumeroCandidato = escolhido ?? 13
  // sem candidato escolhido, o "Onde virar voto" abre na conta que não tem lado (votos em aberto)
  const pedidaLente = params.get('a')
  const lente: Lente = pedidaLente ? lerLente(pedidaLente) : escolhido ? 'faltosos' : 'abertos'
  const mudarParametro = (chave: string, valor: string) =>
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual)
        novos.set(chave, valor)
        return novos
      },
      { replace: true },
    )
  const navegar = useNavigate()
  const nome = CANDIDATOS[candidato].nome
  const porCandidato =
    variavel === 'efeito' || variavel === 'semperfil' || variavel === 'bolsoes' || (variavel === 'virar' && LENTES[lente].porCandidato)

  const descricao: Record<VariavelMapa, string> = {
    virar: `Em cada município, ${lente === 'faltosos' ? 'o' : 'os'} ${rotuloValor(lente, nome)}, de cada 100 eleitores aptos. A taxa, e não o total, para as cidades grandes não dominarem o mapa; o total aparece ao passar o mouse ou o dedo.`,
    margem: 'Diferença entre Lula e Flávio Bolsonaro em cada município, em pontos (1 ponto é 1 voto em cada 100 votos válidos).',
    efeito: `Quanto cada município empurra o voto em ${nome} além do que o seu estado faria prever (efeito do município no modelo de três níveis).`,
    semperfil: `Quanto cada município se afasta do voto em ${nome} que o perfil do eleitorado, o perfil do município (renda, cor ou raça, religião, urbanização) e a região fariam prever. É o que o modelo completo não explica.`,
    bolsoes: `Grupos de municípios vizinhos que votam acima (ou abaixo) do que o perfil e a região preveem para ${nome}, mais do que o acaso explicaria (LISA, p < 0,05).`,
    regioes: '27 regiões de municípios vizinhos desenhadas só pelo voto (SKATER), o mesmo número de estados. A cor é a diferença entre Lula e Flávio na região; o contorno escuro, a borda de cada região.',
  }

  const aoClicar = (cd: number) => {
    if (variavel !== 'virar') return navegar(`/municipio/${cd}`)
    const uf = indice?.porCodigo.get(cd)?.uf ?? ''
    navegar(`/virar?a=${lente}&uf=${uf}&m=${cd}${comCandidato(escolhido, '&')}`)
  }

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>O Brasil em camadas</h1>
      <p className="secundario">{descricao[variavel]}</p>
      <div className="abas" role="group" aria-label="O que o mapa mostra">
        {VISTAS.map((v) => (
          <button key={v.chave} aria-pressed={variavel === v.chave} onClick={() => mudarParametro('v', v.chave)}>
            {v.rotulo}
          </button>
        ))}
      </div>
      {(variavel === 'virar' || porCandidato) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {variavel === 'virar' && (
            <div className="abas" role="group" aria-label="Que tipo de conversa">
              {TODAS_LENTES.map((l) => (
                <button key={l} aria-pressed={lente === l} onClick={() => mudarParametro('a', l)}>
                  {LENTES[l].titulo}
                  {LENTES[l].experimental && ' (experimental)'}
                </button>
              ))}
            </div>
          )}
          {porCandidato && <SeletorCandidato valor={candidato} aoMudar={definirCandidato} />}
        </div>
      )}
      {resumo && indice ? (
        <MapaBrasil resumo={resumo} indice={indice} variavel={variavel} candidato={candidato} lente={lente} aoClicar={aoClicar} />
      ) : (
        <p className="carregando">Carregando…</p>
      )}
      {variavel === 'virar' ? <LegendaSequencial lente={lente} candidato={candidato} /> : <LegendaEscala variavel={variavel} candidato={candidato} />}
      {variavel === 'virar' ? (
        <>
          <p className="discreto" style={{ marginTop: 16 }}>
            Clique em um município para ver os bairros e as escolas no “Onde virar voto”. Os mesmos números, em tabela, estado
            por estado: <Link to={`/virar?a=${lente}${comCandidato(escolhido, '&')}`}>ver a lista</Link>. A conta é a mesma para
            os dois candidatos; o site não pede voto para ninguém.
          </p>
          {lente === 'perfil' && (
            <p className="aviso">
              <SeloExperimental /> O esperado vem do modelo do capítulo 4 da análise, que não conhece a renda do bairro nem a
              história política do lugar: parte do “abaixo do esperado” vem daí. Trate como pista, não como certeza.
            </p>
          )}
          {lente === 'faltosos' && (
            <p className="aviso">
              Quem faltou é um teto: parte mudou de cidade, está fora do país ou não pode votar. O saldo supõe que quem faltou
              votaria como os vizinhos que votaram. Onde {CANDIDATOS[candidato].curto} não ficou à frente em nenhuma escola, o
              saldo é zero.
            </p>
          )}
        </>
      ) : (
        <p className="discreto" style={{ marginTop: 16 }}>
          Clique em um município para ver seus locais de votação e urnas. A malha é a do IBGE (2022); Boa Esperança do Norte
          (MT), instalado depois, aparece dentro do território de origem, mas suas urnas estão na busca.
        </p>
      )}
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
