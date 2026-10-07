# Actualización 55: secciones plegables que se recuerdan, fichas que se iluminan (n/6) y guía con ruta de aprendizaje.
import sys, re
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
with sync_playwright() as p:
    b=p.chromium.launch()
    for nombre,vp,m in [("ordenador",{"width":1440,"height":900},False),("móvil",{"width":390,"height":844},True)]:
        print("\n==",nombre)
        ctx=b.new_context(viewport=vp,has_touch=m,is_mobile=m,locale="es-ES"); pg=ctx.new_page(); errs=[]
        toks=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.on("dialog",lambda d:d.accept()); pg.on("request",lambda r:toks.append(re.search(r"/fichas/([A-Za-z0-9]+)/f5",r.url).group(1)) if re.search(r"/fichas/[A-Za-z0-9]+/f5",r.url) else None)
        def entrar():
            pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
            if pg.is_visible("#f-eq"): pg.click("#login-modo")
            pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(1000)
        def recarga():
            pg.reload(); pg.wait_for_function("typeof abrirTab==='function'&&document.querySelector('#s-login')&&document.querySelector('#s-login').hidden",timeout=15000); pg.wait_for_timeout(1200)
        entrar()
        # 1) cabeceras plegables en todas las secciones
        n=pg.evaluate("document.querySelectorAll('main section[id^=s-] > .head[data-fold]').length")
        check(f"{nombre}: {n} cabeceras con botón de plegar (≥ 9)",n>=9,str(n))
        pg.evaluate("abrirTab('coches')"); pg.wait_for_selector("#s-list:not([hidden])"); pg.wait_for_timeout(500)
        check(f"{nombre}: Coches: botones visibles al principio",pg.is_visible("#add") and pg.is_visible("#pdf-venta"))
        pg.click("#s-list [data-vcfold]"); pg.wait_for_timeout(300)
        check(f"{nombre}: al plegar se esconden botones y texto",not pg.is_visible("#add") and not pg.is_visible("#s-list .head p") and pg.get_attribute("#s-list [data-vcfold]","aria-expanded")=="false")
        check(f"{nombre}: el título sigue visible y completo",pg.is_visible("#s-list .head h1"))
        recarga(); pg.evaluate("abrirTab('coches')"); pg.wait_for_selector("#s-list:not([hidden])"); pg.wait_for_timeout(600)
        check(f"{nombre}: tras recargar sigue plegado (el panel se acuerda)",not pg.is_visible("#add"))
        pg.click("#s-list [data-vcfold]"); pg.wait_for_timeout(300)
        check(f"{nombre}: al desplegar vuelve todo",pg.is_visible("#add") and pg.is_visible("#pdf-reserva"))
        # 2) ficha: barra de progreso, factura emitida ilumina, plegar
        pg.evaluate("abrirTab('dash')"); pg.wait_for_timeout(800)
        pg.evaluate("document.querySelector('#gd-bar [data-gd=factura]').click()"); pg.wait_for_selector("#dlg-gd[open]")
        pg.fill("#gd-nom","Cliente "+nombre); pg.fill("#gd-tel","612345678"); pg.fill("#gd-mat","55"+("A" if not m else "B")+"PLG"); pg.fill("#gd-coche","Seat Ibiza")
        pg.click("[data-gdsig]"); pg.fill("[data-gdl=d][data-i='0']","Aceite"); pg.fill("[data-gdl=p][data-i='0']","107"); pg.click("[data-gdemitir]")
        pg.wait_for_selector("text=Cobro y cierre",timeout=15000); pg.click("#dlg-gd [data-gdcerrar]") if pg.is_visible("#dlg-gd [data-gdcerrar]") else pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        check(f"{nombre}: la factura rápida creó su orden",len(toks)>=1,str(toks))
        pg.evaluate("abrirTab('ordenes')"); pg.wait_for_timeout(800)
        pg.evaluate("async t=>{ await abrirFichas(t,'f1'); }",toks[-1]); pg.wait_for_selector("#tf .fch-prog",timeout=10000); pg.wait_for_timeout(600)
        lbl=pg.get_attribute("#tf .fch-prog","aria-label"); segs=pg.locator("#tf .fch-seg").count(); on=pg.locator("#tf .fch-seg.on").count()
        check(f"{nombre}: la ficha muestra la barra de fichas completadas ({lbl})",segs==6 and "de 6 fichas completadas" in lbl,lbl)
        check(f"{nombre}: la factura emitida ilumina su segmento y su pestaña",on>=1 and pg.locator("#tf .t-tabs button.hecha").count()>=1,f"on={on}")
        check(f"{nombre}: el contador coincide con los segmentos encendidos",pg.inner_text("#tf .fch-prog-n").replace("\n","").startswith(str(on)),pg.inner_text("#tf .fch-prog-n"))
        pg.click("#tf .fch-seg >> nth=0"); pg.wait_for_timeout(400)
        check(f"{nombre}: tocar un segmento abre esa ficha",pg.locator('#tf .t-tabs button[aria-selected="true"]').count()==1)
        if not m:
            check(f"{nombre}: botones de la ficha visibles",pg.is_visible("#tf .t-facts"))
        pg.click("#tf [data-vcfold=ficha]"); pg.wait_for_timeout(300)
        check(f"{nombre}: plegar la ficha esconde botones y fases",not pg.is_visible("#tf .t-fases") and not pg.is_visible("#tf .t-facts"))
        pg.click("#tf .t-tabs button >> nth=1"); pg.wait_for_timeout(500)
        check(f"{nombre}: cambiar de pestaña mantiene la ficha plegada",not pg.is_visible("#tf .t-fases"))
        pg.click("#tf [data-vcfold=ficha]"); pg.wait_for_timeout(300)
        check(f"{nombre}: desplegar la ficha devuelve las fases",pg.is_visible("#tf .t-fases"))
        pg.evaluate("tPanelFichas(TF.orden.token)"); pg.wait_for_selector("#vc-fichas .vf-prog",timeout=8000)
        check(f"{nombre}: el recuadro «Las 6 fichas» muestra su progreso e ilumina las hechas",pg.locator("#vc-fichas .vf-prog i.on").count()>=1 and pg.locator("#vc-fichas .vf-l li.hecha").count()>=1)
        pg.keyboard.press("Escape")
        # 3) guía: ruta de aprendizaje
        pg.evaluate("abrirTab('ayuda')"); pg.wait_for_selector("#s-ayuda .ay-ruta",timeout=8000)
        check(f"{nombre}: Ayuda muestra la ruta de aprendizaje 0/N",pg.is_visible("#s-ayuda .ay-meter") and pg.inner_text("#s-ayuda .ay-meter b").startswith("0"))
        pg.click("#s-ayuda [data-ayvisto]"); pg.wait_for_timeout(300)
        check(f"{nombre}: «Marcar como visto» suma 1 y lo guarda",pg.inner_text("#s-ayuda .ay-meter b").startswith("1") and "Visto" in pg.inner_text("#s-ayuda [data-ayvisto]"))
        recarga(); pg.evaluate("abrirTab('ayuda')"); pg.wait_for_selector("#s-ayuda .ay-ruta"); pg.wait_for_timeout(500)
        check(f"{nombre}: tras recargar sigue 1 módulo visto",pg.inner_text("#s-ayuda .ay-meter b").startswith("1"))
        nd=pg.locator("#s-ayuda details.ay-s").count(); check(f"{nombre}: la guía escrita sale en secciones plegables ({nd})",nd>=3)
        pg.evaluate("document.querySelector('#s-ayuda details.ay-s>summary').click()"); pg.wait_for_timeout(300)
        est=pg.evaluate("document.querySelector('#s-ayuda details.ay-s').open")
        recarga(); pg.evaluate("abrirTab('ayuda')"); pg.wait_for_selector("#s-ayuda .ay-ruta"); pg.wait_for_timeout(500)
        check(f"{nombre}: la sección de la guía recuerda si la dejaste abierta o cerrada",pg.evaluate("document.querySelector('#s-ayuda details.ay-s').open")==est)
        check(f"{nombre}: sin scroll horizontal",pg.evaluate("document.documentElement.scrollWidth")<=vp["width"]+1)
        check(f"{nombre}: sin errores de JavaScript",not errs,str(errs[:3]))
        ctx.close()
    b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
