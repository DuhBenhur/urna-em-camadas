"""Step-up: composição (perfil da seção) ou contexto (município, estado)? Modelos explicativos com gpboost.

Desenho fixado em docs/plano_de_analise.md (07/10/2026) antes dos resultados. Para Lula (13) e Flávio (22):

  sequência   M0 nulo → M1 perfil da seção → M2 + perfil do município → M3 + região, com LRT (ML) e a queda
              da variância de cada nível em relação ao nulo
  Shapley     queda da variância do estado e do município repartida entre 7 blocos, na média de todas as
              ordens de entrada (128 modelos), com e sem o bloco de região
  efeitos     modelo completo com renda, PIB e Bolsa Família num índice (1º componente principal, porque
              andam juntos: r = −0,91) e a escolaridade da seção num índice (% superior − % até o fundamental
              incompleto, r = −0,67 entre os dois); efeito de +1 desvio-padrão em p.p. para uma urna típica
  Mundlak     variáveis da seção centradas no município + médias do município: efeito dentro da cidade
              (composição) x entre cidades (contexto). A versão completa (5 variáveis, com o contexto
              municipal) dá os coeficientes "dentro" da camada "perfil da seção" da página da urna; a versão
              simples (idade, sexo, índice de escolaridade e região) é a que o site mostra
  4 níveis    nulo com seção < local de votação < município < UF
  inclinação  índice de escolaridade com efeito aleatório por UF (LRT com correção de fronteira) e
              interações escolaridade × região e escolaridade × índice socioeconômico
  robustez    mesma decomposição na escala de proporção (em vez do logit) e só seções com 100+ válidos.
              A verossimilhança binomial do gpboost não saiu dos valores iniciais nesta escala: descartada
  bootstrap   (--bootstrap B) reamostra os 27 estados: intervalos das quedas de variância e dos efeitos

Y = logit empírico da proporção de votos do candidato nos válidos da seção, como no 05.
Fora: 389 seções sem perfil do eleitorado e Boa Esperança do Norte (MT), sem dados do Censo.

Saídas:
  resultados/10_hlm_stepup.json             tudo o que o site e o notebook usam
  data/processed/efeitos_stepup.parquet     efeito do estado e do município por modelo (nulo, perfis, completo)

Uso: python pipeline/10_hlm_stepup.py [--bootstrap 100]
"""
import json
import sys
import time
from itertools import combinations
from math import factorial

import duckdb
import gpboost as gpb
import numpy as np
import pandas as pd
from scipy import stats

from config import CANDIDATOS_PRESIDENTE, PROCESSED_DIR, ROOT

RESULTADOS = ROOT / "resultados"
CANDIDATOS = (13, 22)
MIN_VALIDOS_ROBUSTEZ = 100

# perfil do eleitorado da seção (TSE): proporção do eleitorado cadastrado
L1 = {"mulher": "ELEIT_MULHER", "16_24": "ELEIT_16_24", "60_mais": "ELEIT_60_MAIS",
      "ate_fund_inc": "ELEIT_ATE_FUND_INC", "superior": "ELEIT_SUPERIOR"}
MUNICIPAIS = ["log_renda", "log_pib", "pct_pbf", "pct_preta_parda", "pct_evangelicos", "pct_urbana"]
REGIOES = {"N": "AC AM AP PA RO RR TO", "NE": "AL BA CE MA PB PE PI RN SE", "CO": "DF GO MS MT",
           "SE": "ES MG RJ SP", "S": "PR RS SC"}
DUMMIES_REGIAO = ["reg_N", "reg_NE", "reg_CO", "reg_S"]  # Sudeste é a referência

BLOCOS = {
    "idade_sexo": ["z_mulher", "z_16_24", "z_60_mais"],
    "escolaridade": ["z_ate_fund_inc", "z_superior"],
    "renda_economia": ["z_log_renda", "z_log_pib", "z_pct_pbf"],
    "cor_raca": ["z_pct_preta_parda"],
    "religiao": ["z_pct_evangelicos"],
    "urbanizacao": ["z_pct_urbana"],
    "regiao": DUMMIES_REGIAO,
}
ROTULOS = {"idade_sexo": "Idade e sexo do eleitorado da seção", "escolaridade": "Escolaridade do eleitorado da seção",
           "renda_economia": "Renda e economia do município", "cor_raca": "Cor ou raça no município",
           "religiao": "Religião no município", "urbanizacao": "Urbanização do município", "regiao": "Região"}
