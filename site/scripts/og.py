"""Gera a imagem de compartilhamento do site (og:image, 1200×630) a partir de site/scripts/og.html.

JPEG abaixo de 300 kB: acima disso, o WhatsApp costuma não mostrar a prévia do link (a foto da abertura não cabe em PNG).

Uso: python site/scripts/og.py   (saída em site/public/og.jpg, versionada)
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).parent
SAIDA = AQUI.parent / "public" / "og.jpg"
LIMITE_KB = 300


def main() -> None:
    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        pagina = navegador.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        pagina.goto((AQUI / "og.html").resolve().as_uri())
        for qualidade in (86, 80, 74, 68):
            pagina.screenshot(path=str(SAIDA), type="jpeg", quality=qualidade)
            if SAIDA.stat().st_size <= LIMITE_KB * 1000:
                break
        navegador.close()
    tamanho = SAIDA.stat().st_size / 1e3
    print(f"[{'ok' if tamanho <= LIMITE_KB else 'aviso: acima do limite'}] {SAIDA} ({tamanho:.0f} kB, qualidade {qualidade})")


if __name__ == "__main__":
    main()
