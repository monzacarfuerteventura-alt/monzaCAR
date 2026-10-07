# Las 5 fichas tras la recepción guiada + PDF individual (actualización 51). Servidor recién arrancado.
import sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    for nombre,vp in [("ordenador",{"width":1366,"height":900}),("móvil",{"width":390,"height":844})]:
        print(nombre)
        pg=b.new_context(viewport=vp,has_touch=nombre=="móvil",locale="es-ES").new_page()
        pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
        pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(1200)
        pg.evaluate("()=>{window.__p=[];window.print=()=>window.__p.push(document.title)}")
        mat="77"+("A" if nombre=="ordenador" else "B")+"XYZ"
        pg.evaluate("document.querySelector('#gd-bar [data-gd=\"entrada\"]').click()"); pg.wait_for_selector("[data-gdf=nombre]")
        pg.fill("[data-gdf=nombre]","Cliente "+nombre); pg.fill("[data-gdf=tel]","600"+("123456" if nombre=="ordenador" else "654321")); pg.fill("[data-gdf=mat]",mat); pg.fill("[data-gdf=coche]","Seat Leon")
        pg.click("[data-gdsig]"); pg.click("[data-gddest=taller]"); pg.click("[data-gdruta=completa]")
        pg.wait_for_selector("#vc-fichas",timeout=10000)
        check("al crear la orden sale la lista de las 6 fichas",pg.locator("#vc-fichas .vf-l li").count()==6)
        txt=pg.inner_text("#vc-fichas")
        check("cada ficha explica por qué se rellena","Te protege" in txt and "Semáforo" in txt and "legal" in txt and "horas reales" in txt and "devoluciones" in txt)
        pg.click('#vc-fichas [data-vf=p][data-k=f2]'); pg.wait_for_timeout(1500)
        check("«PDF» de una ficha abre la impresión con nombre de archivo propio",len(pg.evaluate("window.__p"))==1 and "FORM-02" in pg.evaluate("window.__p[0]"),str(pg.evaluate("window.__p")))
        pg.wait_for_timeout(800)
        pg.evaluate("document.querySelector('#vc-fichas [data-vf=r][data-k=f1]').click()"); pg.wait_for_selector("#tf .t-tabs",timeout=8000)
        check("«Rellenar» abre la ficha de recepción",pg.is_visible("#tf .t-tabs"))
        pg.evaluate("window.__p=[]")
        if nombre=="móvil" and pg.is_visible("#tf .app-more"): pg.click("#tf .app-more")
        pg.click("[data-tprint=uno]"); pg.wait_for_timeout(1500)
        check("«Descargar PDF de esta ficha» imprime solo esa ficha",len(pg.evaluate("window.__p"))==1 and "FORM-01" in pg.evaluate("window.__p[0]"),str(pg.evaluate("window.__p")))
        check("sin scroll horizontal",pg.evaluate("document.documentElement.scrollWidth")<=vp["width"]+1)
        pg.screenshot(path=f"/tmp/claude-0/fin/fichas-{'m' if nombre=='móvil' else 'd'}.png")
    check("sin errores de JavaScript",not errs,str(errs)); b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
