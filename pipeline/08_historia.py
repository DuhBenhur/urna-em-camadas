"""Números do Entenda e de Método e dados (o jogo de adivinhar, vizinhos, cidades gêmeas), e a "surpresa" de cada urna.

Tudo descritivo, a partir da base por seção, dos efeitos do HLM3 nulo (05) e da malha municipal do IBGE.
Os dois candidatos do 2º turno (Lula, 13, e Flávio Bolsonaro, 22) saem sempre lado a lado.

  adivinhacao  erro médio (p.p.) ao adivinhar o % de uma urna sabendo nada, o estado, o município ou a
               escola. O palpite é o resultado somado das OUTRAS urnas do grupo (a própria fica de fora);
               sem outra urna no grupo, vale o palpite da camada anterior. Avalia urnas com 50+ válidos.
  pares        diferença média entre dois municípios: quaisquer do Brasil, quaisquer do mesmo estado,
               vizinhos com divisa estadual no meio e vizinhos do mesmo estado (contiguidade da malha).
  gemeas       cidades conurbadas separadas por divisa: vizinhas, de UFs diferentes, com o centro dos
               locais de votação a menos de 20 km e 10 mil+ votos válidos cada. Regra fixa, sem escolha a dedo.
               O resumo compara a diferença entre as cidades com a diferença entre os seus estados.
  escolas      diferença entre a urna mais alta e a mais baixa da mesma escola (locais com 4+ urnas).
  contrariam   municípios que mais se afastam do próprio estado (efeito do município do 05, em p.p.),
               entre os que têm 20 mil+ votos válidos.
  surpresa     percentis de |resultado da urna − esperado pelo modelo para o município|, em p.p.:
               a página da urna diz "mais surpreendente que N% das urnas".

Saída: resultados/08_historia.json (versionado; o 07 copia para o site). Precisa de geopandas e
libpysal, por isso roda localmente e não no CI.

Uso: python pipeline/08_historia.py
"""
import json
import warnings

import duckdb
import geopandas as gpd
import numpy as np
import pandas as pd
from libpysal.weights import Queen

from config import GEO_DIR, NOMES_UF, PROCESSED_DIR, ROOT

RESULTADOS = ROOT / "resultados"
CANDIDATOS = (13, 22)
MIN_VALIDOS_URNA = 50
MIN_VALIDOS_GEMEA = 10_000
MIN_VALIDOS_CONTRARIA = 20_000
DIST_GEMEAS_KM = 20
MIN_URNAS_ESCOLA = 4


def carregar() -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    base = duckdb.sql(f"""
        SELECT SG_UF, CD_MUNICIPIO, NM_MUNICIPIO, NR_ZONA, NR_SECAO, NR_LOCAL_VOTACAO, LAT, LON,
               QT_VALIDOS AS validos, V_13, V_22
        FROM '{(PROCESSED_DIR / "base_secao_2026.parquet").as_posix()}'
        WHERE QT_VALIDOS > 0
    """).df()
    municipios = (pd.read_parquet(PROCESSED_DIR / "contexto_municipal.parquet",
                                  columns=["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO"])
                  .merge(pd.read_parquet(PROCESSED_DIR / "blups_hlm3_nulo.parquet"), on="CD_MUNICIPIO"))
    modelos = json.loads((RESULTADOS / "05_hlm_nulo.json").read_text(encoding="utf-8"))
    return base, municipios, modelos


def expit(x):
    return 1 / (1 + np.exp(-x))


def loo(df: pd.DataFrame, grupo: list[str], v: str) -> pd.Series:
    """Resultado somado das outras urnas do grupo; NaN se a urna está sozinha."""
    g = df.groupby(grupo)
    soma_v, soma_val = g[v].transform("sum") - df[v], g["validos"].transform("sum") - df.validos
    return (soma_v / soma_val).where(soma_val > 0)


