"""Validação de controle. Se falhar, há erro de recorte ou de definição de voto válido; nada adiante deve rodar.

1. Recorte da capital: percentuais da 1ª ZE (Bela Vista) precisam bater com o mapa do g1.
2. Base nacional: totais de Presidente em SP precisam bater exatamente com o Relatório de Totalização do TSE.

Uso: python pipeline/03_validar_controle.py
"""
import sys

import duckdb

from config import PROCESSED_DIR

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


def main() -> None:
    falhas = validar_capital_g1() + validar_base_nacional_sp()
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
