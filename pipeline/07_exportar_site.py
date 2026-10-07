"""Exporta os dados estáticos do site para site/public/dados/.

Usa só arquivos versionados no repositório (data/processed, data/geo, resultados), então roda no
GitHub Actions antes do build, sem os brutos do TSE. Os JSON gerados não vão para o git.

Arquivos (tabelas compactas: "colunas" + "linhas", para reduzir tamanho):
  resumo.json                  totais nacionais, candidatos, modelos nulos e UFs
  historia.json                números da história da página inicial (cópia de resultados/08_historia.json)
  conferencia.json             soma dos boletins x resultado oficial do TSE, por UF e no Brasil
  explicacao.json              modelos explicativos (10) e análise espacial (11): capítulo "quem mora ali ou onde fica?"
  municipios.json              índice dos 5.571 municípios (busca, mapa, zonas de cada município)
  locais/{cd_tse}.json         locais de votação do município, com coordenadas e votos somados
  zonas/{UF}-{zona}.json       seções da zona eleitoral (o boletim de cada urna) e seus locais,
                               indexados por "{município}-{local}"; "conf" = 1 se a seção é idêntica
                               ao resultado oficial em todos os campos
  geo/municipios.topo.json     malha municipal do IBGE (qualidade mínima)
  geo/ufs.topo.json            malha das UFs
  geo/regioes.json             contorno das regiões de voto (11, SKATER)

Colunas novas vindas dos modelos (10, 11): no índice de municípios, "sp" = o que o perfil não explica (p.p.),
"lisa" = bolsão espacial e "regiao" = região de voto; nas zonas, "d" = desvio do perfil da seção em relação ao
município (logit × 10.000); nos locais, "s" = surpresa (resultado − esperado pelo município e pelo perfil).

Uso: python pipeline/07_exportar_site.py
"""
import json
import shutil
from datetime import date

import duckdb
import numpy as np
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


# campos conferidos: base (boletins) → resultado oficial por seção (09)
CONFERIDOS = {
    "QT_APTOS": ["QT_APTOS"], "QT_COMPARECIMENTO": ["QT_COMPARECIMENTO"], "QT_ABSTENCOES": ["QT_ABSTENCOES"],
    "QT_BRANCOS": ["QT_BRANCOS"], "QT_NULOS": ["QT_NULOS_URNA", "QT_NULOS_TECNICOS"],
    "QT_VALIDOS": [f"V_{n}" for n in ORDEM_CANDIDATOS], **{f"V_{n}": [f"V_{n}"] for n in ORDEM_CANDIDATOS},
}


def marcar_conferencia(base: pd.DataFrame) -> pd.DataFrame:
    """Junta o resultado oficial de cada seção à base e marca as seções idênticas em todos os campos."""
    oficial = pd.read_parquet(PROCESSED_DIR / "totalizacao_secao_2026.parquet")
    chave = ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO"]
    o = oficial[chave].copy()
    for campo, partes in CONFERIDOS.items():
        o[f"OF_{campo}"] = oficial[partes].sum(axis=1)
    b = base.merge(o, on=chave, how="left")
    iguais = [(b[c] == b[f"OF_{c}"]) for c in CONFERIDOS]
    b["conf"] = pd.concat(iguais, axis=1).all(axis=1).astype(int)
    return b


def conferencia(b: pd.DataFrame) -> dict:
    campos = ["QT_COMPARECIMENTO", "QT_VALIDOS", "QT_BRANCOS", "QT_NULOS", "V_13", "V_22"]
    nomes = {"QT_COMPARECIMENTO": "comparecimento", "QT_VALIDOS": "validos", "QT_BRANCOS": "brancos",
             "QT_NULOS": "nulos", "V_13": "v13", "V_22": "v22"}

    def linha(g: pd.DataFrame) -> dict:
        return {"secoes": len(g), "conferem": int(g.conf.sum()),
                **{nomes[c]: [int(g[c].sum()), int(g[f"OF_{c}"].sum())] for c in campos}}

    return {
        "fonte": "TSE, Portal de Dados Abertos: detalhe_votacao_secao_2026 e votacao_secao_2026 (Presidente, 1º turno)",
        "campos_conferidos": ["aptos", "comparecimento", "abstenções", "brancos", "nulos (da urna + técnicos)",
                              "votos válidos", "votos de cada um dos 12 candidatos"],
        # cada par é [soma dos boletins, resultado oficial]
        "brasil": linha(b),
        "ufs": [{"uf": uf, "nome": NOMES_UF[uf], **linha(g)} for uf, g in b.groupby("SG_UF")],
    }


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