def adivinhacao(base: pd.DataFrame) -> dict:
    df = base.copy()
    df["escola"] = list(zip(df.CD_MUNICIPIO, df.NR_ZONA, df.NR_LOCAL_VOTACAO))
    saida = {"n_urnas": int((df.validos >= MIN_VALIDOS_URNA).sum())}
    for n in CANDIDATOS:
        v = f"V_{n}"
        real = df[v] / df.validos
        brasil = (df[v].sum() - df[v]) / (df.validos.sum() - df.validos)
        estado = loo(df, ["SG_UF"], v).fillna(brasil)
        municipio = loo(df, ["CD_MUNICIPIO"], v).fillna(estado)
        escola = loo(df, ["escola"], v).fillna(municipio)
        avaliar = df.validos >= MIN_VALIDOS_URNA
        erro = lambda palpite: (real - palpite).abs()[avaliar] * 100
        saida[str(n)] = [
            {"pista": chave, "erro_medio": round(float(erro(p).mean()), 2),
             "ate_5pp": round(float((erro(p) <= 5).mean()), 4)}
            for chave, p in [("nada", brasil), ("estado", estado), ("municipio", municipio), ("escola", escola)]
        ]
    return saida


def diferenca_media_todos_pares(x: np.ndarray) -> tuple[float, int]:
    """Média de |xi − xj| sobre todos os pares, sem montar a matriz: Σ (2i − n − 1)·x(i) com x ordenado."""
    x = np.sort(x)
    n = len(x)
    pares = n * (n - 1) // 2
    return float(np.sum((2 * np.arange(1, n + 1) - n - 1) * x) / pares) if pares else 0.0, pares


def malha_com_votos(base: pd.DataFrame, municipios: pd.DataFrame) -> gpd.GeoDataFrame:
    por_mun = (base.groupby(["CD_MUNICIPIO", "SG_UF"])
               .agg(validos=("validos", "sum"), V_13=("V_13", "sum"), V_22=("V_22", "sum"),
                    lat=("LAT", "median"), lon=("LON", "median"))
               .reset_index()
               .merge(municipios[["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO"]], on="CD_MUNICIPIO"))
    for n in CANDIDATOS:
        por_mun[f"p{n}"] = por_mun[f"V_{n}"] / por_mun.validos
    malha = gpd.read_file(GEO_DIR / "municipios_br_minima.topo.json")
    malha["CD_MUNICIPIO_IBGE"] = malha.codarea.astype(int)
    # Boa Esperança do Norte (MT) não está na malha de 2022: fica fora das comparações entre vizinhos
    return malha.merge(por_mun, on="CD_MUNICIPIO_IBGE").reset_index(drop=True)


def vizinhos(malha: gpd.GeoDataFrame) -> pd.DataFrame:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        w = Queen.from_dataframe(malha, use_index=False, silence_warnings=True)
    pares = pd.DataFrame([(i, j) for i, viz in w.neighbors.items() for j in viz if i < j], columns=["i", "j"])
    for col in ["CD_MUNICIPIO", "NM_MUNICIPIO", "SG_UF", "validos", "lat", "lon", "p13", "p22"]:
        pares[f"{col}_a"] = malha[col].to_numpy()[pares.i]
        pares[f"{col}_b"] = malha[col].to_numpy()[pares.j]
    pares["divisa"] = pares.SG_UF_a != pares.SG_UF_b
    # distância entre os centros dos locais de votação (haversine)
    la, lb = np.radians(pares.lat_a), np.radians(pares.lat_b)
    dlon = np.radians(pares.lon_b - pares.lon_a)
    h = np.sin((lb - la) / 2) ** 2 + np.cos(la) * np.cos(lb) * np.sin(dlon / 2) ** 2
    pares["km"] = 2 * 6371 * np.arcsin(np.sqrt(h))
    return pares


