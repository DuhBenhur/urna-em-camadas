"""Testes no navegador: os critérios de pronto do plano "Onde virar voto" (docs/plano_virar_voto.md) e as regras do
conteúdo público. Rodam contra o preview local ou contra o site publicado.

Antes, em outro terminal:  cd site && npm run build && npx vite preview --port 4173
Uso:  python site/scripts/testes.py                                              # local
      python site/scripts/testes.py https://duhbenhur.github.io/urna-em-camadas/   # ao vivo
      python site/scripts/testes.py --so candidato,acao                           # só algumas baterias

Baterias: candidato (P0.2), acao (P0.3 a P0.5), perfil (P1.1), publico (P1.2 a P2.2 e regras do conteúdo público).
Cada bateria abre o navegador do zero (a escolha do candidato fica na sessionStorage da aba e vazaria de uma para outra).
Sai com código 1 se algum critério falhar. Quando a estrutura do site mudar, estes testes mudam junto.
Requer: pip install playwright (usa o Chrome instalado; sem ele, o Chromium do Playwright).
"""
import argparse
import hashlib
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

falhas: list[str] = []


def conferir(rotulo: str, ok: bool, detalhe: str = "") -> None:
    print(f"[{'ok' if ok else 'FALHA'}] {rotulo} {detalhe}")
    if not ok:
        falhas.append(rotulo)


def abrir(pg, url: str, espera: float = 2.0) -> None:
    pg.goto(url)
    pg.wait_for_load_state("networkidle")
    time.sleep(espera)


def esperar(pg, espera: float = 2.0) -> None:
    """Depois de um clique ou do "voltar": espera a página assentar, sem navegar de novo."""
    pg.wait_for_load_state("networkidle")
    time.sleep(espera)


def endereco(pg) -> str:
    """O endereço de verdade: depois de um redirecionamento no mesmo documento, o pg.url do Playwright pode ficar parado."""
    return pg.evaluate("location.href")


def abrir_zona_secao(pg) -> None:
    """Na ferramenta (inicial), o formulário de zona e seção fica recolhido em "Tenho a zona e a seção"."""
    if not pg.locator("details.zona-secao").evaluate("d => d.open"):
        pg.locator("details.zona-secao > summary").click()
        time.sleep(0.3)


def vigiar(pg, erros: list[str]) -> None:
    pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)


def pressionados(pg) -> list[str]:
    """Botões de candidato pressionados (fora dos botões de ação, cujo texto também cita o candidato)."""
    return pg.evaluate("""() => [...document.querySelectorAll('button[aria-pressed="true"]')]
        .filter(b => !b.closest('.lentes')).map(b => b.textContent.trim()).filter(t => /Lula|Flávio/.test(t))""")


# prosa: parágrafos e itens de lista do conteúdo (não rótulos, legendas de gráfico nem mapa)
FONTES_PEQUENAS = """() => [...document.querySelectorAll('main p, main li, main dt, main dd')]
  .filter(el => el.offsetParent !== null && el.innerText.trim().length > 20 && !el.closest('.legenda, .legenda-escala, .rotulo-pequeno, .maplibregl-map, .grafico'))
  .map(el => [parseFloat(getComputedStyle(el).fontSize), el.innerText.trim().slice(0, 50)])
  .filter(([px]) => px < 16)"""


