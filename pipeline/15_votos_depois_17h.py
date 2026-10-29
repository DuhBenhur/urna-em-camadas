"""Votos depois das 17h (horário de Brasília), contados nos logs das urnas: 2º turno (25/10/2026) e, nas mesmas urnas, o 1º
(04/10/2026). Desenho registrado em docs/plano_de_analise.md ("Votos depois das 17h") antes de rodar.

Fonte: os arquivos transmitidos para totalização do 2º turno (TSE, `bu_imgbu_logjez_rdv_vscmr_2026_2t_{UF}.zip`, 123 GB nos 27
estados). Cada urna tem um `*-log.jez` (um zip com `logd.dat`, texto em latin-1): uma linha por evento, com a data e a hora LOCAIS.
O log guarda a vida inteira da urna (preparação, 1º e 2º turnos), por isso as duas contas saem dos mesmos arquivos. Em cerca de
2% das urnas o .jez traz, além do `logd.dat`, outro .jez com um log arquivado: o da urna substituída no meio do dia (os votos de
antes da troca) ou o da carga anterior (o 1º turno). Os dois entram na conta.

Para cada estado, da menor para a maior: baixa o zip (se ainda não estiver no disco), lê só os logs, em paralelo, e guarda um
resumo em RAW_DIR/votos_horario; depois apaga o zip (`--manter` guarda). Para cada urna e cada turno:
  - voto = linha "O voto do eleitor foi computado" (aplicação VOTA) no dia da eleição;
  - fuso do município = 8 − a hora local mais comum de "Urna pronta para receber votos" das suas urnas no dia (a votação abre às
    8h de Brasília em todo o país); fora de {−1, 0, 1, 2, 3}, o script para;
  - conferência = votos do log no dia iguais ao comparecimento oficial da seção (2º turno: base_secao_2t_2026; 1º:
    base_secao_2026).
No fim, junta os estados e grava:
  data/processed/votos_depois_17h_secao_2026.parquet  uma linha por urna e turno (votos no log, depois das 17h e das 17h05,
                                                       último voto e início do encerramento em Brasília, fuso, confere)
  data/processed/votos_por_minuto_2026.parquet        votos por minuto de 16h00 a 19h29 (Brasília), por estado, turno e conferência
  resultados/15_votos_depois_17h.json                 os totais

Uso: python pipeline/15_votos_depois_17h.py [UF ...] [--manter] [--so-juntar]
"""
import argparse
import importlib
import io
import json
import os
import re
import sys
import time
import urllib.request
import zipfile
from concurrent.futures import ProcessPoolExecutor

import duckdb
import numpy as np
import pandas as pd

from config import PROCESSED_DIR, RAW_DIR, ROOT, UFS
from tse import salvar

baixar_tse = importlib.import_module("01_baixar_tse")

URL = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/arqurnatot/bu_imgbu_logjez_rdv_vscmr_2026_2t_{uf}.zip"
PASTA_ZIP = RAW_DIR / "arquivos_urna_2t"
PASTA = RAW_DIR / "votos_horario"
DIAS = {b"25/10/2026": 2, b"04/10/2026": 1}
EVENTO = re.compile(
    rb"^(25/10/2026|04/10/2026) (\d\d):(\d\d):(\d\d)\tINFO\t[^\t]*\tVOTA\t"
    rb"(O voto do eleitor foi computado|Urna pronta para receber votos|Inicio do Encerramento)[^\n]*",
    re.M,
)
NOME = re.compile(r"o\d{5}[a-z]{2}(\d{5})(\d{4})(\d{4})-log\.jez$")
LOCAL_DESDE = 13 * 3600  # guarda a hora dos votos só a partir das 13h locais: cobre 16h de Brasília em qualquer fuso
H17, H1705 = 17 * 3600, 17 * 3600 + 5 * 60
MIN_INICIO, MIN_FIM = 16 * 60, 19 * 60 + 30  # janela por minuto, em Brasília
FUSOS_VALIDOS = {-1, 0, 1, 2, 3}
ORDEM = sorted(UFS, key=lambda uf: (uf == "SP", uf))  # SP (26 GB) por último


def logs_do_jez(dados: bytes) -> tuple[list[bytes], int]:
    """Os `logd.dat` de um `*-log.jez`: o da urna e os que vêm arquivados dentro dele, em outro .jez (o log da urna substituída
    no dia ou o da carga anterior, com o 1º turno). Devolve os textos e quantos .jez internos não abriram."""
    textos, ilegiveis = [], 0
    with zipfile.ZipFile(io.BytesIO(dados)) as z:
        for nome in z.namelist():
            if nome.endswith(".jez"):
                try:
                    t, i = logs_do_jez(z.read(nome))
                except zipfile.BadZipFile:
                    t, i = [], 1
                textos += t
                ilegiveis += i
            elif nome.endswith("logd.dat"):
                textos.append(z.read(nome))
    return textos, ilegiveis