PERFIL_L1 = {"mulher": "ELEIT_MULHER", "16_24": "ELEIT_16_24", "60_mais": "ELEIT_60_MAIS",
             "ate_fund_inc": "ELEIT_ATE_FUND_INC", "superior": "ELEIT_SUPERIOR"}


def expit(x):
    return 1 / (1 + np.exp(-x))


def explicacao() -> dict | None:
    caminhos = [RESULTADOS / "10_hlm_stepup.json", RESULTADOS / "11_espacial.json"]
    if not all(c.exists() for c in caminhos):
        return None
    stepup, espacial = (json.loads(c.read_text(encoding="utf-8")) for c in caminhos)
    return {"stepup": stepup, "espacial": espacial}


def desvio_perfil(tabela: pd.DataFrame, comp_mun: pd.DataFrame, beta: dict, peso: str = "ELEIT_PERFIL") -> pd.Series:
    """Σ β_dentro · (composição − composição do município), no logit (camada "perfil da seção")."""
    t = tabela.merge(comp_mun, on="CD_MUNICIPIO", how="left")
    d = sum(beta[n] * (t[c] / t[peso] - t[f"mun_{n}"]) for n, c in PERFIL_L1.items())
    return d.where(t[peso] > 0).set_axis(tabela.index)


def composicao_municipal(base: pd.DataFrame) -> pd.DataFrame:
    com = base[base.ELEIT_PERFIL > 0]
    soma = com.groupby("CD_MUNICIPIO")[["ELEIT_PERFIL", *PERFIL_L1.values()]].sum()
    return pd.DataFrame({f"mun_{n}": soma[c] / soma.ELEIT_PERFIL for n, c in PERFIL_L1.items()}).reset_index()


