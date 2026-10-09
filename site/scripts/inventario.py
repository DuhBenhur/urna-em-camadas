"""Inventário do conteúdo do site: palavras visíveis, jargão técnico visível, altura e seções de cada página.

Mede o que a pessoa vê: texto dentro de "Como sabemos" e outros recolhíveis fechados não conta. Serve de linha de base e de
critério para a reorganização (docs/plano_reorganizacao.md): jargão só na área técnica.

Antes, em outro terminal:  cd site && npm run build && npx vite preview --port 4173
Uso:  python site/scripts/inventario.py                        # rotas padrão, preview local
      python site/scripts/inventario.py --rotas "#/,#/metodo"   # rotas específicas
      python site/scripts/inventario.py --base https://duhbenhur.github.io/urna-em-camadas/
"""
import argparse
import re
import time

from playwright.sync_api import sync_playwright

ROTAS = ["#/", "#/virar?c=13", "#/virar?c=13&uf=SP&m=71072", "#/urna/SP/403/411?c=13", "#/municipio/71072",
         "#/mapa?v=virar", "#/analise", "#/conferencia", "#/metodo", "#/dados", "#/sobre"]

# termos que pedem formação técnica para entender (palavra inteira; "analisa" não conta como LISA)
JARGAO = ["ICC", "logit", "BLUP", "Shapley", "Mundlak", "LISA", "SKATER", "gpboost", "statsmodels", "Moran", "multinível",
          "step-up", "processo gaussiano", "inclinação aleatória", "variância", "desvio-padrão", "Parquet", "JSON", "pipeline",
          "SHA-512", "verossimilhança", "bootstrap", "efeito aleatório", "intraclasse", "coeficiente", "regressão", "DuckDB",
          "intervalo de 95%", "χ²", "haversine", "OKLCH"]
PADROES = {j: re.compile(rf"(?<!\w){re.escape(j)}(?!\w)", re.IGNORECASE) for j in JARGAO}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://localhost:4173/")
    p.add_argument("--rotas", default=",".join(ROTAS))
    args = p.parse_args()
    with sync_playwright() as pw:
        try:
            nav = pw.chromium.launch(channel="chrome")
        except Exception:
            nav = pw.chromium.launch()
        pg = nav.new_page(viewport={"width": 1280, "height": 900})
        pg.goto(args.base + "#/")
        pg.wait_for_load_state("networkidle")
        print("MENU:", " | ".join(pg.locator("nav.navegacao a").all_inner_texts()))
        for rota in args.rotas.split(","):
            pg.goto(args.base + rota)
            pg.wait_for_load_state("networkidle")
            time.sleep(3)
            texto = pg.locator("main").inner_text()
            palavras = len(re.findall(r"\w+", texto))
            achados = {j: len(r.findall(texto)) for j, r in PADROES.items()}
            achados = {j: n for j, n in achados.items() if n}
            altura = pg.evaluate("document.documentElement.scrollHeight")
            recolhiveis = pg.locator("main details").count()
            titulos = pg.evaluate("() => [...document.querySelectorAll('main h1, main h2')].map(h => h.tagName + ' ' + h.textContent.trim().slice(0, 70))")
            print(f"\n=== {rota}\n    palavras visíveis {palavras} · jargão {sum(achados.values())} {achados} · altura {altura}px · recolhíveis {recolhiveis}")
            for t in titulos:
                print("   ", t)
        nav.close()


if __name__ == "__main__":
    main()
