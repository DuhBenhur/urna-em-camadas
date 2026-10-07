"""Validação de controle. Se falhar, há erro de recorte ou de definição de voto válido; nada adiante deve rodar.

1. Recorte da capital: percentuais da 1ª ZE (Bela Vista) precisam bater com o mapa do g1.
2. Base nacional: totais de Presidente em SP precisam bater exatamente com o Relatório de Totalização do TSE.
3. Conferência cidadã: cada uma das seções da base (vinda dos boletins de urna) precisa ser idêntica ao
   resultado oficial da seção (09_totalizacao_oficial.py) em aptos, comparecimento, abstenções, brancos,
   nulos (da urna + técnicos) e votos de cada candidato.

Uso: python pipeline/03_validar_controle.py
"""
import sys

import duckdb

from config import CANDIDATOS_PRESIDENTE, PROCESSED_DIR

# % de votos válidos na 1ª ZE (Bela Vista), conforme o mapa de apuração do g1
REFERENCIA_G1 = {
    ("Presidente", "LULA"): 60.58,
    ("Presidente", "BOLSONARO"): 30.65,
    ("Governador", "HADDAD"): 58.96,
    ("Governador", "TARCÍSIO"): 39.95,
}
TOLERANCIA_PP = 0.01  # o g1 arredonda em duas casas

# Relatório Resultado da Totalização, Presidente, 1º turno, SP (TSE/SISTOT, 04/10/2026 23:00:29)
REFERENCIA_TOTALIZACAO_SP = {
    "secoes": 103_656,
    "QT_APTOS": 34_122_892,
    "QT_COMPARECIMENTO": 26_431_992,
    "QT_ABSTENCOES": 7_690_900,
    "QT_VALIDOS": 24_882_948,
    "QT_BRANCOS": 632_801,
    "QT_NULOS": 916_243,  # 914.888 nulos na urna + 1.355 nulos técnicos
}


def conferir(rotulo: str, calculado: float, esperado: float, tolerancia: float = 0) -> bool:
    ok = abs(calculado - esperado) <= tolerancia
    print(f"[{'ok' if ok else 'FALHA'}] {rotulo:38s} calculado {calculado:>14,.2f}  referência {esperado:>14,.2f}")
    return ok


def validar_capital_g1() -> int:
    bu = (PROCESSED_DIR / "bu_1t_2026_capital.parquet").as_posix()
    resultado = duckdb.sql(f"""
        SELECT DS_CARGO_PERGUNTA AS cargo, NM_VOTAVEL AS votavel,
               round(100 * sum(QT_VOTOS) / sum(sum(QT_VOTOS)) OVER (PARTITION BY DS_CARGO_PERGUNTA), 2) AS pct
        FROM '{bu}'
        WHERE NR_ZONA = 1 AND VOTO_VALIDO
          AND DS_CARGO_PERGUNTA IN ('Presidente', 'Governador')
        GROUP BY DS_CARGO_PERGUNTA, NM_VOTAVEL
    """).fetchall()
    calculado = {(c, v): p for c, v, p in resultado}

    falhas = 0
    for (cargo, trecho), esperado in REFERENCIA_G1.items():
        achados = [(v, p) for (c, v), p in calculado.items() if c == cargo and trecho in v.upper()]
        if len(achados) != 1:
            print(f"[erro] {cargo}/{trecho}: {len(achados)} votáveis correspondentes")
            falhas += 1
            continue
        nome, pct = achados[0]
        falhas += not conferir(f"1ª ZE {cargo} {nome}", pct, esperado, TOLERANCIA_PP)
    return falhas


def validar_base_nacional_sp() -> int:
    base = PROCESSED_DIR / "base_secao_2026.parquet"
    if not base.exists():
        print("[aviso] base nacional ainda não gerada (pipeline/04_base_nacional.py)")
        return 0
    colunas = [c for c in REFERENCIA_TOTALIZACAO_SP if c != "secoes"]
    somas = ", ".join(f"sum({c})" for c in colunas)
    linha = duckdb.sql(f"SELECT count(*), {somas} FROM '{base.as_posix()}' WHERE SG_UF = 'SP'").fetchone()
    calculado = dict(zip(["secoes", *colunas], linha))
    return sum(not conferir(f"SP Presidente {k}", calculado[k], v) for k, v in REFERENCIA_TOTALIZACAO_SP.items())


# campo da base (boletins) → expressão no resultado oficial por seção
CAMPOS_CONFERENCIA = {
    "QT_APTOS": "o.QT_APTOS",
    "QT_COMPARECIMENTO": "o.QT_COMPARECIMENTO",
    "QT_ABSTENCOES": "o.QT_ABSTENCOES",
    "QT_BRANCOS": "o.QT_BRANCOS",
    "QT_NULOS": "o.QT_NULOS_URNA + o.QT_NULOS_TECNICOS",
    "QT_VALIDOS": " + ".join(f"o.V_{n}" for n in CANDIDATOS_PRESIDENTE),
    **{f"V_{n}": f"o.V_{n}" for n in CANDIDATOS_PRESIDENTE},
}


def validar_totalizacao_secoes() -> int:
    base = PROCESSED_DIR / "base_secao_2026.parquet"
    oficial = PROCESSED_DIR / "totalizacao_secao_2026.parquet"
    if not (base.exists() and oficial.exists()):
        print("[aviso] base ou resultado oficial por seção ainda não gerados (04, 09)")
        return 0
    difs = ", ".join(f"sum((b.{c} IS DISTINCT FROM {e})::int) AS {c}" for c, e in CAMPOS_CONFERENCIA.items())
    linha = duckdb.sql(f"""
        SELECT count(*) AS secoes, count(o.QT_APTOS) AS no_oficial, {difs}
        FROM '{base.as_posix()}' b
        FULL JOIN '{oficial.as_posix()}' o USING (SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO)
    """).fetchone()
    secoes, no_oficial, *divergencias = linha
    falhas = not conferir("Brasil: seções da base no resultado oficial", no_oficial, secoes)
    for campo, n in zip(CAMPOS_CONFERENCIA, divergencias):
        falhas += not conferir(f"Brasil: seções com {campo} diferente", n, 0)
    return falhas


def main() -> None:
    falhas = validar_capital_g1() + validar_base_nacional_sp() + validar_totalizacao_secoes()
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
