"""Leitura dos arquivos do TSE, compartilhada pelos scripts do pipeline."""
import zipfile
from pathlib import Path

import duckdb


def sql_csv(csv: Path) -> str:
    """Fonte DuckDB para um CSV do TSE.

    all_varchar: o TSE usa "#NULO#" e -1 em colunas numéricas; a conversão é feita no SELECT.
    """
    return f"read_csv('{csv.as_posix()}', delim=';', quote='\"', header=true, encoding='latin-1', all_varchar=true)"


def extrair(zip_path: Path, destino_dir: Path, membro: str | None = None) -> Path:
    """Extrai um CSV do zip (o primeiro .csv, se `membro` não for informado). Reaproveita se já extraído."""
    with zipfile.ZipFile(zip_path) as z:
        membro = membro or next(n for n in z.namelist() if n.endswith(".csv"))
        info = z.getinfo(membro)
        destino = destino_dir / membro
        if not (destino.exists() and destino.stat().st_size == info.file_size):
            z.extract(info, destino_dir)
    return destino


def salvar(con: duckdb.DuckDBPyConnection, sql: str, destino: Path, verbose: bool = True) -> None:
    """Grava o resultado de uma consulta em Parquet (zstd).

    Escreve num arquivo temporário e renomeia no fim, para que uma execução interrompida
    nunca deixe um Parquet incompleto com o nome definitivo.
    """
    parcial = destino.with_name(destino.name + ".part")
    con.execute(f"COPY ({sql}) TO '{parcial.as_posix()}' (FORMAT parquet, COMPRESSION zstd)")
    parcial.replace(destino)
    if verbose:
        linhas = con.execute(f"SELECT count(*) FROM '{destino.as_posix()}'").fetchone()[0]
        print(f"[ok] {destino.name}: {linhas:,} linhas, {destino.stat().st_size / 1e6:.1f} MB")
