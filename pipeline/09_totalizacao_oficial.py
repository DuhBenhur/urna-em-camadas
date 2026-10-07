"""Resultado oficial de Presidente por seção, para a conferência cidadã.

Junta duas publicações do TSE (Portal de Dados Abertos, 1º turno de 2026, cargo de abrangência nacional):
  detalhe_votacao_secao_2026_BR.csv   aptos, comparecimento, abstenções, brancos e nulos de cada seção
  votacao_secao_2026_BR.csv           votos de cada votável em cada seção (candidatos, 95 branco, 96 nulo)

A base do projeto vem dos boletins de urna (01 → 04). O 03 confere, urna por urna, que a base é idêntica a
este resultado oficial. Os nulos têm duas partes: o nulo digitado na urna (96) e o nulo técnico (votos em
candidatura renunciada ou indeferida, config.VOTOS_NAO_VALIDOS), que a tabela de detalhe não soma aos nulos.

Saída: data/processed/totalizacao_secao_2026.parquet (uma linha por seção instalada no Brasil; sem o exterior)

Uso: python pipeline/09_totalizacao_oficial.py
"""
import duckdb

from config import CANDIDATOS_PRESIDENTE, PROCESSED_DIR, RAW_DIR, VOTOS_NAO_VALIDOS
from tse import extrair, salvar, sql_csv

CHAVE = ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO"]
NULOS_TECNICOS = [n for (cargo, n) in VOTOS_NAO_VALIDOS if cargo == "Presidente"]


def main() -> None:
    csv_dir = RAW_DIR / "csv"
    detalhe = extrair(RAW_DIR / "detalhe_votacao_secao_2026.zip", csv_dir, "detalhe_votacao_secao_2026_BR.csv")
    votacao = extrair(RAW_DIR / "votacao_secao_2026_BR.zip", csv_dir, "votacao_secao_2026_BR.csv")

    chave_int = "SG_UF, CAST(CD_MUNICIPIO AS INT) AS CD_MUNICIPIO, CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO"
    votos = ",\n".join(f"coalesce(sum(CAST(QT_VOTOS AS INT)) FILTER (WHERE NR_VOTAVEL = '{n}'), 0) AS V_{n}"
                       for n in CANDIDATOS_PRESIDENTE)
    tecnicos = ", ".join(f"'{n}'" for n in NULOS_TECNICOS)
    sql = f"""
        WITH det AS (
            SELECT {chave_int},
                   CAST(QT_APTOS AS INT) AS QT_APTOS, CAST(QT_COMPARECIMENTO AS INT) AS QT_COMPARECIMENTO,
                   CAST(QT_ABSTENCOES AS INT) AS QT_ABSTENCOES, CAST(QT_VOTOS_BRANCOS AS INT) AS QT_BRANCOS,
                   CAST(QT_VOTOS_NULOS AS INT) AS QT_NULOS_URNA
            FROM {sql_csv(detalhe)}
            WHERE SG_UF <> 'ZZ' AND ST_SECAO_INSTALADA = 'Sim'
        ),
        vot AS (
            SELECT {chave_int},
                   {votos},
                   coalesce(sum(CAST(QT_VOTOS AS INT)) FILTER (WHERE NR_VOTAVEL IN ({tecnicos})), 0) AS QT_NULOS_TECNICOS
            FROM {sql_csv(votacao)}
            WHERE SG_UF <> 'ZZ'
            GROUP BY ALL
        )
        SELECT det.*, vot.* EXCLUDE ({', '.join(CHAVE)})
        FROM det LEFT JOIN vot USING ({', '.join(CHAVE)})
        ORDER BY {', '.join(CHAVE)}
    """
    salvar(duckdb.connect(), sql, PROCESSED_DIR / "totalizacao_secao_2026.parquet")


if __name__ == "__main__":
    main()
