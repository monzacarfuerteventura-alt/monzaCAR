# Actualización 67: barra lateral grande del panel + página /gracias/ (Remotion + toques).
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-gracias-67.py
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
    # --- barra lateral
    for w, h, minfs in [(1366, 768, 21), (1920, 1080, 26), (1200, 800, 21)]:
        pg = b.new_context(viewport={"width": w, "height": h}).new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000); pg.wait_for_timeout(1200)
        fs = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.vs-it')).fontSize)")
        check(f"{w}px: letras de la barra ≥ {minfs}px (hoy {fs})", fs >= minfs)
        cort = pg.evaluate("[...document.querySelectorAll('.vs-it')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.innerText)")
        check(f"{w}px: ninguna etiqueta se corta", not cort, cort)
        ancho = pg.evaluate("(()=>{const s=document.querySelector('.vs-it').getBoundingClientRect(),n=document.querySelector('.vs-it').parentElement.getBoundingClientRect();return s.width/n.width})()")
        check(f"{w}px: cada botón ocupa todo el ancho de la barra ({ancho:.2f})", ancho > .9)
        check(f"{w}px: sin errores JS", not errs, errs[:2])
    # --- gracias (versión de marca, act. 68)
    for nm, vp, mob in [("móvil", {"width": 390, "height": 800}, True), ("escritorio", {"width": 1366, "height": 768}, False)]:
        ctx = b.new_context(viewport=vp, has_touch=mob, is_mobile=mob); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE + "/gracias/"); pg.wait_for_timeout(2500)
        check(nm + ": título GRACIAS", "GRACIAS" in pg.inner_text("#tit").upper())
        check(nm + ": banda CARS del logo", "CARS" in pg.inner_text(".tag"))
        check(nm + ": 3 pasos y 2 botones + volver", pg.locator("#pasos li").count() == 3 and pg.locator(".ctas .btn").count() == 2 and pg.locator(".volver").count() == 1)
        check(nm + ": WhatsApp y teléfono intactos", pg.evaluate("document.querySelector('.b-wa').href.includes('34643566098')&&!!document.querySelector('a[href^=\"tel:\"]')"))
        check(nm + ": noindex", pg.evaluate("document.querySelector('meta[name=robots]').content.includes('noindex')"))
        check(nm + ": sin scroll horizontal", pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        check(nm + ": todo cabe sin recortar botones (WhatsApp visible)", pg.evaluate("document.querySelector('.b-wa').getBoundingClientRect().bottom<=document.documentElement.scrollHeight"))
        if mob: pg.touchscreen.tap(195, 300)
        else: pg.mouse.click(600, 300)
        check(nm + ": sin errores JS", not errs, errs[:2])
    ctx = b.new_context(viewport={"width": 390, "height": 800}, reduced_motion="reduce"); pg = ctx.new_page()
    pg.goto(BASE + "/gracias/?l=en"); pg.wait_for_timeout(800)
    check("inglés: título en inglés", "THANK" in pg.inner_text("#tit").upper())
    check("movimiento reducido: sin vídeo", pg.evaluate("document.getElementById('vid').getAttribute('src')===null"))
    b.close()
print("RESULTADO:", ok, "correctas ·", len(mal), "fallidas", mal)
sys.exit(1 if mal else 0)
