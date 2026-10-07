"""Variáveis de contexto municipal (nível 2) do IBGE, ligadas ao código de município do TSE.

Fonte: API de agregados do IBGE (servicodados.ibge.gov.br/api/v3), Censo 2022 e PIB dos Municípios.
Saída: data/processed/contexto_municipal.parquet (uma linha por município)

Uso: python pipeline/06_contexto_municipal.py
"""
import gzip
import json
import urllib.request
import zipfile

import pandas as pd

from config import PROCESSED_DIR, RAW_DIR

API = "https://servicodados.ibge.gov.br/api/v3/agregados"
MI_SOCIAL = "https://aplicacoes.mds.gov.br/sagi/servicos/misocial"
ANOMES_PBF = 202608  # último mês completo antes do 1º turno (04/10/2026)


def _get(url: str):
    with urllib.request.urlopen(url, timeout=300) as resp:
        corpo = resp.read()
    if corpo[:2] == b"\x1f\x8b":  # a API do IBGE às vezes responde em gzip mesmo sem pedido
        corpo = gzip.decompress(corpo)
    return json.loads(corpo)


def consultar(tabela: int, periodo: int, variavel: int, abrir: dict[int, list[int]] | None = None) -> pd.DataFrame:
    """Valores por município (N6). Classificações em `abrir` trazem as categorias pedidas;
    as demais ficam fixas na categoria "Total", para não somar recortes por engano."""
    abrir = abrir or {}
    meta = _get(f"{API}/{tabela}/metadados")
    filtros = []
    for c in meta["classificacoes"]:
        if int(c["id"]) in abrir:
            cats = abrir[c["id"]]
        else:
            cats = [x["id"] for x in c["categorias"] if x["nome"].lower().startswith("total")][:1]
            if not cats:
                raise ValueError(f"tabela {tabela}: classificação {c['nome']} sem categoria Total")
        filtros.append(f"{c['id']}[{','.join(map(str, cats))}]")
    url = f"{API}/{tabela}/periodos/{periodo}/variaveis/{variavel}?localidades=N6[all]"
    if filtros:
        url += "&classificacao=" + "|".join(filtros)

    linhas = []
    for resultado in _get(url)[0]["resultados"]:
        # categoria da classificação aberta (se houver) vira o nome da coluna
        # (a API devolve os ids de classificação como texto)
        cat = next((list(c["categoria"].values())[0] for c in resultado["classificacoes"] if int(c["id"]) in abrir),
                   "valor")
        for s in resultado["series"]:
            linhas.append((int(s["localidade"]["id"]), cat, s["serie"][str(periodo)]))
    df = pd.DataFrame(linhas, columns=["CD_MUNICIPIO_IBGE", "cat", "valor"])
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")  # "-", "X", "..." → NaN
    return df.pivot(index="CD_MUNICIPIO_IBGE", columns="cat", values="valor")


def bolsa_familia(anomes: int) -> pd.DataFrame:
    """Pessoas e famílias no Bolsa Família por município (MDS/SAGI, API MI Social)."""
    url = (f"{MI_SOCIAL}?q=*:*&fq=anomes_s:{anomes}&rows=10000&wt=json"
           "&fl=codigo_ibge,cadunico_tot_pes_pbf_i,qtd_familias_beneficiarias_bolsa_familia_i")
    docs = _get(url)["response"]["docs"]
    df = pd.DataFrame(docs).rename(columns={"cadunico_tot_pes_pbf_i": "pessoas_pbf",
                                            "qtd_familias_beneficiarias_bolsa_familia_i": "familias_pbf"})
    df["codigo_ibge6"] = df.pop("codigo_ibge").astype(int)  # o MDS usa o código IBGE sem o dígito verificador
    return df


PREPOSICOES = {"De", "Da", "Do", "Das", "Dos", "E", "Del"}


def nome_municipio(nome: str) -> str:
    """A tabela TSE ↔ IBGE capitaliza as preposições: 'Santa Rosa Do Purus' → 'Santa Rosa do Purus'."""
    return " ".join(p.lower() if i and p in PREPOSICOES else p for i, p in enumerate(nome.split(" ")))


def tabela_tse_ibge() -> pd.DataFrame:
    with zipfile.ZipFile(RAW_DIR / "municipio_tse_ibge.zip") as z:
        df = pd.read_csv(z.open("municipio_tse_ibge.csv"), sep=";", encoding="latin-1", dtype=str)
    return pd.DataFrame({"CD_MUNICIPIO": df.CD_MUNICIPIO_TSE.astype(int),
                         "CD_MUNICIPIO_IBGE": df.CD_MUNICIPIO_IBGE.astype(int),
                         "SG_UF": df.SG_UF,
                         # grafia com acentos (no boletim o TSE usa maiúsculas)
                         "NM_MUNICIPIO": df.NM_MUNICIPIO_IBGE.map(nome_municipio)})


def main() -> None:
    cor = consultar(9605, 2022, 93, {86: [95251, 2777, 2779]})        # total, preta, parda
    situacao = consultar(9923, 2022, 93, {1: [6795, 1]})              # total, urbana
    religiao = consultar(9537, 2022, 140, {133: [95278, 95277]})      # total, evangélicas (10 anos ou mais)
    # rendimento domiciliar per capita: a mediana vem arredondada (degraus de salário mínimo); a média varia mais
    renda_mediana = consultar(10295, 2022, 13534)
    renda_media = consultar(10295, 2022, 13431)
    pib = consultar(5938, 2022, 37)                                   # PIB a preços correntes (mil R$)
    # Boa Esperança do Norte (MT, 5101837) foi criado depois do Censo 2022 e fica sem essas variáveis

    ctx = pd.DataFrame({
        "pop_2022": cor["Total"],
        "pct_preta_parda": (cor["Preta"] + cor["Parda"]) / cor["Total"],
        "pct_urbana": situacao["Urbana"] / situacao["Total"],
        "pct_evangelicos": religiao["Evangélicas"] / religiao["Total"],
        "renda_pc_mediana": renda_mediana["valor"],
        "renda_pc_media": renda_media["valor"],
        "pib_pc_2022": pib["valor"] * 1000 / cor["Total"],
    }).reset_index()

    ctx["codigo_ibge6"] = ctx.CD_MUNICIPIO_IBGE // 10
    ctx = ctx.merge(bolsa_familia(ANOMES_PBF), on="codigo_ibge6", how="left").drop(columns="codigo_ibge6")
    ctx["pct_pop_pbf"] = ctx.pessoas_pbf / ctx.pop_2022

    ctx = tabela_tse_ibge().merge(ctx, on="CD_MUNICIPIO_IBGE", how="left")
    ctx.to_parquet(PROCESSED_DIR / "contexto_municipal.parquet", index=False)
    print(f"[ok] contexto_municipal.parquet: {len(ctx):,} municípios")
    print(ctx.drop(columns=["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "SG_UF", "NM_MUNICIPIO"]).describe().T.round(3).to_string())
    faltantes = ctx[ctx.drop(columns=["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "SG_UF", "NM_MUNICIPIO"]).isna().any(axis=1)]
    if len(faltantes):
        print(f"[aviso] {len(faltantes)} municípios com alguma variável faltante:", faltantes.CD_MUNICIPIO_IBGE.tolist()[:10])


if __name__ == "__main__":
    main()
