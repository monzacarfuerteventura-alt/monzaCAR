# Doble clic al emitir una factura rápida (actualización 55): debe emitirse UNA sola factura aunque se pulse 8 veces seguidas.
import sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1440,"height":900},locale="es-ES"); pg=ctx.new_page(); errs=[]; posts=[]
    pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.on("dialog",lambda d:d.accept())
    pg.on("request",lambda r:posts.append(r.url) if r.method!="GET" and "/api/" in r.url else None)
    pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])"); pg.wait_for_timeout(1000)
    pg.click("#gd-bar [data-gd=factura]"); pg.wait_for_selector("#dlg-gd[open]")
    pg.fill("#gd-nom","Doble <b>Clic</b> Ñ"); pg.fill("#gd-tel","612345678"); pg.fill("#gd-mat","1234 abc"); pg.fill("#gd-coche","Seat Ibiza")
    pg.click("[data-gdsig]"); pg.fill("[data-gdl=d][data-i='0']","Aceite ' \" <>"); pg.fill("[data-gdl=p][data-i='0']","107")
    posts.clear()
    pg.evaluate("()=>{const b=document.querySelector(\"[data-gdemitir]\");for(let i=0;i<8;i++)b.click()}")
    pg.wait_for_selector("text=Cobro y cierre",timeout=15000); pg.wait_for_timeout(800)
    fact=[u for u in posts if "recepcion" in u]
    ok=len(fact)==1 and not errs
    print("  ✔" if len(fact)==1 else "  ✘","8 clics → altas de orden/factura:",len(fact),posts)
    print("  ✔" if not errs else "  ✘","sin errores de JS",errs)
    b.close(); sys.exit(0 if ok else 1)
