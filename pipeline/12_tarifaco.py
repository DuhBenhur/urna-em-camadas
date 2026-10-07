"""Exposição ao tarifaço dos EUA e o voto de 2026: extensão do step-up (registrada depois do desenho do 10).

Fonte: API do Comex Stat (MDIC), exportações de 2024, o ano anterior ao anúncio das tarifas de 50% sobre produtos
brasileiros (julho de 2025), por município do exportador: para os Estados Unidos (país 249) e para todos os destinos.
As respostas da API ficam guardadas em RAW_DIR, para a conta poder ser refeita sem a internet.

A API identifica o município por "Nome - UF"; o código dela não é o do IBGE em todos os estados (Goiás e Distrito
Federal trocam o prefixo). Os nomes são casados com a tabela TSE ↔ IBGE, sem acento e sem caixa.

Medida: exportações para os EUA por habitante (US$ de 2024), em log(1 + x). Municípios sem exportação para os EUA
ficam com zero. Também a parcela das exportações do município que foi para os EUA.

Modelo: o modelo de efeitos do 10 (perfil da seção, índices socioeconômico e de escolaridade, cor ou raça, religião,
urbanização e região) mais a exposição. LRT contra o modelo sem ela, efeito de +1 desvio-padrão em p.p. e quanto a
variância do estado e do município cai a mais. Associação entre lugares, medida antes do tarifaço: nada causal.

Saídas:
  data/processed/exposicao_tarifaco.parquet   exposição de cada município
  resultados/12_tarifaco.json

Uso: python pipeline/12_tarifaco.py [--sem-internet]
"""
import importlib.util
import json
import sys
import unicodedata
import urllib.request

import numpy as np
import pandas as pd
from scipy import stats

from config import PROCESSED_DIR, RAW_DIR, ROOT

RESULTADOS = ROOT / "resultados"
API = "https://api-comexstat.mdic.gov.br/cities"
PAIS_EUA = 249
ANO = 2024


def consultar(filtros: list) -> list[dict]:
    corpo = {"flow": "export", "monthDetail": False, "period": {"from": f"{ANO}-01", "to": f"{ANO}-12"},
             "filters": filtros, "details": ["city"], "metrics": ["metricFOB"]}
    req = urllib.request.Request(API, data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read())["data"]["list"]


def exportacoes(sem_internet: bool) -> pd.DataFrame:
    """Exportações de 2024 por município: para os EUA e no total (respostas da API guardadas em RAW_DIR)."""
    tabelas = {}
    for nome, filtros in [("eua", [{"filter": "country", "values": [PAIS_EUA]}]), ("total", [])]:
        cache = RAW_DIR / f"comexstat_exportacao_municipio_{ANO}_{nome}.json"
        if not cache.exists():
            if sem_internet:
                sys.exit(f"[erro] {cache.name} não existe e --sem-internet foi pedido")
            cache.write_text(json.dumps(consultar(filtros), ensure_ascii=False), encoding="utf-8")
        lista = json.loads(cache.read_text(encoding="utf-8"))
        tabelas[nome] = pd.DataFrame(lista).assign(fob=lambda d: d.metricFOB.astype(float))[["noMunMinsgUf", "fob"]]
    return tabelas["total"].rename(columns={"fob": "fob_total"}).merge(
        tabelas["eua"].rename(columns={"fob": "fob_eua"}), on="noMunMinsgUf", how="left").fillna({"fob_eua": 0.0})


def chave(nome: str, uf: str) -> str:
    sem_acento = unicodedata.normalize("NFD", nome).encode("ascii", "ignore").decode().lower()
    return "".join(c for c in sem_acento if c.isalnum()) + "|" + uf.upper()


def exposicao(sem_internet: bool) -> tuple[pd.DataFrame, dict]:
    exp = exportacoes(sem_internet)
    partes = exp.noMunMinsgUf.str.rsplit(" - ", n=1, expand=True)
    exp["k"] = [chave(n, u) for n, u in zip(partes[0], partes[1])]
    ctx = pd.read_parquet(PROCESSED_DIR / "contexto_municipal.parquet", columns=["CD_MUNICIPIO", "NM_MUNICIPIO", "SG_UF", "pop_2022"])
    ctx["k"] = [chave(n, u) for n, u in zip(ctx.NM_MUNICIPIO, ctx.SG_UF)]
    casados = exp.merge(ctx[["k", "CD_MUNICIPIO"]], on="k", how="left")
    sem_par = casados[casados.CD_MUNICIPIO.isna()]
    m = ctx.merge(casados.dropna(subset=["CD_MUNICIPIO"])[["CD_MUNICIPIO", "fob_eua", "fob_total"]], on="CD_MUNICIPIO", how="left")
    m[["fob_eua", "fob_total"]] = m[["fob_eua", "fob_total"]].fillna(0.0)
    m["eua_por_habitante"] = m.fob_eua / m.pop_2022
    m["log_eua_pc"] = np.log1p(m.eua_por_habitante)
    m["parcela_eua"] = (m.fob_eua / m.fob_total).where(m.fob_total > 0)
    resumo = {"municipios_api": len(exp), "sem_par": len(sem_par), "fob_sem_par_pct": float(sem_par.fob_total.sum() / exp.fob_total.sum()),
              "municipios_exportam_eua": int((m.fob_eua > 0).sum()), "fob_eua_total_usd": float(m.fob_eua.sum()),
              "nomes_sem_par": sem_par.noMunMinsgUf.head(20).tolist()}
    return m[["CD_MUNICIPIO", "fob_eua", "fob_total", "eua_por_habitante", "log_eua_pc", "parcela_eua"]], resumo


