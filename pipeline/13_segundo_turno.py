"""Resultado oficial do 2º turno (Presidente, 25/10/2026) por município, a partir da divulgação do TSE.

Os boletins de urna do 2º turno (bweb_2t) ainda não estão no Portal de Dados Abertos; o resultado oficial por município já
está no site de resultados do TSE (resultados.tse.jus.br), em um arquivo por município. Este script:

1. baixa o cadastro de municípios do 2º turno, o arquivo de cada município (5.570 + exterior), o do Brasil e o de cada UF,
   e o do Brasil no 1º turno (para os percentuais oficiais com o exterior), guardando tudo em RAW_DIR/resultados_2t;
2. confere: a soma dos municípios (com o exterior) é igual ao total do Brasil em todos os campos; a soma dos municípios de
   cada UF é igual ao total da UF; todos os municípios estão 100% totalizados; o comparecimento e a abstenção de cada
   município batem com o arquivo de abrangência da UF (outro arquivo do TSE);
3. grava data/processed/resultado_2t_municipio_2026.parquet (um município por linha, sem o exterior) e
   resultados/13_segundo_turno.json (totais oficiais e a conferência).

Qualquer divergência interrompe o script antes de gravar.

Uso: python pipeline/13_segundo_turno.py
"""
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import duckdb
import pandas as pd

from config import PROCESSED_DIR, RAW_DIR, ROOT
from tse import salvar

BASE = "https://resultados.tse.jus.br/oficial/ele2026"
ELEICAO_2T = "6258"  # Eleição Ordinária Federal 2026, 2º turno (cdt2 da 6257 em comum/config/ele-c.json)
ELEICAO_1T = "6257"
CACHE = RAW_DIR / "resultados_2t"
SAIDA_JSON = ROOT / "resultados" / "13_segundo_turno.json"
# poucas conexões ao mesmo tempo: o servidor é público e está sob carga nos dias seguintes à eleição
PARALELO = 6


def baixar(url: str, destino: Path, refazer: bool = False) -> dict:
    if destino.exists() and not refazer:
        return json.loads(destino.read_text(encoding="utf-8"))
    destino.parent.mkdir(parents=True, exist_ok=True)
    for tentativa in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "urna-em-camadas (github.com/DuhBenhur/urna-em-camadas)"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                texto = resp.read().decode("utf-8")
            dados = json.loads(texto)
            parcial = destino.with_name(destino.name + ".part")
            parcial.write_text(texto, encoding="utf-8")
            parcial.replace(destino)
            return dados
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as erro:
            if tentativa == 4:
                raise RuntimeError(f"{url}: {erro}") from erro
            time.sleep(2 ** tentativa)
    raise AssertionError("inalcançável")


def arquivo_resultado(eleicao: str, uf: str, abrangencia: str) -> tuple[str, Path]:
    """URL e caminho local do resultado de Presidente (cargo 1) de uma abrangência: 'br', a UF ou '{uf}{código}'."""
    nome = f"{abrangencia}-c0001-e00{eleicao}-u.json"
    return f"{BASE}/{eleicao}/dados/{uf}/{nome}", CACHE / eleicao / uf / nome


def ler_resultado(d: dict) -> dict:
    """Os campos usados de um arquivo de resultado: eleitorado, comparecimento, votos e seções totalizadas.

    `aptos` são os eleitores das seções instaladas: é sobre eles que o TSE calcula a abstenção (comparecimento + abstenção =
    aptos), e são eles que aparecem nos boletins de urna. `aptos_cadastro` inclui as seções não instaladas (no 2º turno,
    41 seções e 423 eleitores no Brasil): é o "eleitores aptos" anunciado."""
    e, v, s = d["e"], d["v"], d["s"]
    votos = {}
    for agr in d["carg"][0]["agr"]:
        for par in agr["par"]:
            for cand in par["cand"]:
                votos[int(cand["n"])] = int(cand["vap"])
    return {
        "aptos": int(e["esi"]), "aptos_cadastro": int(e["te"]), "comparecimento": int(e["c"]), "abstencoes": int(e["a"]),
        "validos": int(v["vv"]), "brancos": int(v["vb"]), "nulos": int(v["tvn"]),
        "anulados": int(v["van"]) + int(v["vansj"]),
        "V_13": votos.get(13, 0), "V_22": votos.get(22, 0),
        "secoes": int(s["ts"]), "secoes_totalizadas": int(s["st"]), "secoes_instaladas": int(s["si"]),
        "gerado": f'{d["dg"]} {d["hg"]}', "andamento": d.get("and"),
    }


CAMPOS = ["aptos", "aptos_cadastro", "comparecimento", "abstencoes", "validos", "brancos", "nulos", "anulados", "V_13", "V_22",
          "secoes", "secoes_totalizadas", "secoes_instaladas"]


