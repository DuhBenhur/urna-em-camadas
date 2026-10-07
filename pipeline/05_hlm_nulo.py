"""Step-up, modelos nulos: OLS nulo → HLM2 nulo (seção em UF) → HLM3 nulo (seção em município em UF).

Y = logit empírico da proporção de votos do candidato nos válidos da seção (1º turno 2026).
Roda para os dois candidatos do 2º turno (Lula, 13, e Flávio Bolsonaro, 22), para o site não
decompor só o voto de um lado.

Cada passo acrescenta um componente de variância. O teste de razão de verossimilhança usa a
mistura ½χ²₀ + ½χ²₁, porque a variância testada está na fronteira do espaço de parâmetros.

Motor: gpboost (estimação por ML, álgebra esparsa; o HLM3 nacional leva segundos).
Com --statsmodels, reajusta o modelo do Lula com o MixedLM do statsmodels (~10 min) e compara.
Validação feita em 07/10/2026: ML do HLM3 nulo (Lula) −225.328,4 (gpboost) x −225.328,8 (statsmodels).

Saídas:
  resultados/05_hlm_nulo.json             por candidato: log-verossimilhanças, testes, variâncias, ICC
  data/processed/blups_hlm3_nulo.parquet  efeitos aleatórios de UF e município por candidato

Limitação: nenhum dos dois motores pondera as seções aqui, então toda seção pesa igual
(o tamanho varia pouco: em geral de 200 a 450 eleitores).

Uso: python pipeline/05_hlm_nulo.py [--statsmodels]
"""
import json
import sys
import time

import duckdb
import gpboost as gpb
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

from config import CANDIDATOS_PRESIDENTE, PROCESSED_DIR, ROOT

RESULTADOS = ROOT / "resultados"
CANDIDATOS = (13, 22)


def carregar() -> pd.DataFrame:
    votos = ", ".join(f"V_{n}" for n in CANDIDATOS)
    return duckdb.sql(f"""
        SELECT SG_UF, CD_MUNICIPIO, QT_VALIDOS AS validos, {votos}
        FROM '{(PROCESSED_DIR / "base_secao_2026.parquet").as_posix()}'
        WHERE QT_VALIDOS > 0
    """).df()


def logit_empirico(votos: pd.Series, validos: pd.Series) -> np.ndarray:
    # a correção de 0,5 evita log(0) em seções com 0% ou 100%
    return np.log((votos + 0.5) / (validos - votos + 0.5)).to_numpy()


def lrt_fronteira(llf_restrito: float, llf_completo: float) -> tuple[float, float]:
    """LRT para um componente de variância a mais: p = ½·P(χ²₁ > LR)."""
    lr = max(2 * (llf_completo - llf_restrito), 0.0)
    return lr, 0.5 * stats.chi2.sf(lr, 1)


def ajustar(df: pd.DataFrame, y: np.ndarray, niveis: list[str]) -> gpb.GPModel:
    t = time.time()
    m = gpb.GPModel(group_data=df[niveis].astype(str).to_numpy(), likelihood="gaussian")
    m.fit(y=y, X=np.ones((len(y), 1)))
    print(f"    HLM{len(niveis) + 1} nulo ({' + '.join(niveis)}): {time.time() - t:.1f}s", flush=True)
    return m


def validar_statsmodels(df: pd.DataFrame, y: np.ndarray, llf_gpboost: float) -> dict:
    t = time.time()
    r = smf.mixedlm("y ~ 1", df.assign(y=y), groups="SG_UF", re_formula="1",
                    vc_formula={"mun": "0 + C(CD_MUNICIPIO)"}).fit(reml=False, method="lbfgs")
    print(f"    statsmodels HLM3 nulo (ML): {time.time() - t:.0f}s, llf = {r.llf:,.1f}", flush=True)
    return {"loglik_statsmodels": r.llf, "loglik_gpboost": llf_gpboost, "diferenca": r.llf - llf_gpboost}