def bateria_candidato(nav, b: str) -> None:
    """P0.2: o candidato escolhido viaja pelo site e sobrevive ao recarregar."""
    erros: list[str] = []
    ctx = nav.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    vigiar(pg, erros)
    abrir(pg, b + "#/", 1)
    pg.locator(".escolha-candidato button", has_text="Flávio").click()
    time.sleep(1)
    abrir(pg, b + "#/", 1)
    abrir_zona_secao(pg)
    pg.select_option("#b-uf", "SP")
    pg.fill("#b-zona", "1")
    pg.fill("#b-secao", "240")
    pg.get_by_role("button", name="Ver minha urna").click()
    esperar(pg, 1.5)
    conferir("busca leva ?c=22 para a urna", pg.url.endswith("#/urna/SP/1/240?c=22"), pg.url)
    p = pressionados(pg)
    conferir("urna: Flávio pressionado", bool(p) and all("Flávio" in t for t in p), str(p))
    pg.get_by_role("link", name="São Paulo (SP)").first.click()
    pg.wait_for_load_state("networkidle")
    time.sleep(2)
    pg.get_by_role("button", name="Surpresa").click()
    time.sleep(1)
    conferir("município: Flávio pressionado", pressionados(pg) == ["Flávio Bolsonaro (PL)"], str(pressionados(pg)))
    pg.reload()
    pg.wait_for_load_state("networkidle")
    time.sleep(2)
    pg.get_by_role("button", name="Surpresa").click()
    time.sleep(1)
    conferir("município depois de recarregar: Flávio", pressionados(pg) == ["Flávio Bolsonaro (PL)"], str(pressionados(pg)))
    abrir(pg, b + "#/mapa?v=efeito")
    conferir("mapa: Flávio pressionado", pressionados(pg) == ["Flávio Bolsonaro (PL)"], str(pressionados(pg)))
    abrir(pg, b + "#/analise")
    p = pressionados(pg)
    conferir("análise: Flávio em todos os seletores", len(p) > 1 and all("Flávio" in t for t in p), f"{len(p)} seletores")
    abrir(pg, b + "#/virar", 1.5)
    conferir("#/virar (endereço antigo) abre a ferramenta", endereco(pg).endswith("#/"), endereco(pg))
    conferir("virar sem ?c: Flávio já escolhido", pressionados(pg) == ["Flávio Bolsonaro (PL)"], str(pressionados(pg)))
    abrir(pg, b + "#/urna/SP/1/240", 1.5)
    pg.get_by_role("button", name="Lula (PT)").first.click()
    time.sleep(0.5)
    conferir("urna: trocar para Lula põe ?c=13 na URL", pg.url.endswith("?c=13"), pg.url)
    abrir(pg, b + "#/mapa?v=efeito", 1.5)
    conferir("mapa segue a troca: Lula", pressionados(pg) == ["Lula (PT)"], str(pressionados(pg)))
    pg.get_by_role("button", name="Bolsões").click()
    time.sleep(0.5)
    conferir("mapa: trocar a vista mantém o candidato", "v=bolsoes" in pg.url and pressionados(pg) == ["Lula (PT)"], pg.url)
    pg2 = ctx.new_page()
    abrir(pg2, b + "#/urna/SP/1/240?c=22", 1.5)
    pg2.get_by_role("link", name="São Paulo (SP)").first.click()
    time.sleep(2)
    pg2.get_by_role("button", name="Surpresa").click()
    time.sleep(0.5)
    conferir("link com ?c=22 em aba nova leva Flávio ao município", pressionados(pg2) == ["Flávio Bolsonaro (PL)"], str(pressionados(pg2)))
    for rota in ["#/analise?cap=c-estado", "#/analise?c=c-estado"]:
        abrir(pg, b + rota)
        topo = pg.evaluate("() => document.getElementById('c-estado').getBoundingClientRect().top")
        conferir(f"{rota} abre no capítulo", abs(topo) < 140, f"(topo a {topo:.0f}px)")
    conferir("candidato: sem erros de console", not erros, str(erros[:3]))
    ctx.close()


