"""Gera a imagem de compartilhamento do site (og:image, 1200×630) a partir de site/scripts/og.html.

Uso: python site/scripts/og.py   (saída em site/public/og.png, versionada)
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).parent
SAIDA = AQUI.parent / "public" / "og.png"


def main() -> None:
    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        pagina = navegador.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        pagina.goto((AQUI / "og.html").resolve().as_uri())
        pagina.screenshot(path=str(SAIDA))
        navegador.close()
    print(f"[ok] {SAIDA} ({SAIDA.stat().st_size / 1e3:.0f} kB)")


if __name__ == "__main__":
    main()