def ler_logs(args: tuple[str, list[str]]) -> list[dict]:
    """Lê um lote de logs de um zip de estado. Devolve, por urna e turno, a abertura, o encerramento e os votos."""
    caminho, nomes = args
    saida = []
    with zipfile.ZipFile(caminho) as z:
        for nome in nomes:
            m = NOME.search(nome)
            if not m:
                continue
            cd, zona, secao = (int(x) for x in m.groups())
            try:
                textos, ilegiveis = logs_do_jez(z.read(nome))
            except zipfile.BadZipFile:
                textos, ilegiveis = [], 1
            if ilegiveis:
                saida.append({"cd": cd, "zona": zona, "secao": secao, "turno": 0, "erro": True})
            por_turno: dict[int, dict] = {}
            vistas: set[bytes] = set()  # a mesma linha (com o hash) em dois logs conta uma vez
            for texto in textos:
                for ev in EVENTO.finditer(texto):
                    if ev.group(0) in vistas:
                        continue
                    vistas.add(ev.group(0))
                    dia, h, mi, s, evento = ev.groups()
                    turno = DIAS[dia]
                    seg = int(h) * 3600 + int(mi) * 60 + int(s)
                    t = por_turno.setdefault(turno, {"abertura": None, "encerramento": None, "n": 0, "horas": []})
                    if evento == b"O voto do eleitor foi computado":
                        t["n"] += 1
                        if seg >= LOCAL_DESDE:
                            t["horas"].append(seg)
                    elif evento == b"Urna pronta para receber votos":  # a primeira abertura do dia, entre as urnas da seção
                        t["abertura"] = seg if t["abertura"] is None else min(t["abertura"], seg)
                    else:  # o último início de encerramento
                        t["encerramento"] = seg if t["encerramento"] is None else max(t["encerramento"], seg)
            for turno, t in por_turno.items():
                saida.append({"cd": cd, "zona": zona, "secao": secao, "turno": turno, "erro": False,
                              "abertura": t["abertura"], "encerramento": t["encerramento"], "n": t["n"],
                              "horas": np.array(t["horas"], dtype=np.int32)})
    return saida


