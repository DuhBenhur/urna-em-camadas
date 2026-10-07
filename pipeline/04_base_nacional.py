"""Monta a base nacional por seção (Presidente, 1º turno 2026) para o modelo multinível.

Para cada UF, extrai o CSV, agrega com DuckDB e apaga o CSV (descompactados, os brutos passam de 50 GB).
Seções agregadas (que votam na urna de outra seção) têm o perfil somado ao da seção principal.

Saídas em data/processed/:
  locais_votacao_2026_brasil.parquet  seção → local de votação, com latitude/longitude
  base_secao_2026.parquet             uma linha por urna: votos por candidato + perfil do eleitorado

Uso: python pipeline/04_base_nacional.py
"""
import duckdb

from config import CANDIDATOS_PRESIDENTE, PROCESSED_DIR, RAW_DIR, UFS, VOTOS_NAO_VALIDOS
from tse import extrair, salvar, sql_csv

TMP = RAW_DIR / "tmp"
INTER = RAW_DIR / "intermediario"
NAO_VALIDOS = ", ".join(str(n) for c, n in VOTOS_NAO_VALIDOS if c == "Presidente")


def bu_uf(con: duckdb.DuckDBPyConnection, uf: str) -> None:
    destino = INTER / f"bu_{uf}.parquet"
    if destino.exists():
        return
    csv = extrair(RAW_DIR / f"bweb_1t_{uf}_2026.zip", TMP)
    # coalesce: sum com FILTER sem linhas devolve NULL, e candidato sem voto na seção tem 0
    votos = ",\n".join(f"coalesce(sum(QT) FILTER (WHERE VALIDO AND NR = {n}), 0) AS V_{n}"
                       for n in CANDIDATOS_PRESIDENTE)
    salvar(con, f"""
        SELECT SG_UF, CAST(CD_MUNICIPIO AS INT) AS CD_MUNICIPIO, any_value(NM_MUNICIPIO) AS NM_MUNICIPIO,
               CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO,
               any_value(CAST(NR_LOCAL_VOTACAO AS INT)) AS NR_LOCAL_VOTACAO,
               any_value(CAST(QT_APTOS AS INT)) AS QT_APTOS,
               any_value(CAST(QT_COMPARECIMENTO AS INT)) AS QT_COMPARECIMENTO,
               any_value(CAST(QT_ABSTENCOES AS INT)) AS QT_ABSTENCOES,
               coalesce(sum(QT) FILTER (WHERE DS_TIPO_VOTAVEL = 'Branco'), 0) AS QT_BRANCOS,
               coalesce(sum(QT) FILTER (WHERE DS_TIPO_VOTAVEL <> 'Branco' AND NOT VALIDO), 0) AS QT_NULOS,
               coalesce(sum(QT) FILTER (WHERE VALIDO), 0) AS QT_VALIDOS,
               {votos}
        FROM (
            SELECT *, CAST(QT_VOTOS AS INT) AS QT, CAST(NR_VOTAVEL AS INT) AS NR,
                   DS_TIPO_VOTAVEL = 'Nominal' AND CAST(NR_VOTAVEL AS INT) NOT IN ({NAO_VALIDOS}) AS VALIDO
            FROM {sql_csv(csv)}
            WHERE DS_CARGO_PERGUNTA = 'Presidente'
        )
        GROUP BY SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO
    """, destino, verbose=False)
    csv.unlink()


def perfil_uf(con: duckdb.DuckDBPyConnection, uf: str) -> None:
    destino = INTER / f"perfil_{uf}.parquet"
    if destino.exists():
        return
    csv = extrair(RAW_DIR / f"perfil_eleitor_secao_2026_{uf}.zip", TMP)
    # Contagens (não percentuais) para que seções agregadas possam ser somadas à principal.
    # Raça/cor fica de fora: ~84% "não informado" no cadastro (vai para o nível município, via Censo).
    salvar(con, f"""
        SELECT SG_UF, CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO,
               sum(N) AS ELEIT_PERFIL,
               coalesce(sum(N) FILTER (WHERE CD_GENERO = '4'), 0) AS ELEIT_MULHER,
               coalesce(sum(N) FILTER (WHERE IDADE BETWEEN 1600 AND 2124), 0) AS ELEIT_16_24,
               coalesce(sum(N) FILTER (WHERE IDADE >= 6064), 0) AS ELEIT_60_MAIS,
               coalesce(sum(N) FILTER (WHERE CD_GRAU_ESCOLARIDADE IN ('1', '2', '3')), 0) AS ELEIT_ATE_FUND_INC,
               coalesce(sum(N) FILTER (WHERE CD_GRAU_ESCOLARIDADE = '8'), 0) AS ELEIT_SUPERIOR
        FROM (
            SELECT *, CAST(QT_ELEITORES AS INT) AS N, TRY_CAST(CD_FAIXA_ETARIA AS INT) AS IDADE
            FROM {sql_csv(csv)}
        )
        GROUP BY ALL
    """, destino, verbose=False)
    csv.unlink()


