"""2º turno urna por urna (Presidente, 25/10/2026): base por seção a partir dos boletins de urna do 2º turno.

O TSE publica os boletins (bweb_2t) no Portal de Dados Abertos alguns dias depois da eleição. Este script:

1. procura os arquivos do 2º turno no portal (API do CKAN); se ainda não saíram, avisa e sai com código 3, sem mudar nada;
2. baixa os 27 zips (conferindo o SHA-512 publicado), extrai Presidente e monta uma linha por seção, como o 04; o local de
   votação vem do cadastro do 1º turno (a mesma escola nos dois turnos), e a hora de abertura e de encerramento de cada urna
   fica guardada (no fuso local) para a conta das urnas encerradas depois das 17h;
3. confere: a soma das seções de cada município é igual ao resultado oficial do município (13) em aptos (seções instaladas),
   comparecimento, abstenções, válidos, brancos, nulos e votos de Lula e de Flávio; se um município não fechar, nada é gravado;
4. grava data/processed/base_secao_2t_2026.parquet.

`--ensaio`: roda tudo com os boletins do 1º turno, que têm o mesmo formato, conferindo a soma contra a base do 1º turno, e
grava em RAW_DIR/ensaio_2t: testa o script antes de o TSE publicar o 2º turno, sem tocar em data/processed.

`--fonte totalizacao`: em vez dos boletins, usa o resultado oficial por seção (votacao_secao e detalhe_votacao_secao, as
tabelas da conferência do 09), que o TSE atualizou com o 2º turno em 26/10/2026, antes dos boletins. Mesma base e mesma
conferência; só não tem a hora de abertura e de encerramento das urnas (fica nula).

Uso: python pipeline/14_secoes_segundo_turno.py [--ensaio | --fonte totalizacao]
"""
import argparse
import importlib
import json
import re
import sys
import urllib.request

import duckdb
import pandas as pd

from config import PROCESSED_DIR, RAW_DIR, UFS, VOTOS_NAO_VALIDOS
from tse import extrair, salvar, sql_csv

baixar_tse = importlib.import_module("01_baixar_tse")  # baixar() e conferir_sha512()

CKAN = "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2026-boletim-de-urna"
TMP = RAW_DIR / "tmp"
NAO_VALIDOS = ", ".join(str(n) for c, n in VOTOS_NAO_VALIDOS if c == "Presidente")
CAMPOS = {  # base por seção → resultado oficial do município (13)
    "QT_APTOS": "aptos", "QT_COMPARECIMENTO": "comparecimento", "QT_ABSTENCOES": "abstencoes", "QT_VALIDOS": "validos",
    "QT_BRANCOS": "brancos", "QT_NULOS": "nulos", "V_13": "V_13", "V_22": "V_22",
}


def arquivos_2t() -> dict[str, str]:
    """UF → URL do boletim do 2º turno, segundo o portal (vazio enquanto o TSE não publica)."""
    with urllib.request.urlopen(CKAN, timeout=60) as resp:
        recursos = json.load(resp)["result"]["resources"]
    achados = {}
    for r in recursos:
        m = re.search(r"/bweb_2t_([A-Z]{2})_\d+\.zip$", r.get("url", ""))
        if m and m.group(1) in UFS:
            achados[m.group(1)] = r["url"]
    return achados


def bu_uf(con: duckdb.DuckDBPyConnection, zip_path, destino) -> None:
    if destino.exists():
        return
    csv = extrair(zip_path, TMP)
    salvar(con, f"""
        SELECT SG_UF, CAST(CD_MUNICIPIO AS INT) AS CD_MUNICIPIO, CAST(NR_ZONA AS INT) AS NR_ZONA,
               CAST(NR_SECAO AS INT) AS NR_SECAO, any_value(CAST(NR_LOCAL_VOTACAO AS INT)) AS NR_LOCAL_VOTACAO,
               any_value(CAST(QT_APTOS AS INT)) AS QT_APTOS,
               any_value(CAST(QT_COMPARECIMENTO AS INT)) AS QT_COMPARECIMENTO,
               any_value(CAST(QT_ABSTENCOES AS INT)) AS QT_ABSTENCOES,
               coalesce(sum(QT) FILTER (WHERE VALIDO), 0) AS QT_VALIDOS,
               coalesce(sum(QT) FILTER (WHERE DS_TIPO_VOTAVEL = 'Branco'), 0) AS QT_BRANCOS,
               coalesce(sum(QT) FILTER (WHERE DS_TIPO_VOTAVEL <> 'Branco' AND NOT VALIDO), 0) AS QT_NULOS,
               coalesce(sum(QT) FILTER (WHERE VALIDO AND NR = 13), 0) AS V_13,
               coalesce(sum(QT) FILTER (WHERE VALIDO AND NR = 22), 0) AS V_22,
               -- hora local da urna (no Acre, a abertura das 8h de Brasília aparece como 06:00)
               any_value(TRY_CAST(DT_ABERTURA AS TIMESTAMP)) AS DT_ABERTURA,
               any_value(TRY_CAST(DT_ENCERRAMENTO AS TIMESTAMP)) AS DT_ENCERRAMENTO
        FROM (
            SELECT *, CAST(QT_VOTOS AS INT) AS QT, CAST(NR_VOTAVEL AS INT) AS NR,
                   DS_TIPO_VOTAVEL = 'Nominal' AND CAST(NR_VOTAVEL AS INT) NOT IN ({NAO_VALIDOS}) AS VALIDO
            FROM {sql_csv(csv)}
            WHERE DS_CARGO_PERGUNTA = 'Presidente'
        )
        GROUP BY SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO
    """, destino, verbose=False)
    csv.unlink()