def processar_uf(uf: str, manter: bool) -> None:
    destino_urnas = PASTA / f"urnas_{uf}.parquet"
    if destino_urnas.exists():
        print(f"[ok] {uf} já processado")
        return
    zip_uf = PASTA_ZIP / f"bu_imgbu_logjez_rdv_vscmr_2026_2t_{uf}.zip"
    t0 = time.time()
    baixar_tse.baixar(URL.format(uf=uf), zip_uf)
    t1 = time.time()
    with zipfile.ZipFile(zip_uf) as z:
        nomes = [n for n in z.namelist() if n.endswith("-log.jez")]
    n_proc = max(1, min(8, (os.cpu_count() or 2) - 1))
    lotes = [(str(zip_uf), nomes[i::n_proc * 4]) for i in range(n_proc * 4)]
    registros = []
    with ProcessPoolExecutor(n_proc) as ex:
        for parte in ex.map(ler_logs, lotes):
            registros.extend(parte)
    t2 = time.time()

    erros = [r for r in registros if r["erro"]]
    urnas = pd.DataFrame([r for r in registros if not r["erro"]])
    if urnas.empty:
        sys.exit(f"[FALHA] {uf}: nenhum log lido")
    # fuso de cada município: 8 − a hora local mais comum de abertura no dia (do 2º turno; o 1º confere abaixo)
    ab = urnas[urnas.abertura.notna()].assign(hora=lambda d: (d.abertura // 3600).astype(int))
    moda = ab.groupby(["cd", "turno"]).hora.agg(lambda h: h.mode().iloc[0]).unstack()
    fuso = 8 - moda[2].fillna(moda.get(1))
    # município sem abertura registrada em nenhum turno (raro): o fuso mais comum do estado
    fuso = fuso.reindex(urnas.cd.unique()).fillna(fuso.mode().iloc[0]).astype(int).rename("fuso")
    if not set(fuso.unique()) <= FUSOS_VALIDOS:
        sys.exit(f"[FALHA] {uf}: fuso fora do esperado: {sorted(set(fuso.unique()))}")
    if 1 in moda.columns:
        diverge = moda[1].notna() & moda[2].notna() & (moda[1] != moda[2])
        if diverge.any():
            sys.exit(f"[FALHA] {uf}: hora de abertura diferente entre os turnos em {int(diverge.sum())} municípios")
    urnas = urnas.join(fuso, on="cd")
    desloc = urnas.fuso * 3600

    linhas, tardios = [], []
    minutos = np.zeros((3, MIN_FIM - MIN_INICIO), dtype=np.int64)  # linhas 1 e 2 = turnos
    for r, d in zip(urnas.itertuples(index=False), desloc):
        h = r.horas + d  # em Brasília
        linhas.append((r.cd, r.zona, r.secao, r.turno, r.n, int((h >= H17).sum()), int((h >= H1705).sum()),
                       int(h.max()) if len(h) else None,
                       None if r.encerramento is None or pd.isna(r.encerramento) else int(r.encerramento + d),
                       None if r.abertura is None or pd.isna(r.abertura) else int(r.abertura + d), r.fuso))
        m = h // 60
        m = m[(m >= MIN_INICIO) & (m < MIN_FIM)] - MIN_INICIO
        np.add.at(minutos[r.turno], m, 1)
        # a hora exata dos votos a partir de 16h55 (poucos): a curva das urnas que conferem sai deles no fim
        for s in h[h >= H17 - 300]:
            tardios.append((r.cd, r.zona, r.secao, r.turno, int(s)))
    resumo = pd.DataFrame(linhas, columns=["CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NR_TURNO", "VOTOS_LOG", "VOTOS_DEPOIS_17H",
                                           "VOTOS_DEPOIS_1705", "ULTIMO_VOTO_S", "ENCERRAMENTO_S", "ABERTURA_S", "FUSO"])
    resumo.insert(0, "SG_UF", uf)
    PASTA.mkdir(parents=True, exist_ok=True)
    por_minuto = pd.DataFrame([(uf, t, MIN_INICIO + i, int(minutos[t, i])) for t in (1, 2) for i in range(MIN_FIM - MIN_INICIO)],
                              columns=["SG_UF", "NR_TURNO", "MINUTO", "VOTOS"])
    tardios = pd.DataFrame(tardios, columns=["CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NR_TURNO", "SEGUNDO"]).assign(SG_UF=uf)
    con = duckdb.connect()
    con.register("por_minuto", por_minuto)
    con.register("tardios", tardios)
    salvar(con, "SELECT * FROM por_minuto ORDER BY ALL", PASTA / f"minutos_{uf}.parquet", verbose=False)
    salvar(con, "SELECT * FROM tardios ORDER BY ALL", PASTA / f"tardios_{uf}.parquet", verbose=False)
    con.register("resumo", resumo)
    # o resumo das urnas por último: é ele que marca o estado como processado
    salvar(con, "SELECT * FROM resumo ORDER BY ALL", destino_urnas, verbose=False)
    print(f"[ok] {uf}: {len(nomes):,} logs ({len(erros)} ilegíveis), {len(resumo):,} urna-turnos; "
          f"download {t1 - t0:,.0f} s, leitura {t2 - t1:,.0f} s; depois das 17h no 2º turno: "
          f"{int(resumo[resumo.NR_TURNO == 2].VOTOS_DEPOIS_17H.sum()):,}", flush=True)
    if not manter:
        zip_uf.unlink()


def juntar() -> None:
    urnas = pd.concat([pd.read_parquet(PASTA / f"urnas_{uf}.parquet") for uf in UFS], ignore_index=True)
    chave = ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO"]
    oficial = pd.concat([
        pd.read_parquet(PROCESSED_DIR / "base_secao_2026.parquet", columns=[*chave, "QT_COMPARECIMENTO"]).assign(NR_TURNO=1),
        pd.read_parquet(PROCESSED_DIR / "base_secao_2t_2026.parquet", columns=[*chave, "QT_COMPARECIMENTO"]).assign(NR_TURNO=2),
    ])
    j = urnas.merge(oficial, on=[*chave, "NR_TURNO"], how="outer", indicator=True)
    j["CONFERE"] = (j._merge == "both") & (j.VOTOS_LOG == j.QT_COMPARECIMENTO)
    sem_log = j[j._merge == "right_only"].groupby("NR_TURNO").size().to_dict()
    sem_oficial = j[j._merge == "left_only"].groupby("NR_TURNO").size().to_dict()
    urnas = j[j._merge != "right_only"].drop(columns="_merge")

    con = duckdb.connect()
    con.register("urnas", urnas)
    salvar(con, "SELECT * FROM urnas ORDER BY SG_UF, CD_MUNICIPIO, NR_ZONA, NR_SECAO, NR_TURNO",
           PROCESSED_DIR / "votos_depois_17h_secao_2026.parquet")
    # votos por minuto: todas as urnas (16h00 a 19h29) e, a partir de 16h55, só as urnas cujo log confere com o oficial
    minutos = pd.concat([pd.read_parquet(PASTA / f"minutos_{uf}.parquet") for uf in UFS], ignore_index=True)
    tardios = pd.concat([pd.read_parquet(PASTA / f"tardios_{uf}.parquet") for uf in UFS], ignore_index=True)
    tardios = tardios.merge(urnas[[*chave, "NR_TURNO", "CONFERE"]], on=[*chave, "NR_TURNO"], how="left")
    conf_min = (tardios[tardios.CONFERE.fillna(False)].assign(MINUTO=lambda d: d.SEGUNDO // 60)
                .groupby(["SG_UF", "NR_TURNO", "MINUTO"]).size().rename("VOTOS_URNAS_QUE_CONFEREM"))
    minutos = minutos.join(conf_min, on=["SG_UF", "NR_TURNO", "MINUTO"])
    minutos.loc[minutos.MINUTO >= H17 // 60 - 5, "VOTOS_URNAS_QUE_CONFEREM"] = (
        minutos.loc[minutos.MINUTO >= H17 // 60 - 5, "VOTOS_URNAS_QUE_CONFEREM"].fillna(0))
    con.register("minutos", minutos)
    salvar(con, "SELECT * FROM minutos ORDER BY NR_TURNO, SG_UF, MINUTO", PROCESSED_DIR / "votos_por_minuto_2026.parquet")

    saida = {"fonte": "TSE, arquivos de urna do 2º turno (bu_imgbu_logjez_rdv_vscmr_2026_2t_{UF}.zip), logs das urnas",
             "desenho": "docs/plano_de_analise.md, 'Votos depois das 17h' (registrado em 29/10/2026, antes de rodar)",
             "turnos": {}}
    for turno, g in urnas.groupby("NR_TURNO"):
        conf = g[g.CONFERE]
        ultimo = g.ULTIMO_VOTO_S.max()
        saida["turnos"][str(int(turno))] = {
            "urnas_com_log": int(len(g)),
            "urnas_sem_log": int(sem_log.get(turno, 0)),
            "urnas_sem_resultado_oficial": int(sem_oficial.get(turno, 0)),
            "urnas_conferem": int(len(conf)),
            "votos_log": int(g.VOTOS_LOG.sum()),
            "comparecimento_oficial": int(oficial[oficial.NR_TURNO == turno].QT_COMPARECIMENTO.sum()),
            "votos_depois_17h": int(g.VOTOS_DEPOIS_17H.sum()),
            "votos_depois_1705": int(g.VOTOS_DEPOIS_1705.sum()),
            "votos_depois_17h_urnas_que_conferem": int(conf.VOTOS_DEPOIS_17H.sum()),
            "urnas_com_voto_depois_17h": int((g.VOTOS_DEPOIS_17H > 0).sum()),
            "urnas_com_voto_depois_1705": int((g.VOTOS_DEPOIS_1705 > 0).sum()),
            "ultimo_voto": None if pd.isna(ultimo) else f"{int(ultimo) // 3600:02d}:{int(ultimo) % 3600 // 60:02d}:{int(ultimo) % 60:02d}",
            "por_uf": {uf: int(v) for uf, v in g.groupby("SG_UF").VOTOS_DEPOIS_17H.sum().items()},
            # minuto a minuto, de 16h00 a 19h29 (Brasília), no país: todas as urnas
            "por_minuto": {f"{m // 60:02d}:{m % 60:02d}": int(v)
                           for m, v in minutos[minutos.NR_TURNO == turno].groupby("MINUTO").VOTOS.sum().items()},
        }
    (ROOT / "resultados" / "15_votos_depois_17h.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({t: {k: v for k, v in d.items() if k != "por_uf"} for t, d in saida["turnos"].items()}, ensure_ascii=False, indent=1))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("ufs", nargs="*", help="estados (padrão: os 27, SP por último)")
    p.add_argument("--manter", action="store_true", help="não apaga o zip depois de ler")
    p.add_argument("--so-juntar", action="store_true", help="só junta os estados já processados")
    args = p.parse_args()
    PASTA_ZIP.mkdir(parents=True, exist_ok=True)
    if not args.so_juntar:
        for uf in [u.upper() for u in args.ufs] or ORDEM:
            processar_uf(uf, args.manter)
    if all((PASTA / f"urnas_{uf}.parquet").exists() for uf in UFS):
        juntar()
    else:
        faltam = [uf for uf in UFS if not (PASTA / f"urnas_{uf}.parquet").exists()]
        print(f"[parcial] faltam {len(faltam)} estados: {', '.join(faltam)}")


if __name__ == "__main__":
    main()