SECAO = ["idade_sexo", "escolaridade"]
MUNICIPIO = ["renda_economia", "cor_raca", "religiao", "urbanizacao"]

# modelo de efeitos: o bloco de renda vira um índice (as três variáveis andam juntas)
EFEITOS = ["z_mulher", "z_16_24", "z_60_mais", "z_escol",
           "z_socio", "z_pct_preta_parda", "z_pct_evangelicos", "z_pct_urbana"]
ROTULOS_EFEITOS = {"z_mulher": "% mulheres na seção", "z_16_24": "% de 16 a 24 anos na seção",
                   "z_60_mais": "% de 60 anos ou mais na seção", "z_escol": "Escolaridade do eleitorado da seção",
                   "z_socio": "Nível socioeconômico do município",
                   "z_pct_preta_parda": "% pretos e pardos no município", "z_pct_evangelicos": "% evangélicos no município",
                   "z_pct_urbana": "% urbana do município"}


def expit(x):
    return 1 / (1 + np.exp(-x))


def logit_empirico(votos, validos) -> np.ndarray:
    return np.log((votos + 0.5) / (validos - votos + 0.5)).to_numpy()


def carregar() -> pd.DataFrame:
    perfil = ", ".join(L1.values())
    df = duckdb.sql(f"""
        SELECT SG_UF, CD_MUNICIPIO, NR_ZONA, NR_LOCAL_VOTACAO, QT_VALIDOS AS validos, V_13, V_22, ELEIT_PERFIL, {perfil}
        FROM '{(PROCESSED_DIR / "base_secao_2026.parquet").as_posix()}'
        WHERE QT_VALIDOS > 0 AND ELEIT_PERFIL > 0
    """).df()
    for nome, col in L1.items():
        df[nome] = df[col] / df.ELEIT_PERFIL
    # composição do eleitorado do município inteiro: centro das variáveis da seção no Mundlak
    soma = df.groupby("CD_MUNICIPIO")[["ELEIT_PERFIL", *L1.values()]].transform("sum")
    for nome, col in L1.items():
        df[f"m_{nome}"] = soma[col] / soma.ELEIT_PERFIL

    ctx = pd.read_parquet(PROCESSED_DIR / "contexto_municipal.parquet")
    ctx["log_renda"] = np.log(ctx.renda_pc_media)
    ctx["log_pib"] = np.log(ctx.pib_pc_2022)
    ctx["pct_pbf"] = ctx.pct_pop_pbf.clip(upper=1)  # 3 municípios passam de 100% (cadastro x população do Censo)
    mun = ctx[["CD_MUNICIPIO", *MUNICIPAIS]].dropna().reset_index(drop=True)
    z = (mun[MUNICIPAIS] - mun[MUNICIPAIS].mean()) / mun[MUNICIPAIS].std()  # cada município pesa igual
    # índice socioeconômico: 1º componente principal de renda, PIB e Bolsa Família
    trio = z[["log_renda", "log_pib", "pct_pbf"]].to_numpy()
    _, sv, vt = np.linalg.svd(trio - trio.mean(0), full_matrices=False)
    carga = vt[0] * np.sign(vt[0][0])  # mais renda = índice maior
    socio = trio @ carga
    mun = pd.concat([mun[["CD_MUNICIPIO"]], z.add_prefix("z_")], axis=1).assign(z_socio=(socio - socio.mean()) / socio.std())
    df = df.merge(mun, on="CD_MUNICIPIO", how="inner")
    df.attrs["pca"] = {"cargas": dict(zip(["log_renda", "log_pib", "pct_pbf"], carga.round(3).tolist())),
                       "variancia_explicada": float(sv[0] ** 2 / (sv ** 2).sum())}

    regiao = {uf: r for r, ufs in REGIOES.items() for uf in ufs.split()}
    for d in DUMMIES_REGIAO:
        df[d] = (df.SG_UF.map(regiao) == d.removeprefix("reg_")).astype(float)
    # escolaridade da seção num índice só: % superior − % até o fundamental incompleto (r = −0,67 entre os dois)
    df["escol"] = df.superior - df.ate_fund_inc
    df["m_escol"] = df.m_superior - df.m_ate_fund_inc
    for nome in [*L1, "escol"]:
        df[f"z_{nome}"] = (df[nome] - df[nome].mean()) / df[nome].std()
        df[f"w_{nome}"] = df[nome] - df[f"m_{nome}"]  # dentro do município (Mundlak)
    df["local"] = df.CD_MUNICIPIO.astype(str) + "-" + df.NR_ZONA.astype(str) + "-" + df.NR_LOCAL_VOTACAO.astype(str)
    return df.reset_index(drop=True)


