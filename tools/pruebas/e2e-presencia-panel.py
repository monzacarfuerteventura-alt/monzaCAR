# Prueba del antitrampa en un navegador real (Chromium) contra tools/pruebas/servidor-local.mjs
# Simula el GPS del móvil: primero en casa (a km de la nave) y luego en la nave. Uso:
#   bun tools/pruebas/servidor-local.mjs   y en otra ventana:   python3 tools/pruebas/e2e-presencia-panel.py [carpeta-capturas]
import sys, pathlib
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8888"
CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-presencia"); OUT.mkdir(parents=True, exist_ok=True)
LAT, LNG = 28.4, -13.87
ok = 0; mal = []
def check(n, c, extra=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(extra)); print("  ✘", n, extra)

def api(page, metodo, ruta, token, body=None):
    return page.evaluate("""async ([m,r,t,b])=>{ const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined}); return {s:x.status,d:await x.json().catch(()=>({}))}; }""", [metodo, ruta, token, body])

with sync_playwright() as p:
    b = p.chromium.launch()
    # Móvil (Pixel 7) con GPS simulado
    ctx = b.new_context(viewport={"width": 412, "height": 915}, is_mobile=True, has_touch=True, permissions=["geolocation"],
                        geolocation={"latitude": LAT, "longitude": LNG, "accuracy": 10}, locale="es-ES", timezone_id="Atlantic/Canary")
    page = ctx.new_page(); errores = []
    page.on("pageerror", lambda e: errores.append(str(e)))
    page.on("console", lambda m: errores.append("console: " + m.text) if m.type == "error" and "favicon" not in m.text and "403" not in m.text and "423" not in m.text else None)

    print("\n1) El gerente ve que la antitrampa NO está activa y la activa desde la nave")
    page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
    if page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#pw", CLAVE); page.click("#login-btn")
    page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
    tok = page.evaluate("sessionStorage.getItem('vc_tok')")
    for u, n, pin in [("pedro", "Pedro", "445566")]:
        api(page, "POST", "/api/taller/equipo", tok, {"nombre": n, "usuario": u, "pin": pin, "rol": "mecanico"})
    page.evaluate("abrirTab('jornada')"); page.wait_for_selector("#jg .jg-nave", timeout=10000)
    txt = page.inner_text("#jg .jg-nave")
    check("la tarjeta «Antitrampa» dice NO activa y avisa de que se puede fichar desde casa", "NO activa" in txt and "desde casa" in txt, txt[:200])
    page.screenshot(path=str(OUT / "1-gerente-sin-activar.png"), full_page=True)
    page.click("[data-jgnave=fijar]"); page.wait_for_function("document.querySelector('#jg .jg-nave')?.innerText.includes('Activa')", timeout=10000)
    txt = page.inner_text("#jg .jg-nave")
    check("tras «Fijar la nave aquí» queda Activa con radio 80 m (nuevo valor por defecto)", "Activa" in txt and "80 m" in txt, txt[:260])
    page.screenshot(path=str(OUT / "2-gerente-activa.png"), full_page=True)
    page.click("[data-jgnave=probar]"); page.wait_for_selector("#jg .jg-nave .msg", timeout=20000)
    m = page.inner_text("#jg .jg-nave .msg")
    check("«Comprobar dónde estoy» en la nave dice DENTRO y la distancia", "DENTRO" in m and "Radio permitido: 80 m" in m, m)
    page.click("#logout")

    print("\n2) Pedro intenta fichar desde casa (GPS a ~5 km)")
    ctx.set_geolocation({"latitude": LAT + 0.045, "longitude": LNG, "accuracy": 10})
    page.wait_for_selector("#login-form")
    if not page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#eq-u", "pedro"); page.fill("#eq-p", "445566"); page.click("#login-btn")
    page.wait_for_selector("#s-fichar:not([hidden])", timeout=15000)
    check("la pantalla de fichaje avisa de que se comprueba la ubicación (transparencia)", "comprueba que estás en la nave" in page.inner_text("#j-fichar"))
    page.click("[data-jacc=entrada]")
    page.wait_for_selector("#j-fichar .msg.bad", timeout=15000)
    m = page.inner_text("#j-fichar .msg.bad")
    check("desde casa NO ficha y le dice a cuántos km está", "del taller" in m and "km" in m, m)
    check("sigue «Fuera de jornada»", "Fuera de jornada" in page.inner_text("#j-fichar"))
    page.screenshot(path=str(OUT / "3-trabajador-en-casa.png"), full_page=True)

    print("\n3) Pedro sin GPS (permiso denegado)")
    ctx.clear_permissions()
    page.click("[data-jacc=entrada]")
    page.wait_for_selector("#j-fichar .msg.bad", timeout=15000)
    m = page.inner_text("#j-fichar .msg.bad")
    check("sin permiso de ubicación NO ficha y explica cómo activarla", "Ubicación" in m or "ubicación" in m, m)

    print("\n4) Pedro llega a la nave")
    ctx.grant_permissions(["geolocation"]); ctx.set_geolocation({"latitude": LAT + 0.0002, "longitude": LNG + 0.0001, "accuracy": 15})
    page.click("[data-jacc=entrada]")
    page.wait_for_selector("#j-toast.on", timeout=15000)
    check("en la nave ficha la entrada", "Entrada registrada" in page.inner_text("#j-toast"), page.inner_text("#j-toast"))
    page.screenshot(path=str(OUT / "4-trabajador-en-nave.png"), full_page=True)
    tok_p = page.evaluate("sessionStorage.getItem('vc_tok')")
    page.click("#logout") if page.is_visible("#logout") else None

    print("\n5) El gerente comprueba qué ha pasado")
    page.wait_for_selector("#login-form")
    if page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#pw", CLAVE); page.click("#login-btn")
    page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
    page.evaluate("abrirTab('jornada')"); page.wait_for_selector("#jg .jg-nave", timeout=10000)
    page.wait_for_function("document.querySelector('#jg .jg-nave')?.innerText.includes('Pedro')", timeout=10000)
    txt = page.inner_text("#jg .jg-nave")
    check("«Intentos bloqueados» lista los de Pedro (casa y sin GPS)", "Pedro" in txt and "km de la nave" in txt and "sin ubicación" in txt, txt[-400:])
    en_vivo = page.inner_text("#jg .jg-live")
    check("la lista en vivo marca a Pedro «✓ en la nave»", "Pedro" in en_vivo and "en la nave" in en_vivo, en_vivo)
    page.screenshot(path=str(OUT / "5-gerente-intentos.png"), full_page=True)
    page.click("[data-jguid], .jg-live .jg-p") if False else None
    uid = api(page, "GET", "/api/taller/equipo", tok)["d"]
    pid = [x["id"] for x in (uid if isinstance(uid, list) else uid.get("equipo", [])) if x.get("usuario") == "pedro" or x.get("nombre") == "Pedro"][0]
    hoy = page.evaluate("hoyC()")
    page.evaluate(f"jgDia('{pid}','{hoy}')"); page.wait_for_selector("#dlg-jdia table", timeout=10000)
    t = page.inner_text("#dlg-jdia table")
    check("el detalle del día muestra «✓ En la nave · a N m (±15 m)» y el enlace al mapa", "En la nave" in t and "±15 m" in t and "ver en el mapa" in t, t)
    page.screenshot(path=str(OUT / "6-gerente-detalle-dia.png"))
    check("sin errores de JavaScript en toda la prueba", not errores, errores)
    b.close()

print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("\n".join(mal)); sys.exit(1)
