# Rediseño (actualización 48): barra lateral, buscador Ctrl+K, menú «+ Nuevo» y orden de tarjetas. Servidor: bun tools/pruebas/servidor-local.mjs (con sembrar-demo.py para ver datos)
import sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def entrar(vp):
        ctx=b.new_context(viewport=vp,locale="es-ES"); pg=ctx.new_page()
        pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
        pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(1200); return pg
    print("Ordenador")
    d=entrar({"width":1440,"height":900})
    check("barra lateral visible",d.is_visible("#vc-side"))
    check("al menos 9 secciones en la barra",d.locator("#vc-side [data-vs]:visible").count()>=9)
    d.click('#vc-side [data-vs="caja"]'); d.wait_for_timeout(600)
    check("pulsar «Caja» abre la caja",d.is_visible("#s-caja") and d.get_attribute('#vc-side [data-vs="caja"]',"aria-current")=="true")
    d.keyboard.press("Control+k"); d.wait_for_selector("#vp-q")
    check("Ctrl+K abre el buscador",True)
    d.fill("#vp-q","taller"); d.wait_for_timeout(200); check("el buscador encuentra «Taller»",d.locator("#vp-l button").count()>=1)
    d.keyboard.press("Enter"); d.wait_for_timeout(600); check("Enter abre la sección",d.is_visible("#s-ordenes"))
    d.keyboard.press("Escape")
    d.click("#vs-new"); check("«+ Nuevo» ofrece 3 acciones",d.locator("#vs-menu button").count()==3)
    d.click('#vs-menu [data-g="entrada"]'); d.wait_for_timeout(600); check("«Nueva entrada» abre el asistente",d.locator(".gd-dlg[open], dialog[open]").count()>=1)
    d.keyboard.press("Escape")
    check("#logout sigue disponible",d.is_visible("#logout"))
    print("Móvil")
    m=entrar({"width":390,"height":844})
    check("sin barra lateral en móvil",not m.is_visible("#vc-side"))
    check("barra inferior presente",m.is_visible("#app-bar"))
    check("sin scroll horizontal",m.evaluate("document.documentElement.scrollWidth")<=391)
    check("sin errores de JavaScript",not errs,str(errs)); b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