class Ajustes:
    """Ajusta e guarda modelos gaussianos no logit, com efeito aleatório de UF e município."""

    def __init__(self, df: pd.DataFrame, y: np.ndarray):
        self.df, self.y = df, y
        self.grupos = df[["SG_UF", "CD_MUNICIPIO"]].astype(str).to_numpy()
        self.cache: dict = {}

    def matriz(self, colunas: list[str]) -> np.ndarray:
        return np.c_[np.ones(len(self.df)), self.df[colunas].to_numpy()] if colunas else np.ones((len(self.df), 1))

    def ajustar(self, colunas: list[str], **kw) -> gpb.GPModel:
        m = gpb.GPModel(group_data=self.grupos, likelihood="gaussian", **kw)
        m.fit(y=self.y, X=self.matriz(colunas))
        return m

    def componentes(self, blocos: frozenset) -> dict:
        """Variâncias e log-verossimilhança do modelo com os blocos dados (com cache: o Shapley reaproveita)."""
        if blocos not in self.cache:
            colunas = [c for b in BLOCOS if b in blocos for c in BLOCOS[b]]
            m = self.ajustar(colunas)
            cp = np.asarray(m.get_cov_pars()).ravel()
            self.cache[blocos] = {"secao": float(cp[0]), "uf": float(cp[1]), "mun": float(cp[2]),
                                  "loglik": float(-m.get_current_neg_log_likelihood()), "k": len(colunas)}
        return self.cache[blocos]


def queda(nulo: dict, modelo: dict) -> dict:
    """Proporção da variância de cada nível que o modelo explica, em relação ao nulo."""
    return {nivel: 1 - modelo[nivel] / nulo[nivel] for nivel in ("uf", "mun", "secao")}


def shapley(aj: Ajustes, blocos: list[str], nivel: str) -> dict:
    nulo = aj.componentes(frozenset())
    v = lambda s: 1 - aj.componentes(frozenset(s))[nivel] / nulo[nivel]
    n = len(blocos)
    phi = {}
    for b in blocos:
        resto = [x for x in blocos if x != b]
        phi[b] = sum(factorial(k) * factorial(n - k - 1) / factorial(n) * (v(set(s) | {b}) - v(s))
                     for k in range(n) for s in combinations(resto, k))
    return {"blocos": phi, "total": v(blocos)}


def lrt(restrito: dict, completo: dict) -> dict:
    lr = max(2 * (completo["loglik"] - restrito["loglik"]), 0.0)
    gl = completo["k"] - restrito["k"]
    return {"LR": lr, "gl": gl, "p": float(stats.chi2.sf(lr, gl))}


def efeitos_aleatorios(m: gpb.GPModel, df: pd.DataFrame) -> pd.DataFrame:
    re = m.predict_training_data_random_effects()
    return pd.DataFrame({"SG_UF": df.SG_UF.to_numpy(), "CD_MUNICIPIO": df.CD_MUNICIPIO.to_numpy(),
                         "u_uf": re.iloc[:, 0].to_numpy(), "u_mun": re.iloc[:, 1].to_numpy()})


def coeficientes(m: gpb.GPModel, nomes: list[str]) -> pd.DataFrame:
    try:
        c = m.get_coef(std_err=True, format_pandas=True)
        coef, ep = c.iloc[0].to_numpy(), c.iloc[1].to_numpy()
    except Exception:  # erro-padrão pode estourar a memória nesta escala: o bootstrap cobre
        coef, ep = np.asarray(m.get_coef()).ravel(), np.full(len(nomes) + 1, np.nan)
    return pd.DataFrame({"coef": coef[1:], "ep": ep[1:]}, index=nomes).assign(intercepto=coef[0])


