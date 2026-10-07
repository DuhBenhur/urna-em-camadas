"""Baixa os arquivos brutos do TSE para RAW_DIR e confere o SHA-512 quando o TSE o publica.

Uso: python pipeline/01_baixar_tse.py
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

from config import COM_HASH, FONTES, RAW_DIR

CHUNK = 8 * 1024 * 1024


def tamanho_remoto(url: str) -> int:
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return int(resp.headers["Content-Length"])


def baixar(url: str, destino: Path) -> None:
    total = tamanho_remoto(url)
    if destino.exists() and destino.stat().st_size == total:
        print(f"[ok] {destino.name} já baixado ({total / 1e6:.0f} MB)")
        return
    parcial = destino.with_suffix(destino.suffix + ".part")
    lido = 0
    with urllib.request.urlopen(url, timeout=120) as resp, open(parcial, "wb") as f:
        while bloco := resp.read(CHUNK):
            f.write(bloco)
            lido += len(bloco)
    print(f"[baixado] {destino.name}: {lido / 1e6:,.0f} MB", flush=True)
    if lido != total:
        sys.exit(f"[erro] {destino.name}: recebidos {lido} bytes, esperados {total}")
    parcial.replace(destino)


def conferir_sha512(url: str, arquivo: Path) -> None:
    with urllib.request.urlopen(url + ".sha512", timeout=60) as resp:
        esperado = resp.read().decode().split()[0].strip().lower()
    h = hashlib.sha512()
    with open(arquivo, "rb") as f:
        while bloco := f.read(CHUNK):
            h.update(bloco)
    if h.hexdigest() != esperado:
        sys.exit(f"[erro] SHA-512 não confere para {arquivo.name}")
    print(f"[ok] SHA-512 confere: {arquivo.name}")


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Destino: {RAW_DIR}")
    for nome, url in FONTES.items():
        destino = RAW_DIR / nome
        baixar(url, destino)
        if nome in COM_HASH:
            conferir_sha512(url, destino)


if __name__ == "__main__":
    main()