def acrescentar_modelos(base: pd.DataFrame, municipios: pd.DataFrame, exp: dict | None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Camada do perfil por seção e colunas dos modelos 10 e 11 por município (vazias se ainda não rodaram)."""
    if exp is None:
        return base, municipios
    comp = composicao_municipal(base)
    for n in (13, 22):
        beta = exp["stepup"]["candidatos"][str(n)]["camada_perfil"]["beta_dentro"]
        base[f"D_{n}"] = (desvio_perfil(base, comp, beta) * 10_000).round()
    efeitos = pd.read_parquet(PROCESSED_DIR / "efeitos_stepup.parquet").drop(columns="SG_UF")
    espacial = pd.read_parquet(PROCESSED_DIR / "espacial_municipios.parquet")
    m = municipios.merge(efeitos, on="CD_MUNICIPIO", how="left").merge(espacial, on="CD_MUNICIPIO", how="left")
    for n in (13, 22):
        ref, uf, mun = m[f"ref_completo_{n}"], m[f"u_uf_completo_{n}"], m[f"u_mun_completo_{n}"]
        m[f"sp{n}"] = (expit(ref + uf + mun) - expit(ref + uf)).round(4)
        m[f"lisa{n}"] = m[f"lisa_completo_{n}"].astype("Int64")
    m["regiao"] = m.regiao_voto.astype("Int64")
    return base, m


def indice_municipios(base: pd.DataFrame, municipios: pd.DataFrame) -> dict:
    agg = (base.groupby("CD_MUNICIPIO")
           .agg(secoes=("NR_SECAO", "size"), validos=("QT_VALIDOS", "sum"), v13=("V_13", "sum"),
                v22=("V_22", "sum"), zonas=("NR_ZONA", lambda z: sorted(set(int(x) for x in z))))
           .reset_index())
    m = municipios.merge(agg, on="CD_MUNICIPIO")
    m["u13"] = m.u_mun_13.round(4)
    m["u22"] = m.u_mun_22.round(4)
    colunas = ["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO", "SG_UF", "secoes", "validos", "v13", "v22",
               "u13", "u22", "zonas"] + [c for c in ["sp13", "sp22", "lisa13", "lisa22", "regiao"] if c in m.columns]
    return tabela(m[colunas].rename(columns={"CD_MUNICIPIO": "cd", "CD_MUNICIPIO_IBGE": "ibge",
                                              "NM_MUNICIPIO": "nome", "SG_UF": "uf"}))


def exportar_locais(base: pd.DataFrame, locais: pd.DataFrame, municipios: pd.DataFrame, modelos: dict,
                    exp: dict | None) -> int:
    perfil = list(PERFIL_L1.values())
    por_local = (base.groupby(["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
                 .agg(secoes=("NR_SECAO", "size"), validos=("QT_VALIDOS", "sum"),
                      v13=("V_13", "sum"), v22=("V_22", "sum"),
                      ELEIT_PERFIL=("ELEIT_PERFIL", "sum"), **{c: (c, "sum") for c in perfil})
                 .reset_index()
                 .merge(locais.drop(columns="SG_UF"), on=["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"], how="left"))
    extras = []
    if exp is not None:
        comp = composicao_municipal(base)
        u = municipios.set_index("CD_MUNICIPIO")
        for n in (13, 22):
            beta = exp["stepup"]["candidatos"][str(n)]["camada_perfil"]["beta_dentro"]
            g00 = modelos["candidatos"][str(n)]["intercepto"]["logit"]
            efeito = por_local.CD_MUNICIPIO.map(u[f"u_uf_{n}"] + u[f"u_mun_{n}"])
            esperado = expit(g00 + efeito + desvio_perfil(por_local, comp, beta))
            por_local[f"s{n}"] = (por_local[f"v{n}"] / por_local.validos - esperado).round(4)
        extras = ["s13", "s22"]
    colunas = ["NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL", "NM_BAIRRO", "LAT", "LON", "secoes", "validos", "v13", "v22", *extras]
    for cd, grupo in por_local.groupby("CD_MUNICIPIO"):
        gravar(SAIDA / "locais" / f"{cd}.json",
               tabela(grupo[colunas].rename(columns={"NR_ZONA": "zona", "NR_LOCAL_VOTACAO": "local",
                                                     "NM_LOCAL": "nome", "NM_BAIRRO": "bairro",
                                                     "LAT": "lat", "LON": "lon"})))
    return por_local.CD_MUNICIPIO.nunique()


def exportar_zonas(base: pd.DataFrame, locais: pd.DataFrame) -> int:
    colunas = (["NR_SECAO", "NR_LOCAL_VOTACAO", "CD_MUNICIPIO", "QT_APTOS", "QT_COMPARECIMENTO", "QT_VALIDOS",
                "QT_BRANCOS", "QT_NULOS"] + [f"V_{n}" for n in ORDEM_CANDIDATOS] + PERFIL + ["conf"]
               + [c for c in ["D_13", "D_22"] if c in base.columns])
    nomes = {"NR_SECAO": "secao", "NR_LOCAL_VOTACAO": "local", "CD_MUNICIPIO": "cd", "QT_APTOS": "aptos",
             "QT_COMPARECIMENTO": "comparecimento", "QT_VALIDOS": "validos", "QT_BRANCOS": "brancos",
             "QT_NULOS": "nulos", **{c: c.removeprefix("ELEIT_").lower() for c in PERFIL},
             **{f"V_{n}": f"v{n}" for n in ORDEM_CANDIDATOS}, "D_13": "d13", "D_22": "d22"}
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
    base = marcar_conferencia(base)
    gravar(SAIDA / "conferencia.json", conferencia(base))
    exp = explicacao()
    if exp is not None:
        gravar(SAIDA / "explicacao.json", exp)
    base, municipios = acrescentar_modelos(base, municipios, exp)
    gravar(SAIDA / "municipios.json", indice_municipios(base, municipios))
    n_mun = exportar_locais(base, locais, municipios, modelos, exp)
    n_zonas = exportar_zonas(base, locais)
    (SAIDA / "geo").mkdir(parents=True, exist_ok=True)
    shutil.copy(GEO_DIR / "municipios_br_minima.topo.json", SAIDA / "geo" / "municipios.topo.json")
    shutil.copy(GEO_DIR / "ufs_br_minima.topo.json", SAIDA / "geo" / "ufs.topo.json")
    if (GEO_DIR / "regioes_voto.geojson").exists():
        shutil.copy(GEO_DIR / "regioes_voto.geojson", SAIDA / "geo" / "regioes.json")

    arquivos = list(SAIDA.rglob("*.json"))
    tamanho = sum(a.stat().st_size for a in arquivos) / 1e6
    print(f"[ok] {len(arquivos):,} arquivos, {tamanho:,.1f} MB em {SAIDA}")
    print(f"     {n_mun:,} arquivos de locais, {n_zonas:,} arquivos de zona")


if __name__ == "__main__":
    main()