def modelar(df: pd.DataFrame, numero: int) -> tuple[dict, pd.DataFrame]:
    t0 = time.time()
    y = logit_empirico(df[f"V_{numero}"], df.validos)
    share = (df[f"V_{numero}"] / df.validos).to_numpy()
    fator_pp = float(np.mean(share * (1 - share))) * 100  # dp/dlogit médio: logit → pontos percentuais
    aj = Ajustes(df, y)
    nulo = aj.componentes(frozenset())

    # sequência M0 → M3
    m1, m2, m3 = frozenset(SECAO), frozenset(SECAO + MUNICIPIO), frozenset(BLOCOS)
    sequencia = {nome: {**aj.componentes(s), "queda": queda(nulo, aj.componentes(s))}
                 for nome, s in [("M0 nulo", frozenset()), ("M1 perfil da seção", m1),
                                 ("M2 + perfil do município", m2), ("M3 + região", m3)]}
    testes = {"M0 → M1": lrt(nulo, aj.componentes(m1)), "M1 → M2": lrt(aj.componentes(m1), aj.componentes(m2)),
              "M2 → M3": lrt(aj.componentes(m2), aj.componentes(m3))}
    print(f"    sequência: {time.time() - t0:.0f}s", flush=True)

    # Shapley: 2^7 = 128 modelos (os sem região servem para a versão sem região)
    blocos = list(BLOCOS)
    sem_regiao = [b for b in blocos if b != "regiao"]
    decomposicao = {nivel: {"com_regiao": shapley(aj, blocos, nivel), "sem_regiao": shapley(aj, sem_regiao, nivel)}
                    for nivel in ("uf", "mun")}
    print(f"    Shapley ({len(aj.cache)} modelos): {time.time() - t0:.0f}s", flush=True)

    # efeitos de cada estado e município: nulo, perfis (M2, sem região) e completo (M3)
    efeitos = []
    for rotulo, cols in [("nulo", []), ("perfis", [c for b in SECAO + MUNICIPIO for c in BLOCOS[b]]),
                         ("completo", [c for b in BLOCOS for c in BLOCOS[b]])]:
        m = aj.ajustar(cols)
        ref = float(np.mean(aj.matriz(cols) @ np.asarray(m.get_coef()).ravel()))  # urna típica do modelo
        e = efeitos_aleatorios(m, df).drop_duplicates("CD_MUNICIPIO")
        efeitos.append(e.rename(columns={"u_uf": f"u_uf_{rotulo}_{numero}", "u_mun": f"u_mun_{rotulo}_{numero}"})
                        .assign(**{f"ref_{rotulo}_{numero}": ref}))
    tabela_efeitos = efeitos[0]
    for e in efeitos[1:]:
        tabela_efeitos = tabela_efeitos.merge(e.drop(columns="SG_UF"), on="CD_MUNICIPIO")

    def efeito_estado_pp(rotulo: str) -> dict:
        ufs = tabela_efeitos.drop_duplicates("SG_UF").set_index("SG_UF")
        ref = ufs[f"ref_{rotulo}_{numero}"].iloc[0]
        return {uf: float(expit(ref + u) - expit(ref)) for uf, u in ufs[f"u_uf_{rotulo}_{numero}"].items()}

    estados = {"nulo": efeito_estado_pp("nulo"), "perfis": efeito_estado_pp("perfis"),
               "completo": efeito_estado_pp("completo")}

    # efeitos das variáveis (modelo completo, renda/PIB/Bolsa Família como índice)
    cols_ef = EFEITOS + DUMMIES_REGIAO
    m_ef = aj.ajustar(cols_ef)
    coef = coeficientes(m_ef, cols_ef)
    efeitos_vars = {c: {"rotulo": ROTULOS_EFEITOS[c], "logit": float(coef.loc[c, "coef"]), "ep_logit": float(coef.loc[c, "ep"]),
                        "pp": float(coef.loc[c, "coef"] * fator_pp),
                        "pp_ic": [float((coef.loc[c, "coef"] - 1.96 * coef.loc[c, "ep"]) * fator_pp),
                                  float((coef.loc[c, "coef"] + 1.96 * coef.loc[c, "ep"]) * fator_pp)]}
                    for c in EFEITOS}
    print(f"    efeitos: {time.time() - t0:.0f}s", flush=True)

    # Mundlak: dentro do município (composição) x entre municípios (contexto), escala original (proporções)
    cols_mk = [f"w_{n}" for n in L1] + [f"m_{n}" for n in L1] + \
              ["z_socio", "z_pct_preta_parda", "z_pct_evangelicos", "z_pct_urbana"] + DUMMIES_REGIAO
    c_mk = coeficientes(aj.ajustar(cols_mk), cols_mk)
    mundlak = {n: {"dentro": float(c_mk.loc[f"w_{n}", "coef"]), "entre": float(c_mk.loc[f"m_{n}", "coef"]),
                   "dp_dentro": float(df[f"w_{n}"].std()), "dp_entre": float(df.drop_duplicates("CD_MUNICIPIO")[f"m_{n}"].std())}
               for n in L1}
    for n in L1:  # efeito de +1 DP em p.p.
        mundlak[n]["pp_dentro"] = mundlak[n]["dentro"] * mundlak[n]["dp_dentro"] * fator_pp
        mundlak[n]["pp_entre"] = mundlak[n]["entre"] * mundlak[n]["dp_entre"] * fator_pp
    # versão simples: só o perfil (dentro e entre) e a região. Com renda, cor ou raça e religião no mesmo modelo, o
    # "entre cidades" da escolaridade vira um efeito parcial difícil de ler (chega a trocar de sinal)
    simples = ["mulher", "16_24", "60_mais", "escol"]
    cols_ms = [f"w_{n}" for n in simples] + [f"m_{n}" for n in simples] + DUMMIES_REGIAO
    c_ms = coeficientes(aj.ajustar(cols_ms), cols_ms)
    municipios_unicos = df.drop_duplicates("CD_MUNICIPIO")
    mundlak_simples = {n: {"pp_dentro": float(c_ms.loc[f"w_{n}", "coef"] * df[f"w_{n}"].std() * fator_pp),
                           "pp_entre": float(c_ms.loc[f"m_{n}", "coef"] * municipios_unicos[f"m_{n}"].std() * fator_pp)}
                       for n in simples}
    print(f"    Mundlak: {time.time() - t0:.0f}s", flush=True)

    # inclinação aleatória do % superior por UF (sem correlação com o intercepto, como no gpboost)
    base_ef = {"loglik": float(-m_ef.get_current_neg_log_likelihood()), "k": len(cols_ef)}
    m_incl = aj.ajustar(cols_ef, group_rand_coef_data=df[["z_escol"]].to_numpy(), ind_effect_group_rand_coef=[1])
    ll_incl = float(-m_incl.get_current_neg_log_likelihood())
    lr = max(2 * (ll_incl - base_ef["loglik"]), 0.0)
    cp_incl = np.asarray(m_incl.get_cov_pars()).ravel()
    re_incl = m_incl.predict_training_data_random_effects()
    beta_sup = float(np.asarray(m_incl.get_coef()).ravel()[1 + cols_ef.index("z_escol")])
    incl_uf = (pd.DataFrame({"SG_UF": df.SG_UF.to_numpy(), "b": re_incl.iloc[:, 2].to_numpy()})
               .drop_duplicates("SG_UF").set_index("SG_UF").b)
    inclinacao = {"variancia": float(cp_incl[3]), "LR": lr, "p": float(0.5 * stats.chi2.sf(lr, 1)),
                  "fixo_pp": beta_sup * fator_pp,
                  "por_uf_pp": {uf: float((beta_sup + b) * fator_pp) for uf, b in incl_uf.items()}}

    # interações entre níveis: superior × região e superior × nível socioeconômico do município
    for d in DUMMIES_REGIAO + ["z_socio"]:
        df[f"sup_x_{d}"] = df.z_escol * df[d]
    cols_int = cols_ef + [f"sup_x_{d}" for d in DUMMIES_REGIAO + ["z_socio"]]
    m_int = aj.ajustar(cols_int)
    c_int = coeficientes(m_int, cols_int)
    ll_int = float(-m_int.get_current_neg_log_likelihood())
    lr_int = max(2 * (ll_int - base_ef["loglik"]), 0.0)
    sup = float(c_int.loc["z_escol", "coef"])
    interacoes = {"LR": lr_int, "gl": len(cols_int) - len(cols_ef), "p": float(stats.chi2.sf(lr_int, len(cols_int) - len(cols_ef))),
                  "escolaridade_por_regiao_pp": {"SE": sup * fator_pp, **{d.removeprefix("reg_"): (sup + float(c_int.loc[f"sup_x_{d}", "coef"])) * fator_pp
                                                                     for d in DUMMIES_REGIAO}},
                  "escolaridade_x_socio_pp": float(c_int.loc["sup_x_z_socio", "coef"]) * fator_pp}
    print(f"    inclinação e interações: {time.time() - t0:.0f}s", flush=True)

    # nulo de 4 níveis: seção < local de votação < município < UF
    m4 = gpb.GPModel(group_data=df[["SG_UF", "CD_MUNICIPIO", "local"]].astype(str).to_numpy(), likelihood="gaussian")
    m4.fit(y=y, X=np.ones((len(y), 1)))
    cp4 = np.asarray(m4.get_cov_pars()).ravel()
    v4 = {"secao": float(cp4[0]), "uf": float(cp4[1]), "mun": float(cp4[2]), "local": float(cp4[3])}
    quatro_niveis = {"variancias": v4, "icc": {k: v / sum(v4.values()) for k, v in v4.items()}}
    print(f"    4 níveis: {time.time() - t0:.0f}s", flush=True)

    # robustez: binomial (válidos como tentativas) e só seções com 100+ válidos
    robustez = {}
    proporcao = Ajustes(df, share)  # mesma decomposição, sem o logit
    robustez["escala_proporcao"] = {"queda": queda(proporcao.componentes(frozenset()), proporcao.componentes(m3))}
    grandes = df.validos.to_numpy() >= MIN_VALIDOS_ROBUSTEZ
    sub = Ajustes(df[grandes].reset_index(drop=True), y[grandes])
    robustez[f"secoes_{MIN_VALIDOS_ROBUSTEZ}_validos"] = {"n": int(grandes.sum()),
                                                         "queda": queda(sub.componentes(frozenset()), sub.componentes(m3))}
    print(f"    robustez: {time.time() - t0:.0f}s", flush=True)

    # surpresa de cada urna depois do perfil: resultado − esperado (estado e município do nulo + perfil dentro do município)
    beta_dentro = np.array([mundlak[n]["dentro"] for n in L1])
    m_nulo = aj.ajustar([])
    re0 = m_nulo.predict_training_data_random_effects()
    g00 = float(np.asarray(m_nulo.get_coef()).ravel()[0])
    esperado = expit(g00 + re0.iloc[:, 0].to_numpy() + re0.iloc[:, 1].to_numpy() + df[[f"w_{n}" for n in L1]].to_numpy() @ beta_dentro)
    surpresa = np.abs(share - esperado) * 100

    resultado = {
        "candidato": CANDIDATOS_PRESIDENTE[numero], "n_secoes": len(df), "fator_pp": fator_pp,
        "sequencia": sequencia, "testes": testes, "shapley": decomposicao,
        "efeito_estado_pp": estados, "efeitos": efeitos_vars, "mundlak": mundlak, "mundlak_simples": mundlak_simples,
        "inclinacao_escolaridade": inclinacao, "interacoes": interacoes, "quatro_niveis": quatro_niveis,
        "robustez": robustez,
        "camada_perfil": {"beta_dentro": dict(zip(L1, beta_dentro.tolist())), "g00_nulo": g00},
        "surpresa_perfil": [round(float(q), 3) for q in np.quantile(surpresa, np.linspace(0, 1, 101))],
    }
    print(f"    total: {time.time() - t0:.0f}s", flush=True)
    return resultado, tabela_efeitos