TSE_ODSELE = "https://cdn.tse.jus.br/estatistica/sead/odsele"


def secoes_da_totalizacao(con: duckdb.DuckDBPyConnection, destino) -> None:
    """O 2º turno por seção a partir do resultado oficial (os mesmos arquivos do 09, agora com os dois turnos)."""
    if destino.exists():
        return
    arquivos = {
        "detalhe": ("detalhe_votacao_secao/detalhe_votacao_secao_2026.zip", "detalhe_votacao_secao_2026_com_2t.zip",
                    "detalhe_votacao_secao_2026_BR.csv"),
        "votacao": ("votacao_secao/votacao_secao_2026_BR.zip", "votacao_secao_2026_BR_com_2t.zip", "votacao_secao_2026_BR.csv"),
    }
    csv = {}
    for nome, (caminho, local, membro) in arquivos.items():
        # nome próprio: os zips do 1º turno (01, 09) continuam como estão
        baixar_tse.baixar(f"{TSE_ODSELE}/{caminho}", RAW_DIR / local)
        csv[nome] = extrair(RAW_DIR / local, TMP, membro)
    chave = "SG_UF, CAST(CD_MUNICIPIO AS INT) AS CD_MUNICIPIO, CAST(NR_ZONA AS INT) AS NR_ZONA, CAST(NR_SECAO AS INT) AS NR_SECAO"
    salvar(con, f"""
        WITH det AS (
            SELECT {chave},
                   CAST(QT_APTOS AS INT) AS QT_APTOS, CAST(QT_COMPARECIMENTO AS INT) AS QT_COMPARECIMENTO,
                   CAST(QT_ABSTENCOES AS INT) AS QT_ABSTENCOES, CAST(QT_VOTOS_BRANCOS AS INT) AS QT_BRANCOS,
                   CAST(QT_VOTOS_NULOS AS INT) AS QT_NULOS
            FROM {sql_csv(csv['detalhe'])}
            WHERE NR_TURNO = '2' AND SG_UF <> 'ZZ' AND ST_SECAO_INSTALADA = 'Sim'
        ),
        vot AS (
            SELECT {chave}, any_value(CAST(NR_LOCAL_VOTACAO AS INT)) AS NR_LOCAL_VOTACAO,
                   coalesce(sum(CAST(QT_VOTOS AS INT)) FILTER (WHERE NR_VOTAVEL = '13'), 0) AS V_13,
                   coalesce(sum(CAST(QT_VOTOS AS INT)) FILTER (WHERE NR_VOTAVEL = '22'), 0) AS V_22
            FROM {sql_csv(csv['votacao'])}
            WHERE NR_TURNO = '2' AND SG_UF <> 'ZZ'
            GROUP BY ALL
        )
        SELECT det.SG_UF, det.CD_MUNICIPIO, det.NR_ZONA, det.NR_SECAO, vot.NR_LOCAL_VOTACAO,
               det.QT_APTOS, det.QT_COMPARECIMENTO, det.QT_ABSTENCOES,
               coalesce(vot.V_13, 0) + coalesce(vot.V_22, 0) AS QT_VALIDOS, det.QT_BRANCOS, det.QT_NULOS,
               coalesce(vot.V_13, 0) AS V_13, coalesce(vot.V_22, 0) AS V_22,
               NULL::TIMESTAMP AS DT_ABERTURA, NULL::TIMESTAMP AS DT_ENCERRAMENTO
        FROM det LEFT JOIN vot USING (SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO)
    """, destino, verbose=False)
    for c in csv.values():
        c.unlink()