def modelar(df: pd.DataFrame, numero: int) -> tuple[dict, pd.DataFrame]:
    y = logit_empirico(df[f"V_{numero}"], df.validos)
    llf_ols = smf.ols("y ~ 1", pd.DataFrame({"y": y})).fit().llf
    hlm2 = ajustar(df, y, ["SG_UF"])
    hlm3 = ajustar(df, y, ["SG_UF", "CD_MUNICIPIO"])
    llf_2, llf_3 = -hlm2.get_current_neg_log_likelihood(), -hlm3.get_current_neg_log_likelihood()
    lr_2, p_2 = lrt_fronteira(llf_ols, llf_2)
    lr_3, p_3 = lrt_fronteira(llf_2, llf_3)

    cov = hlm3.get_cov_pars().iloc[0]  # Error_term, Group_1 (UF), Group_2 (município)
    var_secao, var_uf, var_mun = float(cov.iloc[0]), float(cov.iloc[1]), float(cov.iloc[2])
    total = var_uf + var_mun + var_secao
    intercepto = float(hlm3.get_coef().iloc[0, 0])
    resultado = {
        "candidato": CANDIDATOS_PRESIDENTE[numero],
        "estimacao": "ML (gpboost)",
        "loglik": {"OLS nulo": llf_ols, "HLM2 nulo": llf_2, "HLM3 nulo": llf_3},
        "lrt": {"OLS → HLM2": {"LR": lr_2, "p": p_2}, "HLM2 → HLM3": {"LR": lr_3, "p": p_3}},
        "variancias": {"UF": var_uf, "município": var_mun, "seção": var_secao},
        "icc": {"UF": var_uf / total, "município": var_mun / total, "seção": var_secao / total},
        # correlação esperada entre duas seções do mesmo município (UF + município)
        "icc_mesmo_municipio": (var_uf + var_mun) / total,
        "intercepto": {"logit": intercepto, "proporcao": float(1 / (1 + np.exp(-intercepto)))},
    }
    if numero == 13 and "--statsmodels" in sys.argv:
        resultado["validacao_statsmodels"] = validar_statsmodels(df, y, llf_3)

    # BLUPs: um valor por observação para cada nível; fica um por município
    re = hlm3.predict_training_data_random_effects()
    blups = pd.DataFrame({"CD_MUNICIPIO": df.CD_MUNICIPIO.to_numpy(),
                          f"u_uf_{numero}": re.iloc[:, 0].to_numpy(),
                          f"u_mun_{numero}": re.iloc[:, 1].to_numpy()}).drop_duplicates("CD_MUNICIPIO")
    return resultado, blups


def main() -> None:
    RESULTADOS.mkdir(exist_ok=True)
    df = carregar()
    print(f"{len(df):,} seções, {df.CD_MUNICIPIO.nunique():,} municípios, {df.SG_UF.nunique()} UFs", flush=True)

    resultados = {"n_secoes": len(df), "n_municipios": int(df.CD_MUNICIPIO.nunique()),
                  "n_ufs": int(df.SG_UF.nunique()), "candidatos": {}}
    blups = df[["SG_UF", "CD_MUNICIPIO"]].drop_duplicates("CD_MUNICIPIO")
    for numero in CANDIDATOS:
        print(f"  {CANDIDATOS_PRESIDENTE[numero]} ({numero})", flush=True)
        resultado, b = modelar(df, numero)
        resultados["candidatos"][str(numero)] = resultado
        blups = blups.merge(b, on="CD_MUNICIPIO")
        print(f"    ICC: " + ", ".join(f"{k} {v:.1%}" for k, v in resultado["icc"].items()), flush=True)

    (RESULTADOS / "05_hlm_nulo.json").write_text(json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8")
    blups.reset_index(drop=True).to_parquet(PROCESSED_DIR / "blups_hlm3_nulo.parquet", index=False)
    print(f"BLUPs: {len(blups):,} municípios")


if __name__ == "__main__":
    main()