def bootstrap(df: pd.DataFrame, numero: int, repeticoes: int, semente: int = 2026) -> dict:
    """Reamostra os 27 estados com reposição; cada cópia de estado vira um grupo novo."""
    rng = np.random.default_rng(semente)
    ufs = df.SG_UF.unique()
    por_uf = {uf: g for uf, g in df.groupby("SG_UF")}
    m1, m2, m3 = frozenset(SECAO), frozenset(SECAO + MUNICIPIO), frozenset(BLOCOS)
    amostras = {"queda_uf": {"M1": [], "M2": [], "M3": []}, "queda_mun": {"M1": [], "M2": [], "M3": []},
                "efeitos_pp": {c: [] for c in EFEITOS}}
    for r in range(repeticoes):
        partes = [por_uf[uf].assign(SG_UF=f"{uf}#{j}", CD_MUNICIPIO=por_uf[uf].CD_MUNICIPIO.astype(str) + f"#{j}")
                  for j, uf in enumerate(rng.choice(ufs, size=len(ufs), replace=True))]
        b = pd.concat(partes, ignore_index=True)
        y = logit_empirico(b[f"V_{numero}"], b.validos)
        aj = Ajustes(b, y)
        nulo = aj.componentes(frozenset())
        for nome, s in [("M1", m1), ("M2", m2), ("M3", m3)]:
            q = queda(nulo, aj.componentes(s))
            amostras["queda_uf"][nome].append(q["uf"])
            amostras["queda_mun"][nome].append(q["mun"])
        share = (b[f"V_{numero}"] / b.validos).to_numpy()
        fator = float(np.mean(share * (1 - share))) * 100
        coef = np.asarray(aj.ajustar(EFEITOS + DUMMIES_REGIAO).get_coef()).ravel()[1:1 + len(EFEITOS)]
        for c, v in zip(EFEITOS, coef):
            amostras["efeitos_pp"][c].append(float(v) * fator)
        print(f"    bootstrap {numero}: {r + 1}/{repeticoes}", flush=True)
    ic = lambda xs: [float(np.percentile(xs, 2.5)), float(np.percentile(xs, 97.5))]
    return {"repeticoes": repeticoes,
            "queda_uf": {k: ic(v) for k, v in amostras["queda_uf"].items()},
            "queda_mun": {k: ic(v) for k, v in amostras["queda_mun"].items()},
            "efeitos_pp": {k: ic(v) for k, v in amostras["efeitos_pp"].items()}}