def main() -> None:
    print(f"Cache: {CACHE}")
    # cadastro de municípios: muda pouco, mas é baixado de novo a cada execução para pegar correções
    cadastro = baixar(f"{BASE}/{ELEICAO_2T}/config/mun-e00{ELEICAO_2T}-cm.json", CACHE / ELEICAO_2T / "mun-cm.json", refazer=True)
    municipios = [(abr["cd"], int(mu["cd"]), int(mu["cdi"]) if mu.get("cdi") else None, mu["nm"])
                  for abr in cadastro["abr"] for mu in abr["mu"]]
    ufs = sorted({uf for uf, *_ in municipios})
    print(f"[ok] cadastro: {len(municipios):,} municípios em {len(ufs)} abrangências ({', '.join(ufs)})")

    pedidos = [arquivo_resultado(ELEICAO_2T, uf, f"{uf}{cd:05d}") for uf, cd, _, _ in municipios]
    with ThreadPoolExecutor(PARALELO) as ex:
        brutos = list(ex.map(lambda p: baixar(*p), pedidos))
    print(f"[ok] {len(brutos):,} arquivos de município")

    linhas = []
    for (uf, cd, ibge, nome), bruto in zip(municipios, brutos):
        r = ler_resultado(bruto)
        linhas.append({"SG_UF": uf.upper(), "CD_MUNICIPIO": cd, "CD_MUNICIPIO_IBGE": ibge, "NM_MUNICIPIO": nome, **r})
    mun = pd.DataFrame(linhas)

    brasil = ler_resultado(baixar(*arquivo_resultado(ELEICAO_2T, "br", "br"), refazer=True))
    brasil_1t = ler_resultado(baixar(*arquivo_resultado(ELEICAO_1T, "br", "br")))
    por_uf = {uf: ler_resultado(baixar(*arquivo_resultado(ELEICAO_2T, uf, uf), refazer=True)) for uf in ufs}
    abrangencia = {uf: baixar(f"{BASE}/{ELEICAO_2T}/dados/{uf}/{uf}-e00{ELEICAO_2T}-ab.json",
                              CACHE / ELEICAO_2T / uf / f"{uf}-ab.json", refazer=True) for uf in ufs}

    falhas: list[str] = []
    soma = mun[CAMPOS].sum()
    for c in CAMPOS:
        if int(soma[c]) != brasil[c]:
            falhas.append(f"Brasil, {c}: soma dos municípios {int(soma[c]):,} x total {brasil[c]:,}")
    for uf in ufs:
        s = mun[mun.SG_UF == uf.upper()][CAMPOS].sum()
        for c in CAMPOS:
            if int(s[c]) != por_uf[uf][c]:
                falhas.append(f"{uf.upper()}, {c}: soma dos municípios {int(s[c]):,} x total da UF {por_uf[uf][c]:,}")
    incompletos = mun[mun.secoes_totalizadas != mun.secoes]
    if len(incompletos):
        falhas.append(f"{len(incompletos)} municípios sem 100% das seções totalizadas")
    # segunda fonte: o arquivo de abrangência de cada UF traz comparecimento e abstenção por município
    ab = pd.DataFrame([{"CD_MUNICIPIO": int(a["cdabr"]), "c": int(a["e"]["c"]), "a": int(a["e"]["a"])}
                       for uf in ufs for a in abrangencia[uf]["abr"] if a["tpabr"] == "mun"])
    cruz = mun.merge(ab, on="CD_MUNICIPIO", how="outer", indicator=True)
    sem_par = int((cruz._merge != "both").sum())
    difere = int(((cruz.comparecimento != cruz.c) | (cruz.abstencoes != cruz.a))[cruz._merge == "both"].sum())
    if sem_par or difere:
        falhas.append(f"abrangência x arquivo do município: {sem_par} sem par, {difere} com comparecimento ou abstenção diferente")
    if brasil["V_13"] + brasil["V_22"] != brasil["validos"]:
        falhas.append("Brasil: Lula + Flávio diferente dos votos válidos")
    fecha = mun.comparecimento + mun.abstencoes != mun.aptos
    if fecha.any():
        falhas.append(f"{int(fecha.sum())} municípios em que comparecimento + abstenção é diferente dos aptos das seções instaladas")

    if falhas:
        print("[FALHA] o resultado do 2º turno não fecha; nada foi gravado:\n  " + "\n  ".join(falhas))
        sys.exit(1)
    print(f"[ok] soma de {len(mun):,} municípios (com o exterior) = total do Brasil em {len(CAMPOS)} campos")
    print(f"[ok] soma dos municípios = total de cada uma das {len(ufs)} abrangências")
    print(f"[ok] comparecimento e abstenção conferem com o arquivo de abrangência em {len(ab):,} municípios")

    exterior = mun[mun.SG_UF == "ZZ"][CAMPOS].sum()
    nacional = mun[mun.SG_UF != "ZZ"].drop(columns=["gerado", "andamento"]).copy()
    con = duckdb.connect()
    con.register("nacional", nacional)
    salvar(con, "SELECT * FROM nacional ORDER BY SG_UF, CD_MUNICIPIO", PROCESSED_DIR / "resultado_2t_municipio_2026.parquet")

    saida = {
        "fonte": "TSE, resultados.tse.jus.br (divulgação oficial), eleição 6258: Presidente, 2º turno, 25/10/2026",
        "gerado_tse": brasil["gerado"],
        "brasil": {c: brasil[c] for c in CAMPOS},
        "brasil_1t": {c: brasil_1t[c] for c in CAMPOS},
        "exterior": {c: int(exterior[c]) for c in CAMPOS},
        "conferencia": {
            "municipios": int(len(nacional)), "com_exterior": int(len(mun)), "abrangencias": len(ufs),
            "soma_igual_ao_brasil": True, "soma_igual_a_cada_uf": True, "abrangencia_confere": True,
            "campos": CAMPOS,
        },
    }
    SAIDA_JSON.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[ok] {SAIDA_JSON.relative_to(ROOT)}")
    b, b1 = brasil, brasil_1t
    print(f"     2º turno: Lula {b['V_13']:,} ({b['V_13'] / b['validos']:.2%}), Flávio {b['V_22']:,} ({b['V_22'] / b['validos']:.2%}), "
          f"abstenção {b['abstencoes'] / b['aptos']:.2%} (1º turno: {b1['abstencoes'] / b1['aptos']:.2%})")


if __name__ == "__main__":
    main()
