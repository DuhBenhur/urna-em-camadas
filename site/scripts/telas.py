"""QA visual do site: screenshots em desktop e celular, temas claro e escuro, com erros de console.

Antes, em outro terminal:  cd site && npm run build && npx vite preview --port 4173
Uso:  python site/scripts/telas.py                       # páginas principais
      python site/scripts/telas.py "#/urna/SP/1/240"     # rotas específicas, separadas por vírgula
      python site/scripts/telas.py "#/mapa" --seletor .mapa --espera 8   # recorte de um elemento

Saída em site/scripts/telas/ (fora do git). Requer: pip install playwright && python -m playwright install chromium
"""
import argparse
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173/"
SAIDA = Path(__file__).parent / "telas"
PADRAO = ["#/", "#/urna/SP/1/240", "#/mapa", "#/municipio/71072", "#/metodo"]
MODOS = [("desktop", 1280, "light"), ("celular", 390, "dark")]
ESPERA_MAPAS = 8  # os mapas carregam malha e tiles depois do networkidle


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("rotas", nargs="?", default=",".join(PADRAO), help="rotas com #, separadas por vírgula")
    p.add_argument("--seletor", help="fotografa só este elemento (ex.: .mapa)")
    p.add_argument("--espera", type=float, help="segundos extras após carregar")
    args = p.parse_args()
    SAIDA.mkdir(exist_ok=True)

    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        for nome, largura, tema in MODOS:
            ctx = navegador.new_context(viewport={"width": largura, "height": 900}, color_scheme=tema,
                                        device_scale_factor=2 if args.seletor else 1)
            pagina = ctx.new_page()
            erros: list[str] = []
            pagina.on("console", lambda m: erros.append(f"{m.type}: {m.text[:160]}")
                      if m.type == "error" or (m.type == "warning" and "GL Driver" not in m.text) else None)
            pagina.on("pageerror", lambda e: erros.append(f"pageerror: {e}"))
            for rota in args.rotas.split(","):
                erros.clear()
                pagina.goto(BASE + rota)
                pagina.wait_for_load_state("networkidle")
                eh_mapa = "mapa" in rota or "municipio" in rota
                time.sleep(args.espera if args.espera is not None else (ESPERA_MAPAS if eh_mapa else 1.5))
                arquivo = SAIDA / f"{nome}_{rota.strip('#/').replace('/', '_') or 'inicio'}.png"
                if args.seletor:
                    pagina.locator(args.seletor).first.screenshot(path=str(arquivo))
                else:
                    pagina.screenshot(path=str(arquivo), full_page=True)
                print(f"{arquivo.name}: {len(erros)} erro(s)", *erros[:5], sep="\n  ")
            ctx.close()
        navegador.close()


if __name__ == "__main__":
    main()
