"""Exporta os dados estáticos do site para site/public/dados/.

Usa só arquivos versionados no repositório (data/processed, data/geo, resultados), então roda no
GitHub Actions antes do build, sem os brutos do TSE. Os JSON gerados não vão para o git.

Arquivos (tabelas compactas: "colunas" + "linhas", para reduzir tamanho):
  resumo.json                  totais nacionais, candidatos, modelos nulos e UFs
  historia.json                números da história da página inicial (cópia de resultados/08_historia.json)
  municipios.json              índice dos 5.571 municípios (busca, mapa, zonas de cada município)
  locais/{cd_tse}.json         locais de votação do município, com coordenadas e votos somados
  zonas/{UF}-{zona}.json       seções da zona eleitoral (o boletim de cada urna) e seus locais,
                               indexados por "{município}-{local}"
  geo/municipios.topo.json     malha municipal do IBGE (qualidade mínima)
  geo/ufs.topo.json            malha das UFs

Uso: python pipeline/07_exportar_site.py
"""
import json
import shutil
from datetime import date

import duckdb
import pandas as pd

from config import (CANDIDATOS_PRESIDENTE, GEO_DIR, NOMES_UF, PARTIDOS_PRESIDENTE, PROCESSED_DIR, ROOT)

SAIDA = ROOT / "site" / "public" / "dados"
RESULTADOS = ROOT / "resultados"

# ordem fixa dos votos por candidato nos arquivos de zona (por votação nacional, decrescente)
ORDEM_CANDIDATOS = [13, 22, 14, 55, 70, 30, 80, 16, 29, 27, 21, 35]
PERFIL = ["ELEIT_PERFIL", "ELEIT_MULHER", "ELEIT_16_24", "ELEIT_60_MAIS", "ELEIT_ATE_FUND_INC", "ELEIT_SUPERIOR"]


