"""Gera as miniaturas do mapa do saldo possível de cada candidato, para o passo 1 da ferramenta ("Para quem?").

São fotos do próprio mapa do site (vista "Onde virar voto", conversa "lembrar quem faltou"), no tema claro e no escuro, com
o fundo transparente. Ficam versionadas em site/public/miniaturas/; rodar de novo só se os dados ou as cores mudarem.

Antes, em outro terminal:  cd site && npm run build && npx vite preview --port 4173
Uso: python site/scripts/miniaturas.py
"""
import io
import time
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173/"
SAIDA = Path(__file__).resolve().parents[1] / "public" / "miniaturas"
LARGURA = 360  # o dobro do tamanho na tela, para ficar nítido em celular
ESCONDER = ".maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-attrib, .dica { display: none !important }"


def recortar(png: bytes) -> Image.Image:
    """Recorta o Brasil (o que não é fundo), deixa o fundo transparente e reduz as cores para o arquivo ficar leve."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    # sem a borda arredondada do quadro do mapa, que entraria no recorte
    im = im.crop((8, 8, im.width - 8, im.height - 8))
    fundo = im.getpixel((2, 2))
    diferenca = ImageChops.difference(im, Image.new("RGB", im.size, fundo)).convert("L").point(lambda v: 255 if v > 8 else 0)
    caixa = diferenca.getbbox()
    if caixa:
        x0, y0, x1, y1 = caixa
        im = im.crop((max(0, x0 - 4), max(0, y0 - 4), min(im.width, x1 + 4), min(im.height, y1 + 4)))
        diferenca = diferenca.crop((max(0, x0 - 4), max(0, y0 - 4), min(diferenca.width, x1 + 4), min(diferenca.height, y1 + 4)))
    altura = round(im.height * LARGURA / im.width)
    rgba = im.convert("RGBA")
    rgba.putalpha(diferenca)
    rgba = rgba.resize((LARGURA, altura), Image.LANCZOS)
    return rgba.quantize(colors=64, method=Image.Quantize.FASTOCTREE)


def main() -> None:
    SAIDA.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        navegador = pw.chromium.launch(channel="chrome")
        for esquema, tema in (("light", "claro"), ("dark", "escuro")):
            ctx = navegador.new_context(viewport={"width": 1000, "height": 1100}, color_scheme=esquema)
            pg = ctx.new_page()
            for n in (13, 22):
                pg.goto(f"{BASE}#/mapa?v=virar&a=faltosos&c={n}")
                pg.wait_for_load_state("networkidle")
                pg.add_style_tag(content=ESCONDER)
                time.sleep(6)
                imagem = recortar(pg.locator(".mapa").first.screenshot())
                arquivo = SAIDA / f"saldo-{n}-{tema}.png"
                imagem.save(arquivo, optimize=True)
                print(f"{arquivo.name}: {imagem.width}x{imagem.height}, {arquivo.stat().st_size / 1e3:.0f} kB")
            ctx.close()
        navegador.close()


if __name__ == "__main__":
    main()
