"""Exporta os dados estáticos do site para site/public/dados/.

Usa só arquivos versionados no repositório (data/processed, data/geo, resultados), então roda no
GitHub Actions antes do build, sem os brutos do TSE. Os JSON gerados não vão para o git.

Arquivos (tabelas compactas: "colunas" + "linhas", para reduzir tamanho):
  resumo.json                  totais nacionais, candidatos, modelos nulos e UFs
  historia.json                números da história da página inicial (cópia de resultados/08_historia.json)
  conferencia.json             soma dos boletins x resultado oficial do TSE, por UF e no Brasil
  explicacao.json              modelos explicativos (10), análise espacial (11) e tarifaço (12): capítulo 4
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

"Onde virar voto": faltosos e abertos em estados, municípios e locais; saldo13/22 (lembrar quem faltou) e gap13/22
(onde o perfil promete mais, experimental) somados escola por escola em estados e municípios. Nos locais, o navegador
calcula saldo e gap a partir de votos, faltosos e da surpresa "s".

Antes de gravar, `conferir_virar` confere que faltosos, abertos, saldos e gaps fecham entre estados, municípios e
escolas (e com as abstenções); se não fecharem, a exportação para sem tocar na pasta do site.

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
    # allow_nan=False: o json do Python escreveria NaN, que não é JSON válido e quebra a leitura no navegador
    # (foi o que deixou 258 zonas sem abrir em 08/10/2026). Melhor falhar aqui do que publicar o arquivo.
    caminho.write_text(json.dumps(objeto, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def nulo(valor):
    """NaN/NA do pandas → None (null no JSON)."""
    return None if pd.isna(valor) else valor


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
        ORDER BY ALL  -- sem ordem, o GROUP BY paralelo do duckdb muda a ordem dos locais nos arquivos a cada execução
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


# "Onde virar voto" (2º turno): quem faltou e quem não votou em nenhum dos dois finalistas no 1º turno
AGG_VIRAR = {"_aptos": ("QT_APTOS", "sum"), "_comparecimento": ("QT_COMPARECIMENTO", "sum"),
             "_validos": ("QT_VALIDOS", "sum"), "_brancos": ("QT_BRANCOS", "sum"), "_nulos": ("QT_NULOS", "sum"),
             "_v13": ("V_13", "sum"), "_v22": ("V_22", "sum")}
COLUNAS_VIRAR = ["faltosos", "abertos"]
COLUNAS_SALDO = ["saldo13", "saldo22"]
# "onde o perfil promete mais" (experimental): votos abaixo do esperado pelo modelo, somados escola por escola
COLUNAS_GAP = ["gap13", "gap22"]


def saldos_por_escola(base: pd.DataFrame) -> pd.DataFrame:
    """Saldo possível ao lembrar quem faltou, calculado escola por escola (local de votação):
    faltosos × (votos do candidato − do adversário) ÷ válidos, só onde ele ficou à frente.
    Municípios e estados recebem a soma das escolas, para que todos os níveis contem a mesma história
    (um estado onde o candidato perdeu ainda tem escolas onde ele ganhou)."""
    g = (base.groupby(["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
         [["QT_APTOS", "QT_COMPARECIMENTO", "QT_VALIDOS", "V_13", "V_22"]].sum().reset_index())
    faltosos = g.QT_APTOS - g.QT_COMPARECIMENTO
    validos = g.QT_VALIDOS.where(g.QT_VALIDOS > 0)
    for n, o in ((13, 22), (22, 13)):
        g[f"saldo{n}"] = (faltosos * (g[f"V_{n}"] - g[f"V_{o}"]) / validos).clip(lower=0).fillna(0)
    return g[["SG_UF", "CD_MUNICIPIO", *COLUNAS_SALDO]]


def somar_saldos(base: pd.DataFrame, chave: str) -> pd.DataFrame:
    return saldos_por_escola(base).groupby(chave)[COLUNAS_SALDO].sum().round().astype(int)


def somar_gaps(por_local: pd.DataFrame, chave: str) -> pd.DataFrame:
    """Votos abaixo do esperado somados escola por escola (vazio se os modelos ainda não rodaram)."""
    if "gap13" not in por_local.columns:
        return pd.DataFrame(index=pd.Index([], name=chave))
    return por_local.groupby(chave)[COLUNAS_GAP].sum().round().astype(int)


def virar_voto(df: pd.DataFrame) -> pd.DataFrame:
    """faltosos = aptos − comparecimento; abertos = votos nos outros 10 candidatos + brancos + nulos."""
    df = df.copy()
    df["faltosos"] = (df._aptos - df._comparecimento).astype(int)
    df["abertos"] = (df._validos - df._v13 - df._v22 + df._brancos + df._nulos).astype(int)
    return df.drop(columns=[c for c in df.columns if c.startswith("_")])


def resumo(base: pd.DataFrame, locais: pd.DataFrame, municipios: pd.DataFrame, modelos: dict,
           por_local: pd.DataFrame) -> dict:
    tot = base[["QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VALIDOS", "QT_BRANCOS", "QT_NULOS"]].sum()
    votos = base[[f"V_{n}" for n in ORDEM_CANDIDATOS]].sum()
    por_uf = virar_voto(base.groupby("SG_UF").agg(QT_APTOS=("QT_APTOS", "sum"), QT_VALIDOS=("QT_VALIDOS", "sum"),
                                                  V_13=("V_13", "sum"), V_22=("V_22", "sum"), **AGG_VIRAR)
                        ).join(somar_saldos(base, "SG_UF")).join(somar_gaps(por_local, "SG_UF"))
    somados = COLUNAS_VIRAR + COLUNAS_SALDO + [c for c in COLUNAS_GAP if c in por_uf.columns]
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
                 **{c: int(getattr(r, c)) for c in somados},
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
    saida = {"stepup": stepup, "espacial": espacial}
    tarifaco = RESULTADOS / "12_tarifaco.json"  # extensão: exposição ao tarifaço dos EUA
    if tarifaco.exists():
        saida["tarifaco"] = json.loads(tarifaco.read_text(encoding="utf-8"))
    return saida


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


def indice_municipios(base: pd.DataFrame, municipios: pd.DataFrame, por_local: pd.DataFrame) -> dict:
    agg = (base.groupby("CD_MUNICIPIO")
           .agg(secoes=("NR_SECAO", "size"), aptos=("QT_APTOS", "sum"), validos=("QT_VALIDOS", "sum"), v13=("V_13", "sum"),
                v22=("V_22", "sum"), zonas=("NR_ZONA", lambda z: sorted(set(int(x) for x in z))),
                **AGG_VIRAR)
           .reset_index())
    m = (virar_voto(municipios.merge(agg, on="CD_MUNICIPIO"))
         .merge(somar_saldos(base, "CD_MUNICIPIO"), on="CD_MUNICIPIO")
         .merge(somar_gaps(por_local, "CD_MUNICIPIO"), on="CD_MUNICIPIO", how="left"))
    m["u13"] = m.u_mun_13.round(4)
    m["u22"] = m.u_mun_22.round(4)
    # aptos: o mapa do "Onde virar voto" mostra cada conta por 100 eleitores aptos (cidade grande não domina)
    colunas = ["CD_MUNICIPIO", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO", "SG_UF", "secoes", "aptos", "validos", "v13", "v22",
               "u13", "u22", "zonas", *COLUNAS_VIRAR, *COLUNAS_SALDO] + [c for c in [*COLUNAS_GAP, "sp13", "sp22", "lisa13", "lisa22", "regiao"] if c in m.columns]
    return tabela(m[colunas].rename(columns={"CD_MUNICIPIO": "cd", "CD_MUNICIPIO_IBGE": "ibge",
                                              "NM_MUNICIPIO": "nome", "SG_UF": "uf"}))


def tabela_locais(base: pd.DataFrame, locais: pd.DataFrame, municipios: pd.DataFrame, modelos: dict,
                  exp: dict | None) -> pd.DataFrame:
    """Uma linha por local de votação (escola), com o que vai para locais/{cd}.json."""
    perfil = list(PERFIL_L1.values())
    # SG_UF não divide nada (cada município é de um estado só): fica para a conferência por estado
    por_local = (base.groupby(["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
                 .agg(secoes=("NR_SECAO", "size"), validos=("QT_VALIDOS", "sum"),
                      v13=("V_13", "sum"), v22=("V_22", "sum"), **AGG_VIRAR,
                      ELEIT_PERFIL=("ELEIT_PERFIL", "sum"), **{c: (c, "sum") for c in perfil})
                 .reset_index()
                 .pipe(virar_voto)
                 .merge(locais.drop(columns="SG_UF"), on=["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"], how="left"))
    if exp is not None:
        comp = composicao_municipal(base)
        u = municipios.set_index("CD_MUNICIPIO")
        for n in (13, 22):
            beta = exp["stepup"]["candidatos"][str(n)]["camada_perfil"]["beta_dentro"]
            g00 = modelos["candidatos"][str(n)]["intercepto"]["logit"]
            efeito = por_local.CD_MUNICIPIO.map(u[f"u_uf_{n}"] + u[f"u_mun_{n}"])
            esperado = expit(g00 + efeito + desvio_perfil(por_local, comp, beta))
            por_local[f"s{n}"] = (por_local[f"v{n}"] / por_local.validos - esperado).round(4)
            # votos abaixo do esperado, com a surpresa arredondada que vai para o arquivo: assim a soma de municípios e
            # estados é a soma do que o navegador calcula escola por escola. Sem surpresa (sem perfil), fica de fora.
            por_local[f"gap{n}"] = gap_na_escola(por_local, n)
    return por_local


def gravar_locais(por_local: pd.DataFrame) -> int:
    extras = [c for c in ["s13", "s22"] if c in por_local.columns]
    colunas = ["NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL", "NM_BAIRRO", "LAT", "LON", "secoes", "validos", "v13", "v22",
               *COLUNAS_VIRAR, *extras]
    for cd, grupo in por_local.groupby("CD_MUNICIPIO"):
        gravar(SAIDA / "locais" / f"{cd}.json",
               tabela(grupo[colunas].rename(columns={"NR_ZONA": "zona", "NR_LOCAL_VOTACAO": "local",
                                                     "NM_LOCAL": "nome", "NM_BAIRRO": "bairro",
                                                     "LAT": "lat", "LON": "lon"})))
    return por_local.CD_MUNICIPIO.nunique()


class ErroConferencia(Exception):
    """Os números de "Onde virar voto" não fecham entre os níveis: melhor não publicar."""


def saldo_na_escola(escolas: pd.DataFrame, n: int) -> pd.Series:
    """O saldo que o navegador calcula para cada escola a partir do arquivo de locais (site/src/lib/virar.ts):
    faltosos × (votos do candidato − do adversário) ÷ válidos, só onde ele ficou à frente."""
    o = 22 if n == 13 else 13
    vantagem = (escolas[f"v{n}"] - escolas[f"v{o}"]) / escolas.validos.where(escolas.validos > 0)
    return (escolas.faltosos * vantagem).clip(lower=0).fillna(0)


def gap_na_escola(escolas: pd.DataFrame, n: int) -> pd.Series:
    """Onde o perfil promete mais, como o navegador calcula para cada escola (site/src/lib/virar.ts):
    max(0, −surpresa) × válidos, em que surpresa = resultado − esperado pela cidade e pelo perfil do eleitorado."""
    return (-escolas[f"s{n}"]).clip(lower=0).fillna(0) * escolas.validos


def conferir_virar(res: dict, indice: dict, por_local: pd.DataFrame) -> None:
    """Trava da exportação: os números de "Onde virar voto" têm que contar a mesma história em todos os níveis,
    exatamente como vão para os arquivos (estados no resumo, municípios no índice, escolas nos arquivos de locais).

    - faltosos e abertos: estado = soma dos seus municípios = soma das suas escolas; município = soma das escolas;
    - saldo: o mesmo, com a tolerância do arredondamento (estados e municípios gravam o saldo inteiro, somado escola
      por escola): 1 voto por município;
    - Brasil: faltosos = abstenções; em cada estado e em cada município, faltosos + abertos + votos dos dois finalistas
      = aptos, e os aptos dos municípios somam os do estado.
    Qualquer falha interrompe a exportação antes de gravar o primeiro arquivo."""
    falhas: list[str] = []
    ufs = pd.DataFrame(res["ufs"]).set_index("uf")
    mun = pd.DataFrame(indice["linhas"], columns=indice["colunas"]).set_index("cd")
    escolas = por_local.rename(columns={"SG_UF": "uf", "CD_MUNICIPIO": "cd"}).copy()
    for n in (13, 22):
        escolas[f"saldo{n}"] = saldo_na_escola(escolas, n)
        if f"s{n}" in escolas.columns:
            escolas[f"gap{n}"] = gap_na_escola(escolas, n)
    somados = COLUNAS_SALDO + [c for c in COLUNAS_GAP if c in escolas.columns]
    n_mun = mun.groupby("uf").size()

    def comparar(rotulo: str, nivel: pd.Series, soma: pd.Series, tolerancia: pd.Series | float = 0) -> None:
        soma = soma.reindex(nivel.index)
        dif = (nivel - soma).abs()
        ruins = dif[~(dif <= tolerancia)]  # NaN (lugar sem par no outro nível) também é falha
        if len(ruins):
            exemplos = ", ".join(f"{k}: {nivel[k]:,.0f} x {soma[k]:,.0f}" for k in ruins.index[:5])
            falhas.append(f"{rotulo}: {len(ruins)} de {len(nivel)} não batem ({exemplos})")

    if set(mun.index) != set(escolas.cd):
        falhas.append(f"municípios sem escola ou escolas sem município: {len(set(mun.index) ^ set(escolas.cd))}")
    if set(ufs.index) != set(mun.uf):
        falhas.append(f"estados sem município ou municípios sem estado: {sorted(set(ufs.index) ^ set(mun.uf))}")
    for c in COLUNAS_VIRAR:
        comparar(f"{c}, município = soma das escolas", mun[c], escolas.groupby("cd")[c].sum())
        comparar(f"{c}, estado = soma dos municípios", ufs[c], mun.groupby("uf")[c].sum())
        comparar(f"{c}, estado = soma das escolas", ufs[c], escolas.groupby("uf")[c].sum())
    for c in somados:
        if c not in mun.columns or c not in ufs.columns:
            falhas.append(f"{c} não foi para o índice de municípios ou para o resumo")
            continue
        comparar(f"{c}, município = soma das escolas", mun[c], escolas.groupby("cd")[c].sum(), 1)
        comparar(f"{c}, estado = soma dos municípios", ufs[c], mun.groupby("uf")[c].sum(), n_mun.reindex(ufs.index))
        comparar(f"{c}, estado = soma das escolas", ufs[c], escolas.groupby("uf")[c].sum(), 1)
    comparar("aptos = faltosos + abertos + Lula + Flávio, por estado", ufs.aptos, ufs.faltosos + ufs.abertos + ufs.v13 + ufs.v22)
    comparar("aptos = faltosos + abertos + Lula + Flávio, por município", mun.aptos, mun.faltosos + mun.abertos + mun.v13 + mun.v22)
    comparar("aptos, estado = soma dos municípios", ufs.aptos, mun.groupby("uf").aptos.sum())
    faltosos, abstencoes = int(ufs.faltosos.sum()), res["totais"]["abstencoes"]
    if faltosos != abstencoes:
        falhas.append(f"faltosos do Brasil ({faltosos:,}) diferentes das abstenções ({abstencoes:,})")

    if falhas:
        raise ErroConferencia("Onde virar voto não fecha entre os níveis; nada foi gravado:\n  " + "\n  ".join(falhas))
    print(f"[ok] Onde virar voto fecha em {len(ufs)} estados, {len(mun):,} municípios e {len(escolas):,} escolas: "
          f"faltosos {faltosos:,} (= abstenções), em aberto {int(ufs.abertos.sum()):,}, "
          + ", ".join(f"{c} {int(ufs[c].sum()):,}" for c in somados if c in ufs.columns))


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
            # locais sem coordenada (sentinela -1 do TSE, presídios) vêm como NaN e precisam virar null
            "locais": {f"{int(r.CD_MUNICIPIO)}-{int(r.NR_LOCAL_VOTACAO)}":
                       [nulo(r.NM_LOCAL), nulo(r.NM_BAIRRO), nulo(r.LAT), nulo(r.LON)]
                       for r in lz.itertuples()},
            **tabela(grupo.sort_values("NR_SECAO")[colunas].rename(columns=nomes).astype("Int64")),
        })
        n += 1
    return n


def main() -> None:
    base, locais, municipios, modelos = carregar()
    base = marcar_conferencia(base)
    conf = conferencia(base)
    exp = explicacao()
    base, municipios = acrescentar_modelos(base, municipios, exp)
    # as escolas vêm primeiro: estados e municípios somam os "abaixo do esperado" delas
    por_local = tabela_locais(base, locais, municipios, modelos, exp)
    res = resumo(base, locais, municipios, modelos, por_local)
    indice = indice_municipios(base, municipios, por_local)
    # trava: se os números de "Onde virar voto" não fecharem entre os níveis, a pasta do site nem é apagada
    conferir_virar(res, indice, por_local)

    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    gravar(SAIDA / "resumo.json", res)
    # calculado localmente pelo 08 (precisa de geopandas); aqui só é compactado e copiado
    gravar(SAIDA / "historia.json", json.loads((RESULTADOS / "08_historia.json").read_text(encoding="utf-8")))
    gravar(SAIDA / "conferencia.json", conf)
    if exp is not None:
        gravar(SAIDA / "explicacao.json", exp)
    gravar(SAIDA / "municipios.json", indice)
    n_mun = gravar_locais(por_local)
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
