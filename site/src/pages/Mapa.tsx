import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LegendaEscala, LegendaSequencial } from '../components/Legendas'
import { MapaBrasil } from '../components/Mapas'
import type { VariavelMapa } from '../lib/escalas'
import { SeletorCandidato } from '../components/SeletorCandidato'
import { comCandidato, useCandidato } from '../lib/candidato'
import { useMunicipios, useResumo } from '../lib/dados'
import { CANDIDATOS, type NumeroCandidato } from '../lib/modelo'
import { LENTES, LENTES_PRINCIPAIS, lerLentePrincipal, rotuloValor, type Lente } from '../lib/virar'

// as vistas em dois grupos (docs/plano_reorganizacao.md, 5.9): a da ferramenta e as da análise, cada uma com o bloco de
// Método e dados que explica a conta
const PARA_AGIR: { chave: VariavelMapa; rotulo: string }[] = [{ chave: 'virar', rotulo: 'Onde virar voto' }]
const PARA_ENTENDER: { chave: VariavelMapa; rotulo: string }[] = [
  { chave: 'margem', rotulo: 'Resultado' },
  { chave: 'efeito', rotulo: 'Efeito da cidade' },
  { chave: 'semperfil', rotulo: 'O que o perfil não explica' },
  { chave: 'bolsoes', rotulo: 'Bolsões' },
  { chave: 'regioes', rotulo: 'Regiões de voto' },
]
const VISTAS = [...PARA_AGIR, ...PARA_ENTENDER]
const BLOCO_METODO: Record<VariavelMapa, string> = {
  virar: 'contas',
  margem: 'fontes',
  efeito: 'modelo',
  semperfil: 'explicacoes',
  bolsoes: 'espaco',
  regioes: 'espaco',
}

export function Mapa() {
  const { dados: resumo } = useResumo()
  const { dados: indice } = useMunicipios()
  const [params, setParams] = useSearchParams()
  const pedida = params.get('v') as VariavelMapa | null
  // sem vista pedida, abre na da ferramenta, o centro do site
  const variavel: VariavelMapa = VISTAS.some((v) => v.chave === pedida) ? pedida! : 'virar'
  const [escolhido, definirCandidato] = useCandidato()
  const candidato: NumeroCandidato = escolhido ?? 13
  // sem candidato escolhido, o "Onde virar voto" abre na conta que não tem lado (votos em aberto); a do perfil,
  // experimental, fica só na ferramenta (D9)
  const pedidaLente = params.get('a')
  const lente: Lente = pedidaLente ? lerLentePrincipal(pedidaLente) : escolhido ? 'faltosos' : 'abertos'
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
    virar: `Em cada cidade, ${lente === 'faltosos' ? 'o' : 'os'} ${rotuloValor(lente, nome)}, de cada 100 eleitores aptos. A taxa, e não o total, para as cidades grandes não dominarem o mapa; o total aparece ao passar o mouse ou o dedo.`,
    margem: 'Diferença entre Lula e Flávio Bolsonaro em cada cidade, em pontos (1 ponto é 1 voto em cada 100 votos válidos).',
    efeito: `Quanto cada cidade empurra o voto em ${nome} além do que o seu estado faria prever.`,
    semperfil: `Quanto cada cidade se afasta do voto em ${nome} que o perfil do eleitorado, o perfil da cidade (renda, cor ou raça, religião, urbanização) e a região fariam prever. É o que o modelo não explica.`,
    bolsoes: `Grupos de cidades vizinhas que votam acima (ou abaixo) do que o perfil e a região preveem para ${nome}, mais do que o acaso explicaria.`,
    regioes: '27 regiões de cidades vizinhas desenhadas só pelo voto, o mesmo número de estados. A cor é a diferença entre Lula e Flávio na região; o contorno escuro, a borda de cada região.',
  }

  const aoClicar = (cd: number) => {
    if (variavel !== 'virar') return navegar(`/?m=${cd}&aba=resultado${comCandidato(escolhido, '&')}`)
    const uf = indice?.porCodigo.get(cd)?.uf ?? ''
    navegar(`/?a=${lente}&uf=${uf}&m=${cd}${comCandidato(escolhido, '&')}`)
  }

  return (
    <div className="conteudo">
      <h1 style={{ marginTop: 32 }}>O Brasil em camadas</h1>
      <div className="grupos-vistas">
        {(
          [
            ['Para agir', PARA_AGIR],
            ['Para entender', PARA_ENTENDER],
          ] as const
        ).map(([titulo, vistas]) => (
          <div key={titulo}>
            <div className="rotulo-pequeno">{titulo}</div>
            <div className="abas" role="group" aria-label={`Mapas ${titulo.toLowerCase()}`}>
              {vistas.map((v) => (
                <button key={v.chave} aria-pressed={variavel === v.chave} onClick={() => mudarParametro('v', v.chave)}>
                  {v.rotulo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="secundario">
        {descricao[variavel]} <Link to={`/metodo?sec=${BLOCO_METODO[variavel]}`}>Como foi calculado</Link>.
      </p>
      {(variavel === 'virar' || porCandidato) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {variavel === 'virar' && (
            <div className="abas" role="group" aria-label="Que tipo de conversa">
              {LENTES_PRINCIPAIS.map((l) => (
                <button key={l} aria-pressed={lente === l} onClick={() => mudarParametro('a', l)}>
                  {LENTES[l].titulo}
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
            Clique em uma cidade para ver os bairros e as escolas na ferramenta. Os mesmos números, em tabela, estado por
            estado: <Link to={`/?a=${lente}${comCandidato(escolhido, '&')}`}>ver a lista</Link>. A conta é a mesma para os dois
            candidatos; o site não pede voto para ninguém.
          </p>
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
          Clique em uma cidade para ver as escolas e as urnas dela. A malha é a do IBGE (2022); Boa Esperança do Norte (MT),
          criada depois, aparece dentro do território de origem, mas as urnas dela estão na busca.
        </p>
      )}
      {variavel === 'efeito' && (
        <p className="aviso">
          O efeito da cidade é medido em relação ao próprio estado: uma cidade vermelha em Santa Catarina pode ter dado menos
          votos a Lula que uma azul no Piauí. É isso que separar as camadas revela.
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