def comparar_pares(malha: gpd.GeoDataFrame, pares: pd.DataFrame) -> dict:
    saida = {"n_municipios": len(malha), "n_vizinhos_divisa": int(pares.divisa.sum()),
             "n_vizinhos_mesmo_estado": int((~pares.divisa).sum())}
    for n in CANDIDATOS:
        p = f"p{n}"
        brasil, _ = diferenca_media_todos_pares(malha[p].to_numpy())
        soma = total = 0
        for _, g in malha.groupby("SG_UF"):
            media, k = diferenca_media_todos_pares(g[p].to_numpy())
            soma, total = soma + media * k, total + k
        dif = (pares[f"{p}_a"] - pares[f"{p}_b"]).abs()
        saida[str(n)] = {k: round(float(v) * 100, 2) for k, v in {
            "quaisquer_brasil": brasil,
            "quaisquer_mesmo_estado": soma / total,
            "vizinhos_divisa": dif[pares.divisa].mean(),
            "vizinhos_mesmo_estado": dif[~pares.divisa].mean(),
        }.items()}
    return saida


def gemeas(pares: pd.DataFrame, base: pd.DataFrame) -> list[dict]:
    por_uf = base.groupby("SG_UF")[["validos", "V_13", "V_22"]].sum()
    sel = pares[pares.divisa & (pares.km < DIST_GEMEAS_KM)
                & (pares.validos_a >= MIN_VALIDOS_GEMEA) & (pares.validos_b >= MIN_VALIDOS_GEMEA)]
    sel = sel.assign(tamanho=sel.validos_a + sel.validos_b).sort_values("tamanho", ascending=False)

    def cidade(r, lado: str) -> dict:
        uf = r[f"SG_UF_{lado}"]
        return {"cd": int(r[f"CD_MUNICIPIO_{lado}"]), "nome": r[f"NM_MUNICIPIO_{lado}"], "uf": uf,
                "validos": int(r[f"validos_{lado}"]),
                **{f"p{n}": round(float(r[f"p{n}_{lado}"]), 4) for n in CANDIDATOS},
                **{f"uf{n}": round(float(por_uf.loc[uf, f"V_{n}"] / por_uf.loc[uf, "validos"]), 4) for n in CANDIDATOS}}

    return [{"km": round(float(r.km), 1), "a": cidade(r, "a"), "b": cidade(r, "b")} for _, r in sel.iterrows()]


def resumo_gemeas(lista: list[dict]) -> dict:
    """Diferença média entre as cidades e entre os seus estados; quantas cidades ficam mais perto da gêmea."""
    saida = {"n_pares": len(lista)}
    for n in CANDIDATOS:
        p, u = f"p{n}", f"uf{n}"
        lados = [(c, t) for g in lista for c, t in ((g["a"], g["b"]), (g["b"], g["a"]))]
        saida[str(n)] = {
            "dif_cidades": round(100 * float(np.mean([abs(g["a"][p] - g["b"][p]) for g in lista])), 2),
            "dif_estados": round(100 * float(np.mean([abs(g["a"][u] - g["b"][u]) for g in lista])), 2),
            "mais_perto_da_gemea": sum(abs(c[p] - t[p]) < abs(c[p] - c[u]) for c, t in lados),
            "n_cidades": len(lados),
        }
    return saida


def escolas(base: pd.DataFrame) -> dict:
    df = base[base.validos >= MIN_VALIDOS_URNA]
    saida = {}
    for n in CANDIDATOS:
        p = df[f"V_{n}"] / df.validos
        g = p.groupby([df.CD_MUNICIPIO, df.NR_ZONA, df.NR_LOCAL_VOTACAO])
        amp = (g.max() - g.min())[g.size() >= MIN_URNAS_ESCOLA] * 100
        saida[str(n)] = {"n_escolas": int(len(amp)), "amplitude_mediana": round(float(amp.median()), 2),
                         "pct_10pp_ou_mais": round(float((amp >= 10).mean()), 4)}
    return saida