def bateria_acao(nav, b: str) -> None:
    """P0.3 a P0.5: inicial, bloco de ação da urna e "perto de você" no mapa."""
    erros: list[str] = []
    ctx = nav.new_context(viewport={"width": 390, "height": 844}, color_scheme="dark")
    pg = ctx.new_page()
    vigiar(pg, erros)
    abrir(pg, b + "#/", 1.5)
    caixa = pg.locator(".escolha-candidato").bounding_box()
    conferir("celular 390x844: passo 1 sem rolar", caixa["y"] + caixa["height"] <= 844, f"(termina em {caixa['y'] + caixa['height']:.0f}px)")
    botoes = pg.locator(".escolha-candidato button").all()
    medidas = [(x.bounding_box()["width"], x.bounding_box()["height"]) for x in botoes]
    conferir("os dois candidatos com o mesmo tamanho", abs(medidas[0][0] - medidas[1][0]) < 1 and abs(medidas[0][1] - medidas[1][1]) < 1, str(medidas))
    pequenas = pg.evaluate(FONTES_PEQUENAS)
    conferir("inicial: nenhuma prosa abaixo de 16px", not pequenas, str(pequenas[:4]))
    conferir("celular: sem rolagem lateral", pg.evaluate("document.documentElement.scrollWidth") <= 390)
    abrir(pg, b + "#/urna/SP/403/411", 2.5)
    topo = pg.evaluate("() => document.getElementById('t-agir').getBoundingClientRect().top")
    conferir("celular: na urna, 'Daqui até o dia 25' na primeira tela", 0 < topo < 844, f"(topo a {topo:.0f}px)")
    ctx.close()

    ctx = nav.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    vigiar(pg, erros)
    abrir(pg, b + "#/", 1.5)
    abrir_zona_secao(pg)
    altura = pg.get_by_role("button", name="Ver minha urna").bounding_box()["height"]
    conferir("botão 'Ver minha urna' numa linha só", altura < 50, f"({altura:.0f}px)")
    pg.locator(".escolha-candidato button", has_text="Flávio").click()
    time.sleep(0.5)
    conferir("inicial: escolher Flávio põe ?c=22", pg.url.endswith("#/?c=22"), pg.url)
    conferir("conversa 'lembrar quem faltou' mostra o saldo de Flávio (4,7 milhões)", "4,7 milhões" in pg.locator(".lentes").first.inner_text())
    abrir_zona_secao(pg)
    pg.select_option("#b-uf", "SP")
    pg.fill("#b-zona", "403")
    pg.fill("#b-secao", "411")
    pg.get_by_role("button", name="Ver minha urna").click()
    esperar(pg, 2.5)
    conferir("busca leva à urna com ?c=22", pg.url.endswith("#/urna/SP/403/411?c=22"), pg.url)
    agir = pg.locator("#agir").inner_text()
    conferir("urna: escola de partida", "ELISIO TEIXEIRA LEITE" in agir)
    conferir("urna: 35 escolas perto", "35 escolas a até 2 km" in agir)
    conferir("urna, Flávio: não ficou à frente na escola", "Flávio não ficou à frente aqui" in agir)
    conferir("urna, Flávio: nenhuma das 35 escolas", "Flávio não ficou à frente em nenhuma das 35 escolas" in agir)
    pg.locator("#agir .abas button", has_text="Lula").click()
    time.sleep(0.5)
    conferir("urna, Lula: saldo perto 5.539", "5.539" in pg.locator("#agir").inner_text() and "?c=13" in pg.url, pg.url)
    conferir("urna: camadas seguem a troca (Lula)", pg.locator("section[aria-labelledby='t-camadas'] button[aria-pressed='true']").inner_text().startswith("Lula"))
    pg.get_by_role("link", name="Ver as escolas perto daqui no mapa").click()
    esperar(pg, 4)
    conferir("botão leva ao mapa com ?perto=", "perto=403-1554" in pg.url and "m=71072" in pg.url and "c=13" in pg.url, pg.url)
    conferir("mapa: tabela 'Perto de você'", pg.get_by_role("heading", name="Perto de você").count() == 1)
    linhas = pg.locator("h2:has-text('Perto de você') ~ .tabela-rolagem").first.locator("tbody tr").count()
    conferir("mapa: 10 primeiras escolas na tabela", linhas == 10, f"({linhas})")
    conferir("mapa carregado, com a legenda do anel", pg.locator(".maplibregl-map").count() == 1 and pg.locator(".chave-tracejada").count() == 1)
    pg.go_back()
    esperar(pg, 1.5)
    conferir("'voltar' do navegador volta à urna", "#/urna/SP/403/411" in pg.url, pg.url)
    abrir(pg, b + "#/", 1.5)
    pg.select_option("#v-uf", "PR")
    esperar(pg, 1.5)
    conferir("onde: estado", pg.url.endswith("#/?c=13&uf=PR") and pg.get_by_role("heading", name="Cidades do Paraná").count() == 1, pg.url)
    abrir(pg, b + "#/", 1.5)
    pg.fill("#v-mun", "Curitiba")
    time.sleep(0.5)
    pg.locator(".campo-municipio .sugestao").first.click()
    esperar(pg, 3)
    conferir("onde: cidade", "uf=PR" in pg.url and "m=" in pg.url and pg.get_by_role("heading", name="No mapa").count() == 1, pg.url)
    abrir(pg, b + "#/", 1.5)
    pg.get_by_role("link", name="Todas as regras, com os artigos da lei").click()
    esperar(pg, 2.5)
    topo = pg.evaluate("() => document.getElementById('lei').getBoundingClientRect().top")
    conferir("lei: abre no guia, no trecho 'Dentro da lei'", "#/como-usar?ir=lei" in pg.url and 0 < topo < 200, f"(topo a {topo:.0f}px) {pg.url}")
    conferir("lei completa traz o impulsionamento (art. 57-C)", "57-C" in pg.locator("#lei").inner_text())
    abrir(pg, b + "#/urna/SP/403/411", 2.5)
    pg.get_by_role("link", name="Como calculamos").click()
    esperar(pg, 2.5)
    topo = pg.evaluate("() => document.getElementById('conversas').getBoundingClientRect().top")
    conferir("como calculamos: abre no guia, em 'As três conversas'", "ir=conversas" in pg.url and 0 < topo < 200, f"(topo a {topo:.0f}px)")
    ctx.close()

    ctx = nav.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    vigiar(pg, erros)
    abrir(pg, b + "#/urna/SP/1/240", 2.5)
    soltos = pg.locator("#agir button[aria-pressed='true']").all_inner_texts()
    conferir("urna sem escolha: nenhum candidato marcado no bloco de ação", not any("Lula" in t or "Flávio" in t for t in soltos), str(soltos))
    conferir("urna sem escolha: pede para escolher", "Escolha para quem" in pg.locator("#agir").inner_text())
    conferir("ação: sem erros de console", not erros, str(erros[:3]))
    ctx.close()