def oficial_por_municipio(ensaio: bool) -> pd.DataFrame:
    """O resultado de referência de cada município, com os nomes de coluna da base por seção."""
    if ensaio:  # no ensaio, a referência é a base do 1º turno (os mesmos boletins, conferidos com o TSE)
        base = pd.read_parquet(PROCESSED_DIR / "base_secao_2026.parquet", columns=["CD_MUNICIPIO", *CAMPOS])
        return base.groupby("CD_MUNICIPIO")[list(CAMPOS)].sum()
    t2 = pd.read_parquet(PROCESSED_DIR / "resultado_2t_municipio_2026.parquet")
    return t2.set_index("CD_MUNICIPIO")[list(CAMPOS.values())].set_axis(list(CAMPOS), axis=1)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ensaio", action="store_true", help="testa com os boletins do 1º turno, sem gravar em data/processed")
    p.add_argument("--fonte", choices=["boletins", "totalizacao"], default="boletins",
                   help="boletins de urna (padrão) ou o resultado oficial por seção (votacao_secao e detalhe_votacao_secao)")
    args = p.parse_args()
    inter = RAW_DIR / ("ensaio_2t" if args.ensaio else "intermediario_2t")
    destino = (inter / "base_secao_2t_2026.parquet") if args.ensaio else PROCESSED_DIR / "base_secao_2t_2026.parquet"
    TMP.mkdir(parents=True, exist_ok=True)
    inter.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect()
    if args.fonte == "totalizacao":
        secoes_da_totalizacao(con, inter / "totalizacao2t.parquet")
        print("[ok] resultado oficial do 2º turno por seção (votacao_secao e detalhe_votacao_secao)")
        partes = f"'{(inter / 'totalizacao2t.parquet').as_posix()}'"
    elif args.ensaio:
        zips = {uf: RAW_DIR / f"bweb_1t_{uf}_2026.zip" for uf in UFS}
        print("[ensaio] boletins do 1º turno no lugar dos do 2º")
    else:
        urls = arquivos_2t()
        if not urls:
            print("[aguardando] o TSE ainda não publicou os boletins de urna do 2º turno (bweb_2t) no Portal de Dados Abertos")
            sys.exit(3)
        faltam = sorted(set(UFS) - set(urls))
        if faltam:
            print(f"[aguardando] boletins do 2º turno publicados só em parte; faltam: {', '.join(faltam)}")
            sys.exit(3)
        zips = {}
        for uf, url in sorted(urls.items()):
            zips[uf] = RAW_DIR / f"bweb_2t_{uf}_2026.zip"
            baixar_tse.baixar(url, zips[uf])
            baixar_tse.conferir_sha512(url, zips[uf])

    if args.fonte == "boletins":
        for uf in UFS:
            bu_uf(con, zips[uf], inter / f"bu2t_{uf}.parquet")
            print(f"[ok] {uf}", flush=True)
        partes = f"'{inter.as_posix()}/bu2t_*.parquet'"

    loc = (PROCESSED_DIR / "locais_votacao_2026_brasil.parquet").as_posix()
    secoes = con.sql(f"""
        -- a escola vem do cadastro (como no 04): o número do local na fonte fica em NR_LOCAL_VOTACAO_BU
        SELECT b.* REPLACE (coalesce(l.NR_LOCAL_VOTACAO, b.NR_LOCAL_VOTACAO) AS NR_LOCAL_VOTACAO),
               b.NR_LOCAL_VOTACAO AS NR_LOCAL_VOTACAO_BU
        FROM {partes} b
        LEFT JOIN (SELECT DISTINCT SG_UF, NR_ZONA, NR_SECAO, NR_LOCAL_VOTACAO FROM '{loc}') l USING (SG_UF, NR_ZONA, NR_SECAO)
        ORDER BY SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO
    """).df()

    soma = secoes.groupby("CD_MUNICIPIO")[list(CAMPOS)].sum()
    oficial = oficial_por_municipio(args.ensaio)
    junto = soma.join(oficial, rsuffix="_of", how="outer")
    falhas = [f"{len(junto) - len(soma)} municípios sem boletim"] if len(junto) > len(soma) else []
    for c in CAMPOS:
        ruins = junto[junto[c] != junto[f"{c}_of"]]
        if len(ruins):
            exemplos = ", ".join(f"{cd}: {r[c]:,.0f} x {r[f'{c}_of']:,.0f}" for cd, r in ruins.head(3).iterrows())
            falhas.append(f"{c}: {len(ruins)} municípios não fecham ({exemplos})")
    if falhas:
        print("[FALHA] a soma das urnas não fecha com o resultado oficial dos municípios; nada foi gravado:\n  " + "\n  ".join(falhas))
        sys.exit(1)
    print(f"[ok] a soma das urnas fecha com o resultado {'do 1º turno (ensaio)' if args.ensaio else 'oficial'} "
          f"nos {len(soma):,} municípios, em {len(CAMPOS)} campos")

    base1 = pd.read_parquet(PROCESSED_DIR / "base_secao_2026.parquet", columns=["SG_UF", "NR_ZONA", "NR_SECAO"])
    chave = ["SG_UF", "NR_ZONA", "NR_SECAO"]
    so_2t = len(secoes.merge(base1, on=chave, how="left", indicator=True).query("_merge == 'left_only'"))
    so_1t = len(base1.merge(secoes[chave], on=chave, how="left", indicator=True).query("_merge == 'left_only'"))
    sem_local = int(secoes.NR_LOCAL_VOTACAO.isna().sum())
    print(f"     {len(secoes):,} urnas; sem par no 1º turno: {so_2t:,} (só no 2º) e {so_1t:,} (só no 1º); sem escola: {sem_local:,}")

    con.register("secoes", secoes)
    salvar(con, "SELECT * FROM secoes", destino)


if __name__ == "__main__":
    main()
