"""Análise espacial: os vizinhos se parecem além do que estado, município e perfil explicam?

Para Lula (13) e Flávio (22), sobre os efeitos dos municípios do 05 (nulo) e do 10 (completo):

  Moran / LISA   autocorrelação espacial (contiguidade da malha do IBGE; ilhas ligadas ao vizinho mais próximo)
                 e bolsões de municípios vizinhos acima ou abaixo do esperado (LISA, 999 permutações, p < 0,05)
  regiões        SKATER (spopt): 27 regiões contíguas desenhadas só pelo voto, comparadas com os 27 estados.
                 Quanto da variação entre municípios cada recorte explica?
  degrau x gradiente
                 modelo municipal com efeito do estado + processo gaussiano nas coordenadas: quanto da variância
                 do estado sobra quando o mapa pode variar de forma suave (a divisa como degrau)
  São Paulo      "surpresa" de cada local de votação (resultado − esperado pelo município e pelo perfil das
                 seções) e LISA entre locais vizinhos (8 mais próximos)

Saídas:
  resultados/11_espacial.json
  data/processed/espacial_municipios.parquet   LISA e região de voto de cada município
  data/geo/regioes_voto.geojson                contorno das regiões de voto (municípios fundidos, simplificado)

Uso: python pipeline/11_espacial.py
"""
import json
import time
import warnings

import duckdb
import geopandas as gpd
import gpboost as gpb
import numpy as np
import pandas as pd
from esda.moran import Moran, Moran_Local
from libpysal.weights import KNN, Queen, attach_islands

from config import COD_MUN_SP, GEO_DIR, PROCESSED_DIR, ROOT

warnings.filterwarnings("ignore")
RESULTADOS = ROOT / "resultados"
CANDIDATOS = (13, 22)
PERMUTACOES = 999
ALFA = 0.05
N_REGIOES = 27  # o mesmo número de estados, para comparar recortes de igual tamanho
CLASSES_LISA = {0: "sem padrão", 1: "alto cercado de alto", 2: "baixo cercado de alto", 3: "baixo cercado de baixo",
                4: "alto cercado de baixo"}


def expit(x):
    return 1 / (1 + np.exp(-x))


