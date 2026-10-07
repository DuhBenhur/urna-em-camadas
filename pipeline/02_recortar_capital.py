"""Recorta a cidade de São Paulo dos brutos do TSE e salva em Parquet em data/processed/.

Uso: python pipeline/02_recortar_capital.py
"""
import duckdb

from config import COD_MUN_SP, PROCESSED_DIR, RAW_DIR, VOTOS_NAO_VALIDOS
from tse import extrair, salvar
from tse import sql_csv as ler

CSV_DIR = RAW_DIR / "csv"
CARGOS = ("Presidente", "Governador", "Senador")


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    bu = extrair(RAW_DIR / "bweb_1t_SP_2026.zip", CSV_DIR)
    locais = extrair(RAW_DIR / "eleitorado_local_votacao_2026.zip", CSV_DIR, "eleitorado_local_votacao_2026_SP.csv")
    perfil = extrair(RAW_DIR / "perfil_eleitor_secao_2026_SP.zip", CSV_DIR)

    con = duckdb.connect()
    cargos = ", ".join(f"'{c}'" for c in CARGOS)
    nao_validos = ", ".join(f"('{c}', {n})" for c, n in VOTOS_NAO_VALIDOS)

    salvar(con, f"""
        SELECT CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO,
               CAST(NR_LOCAL_VOTACAO AS INT) AS NR_LOCAL_VOTACAO,
               DS_CARGO_PERGUNTA, DS_TIPO_URNA, DS_SECOES_AGREGADAS,
               CAST(QT_APTOS AS INT) AS QT_APTOS, CAST(QT_COMPARECIMENTO AS INT) AS QT_COMPARECIMENTO,
               CAST(QT_ABSTENCOES AS INT) AS QT_ABSTENCOES,
               DS_TIPO_VOTAVEL, CAST(NR_VOTAVEL AS INT) AS NR_VOTAVEL, NM_VOTAVEL, SG_PARTIDO,
               CAST(QT_VOTOS AS INT) AS QT_VOTOS,
               DS_TIPO_VOTAVEL = 'Nominal'
                 AND (DS_CARGO_PERGUNTA, CAST(NR_VOTAVEL AS INT)) NOT IN ({nao_validos}) AS VOTO_VALIDO
        FROM {ler(bu)}
        WHERE CD_MUNICIPIO = '{COD_MUN_SP}' AND DS_CARGO_PERGUNTA IN ({cargos})
    """, PROCESSED_DIR / "bu_1t_2026_capital.parquet")

    salvar(con, f"""
        SELECT CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO,
               DS_TIPO_SECAO_AGREGADA, CAST(NR_SECAO_PRINCIPAL AS INT) AS NR_SECAO_PRINCIPAL,
               CAST(NR_LOCAL_VOTACAO AS INT) AS NR_LOCAL_VOTACAO, NM_LOCAL_VOTACAO, DS_TIPO_LOCAL,
               DS_ENDERECO, NM_BAIRRO, NR_CEP,
               TRY_CAST(replace(NR_LATITUDE, ',', '.') AS DOUBLE) AS LAT,
               TRY_CAST(replace(NR_LONGITUDE, ',', '.') AS DOUBLE) AS LON,
               CAST(QT_ELEITOR_SECAO AS INT) AS QT_ELEITOR_SECAO,
               CAST(QT_ELEITOR_ELEICAO_FEDERAL AS INT) AS QT_ELEITOR_ELEICAO_FEDERAL,
               DS_SITU_SECAO
        FROM {ler(locais)}
        WHERE CD_MUNICIPIO = '{COD_MUN_SP}' AND NR_TURNO = '1'
    """, PROCESSED_DIR / "locais_votacao_2026_capital.parquet")

    salvar(con, f"""
        SELECT CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO,
               CAST(NR_LOCAL_VOTACAO AS INT) AS NR_LOCAL_VOTACAO,
               DS_GENERO, DS_ESTADO_CIVIL, DS_FAIXA_ETARIA, DS_GRAU_ESCOLARIDADE, DS_RACA_COR,
               DS_IDENTIDADE_GENERO,
               CAST(QT_ELEITORES AS INT) AS QT_ELEITORES,
               CAST(QT_ELEITORES_DEFICIENCIA AS INT) AS QT_ELEITORES_DEFICIENCIA
        FROM {ler(perfil)}
        WHERE CD_MUNICIPIO = '{COD_MUN_SP}'
    """, PROCESSED_DIR / "perfil_eleitor_secao_2026_capital.parquet")


if __name__ == "__main__":
    main()