def locais(con: duckdb.DuckDBPyConnection) -> None:
    csv = extrair(RAW_DIR / "eleitorado_local_votacao_2026.zip", TMP, "eleitorado_local_votacao_2026_BRASIL.csv")
    ufs = ", ".join(f"'{uf}'" for uf in UFS)
    salvar(con, f"""
        SELECT SG_UF, CAST(CD_MUNICIPIO AS INT) AS CD_MUNICIPIO, NM_MUNICIPIO,
               CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO,
               DS_TIPO_SECAO_AGREGADA, CAST(NR_SECAO_PRINCIPAL AS INT) AS NR_SECAO_PRINCIPAL,
               CAST(NR_LOCAL_VOTACAO AS INT) AS NR_LOCAL_VOTACAO, NM_LOCAL_VOTACAO, NM_BAIRRO,
               -- (-1, -1) é a sentinela do TSE para local sem geocodificação (inclui presídios e unidades de
               -- internação); há ainda alguns valores impossíveis. Fora do retângulo do Brasil vira NULL.
               CASE WHEN BRASIL THEN LAT END AS LAT,
               CASE WHEN BRASIL THEN LON END AS LON
        FROM (
            SELECT *, LAT BETWEEN -34 AND 6 AND LON BETWEEN -74 AND -32 AS BRASIL
            FROM (SELECT *, TRY_CAST(replace(NR_LATITUDE, ',', '.') AS DOUBLE) AS LAT,
                            TRY_CAST(replace(NR_LONGITUDE, ',', '.') AS DOUBLE) AS LON
                  FROM {sql_csv(csv)})
        )
        WHERE NR_TURNO = '1' AND SG_UF IN ({ufs})
    """, PROCESSED_DIR / "locais_votacao_2026_brasil.parquet")
    csv.unlink()


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    INTER.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()

    for uf in UFS:
        bu_uf(con, uf)
        perfil_uf(con, uf)
        print(f"[ok] {uf}", flush=True)
    locais(con)

    loc = (PROCESSED_DIR / "locais_votacao_2026_brasil.parquet").as_posix()
    salvar(con, f"""
        WITH perfil AS (
            -- seção agregada → seção principal (a urna onde seus eleitores votaram)
            SELECT p.SG_UF, p.NR_ZONA,
                   CASE WHEN l.NR_SECAO_PRINCIPAL > 0 THEN l.NR_SECAO_PRINCIPAL ELSE p.NR_SECAO END AS NR_SECAO,
                   sum(ELEIT_PERFIL) AS ELEIT_PERFIL, sum(ELEIT_MULHER) AS ELEIT_MULHER,
                   sum(ELEIT_16_24) AS ELEIT_16_24, sum(ELEIT_60_MAIS) AS ELEIT_60_MAIS,
                   sum(ELEIT_ATE_FUND_INC) AS ELEIT_ATE_FUND_INC, sum(ELEIT_SUPERIOR) AS ELEIT_SUPERIOR
            FROM '{INTER.as_posix()}/perfil_*.parquet' p
            LEFT JOIN '{loc}' l USING (SG_UF, NR_ZONA, NR_SECAO)
            GROUP BY ALL
        )
        -- Local de votação vem do cadastro (gerado depois da eleição): em ~1,3% das seções o BU traz o
        -- número de um local substituído. O número do BU fica em NR_LOCAL_VOTACAO_BU.
        SELECT b.* REPLACE (coalesce(l.NR_LOCAL_VOTACAO, b.NR_LOCAL_VOTACAO) AS NR_LOCAL_VOTACAO),
               b.NR_LOCAL_VOTACAO AS NR_LOCAL_VOTACAO_BU,
               perfil.* EXCLUDE (SG_UF, NR_ZONA, NR_SECAO), l.LAT, l.LON
        FROM '{INTER.as_posix()}/bu_*.parquet' b
        LEFT JOIN perfil USING (SG_UF, NR_ZONA, NR_SECAO)
        LEFT JOIN '{loc}' l USING (SG_UF, NR_ZONA, NR_SECAO)
        ORDER BY SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO
    """, PROCESSED_DIR / "base_secao_2026.parquet")


if __name__ == "__main__":
    main()