def municipios() -> gpd.GeoDataFrame:
    # a API de malhas do IBGE devolve SIRGAS 2000 geográfico; o TopoJSON não carrega o CRS
    malha = gpd.read_file(GEO_DIR / "municipios_br_minima.topo.json").set_crs(4674, allow_override=True)
    malha["CD_MUNICIPIO_IBGE"] = malha.codarea.astype(int)
    ctx = pd.read_parquet(PROCESSED_DIR / "contexto_municipal.parquet", columns=["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "SG_UF"])
    votos = duckdb.sql(f"""
        SELECT CD_MUNICIPIO, sum(QT_VALIDOS) AS validos, sum(V_13) AS V_13, sum(V_22) AS V_22
        FROM '{(PROCESSED_DIR / "base_secao_2026.parquet").as_posix()}' GROUP BY 1
    """).df()
    efeitos = pd.read_parquet(PROCESSED_DIR / "efeitos_stepup.parquet").drop(columns="SG_UF")
    g = (malha.merge(ctx, on="CD_MUNICIPIO_IBGE").merge(votos, on="CD_MUNICIPIO").merge(efeitos, on="CD_MUNICIPIO")
         .reset_index(drop=True))
    for n in CANDIDATOS:
        g[f"p{n}"] = g[f"V_{n}"] / g.validos
    # coordenadas em km (SIRGAS 2000 / Brazil Polyconic) para o processo gaussiano
    centro = g.to_crs(5880).geometry.centroid
    g["x_km"], g["y_km"] = centro.x / 1000, centro.y / 1000
    return g


def pesos(g: gpd.GeoDataFrame):
    w = Queen.from_dataframe(g, use_index=False, silence_warnings=True)
    ilhas = list(w.islands)
    if ilhas:  # municípios sem vizinho na malha (ilhas oceânicas): ligados ao centro mais próximo
        w = attach_islands(w, KNN.from_array(g[["x_km", "y_km"]].to_numpy(), k=1))
    w.transform = "r"
    return w, ilhas


def lisa(valores: np.ndarray, w) -> np.ndarray:
    lm = Moran_Local(valores, w, permutations=PERMUTACOES, seed=2026)
    return np.where(lm.p_sim < ALFA, lm.q, 0)


def variancia_explicada(valores: np.ndarray, grupos: np.ndarray) -> float:
    """R² de um recorte: parte da variância entre municípios que fica entre os grupos."""
    s = pd.Series(valores)
    return float(1 - ((s - s.groupby(grupos).transform("mean")) ** 2).sum() / ((s - s.mean()) ** 2).sum())


def regioes_skater(g: gpd.GeoDataFrame, w) -> np.ndarray:
    from spopt.region import Skater
    attrs = ["z13", "z22"]
    g = g.assign(z13=(g.p13 - g.p13.mean()) / g.p13.std(), z22=(g.p22 - g.p22.mean()) / g.p22.std())
    modelo = Skater(g, w, attrs, n_clusters=N_REGIOES, floor=10, trace=False, islands="increase")
    modelo.solve()
    return np.asarray(modelo.labels_)


def degrau_gradiente(g: gpd.GeoDataFrame, n: int) -> dict:
    """Modelo municipal: efeito do estado, com e sem um processo gaussiano espacial (exponencial)."""
    y = np.log((g[f"V_{n}"] + 0.5) / (g.validos - g[f"V_{n}"] + 0.5)).to_numpy()
    uf = g.SG_UF.to_numpy()
    X = np.ones((len(g), 1))
    so_uf = gpb.GPModel(group_data=uf, likelihood="gaussian")
    so_uf.fit(y=y, X=X)
    cp0 = np.asarray(so_uf.get_cov_pars()).ravel()
    com_gp = gpb.GPModel(group_data=uf, gp_coords=g[["x_km", "y_km"]].to_numpy(), cov_function="exponential",
                         likelihood="gaussian")
    com_gp.fit(y=y, X=X)
    cp1 = np.asarray(com_gp.get_cov_pars()).ravel()  # erro, UF, variância do GP, alcance (km)
    return {"sem_gp": {"erro": float(cp0[0]), "uf": float(cp0[1])},
            "com_gp": {"erro": float(cp1[0]), "uf": float(cp1[1]), "gp": float(cp1[2]), "alcance_km": float(cp1[3])},
            "queda_uf": float(1 - cp1[1] / cp0[1]),
            "loglik": {"sem_gp": float(-so_uf.get_current_neg_log_likelihood()),
                       "com_gp": float(-com_gp.get_current_neg_log_likelihood())}}


def sao_paulo(resultados_10: dict) -> dict:
    """Surpresa de cada local de votação da capital e bolsões entre locais vizinhos."""
    secoes = duckdb.sql(f"""
        SELECT NR_ZONA, NR_LOCAL_VOTACAO, LAT, LON, QT_VALIDOS AS validos, V_13, V_22, ELEIT_PERFIL,
               ELEIT_MULHER, ELEIT_16_24, ELEIT_60_MAIS, ELEIT_ATE_FUND_INC, ELEIT_SUPERIOR
        FROM '{(PROCESSED_DIR / "base_secao_2026.parquet").as_posix()}'
        WHERE CD_MUNICIPIO = {COD_MUN_SP} AND QT_VALIDOS > 0 AND ELEIT_PERFIL > 0
    """).df()
    perfil = ["ELEIT_MULHER", "ELEIT_16_24", "ELEIT_60_MAIS", "ELEIT_ATE_FUND_INC", "ELEIT_SUPERIOR"]
    nomes = ["mulher", "16_24", "60_mais", "ate_fund_inc", "superior"]
    locais = secoes.groupby(["NR_ZONA", "NR_LOCAL_VOTACAO"]).agg(
        lat=("LAT", "first"), lon=("LON", "first"), validos=("validos", "sum"), V_13=("V_13", "sum"), V_22=("V_22", "sum"),
        perfil=("ELEIT_PERFIL", "sum"), **{n: (c, "sum") for n, c in zip(nomes, perfil)}).reset_index()
    locais = locais[(locais.lat.between(-24.1, -23.3)) & (locais.lon.between(-47.0, -46.3))].reset_index(drop=True)
    comp_mun = secoes[perfil].sum() / secoes.ELEIT_PERFIL.sum()
    # efeitos do nulo ajustado no 10 (mesma amostra do intercepto g00_nulo)
    efeitos = pd.read_parquet(PROCESSED_DIR / "efeitos_stepup.parquet").set_index("CD_MUNICIPIO").loc[COD_MUN_SP]
    xy = np.c_[locais.lon * 101.9, locais.lat * 111.0]  # km aproximados na latitude da capital
    w = KNN.from_array(xy, k=8)
    w.transform = "r"
    saida = {"n_locais": len(locais)}
    for n in CANDIDATOS:
        c = resultados_10["candidatos"][str(n)]["camada_perfil"]
        desvio = sum(c["beta_dentro"][nm] * (locais[nm] / locais.perfil - comp_mun[col]) for nm, col in zip(nomes, perfil))
        esperado = expit(c["g00_nulo"] + efeitos[f"u_uf_nulo_{n}"] + efeitos[f"u_mun_nulo_{n}"] + desvio)
        surpresa = (locais[f"V_{n}"] / locais.validos - esperado).to_numpy()
        m = Moran(surpresa, w, permutations=PERMUTACOES)
        classes = lisa(surpresa, w)
        saida[str(n)] = {"moran_I": float(m.I), "p": float(m.p_sim),
                         "lisa": {CLASSES_LISA[k]: int((classes == k).sum()) for k in CLASSES_LISA},
                         "surpresa_dp_pp": float(surpresa.std() * 100)}
    return saida


def main() -> None:
    t0 = time.time()
    g = municipios()
    w, ilhas = pesos(g)
    print(f"{len(g):,} municípios na malha; {len(ilhas)} ilhas ligadas ao vizinho mais próximo; {time.time() - t0:.0f}s", flush=True)
    resultados_10 = json.loads((RESULTADOS / "10_hlm_stepup.json").read_text(encoding="utf-8"))
    saida = {"n_municipios": len(g), "ilhas": [g.CD_MUNICIPIO[i].item() for i in ilhas], "permutacoes": PERMUTACOES,
             "alfa": ALFA, "classes_lisa": CLASSES_LISA, "candidatos": {}}
    espacial = g[["CD_MUNICIPIO"]].copy()
    for n in CANDIDATOS:
        r = {}
        for rotulo, coluna in [("nulo", f"u_mun_nulo_{n}"), ("completo", f"u_mun_completo_{n}")]:
            m = Moran(g[coluna].to_numpy(), w, permutations=PERMUTACOES)
            classes = lisa(g[coluna].to_numpy(), w)
            espacial[f"lisa_{rotulo}_{n}"] = classes
            r[rotulo] = {"moran_I": float(m.I), "p": float(m.p_sim),
                         "lisa": {CLASSES_LISA[k]: int((classes == k).sum()) for k in CLASSES_LISA}}
        r["degrau_gradiente"] = degrau_gradiente(g, n)
        saida["candidatos"][str(n)] = r
        print(f"  {n}: Moran nulo {r['nulo']['moran_I']:.2f}, completo {r['completo']['moran_I']:.2f}; "
              f"GP tira {r['degrau_gradiente']['queda_uf']:.0%} da variância do estado; {time.time() - t0:.0f}s", flush=True)

    rotulos = regioes_skater(g, w)
    espacial["regiao_voto"] = rotulos
    contornos = (g.assign(regiao=rotulos)[["regiao", "geometry"]].dissolve(by="regiao").reset_index()
                 .assign(geometry=lambda d: d.geometry.simplify(0.02)))
    (GEO_DIR / "regioes_voto.geojson").write_text(contornos.to_crs(4326).to_json(drop_id=True), encoding="utf-8")
    logit = {n: np.log(g[f"p{n}"] / (1 - g[f"p{n}"])).to_numpy() for n in CANDIDATOS}
    saida["regioes"] = {
        "n": N_REGIOES,
        **{str(n): {"r2_regioes": variancia_explicada(logit[n], rotulos), "r2_estados": variancia_explicada(logit[n], g.SG_UF.to_numpy())}
           for n in CANDIDATOS},
        # estados cortados por cada região de voto: mostra se as regiões atravessam divisas
        "estados_por_regiao": pd.Series(g.SG_UF.to_numpy()).groupby(rotulos).nunique().describe()[["mean", "max"]].to_dict(),
    }
    print(f"  SKATER ({N_REGIOES} regiões): {saida['regioes']}; {time.time() - t0:.0f}s", flush=True)

    saida["sao_paulo"] = sao_paulo(resultados_10)
    print(f"  São Paulo: {saida['sao_paulo']}; {time.time() - t0:.0f}s", flush=True)

    (RESULTADOS / "11_espacial.json").write_text(json.dumps(saida, indent=2, ensure_ascii=False), encoding="utf-8")
    espacial.to_parquet(PROCESSED_DIR / "espacial_municipios.parquet", index=False)
    print("[ok] resultados/11_espacial.json e data/processed/espacial_municipios.parquet")


if __name__ == "__main__":
    main()