def bateria_perfil(nav, b: str) -> None:
    """P1.1: a terceira ação, "onde o perfil promete mais" (experimental)."""
    erros: list[str] = []
    ctx = nav.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    vigiar(pg, erros)
    for c, esperado in ((13, "2.421.342"), (22, "2.080.423")):
        abrir(pg, b + f"#/virar?c={c}&a=perfil")
        conferir(f"Brasil, candidato {c}: abaixo do esperado {esperado}", esperado in pg.locator(".grade-3").first.inner_text())
        conferir(f"candidato {c}: selo experimental e aviso de que é pista",
                 pg.locator(".pilula-experimental").first.is_visible() and "pista, não como certeza" in pg.locator(".virar").inner_text())
    for cd in (9210, 71072):  # São Luís e São Paulo têm escolas sem surpresa (sem perfil publicado)
        abrir(pg, b + f"#/virar?c=13&a=perfil&m={cd}", 4)
        linhas = pg.locator("h2:has-text('Escolas') ~ .tabela-rolagem").first.locator("tbody tr").count()
        conferir(f"município {cd}: tabela de escolas da ação do perfil", linhas == 20, f"({linhas})")
    abrir(pg, b + "#/urna/SP/403/411?c=22&a=perfil", 3)
    agir = pg.locator("#agir").inner_text()
    conferir("urna (D9): sem a conversa do perfil, só as duas principais",
             "abaixo do esperado" not in agir and pg.locator("#agir .abas button").count() == 4, f"({pg.locator('#agir .abas button').count()} botões nas abas)")
    ctx.close()

    ctx = nav.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    vigiar(pg, erros)
    abrir(pg, b + "#/urna/SP/403/411?a=perfil", 3)
    conferir("urna sem candidato, ação do perfil: pede para escolher", "Escolha para quem" in pg.locator("#agir").inner_text())
    abrir(pg, b + "#/")
    avancada = pg.locator(".lentes-avancada").inner_text().replace("\n", " ")
    conferir("ferramenta sem escolha: a opção avançada traz os dois números", "Lula 2,4 milhões" in avancada and "Flávio 2,1 milhões" in avancada)
    abrir(pg, b + "#/?c=22")
    avancada = pg.locator(".lentes-avancada").inner_text()
    conferir("ferramenta com Flávio: 2,1 milhões abaixo do esperado", "2,1 milhões" in avancada and "para Flávio" in avancada)
    abrir(pg, b + "#/mapa?v=virar&a=perfil&c=13", 3)
    conferir("mapa do Brasil (D9): só as duas conversas", pg.locator("[aria-label='Que tipo de conversa'] button").count() == 2)
    conferir("perfil: sem erros de console", not erros, str(erros[:3]))
    ctx.close()


