# Actualización 66: kit «Publicar en portales» (textos por portal, ZIP de fotos, libreta de control y aviso de anuncios a retirar).
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-portales-66.py
import sys, zipfile
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
        ctx = b.new_context(viewport=vp, locale="es-ES", accept_downloads=True); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000); pg.wait_for_timeout(1200)
        def api(m, body=None, path="/api/portales"):
            return pg.evaluate("""async([m,b,p])=>{const r=await fetch(p,{method:m,headers:{authorization:'Bearer '+PW,'content-type':'application/json'},body:b?JSON.stringify(b):undefined});return [r.status,await r.json()]}""", [m, body, path])
        st, d = api("GET"); check("GET /api/portales responde con coches", st == 200 and len(d["coches"]) >= 1, st)
        sin = pg.evaluate("fetch('/api/portales').then(r=>r.status)"); check("sin sesión no se puede leer", sin in (401, 403), sin)
        cid = d["coches"][0]["id"]
        st, _ = api("PUT", {"id": cid, "portal": "wallapop", "publicado": True, "enlace": "https://es.wallapop.com/item/prueba"}); check("marcar publicado en Wallapop", st == 200)
        st, e = api("PUT", {"id": cid, "portal": "wallapop", "enlace": "javascript:alert(1)"}); check("enlace que no es https se rechaza", st == 400)
        st, e = api("PUT", {"id": cid, "portal": "otro", "publicado": True}); check("portal desconocido se rechaza", st == 400)
        st, e = api("PUT", {"id": "no-existe", "portal": "wallapop", "publicado": True}); check("coche inexistente se rechaza", st == 404)
        pg.evaluate("(()=>{const t=document.querySelector('[data-tab=\"coches\"]'); if(t) t.click();})()"); pg.wait_for_timeout(900)
        check("la tarjeta «Publicar en portales» existe", pg.evaluate("!!document.getElementById('pp-cfg')"))
        pg.evaluate("document.getElementById('pp-cfg').open=true"); pg.wait_for_selector("#pp-b .pp-car", timeout=8000)
        pg.evaluate("document.querySelector('#pp-b .pp-car').open=true")
        t = pg.input_value("#pp-b .pp-car[open] .pp-por[data-p='wallapop'] textarea")
        check("el texto lleva precio, 12 meses de garantía y teléfono", "€" in t and "12 meses" in t and "643 56 60 98" in t, t[:200])
        check("5 portales por coche", pg.locator("#pp-b .pp-car[open] .pp-por").count() == 5)
        check("Wallapop sale como publicado con su enlace", "Publicado" in pg.inner_text("#pp-b .pp-car[open] .pp-por[data-p='wallapop'] h4") and "wallapop.com/item/prueba" in pg.input_value("#pp-b .pp-car[open] .pp-por[data-p='wallapop'] [data-enlace]"))
        with pg.expect_download(timeout=30000) as dl: pg.evaluate("document.querySelector('#pp-b .pp-car[open] [data-zip]').click()")
        z = zipfile.ZipFile(dl.value.path()); check("el ZIP de fotos es válido y tiene fotos", z.testzip() is None and len(z.namelist()) >= 1, z.namelist()[:3])
        st, lista = api("GET", None, "/api/coches?todos=1"); lista = lista if isinstance(lista, list) else lista.get("coches", [])
        car = [c for c in lista if c["id"] == cid][0]
        car["estado"] = "vendido"; st, _ = api("PUT", car, "/api/coches/" + cid); check("pasar el coche a vendido", st == 200, st)
        st, d2 = api("GET"); check("sale en «retirar» con Wallapop", any(r["id"] == cid and "wallapop" in r["portales"] for r in d2["retirar"]), d2["retirar"])
        pg.evaluate("document.getElementById('pp-cfg').open=false; document.getElementById('pp-cfg').open=true"); pg.wait_for_timeout(1200)
        check("el panel avisa en rojo", "Retira estos anuncios" in pg.inner_text("#pp-b"))
        api("PUT", {"id": cid, "portal": "wallapop", "retirado": True}); st, d3 = api("GET"); check("al marcar retirado desaparece el aviso", not d3["retirar"])
        car["estado"] = "disponible"; api("PUT", car, "/api/coches/" + cid)
        api("PUT", {"id": cid, "portal": "wallapop", "publicado": False})
        check("sin errores JS", not errs, errs[:3])
    b.close()
print("RESULTADO:", ok, "correctas ·", len(mal), "fallidas", mal)
sys.exit(1 if mal else 0)