def main() -> None:
    repeticoes = int(sys.argv[sys.argv.index("--bootstrap") + 1]) if "--bootstrap" in sys.argv else 0
    df = carregar()
    print(f"{len(df):,} seções, {df.CD_MUNICIPIO.nunique():,} municípios, {df.SG_UF.nunique()} UFs", flush=True)
    saida = {"n_secoes": len(df), "n_municipios": int(df.CD_MUNICIPIO.nunique()), "blocos": BLOCOS,
             "rotulos_blocos": ROTULOS, "pca_socioeconomico": df.attrs["pca"], "candidatos": {}}
    efeitos = df[["SG_UF", "CD_MUNICIPIO"]].drop_duplicates("CD_MUNICIPIO")
    for numero in CANDIDATOS:
        print(f"  {CANDIDATOS_PRESIDENTE[numero]} ({numero})", flush=True)
        resultado, tabela = modelar(df, numero)
        if repeticoes:
            resultado["bootstrap"] = bootstrap(df, numero, repeticoes)
        saida["candidatos"][str(numero)] = resultado
        efeitos = efeitos.merge(tabela.drop(columns="SG_UF"), on="CD_MUNICIPIO")
        s = resultado["shapley"]["uf"]["com_regiao"]
        print("    camada do estado: " + ", ".join(f"{b} {v:.0%}" for b, v in s["blocos"].items())
              + f" | total {s['total']:.0%}", flush=True)

    RESULTADOS.mkdir(exist_ok=True)
    (RESULTADOS / "10_hlm_stepup.json").write_text(json.dumps(saida, indent=2, ensure_ascii=False), encoding="utf-8")
    efeitos.reset_index(drop=True).to_parquet(PROCESSED_DIR / "efeitos_stepup.parquet", index=False)
    print("[ok] resultados/10_hlm_stepup.json e data/processed/efeitos_stepup.parquet")


if __name__ == "__main__":
    main()