def bateria_publico(nav, b: str) -> None:
    """P1.2 a P2.2 e regras do conteúdo público (o que não foi entregue não aparece; referência como inspiração)."""
    erros: list[str] = []
    ctx = nav.new_context(viewport={"width": 1280, "height": 1000})
    pg = ctx.new_page()
    vigiar(pg, erros)
    abrir(pg, b + "#/", 1.5)
    conferir("título da página", pg.title() == "Urna em Camadas: onde virar voto no 2º turno, bairro a bairro", pg.title())
    menu = pg.locator("nav.navegacao a").all_inner_texts()
    conferir("menu com 6 itens, a ferramenta primeiro (D2)",
             menu == ["Virar voto", "Como usar", "Confira sua urna", "Entenda", "Método e dados", "Sobre"], str(menu))
    abrir(pg, b + "#/virar?c=22&uf=PR", 1.5)
    conferir("#/virar antigo redireciona para a inicial com os parâmetros", endereco(pg).endswith("#/?c=22&uf=PR"), endereco(pg))
    abrir(pg, b + "#/virar?ir=como-fazer", 1.5)
    conferir("#/virar?ir=como-fazer vai para a lei no guia", "#/como-usar?ir=lei" in endereco(pg), endereco(pg))
    abrir(pg, b + "#/como-usar", 1.5)
    secoes = pg.evaluate("() => ['minuto','conversas','exemplo','lista','lei','compartilhar','glossario','perguntas'].filter(id => document.getElementById(id))")
    conferir("guia: as 8 seções", len(secoes) == 8, str(secoes))
    conferir("guia: exemplo calculado (35 escolas)", "35 escolas" in pg.locator("#exemplo").inner_text())
    for rota in ["#/", "#/como-usar", "#/analise", "#/metodo", "#/dados", "#/conferencia", "#/sobre"]:
        abrir(pg, b + rota, 1.5)
        texto = pg.locator("main").inner_text().lower()
        conferir(f"{rota}: não cita a previsão do 2º turno", "previsão do 2" not in texto and "pré-regist" not in texto)
    abrir(pg, b + "#/metodo", 1.5)
    conferir("método: referência como inspiração, com o DOI",
             pg.get_by_role("heading", name="Inspiração metodológica").count() == 1
             and pg.locator("a[href='https://doi.org/10.22167/2675-441X-2024824']").count() >= 1)
    conferir("método: seção 8, Onde virar voto", pg.locator("h2", has_text="8. Onde virar voto").count() == 1)
    abrir(pg, b + "#/mapa?v=virar&a=faltosos&c=13", 4)
    conferir("mapa: legenda sequencial", pg.locator(".legenda-sequencial").count() == 1)
    caixa = pg.locator(".mapa").bounding_box()
    pg.mouse.move(caixa["x"] + caixa["width"] * 0.66, caixa["y"] + caixa["height"] * 0.45)
    time.sleep(1)
    dica = pg.locator(".dica").inner_text() if pg.locator(".dica").count() else ""
    conferir("mapa: dica com a taxa e o total", "de cada 100 eleitores" in dica and "saldo possível para Lula" in dica, dica.replace("\n", " | ")[:100])
    abrir(pg, b + "#/municipio/71072?a=faltosos&c=13", 3)
    conferir("município: vista Virar voto", pg.get_by_role("button", name="Virar voto", exact=True).get_attribute("aria-pressed") == "true")
    abrir(pg, b + "#/analise", 3)
    conferir("análise: 7 linhas 'para quem vai conversar'", pg.locator(".para-conversar").count() == 7)
    abrir(pg, b + "#/urna/SP/403/411?c=13", 3)
    conferir("urna: cartão 'perto de mim'", pg.get_by_role("button", name="Compartilhar “perto de mim”").count() == 1)
    ordem = pg.evaluate("() => [...document.querySelectorAll('main h2')].map(h => h.textContent.trim())")
    conferir("urna (D6): a ação antes da conferência e das camadas",
             ordem.index("Daqui até o dia 25") < ordem.index("Confira e entenda esta urna") < ordem.index("A urna em camadas"), str(ordem[:4]))
    conferir("público: sem erros de console", not erros, str(erros[:3]))
    ctx.close()
    # a imagem de compartilhamento publicada é a do repositório
    if b.startswith("http") and "localhost" not in b:
        publicada = hashlib.sha1(urllib.request.urlopen(b + "og.png").read()).hexdigest()
        local = hashlib.sha1((Path(__file__).resolve().parents[1] / "public" / "og.png").read_bytes()).hexdigest()
        conferir("og.png publicada = a do repositório", publicada == local)


BATERIAS = {"candidato": bateria_candidato, "acao": bateria_acao, "perfil": bateria_perfil, "publico": bateria_publico}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("base", nargs="?", default="http://localhost:4173/", help="endereço do site (com / no fim)")
    p.add_argument("--so", help="baterias separadas por vírgula: " + ", ".join(BATERIAS))
    args = p.parse_args()
    base = args.base if args.base.endswith("/") else args.base + "/"
    escolhidas = args.so.split(",") if args.so else list(BATERIAS)
    with sync_playwright() as pw:
        try:
            nav = pw.chromium.launch(channel="chrome")
        except Exception:
            nav = pw.chromium.launch()
        for nome in escolhidas:
            print(f"\n== {nome}: {BATERIAS[nome].__doc__.splitlines()[0]}")
            BATERIAS[nome](nav, base)
        nav.close()
    print(f"\n{len(falhas)} falha(s)" + (": " + "; ".join(falhas) if falhas else ""))
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
