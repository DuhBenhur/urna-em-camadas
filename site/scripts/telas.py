"""QA visual do site: screenshots em desktop e celular, temas claro e escuro, com erros de console.

Antes, em outro terminal:  cd site && npm run build && npx vite preview --port 4173
Uso:  python site/scripts/telas.py                       # páginas principais
      python site/scripts/telas.py "#/urna/SP/1/240"     # rotas específicas, separadas por vírgula
      python site/scripts/telas.py "#/mapa" --seletor .mapa --espera 8   # recorte de um elemento

Saída em site/scripts/telas/ (fora do git). Requer: pip install playwright && python -m playwright install chromium
"""
import argparse
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173/"
SAIDA = Path(__file__).parent / "telas"
PADRAO = ["#/", "#/?c=13", "#/?c=22&a=abertos&uf=SP&m=71072", "#/?c=13&uf=SP&m=71072&perto=403-1554", "#/folha?m=71072&perto=403-1554", "#/como-usar",
          "#/urna/SP/403/411?c=13", "#/urna/SP/1/240", "#/conferencia", "#/entenda", "#/metodo", "#/metodo?sec=dados", "#/sobre",
          "#/?m=71072&aba=resultado", "#/?m=71072&aba=secao&local=403-1554", "#/mapa?v=virar&a=faltosos&c=13", "#/mapa", "#/mapa?v=bolsoes", "#/mapa?v=regioes"]
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
        # o Chrome instalado é o dos visitantes; o Chromium do Playwright fica versões atrás
        # (ex.: scrollTo passou a devolver Promise e derrubava o React só no Chrome)
        try:
            navegador = pw.chromium.launch(channel="chrome")
        except Exception:
            navegador = pw.chromium.launch()
        print(f"navegador: {navegador.browser_type.name} {navegador.version}")
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
                eh_mapa = any(p in rota for p in ("mapa", "municipio", "m="))  # "m=": o "Onde virar voto" de um município
                time.sleep(args.espera if args.espera is not None else (ESPERA_MAPAS if eh_mapa else 1.5))
                # "#/mapa?v=bolsoes" → "mapa_v-bolsoes" ("?" e "=" não valem em nome de arquivo no Windows)
                limpo = re.sub(r"[^\w-]+", "_", rota.strip("#/").replace("=", "-")).strip("_")
                arquivo = SAIDA / f"{nome}_{limpo or 'inicio'}.png"
                if args.seletor:
                    pagina.locator(args.seletor).first.screenshot(path=str(arquivo))
                elif eh_mapa:
                    # a captura de página inteira redimensiona a janela no meio da foto, e o canvas do mapa (WebGL) sai
                    # desenhado pela metade; com mapa, a janela cresce até a altura da página, o mapa redesenha, e a
                    # foto é só da janela
                    altura = pagina.evaluate("document.documentElement.scrollHeight")
                    pagina.set_viewport_size({"width": largura, "height": altura})
                    time.sleep(2.5)
                    pagina.screenshot(path=str(arquivo))
                    pagina.set_viewport_size({"width": largura, "height": 900})
                else:
                    pagina.screenshot(path=str(arquivo), full_page=True)
                print(f"{arquivo.name}: {len(erros)} erro(s)", *erros[:5], sep="\n  ")
            ctx.close()
        navegador.close()


if __name__ == "__main__":
    main()