def gravar(caminho, objeto) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(objeto, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def tabela(df: pd.DataFrame) -> dict:
    """DataFrame → {"colunas": [...], "linhas": [[...], ...]} com NaN como null."""
    df = df.astype(object).where(df.notna(), None)
    return {"colunas": list(df.columns), "linhas": df.values.tolist()}


def carregar() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    p = lambda nome: (PROCESSED_DIR / nome).as_posix()
    base = duckdb.sql(f"SELECT * FROM '{p('base_secao_2026.parquet')}'").df()
    locais = duckdb.sql(f"""
        SELECT SG_UF, CD_MUNICIPIO, NR_ZONA, NR_LOCAL_VOTACAO, any_value(NM_LOCAL_VOTACAO) AS NM_LOCAL,
               any_value(NM_BAIRRO) AS NM_BAIRRO, round(any_value(LAT), 5) AS LAT, round(any_value(LON), 5) AS LON
        FROM '{p('locais_votacao_2026_brasil.parquet')}'
        WHERE DS_TIPO_SECAO_AGREGADA = 'Principal'
        GROUP BY ALL
    """).df()
    municipios = (pd.read_parquet(PROCESSED_DIR / "contexto_municipal.parquet")
                  .merge(pd.read_parquet(PROCESSED_DIR / "blups_hlm3_nulo.parquet").drop(columns="SG_UF"),
                         on="CD_MUNICIPIO"))
    modelos = json.loads((RESULTADOS / "05_hlm_nulo.json").read_text(encoding="utf-8"))
    return base, locais, municipios, modelos


def resumo(base: pd.DataFrame, locais: pd.DataFrame, municipios: pd.DataFrame, modelos: dict) -> dict:
    tot = base[["QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VALIDOS", "QT_BRANCOS", "QT_NULOS"]].sum()
    votos = base[[f"V_{n}" for n in ORDEM_CANDIDATOS]].sum()
    por_uf = base.groupby("SG_UF")[["QT_APTOS", "QT_VALIDOS", "V_13", "V_22"]].sum()
    efeitos_uf = municipios.groupby("SG_UF")[["u_uf_13", "u_uf_22"]].first()
    return {
        "gerado_em": date.today().isoformat(),
        "eleicao": {"ano": 2026, "turno": 1, "data": "2026-10-04", "cargo": "Presidente"},
        "totais": {
            "secoes": len(base), "municipios": int(base.CD_MUNICIPIO.nunique()),
            "zonas": int(base[["SG_UF", "NR_ZONA"]].drop_duplicates().shape[0]), "locais": len(locais),
            **{k.removeprefix("QT_").lower(): int(v) for k, v in tot.items()},
        },
        "candidatos": [{"numero": n, "nome": CANDIDATOS_PRESIDENTE[n], "partido": PARTIDOS_PRESIDENTE[n],
                        "votos": int(votos[f"V_{n}"])} for n in ORDEM_CANDIDATOS],
        "modelos": {num: {"intercepto": m["intercepto"]["logit"], "icc": m["icc"],
                          "variancias": m["variancias"], "icc_mesmo_municipio": m["icc_mesmo_municipio"]}
                    for num, m in modelos["candidatos"].items()},
        "ufs": [{"uf": uf, "nome": NOMES_UF[uf], "aptos": int(r.QT_APTOS), "validos": int(r.QT_VALIDOS),
                 "v13": int(r.V_13), "v22": int(r.V_22),
                 "u13": round(float(efeitos_uf.loc[uf, "u_uf_13"]), 4),
                 "u22": round(float(efeitos_uf.loc[uf, "u_uf_22"]), 4)}
                for uf, r in por_uf.iterrows()],
    }


def indice_municipios(base: pd.DataFrame, municipios: pd.DataFrame) -> dict:
    agg = (base.groupby("CD_MUNICIPIO")
           .agg(secoes=("NR_SECAO", "size"), validos=("QT_VALIDOS", "sum"), v13=("V_13", "sum"),
                v22=("V_22", "sum"), zonas=("NR_ZONA", lambda z: sorted(set(int(x) for x in z))))
           .reset_index())
    m = municipios.merge(agg, on="CD_MUNICIPIO")
    m["u13"] = m.u_mun_13.round(4)
    m["u22"] = m.u_mun_22.round(4)
    colunas = ["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO", "SG_UF", "secoes", "validos", "v13", "v22",
               "u13", "u22", "zonas"]
    return tabela(m[colunas].rename(columns={"CD_MUNICIPIO": "cd", "CD_MUNICIPIO_IBGE": "ibge",
                                              "NM_MUNICIPIO": "nome", "SG_UF": "uf"}))


def exportar_locais(base: pd.DataFrame, locais: pd.DataFrame) -> int:
    por_local = (base.groupby(["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
                 .agg(secoes=("NR_SECAO", "size"), validos=("QT_VALIDOS", "sum"),
                      v13=("V_13", "sum"), v22=("V_22", "sum"))
                 .reset_index()
                 .merge(locais.drop(columns="SG_UF"), on=["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"], how="left"))
    colunas = ["NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL", "NM_BAIRRO", "LAT", "LON", "secoes", "validos", "v13", "v22"]
    for cd, grupo in por_local.groupby("CD_MUNICIPIO"):
        gravar(SAIDA / "locais" / f"{cd}.json",
               tabela(grupo[colunas].rename(columns={"NR_ZONA": "zona", "NR_LOCAL_VOTACAO": "local",
                                                     "NM_LOCAL": "nome", "NM_BAIRRO": "bairro",
                                                     "LAT": "lat", "LON": "lon"})))
    return por_local.CD_MUNICIPIO.nunique()


def exportar_zonas(base: pd.DataFrame, locais: pd.DataFrame) -> int:
    colunas = (["NR_SECAO", "NR_LOCAL_VOTACAO", "CD_MUNICIPIO", "QT_APTOS", "QT_COMPARECIMENTO", "QT_VALIDOS",
                "QT_BRANCOS", "QT_NULOS"] + [f"V_{n}" for n in ORDEM_CANDIDATOS] + PERFIL)
    nomes = {"NR_SECAO": "secao", "NR_LOCAL_VOTACAO": "local", "CD_MUNICIPIO": "cd", "QT_APTOS": "aptos",
             "QT_COMPARECIMENTO": "comparecimento", "QT_VALIDOS": "validos", "QT_BRANCOS": "brancos",
             "QT_NULOS": "nulos", **{c: c.removeprefix("ELEIT_").lower() for c in PERFIL},
             **{f"V_{n}": f"v{n}" for n in ORDEM_CANDIDATOS}}
    locais_por_zona = dict(tuple(locais.groupby(["SG_UF", "NR_ZONA"])))
    n = 0
    for (uf, zona), grupo in base.groupby(["SG_UF", "NR_ZONA"]):
        lz = locais_por_zona[(uf, zona)]
        gravar(SAIDA / "zonas" / f"{uf}-{zona}.json", {
            "uf": uf, "zona": int(zona),
            # o número do local só é único dentro do município (uma zona pode cobrir vários municípios)
            "locais": {f"{int(r.CD_MUNICIPIO)}-{int(r.NR_LOCAL_VOTACAO)}": [r.NM_LOCAL, r.NM_BAIRRO, r.LAT, r.LON]
                       for r in lz.itertuples()},
            **tabela(grupo.sort_values("NR_SECAO")[colunas].rename(columns=nomes).astype("Int64")),
        })
        n += 1
    return n


def main() -> None:
    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    base, locais, municipios, modelos = carregar()
    gravar(SAIDA / "resumo.json", resumo(base, locais, municipios, modelos))
    # calculado localmente pelo 08 (precisa de geopandas); aqui só é compactado e copiado
    gravar(SAIDA / "historia.json", json.loads((RESULTADOS / "08_historia.json").read_text(encoding="utf-8")))
    gravar(SAIDA / "municipios.json", indice_municipios(base, municipios))
    n_mun = exportar_locais(base, locais)
    n_zonas = exportar_zonas(base, locais)
    (SAIDA / "geo").mkdir(parents=True, exist_ok=True)
    shutil.copy(GEO_DIR / "municipios_br_minima.topo.json", SAIDA / "geo" / "municipios.topo.json")
    shutil.copy(GEO_DIR / "ufs_br_minima.topo.json", SAIDA / "geo" / "ufs.topo.json")

    arquivos = list(SAIDA.rglob("*.json"))
    tamanho = sum(a.stat().st_size for a in arquivos) / 1e6
    print(f"[ok] {len(arquivos):,} arquivos, {tamanho:,.1f} MB em {SAIDA}")
    print(f"     {n_mun:,} arquivos de locais, {n_zonas:,} arquivos de zona")


if __name__ == "__main__":
    main()