def efeitos(base: pd.DataFrame, municipios: pd.DataFrame, modelos: dict) -> tuple[dict, dict]:
    """Municípios que mais contrariam o estado e percentis de surpresa das urnas (mesma conta das camadas do site)."""
    validos_mun = base.groupby("CD_MUNICIPIO")[["validos", "V_13", "V_22"]].sum()
    m = municipios.merge(validos_mun, left_on="CD_MUNICIPIO", right_index=True)
    secoes = base.merge(municipios[["CD_MUNICIPIO", "u_uf_13", "u_mun_13", "u_uf_22", "u_mun_22"]], on="CD_MUNICIPIO")
    contrariam, surpresa = {}, {}
    for n in CANDIDATOS:
        g00 = modelos["candidatos"][str(n)]["intercepto"]["logit"]
        estado = expit(g00 + m[f"u_uf_{n}"])
        m["efeito"] = expit(g00 + m[f"u_uf_{n}"] + m[f"u_mun_{n}"]) - estado
        m["p"] = m[f"V_{n}"] / m.validos
        m["p_uf"] = m.SG_UF.map(base.groupby("SG_UF")[f"V_{n}"].sum() / base.groupby("SG_UF").validos.sum())
        grandes = m[m.validos >= MIN_VALIDOS_CONTRARIA]
        linha = lambda r: {"cd": int(r.CD_MUNICIPIO), "nome": r.NM_MUNICIPIO, "uf": r.SG_UF,
                           "estado": NOMES_UF[r.SG_UF], "efeito": round(float(r.efeito), 4),
                           "p": round(float(r.p), 4), "p_uf": round(float(r.p_uf), 4)}
        contrariam[str(n)] = {"a_favor": [linha(r) for r in grandes.nlargest(5, "efeito").itertuples()],
                              "contra": [linha(r) for r in grandes.nsmallest(5, "efeito").itertuples()]}

        esperado = expit(g00 + secoes[f"u_uf_{n}"] + secoes[f"u_mun_{n}"])
        distancia = (secoes[f"V_{n}"] / secoes.validos - esperado).abs() * 100
        surpresa[str(n)] = [round(float(q), 3) for q in np.quantile(distancia, np.linspace(0, 1, 101))]
    return contrariam, surpresa


def main() -> None:
    base, municipios, modelos = carregar()
    malha = malha_com_votos(base, municipios)
    pares = vizinhos(malha)
    contrariam, surpresa = efeitos(base, municipios, modelos)
    lista_gemeas = gemeas(pares, base)
    historia = {
        "regras": {"min_validos_urna": MIN_VALIDOS_URNA, "min_validos_gemea": MIN_VALIDOS_GEMEA,
                   "dist_gemeas_km": DIST_GEMEAS_KM, "min_urnas_escola": MIN_URNAS_ESCOLA,
                   "min_validos_contraria": MIN_VALIDOS_CONTRARIA},
        "adivinhacao": adivinhacao(base),
        "pares": comparar_pares(malha, pares),
        "gemeas": lista_gemeas,
        "resumo_gemeas": resumo_gemeas(lista_gemeas),
        "escolas": escolas(base),
        "contrariam": contrariam,
        "surpresa": surpresa,
    }
    RESULTADOS.mkdir(exist_ok=True)
    (RESULTADOS / "08_historia.json").write_text(json.dumps(historia, indent=2, ensure_ascii=False), encoding="utf-8")

    for n in CANDIDATOS:
        a = historia["adivinhacao"][str(n)]
        print(f"[{n}] erro ao adivinhar (p.p.): " + " → ".join(f"{x['pista']} {x['erro_medio']:.1f}" for x in a))
        print(f"     pares de municípios (p.p.): {historia['pares'][str(n)]}")
        print(f"     escolas: {historia['escolas'][str(n)]}")
    print(f"[ok] {len(lista_gemeas)} pares de cidades gêmeas: {historia['resumo_gemeas']}")
    print("[ok] resultados/08_historia.json")


if __name__ == "__main__":
    main()