def main() -> None:
    sem_internet = "--sem-internet" in sys.argv
    tabela, resumo = exposicao(sem_internet)
    tabela.to_parquet(PROCESSED_DIR / "exposicao_tarifaco.parquet", index=False)
    print(f"[ok] exposição: {resumo['municipios_exportam_eua']:,} municípios exportaram para os EUA em {ANO}; "
          f"{resumo['sem_par']} nomes da API sem par ({resumo['fob_sem_par_pct']:.2%} do valor exportado)", flush=True)

    # o modelo de efeitos do 10, com a exposição a mais
    spec = importlib.util.spec_from_file_location("m10", ROOT / "pipeline" / "10_hlm_stepup.py")
    m10 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m10)
    df = m10.carregar().merge(tabela[["CD_MUNICIPIO", "log_eua_pc"]], on="CD_MUNICIPIO", how="left")
    mun = df.drop_duplicates("CD_MUNICIPIO")
    df["z_tarifaco"] = (df.log_eua_pc - mun.log_eua_pc.mean()) / mun.log_eua_pc.std()  # cada município pesa igual
    base = m10.EFEITOS + m10.DUMMIES_REGIAO
    saida = {"ano_exportacoes": ANO, "fonte": "API do Comex Stat (MDIC), exportações por município do exportador",
             "medida": "log(1 + exportações para os EUA por habitante, US$)", **resumo, "candidatos": {}}
    for n in m10.CANDIDATOS:
        y = m10.logit_empirico(df[f"V_{n}"], df.validos)
        share = (df[f"V_{n}"] / df.validos).to_numpy()
        fator = float(np.mean(share * (1 - share))) * 100
        aj = m10.Ajustes(df, y)
        nulo = aj.componentes(frozenset())
        modelos = {}
        for rotulo, cols in [("sem", base), ("com", base + ["z_tarifaco"])]:
            mod = aj.ajustar(cols)
            cp = np.asarray(mod.get_cov_pars()).ravel()
            modelos[rotulo] = {"uf": float(cp[1]), "mun": float(cp[2]), "loglik": float(-mod.get_current_neg_log_likelihood()),
                               "coef": m10.coeficientes(mod, cols)}
        c = modelos["com"]["coef"].loc["z_tarifaco"]
        lr = max(2 * (modelos["com"]["loglik"] - modelos["sem"]["loglik"]), 0.0)
        saida["candidatos"][str(n)] = {
            "efeito_pp": float(c.coef * fator),
            "ic_pp": [float((c.coef - 1.96 * c.ep) * fator), float((c.coef + 1.96 * c.ep) * fator)],
            "LR": lr, "p": float(stats.chi2.sf(lr, 1)),
            "queda_extra_uf": (modelos["sem"]["uf"] - modelos["com"]["uf"]) / nulo["uf"],
            "queda_extra_mun": (modelos["sem"]["mun"] - modelos["com"]["mun"]) / nulo["mun"],
        }
        r = saida["candidatos"][str(n)]
        print(f"  {n}: +1 DP de exposição → {r['efeito_pp']:+.2f} p.p. [{r['ic_pp'][0]:+.2f}, {r['ic_pp'][1]:+.2f}], "
              f"LR {r['LR']:.1f} (p {r['p']:.2g}); variância do estado cai {r['queda_extra_uf']:+.1%} a mais, "
              f"do município {r['queda_extra_mun']:+.1%}", flush=True)
    RESULTADOS.mkdir(exist_ok=True)
    (RESULTADOS / "12_tarifaco.json").write_text(json.dumps(saida, indent=2, ensure_ascii=False), encoding="utf-8")
    print("[ok] resultados/12_tarifaco.json e data/processed/exposicao_tarifaco.parquet")


if __name__ == "__main__":
    main()
