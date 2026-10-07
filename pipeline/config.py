"""Caminhos e constantes compartilhados pelo pipeline."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Dados brutos do TSE passam de 20 GB: ficam fora do repositório.
# Para mudar o local, defina a variável de ambiente DADOS_RAW.
RAW_DIR = Path(os.environ.get("DADOS_RAW", Path.home() / "dados" / "tse"))
PROCESSED_DIR = ROOT / "data" / "processed"
GEO_DIR = ROOT / "data" / "geo"  # malhas do IBGE (API de malhas v3, qualidade mínima, TopoJSON)

COD_MUN_SP = 71072  # código TSE do município de São Paulo (não é o código IBGE)

# Candidaturas a Presidente com votos válidos no 1º turno de 2026 (número na urna → nome na urna)
CANDIDATOS_PRESIDENTE = {
    13: "LULA", 22: "FLAVIO BOLSONARO", 14: "RENAN SANTOS", 55: "RONALDO CAIADO",
    70: "ESCRITOR AUGUSTO CURY", 30: "ZEMA", 80: "SAMARA", 16: "HERTZ DIAS",
    29: "RUI COSTA PIMENTA", 27: "CLARIANA BARAO", 21: "EDMILSON COSTA", 35: "VETERINÁRIO WILSON GRASSI",
}
PARTIDOS_PRESIDENTE = {
    13: "PT", 22: "PL", 14: "MISSÃO", 55: "PSD", 70: "AVANTE", 30: "NOVO",
    80: "UP", 16: "PSTU", 29: "PCO", 27: "DC", 21: "PCB", 35: "DEMOCRATA",
}

NOMES_UF = {
    "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia", "CE": "Ceará",
    "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás", "MA": "Maranhão", "MG": "Minas Gerais",
    "MS": "Mato Grosso do Sul", "MT": "Mato Grosso", "PA": "Pará", "PB": "Paraíba", "PE": "Pernambuco",
    "PI": "Piauí", "PR": "Paraná", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RO": "Rondônia",
    "RR": "Roraima", "RS": "Rio Grande do Sul", "SC": "Santa Catarina", "SE": "Sergipe", "SP": "São Paulo",
    "TO": "Tocantins",
}

# Votos nominais que a totalização oficial não conta como válidos (nulo técnico ou anulado sub judice).
# Fonte: Relatório de Resultado da Totalização, TSE, SP, 1º turno 2026. Chave: (cargo, número do votável).
# A entrada de Presidente vale para todo o país; as de Governador e Senador são de SP.
VOTOS_NAO_VALIDOS = {
    ("Presidente", 28): "Leonardo Avalanche (PRTB): renúncia, nulo técnico",
    ("Governador", 29): "Izadora Dias (PCO): indeferido, nulo técnico",
    ("Senador", 290): "Ednelson Cesaretti (PCO): indeferido, nulo técnico",
    ("Senador", 300): "Ricardo Salles (NOVO): renúncia, nulo técnico",
    ("Senador", 360): "William Teixeira de Oliveira (AGIR): anulado sub judice",
}

TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead"
# 27 UFs. "ZZ" (eleitores no exterior) fica de fora: não tem município nem UF para o modelo multinível.
UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
       "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"]

FONTES = {
    # Boletins de urna do 1º turno de 2026, uma linha por votável por seção
    **{f"bweb_1t_{uf}_2026.zip": f"{TSE_CDN}/eleicoes/eleicoes2026/buweb/bweb_1t_{uf}_051020261403.zip"
       for uf in UFS},
    # Perfil do eleitorado (idade, gênero, escolaridade, raça/cor) por seção
    **{f"perfil_eleitor_secao_2026_{uf}.zip": f"{TSE_CDN}/odsele/perfil_eleitor_secao/perfil_eleitor_secao_2026_{uf}.zip"
       for uf in UFS},
    # Locais de votação com latitude/longitude e seções vinculadas
    "eleitorado_local_votacao_2026.zip": f"{TSE_CDN}/odsele/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip",
    # Candidaturas e sua situação: votos em candidatura indeferida não entram nos votos válidos
    "consulta_cand_2026.zip": f"{TSE_CDN}/odsele/consulta_cand/consulta_cand_2026.zip",
    # Tabela oficial de correspondência entre códigos de município do TSE e do IBGE
    "municipio_tse_ibge.zip": f"{TSE_CDN}/odsele/municipio_tse_ibge/municipio_tse_ibge.zip",
    # Totalização oficial por município/zona, com a destinação de cada voto (válido ou anulado)
    "Relatorio_Resultado_Totalizacao_2026_SP.zip": f"{TSE_CDN}/odsele/relatorio_resultado_totalizacao/Relatorio_Resultado_Totalizacao_2026_SP.zip",
}
# Arquivos para os quais o TSE publica o hash SHA-512 ao lado (URL + ".sha512")
COM_HASH = {f"bweb_1t_{uf}_2026.zip" for uf in UFS}
