# Actualización 68: pestaña «Documentación» (marca, modelo de ventas, fichas y manuales) + página /gracias/ de marca.
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-docs-68.py
import sys
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n); print("  ✘", n, x)
with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, vp in [("escritorio", {"width": 1366, "height": 900}), ("movil", {"width": 390, "height": 800})]:
        print("==", nombre)
        ctx = b.new_context(viewport=vp, locale="es-ES"); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000); pg.wait_for_timeout(1200)
        check("existe la pestaña Documentación", pg.evaluate("!!document.querySelector('#tabs [data-tab=docs]')"))
        if nombre == "escritorio": check("sale en la barra lateral", pg.evaluate("[...document.querySelectorAll('.vs-it span')].some(s=>s.textContent==='Documentación')"))
        pg.evaluate("abrirTab('docs')"); pg.wait_for_selector("#s-docs .dc-card", timeout=5000)
        check("la sección es visible y las demás se ocultan", pg.evaluate("!document.getElementById('s-docs').hidden && document.getElementById('s-dash').hidden"))
        check("manual de marca listado", "Manual de marca" in pg.inner_text("#s-docs"))
        check("modelo de ventas listado", "Modelo de ventas" in pg.inner_text("#s-docs"))
        check("8 fichas FORM-01..17 + todas", pg.locator("#s-docs .dc-chip").count() == 9)
        check("13 manuales S00–S11", pg.locator("#s-docs .dc-full:last-of-type .dc-row").count() == 13)
        for nm in ["VolcanoCars-S00-Manual-de-marca-v1", "VolcanoCars-S05-Ventas-hoja-v3.1", "FORM-16", "FORM-17", "FICHAS-TALLER"]:
            r = pg.evaluate("async n=>{const r=await fetch('/api/manual/'+n,{headers:{authorization:'Bearer '+PW}});return [r.status,r.headers.get('content-type')]}", nm)
            check("se abre " + nm, r[0] == 200 and "pdf" in r[1], r)
        r = pg.evaluate("fetch('/api/manual/VolcanoCars-S00-Manual-de-marca-v1').then(r=>r.status)"); check("sin sesión no se abre el manual de marca", r in (401, 403), r)
        pg.fill("#dc-q", "factura"); pg.wait_for_timeout(150)
        check("el buscador filtra", pg.locator("#s-docs .dc-chip:visible").count() == 2, pg.locator("#s-docs .dc-chip:visible").count())
        pg.fill("#dc-q", "zzzz"); pg.wait_for_timeout(150); check("sin resultados avisa", pg.is_visible("#dc-vacio"))
        pg.fill("#dc-q", "")
        check("no hay scroll horizontal", pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        pg.evaluate("abrirTab('ordenes')"); pg.wait_for_timeout(500)
        check("se puede volver a Taller", pg.evaluate("document.getElementById('s-docs').hidden && !document.getElementById('s-ordenes').hidden"))
        check("sin errores JS", not errs, errs[:2])
    b.close()
print("RESULTADO:", ok, "correctas ·", len(mal), "fallidas", mal)
sys.exit(1 if mal else 0)
