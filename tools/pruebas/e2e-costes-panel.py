# Coste de personal en directo, en el navegador (escritorio y móvil 390 px). Uso: bun tools/pruebas/servidor-local.mjs  y  python3 tools/pruebas/e2e-costes-panel.py [carpeta-capturas]
import sys, pathlib
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-co"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + x); print("  ✘", n, x)
def api(page, m, r, t, b=None):
    return page.evaluate("""async ([m,r,t,b])=>{const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined});return {s:x.status,d:await x.json().catch(()=>({}))}}""", [m, r, t, b])
num = lambda t: float(t.replace("\xa0", "").replace("€", "").replace(".", "").replace(",", ".").strip())
with sync_playwright() as p:
    b = p.chromium.launch()
    for i, (nombre, vp) in enumerate([("escritorio", {"width": 1366, "height": 900}), ("movil", {"width": 390, "height": 800})]):
        print("\n==", nombre)
        page = b.new_context(viewport=vp).new_page(); errores = []
        page.on("pageerror", lambda e: errores.append(str(e)))
        page.on("console", lambda m: errores.append(m.text) if m.type == "error" and not any(x in m.text for x in ("ERR_TUNNEL", "favicon", "423", "403", "ERR_INTERNET")) else None)
        page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
        if page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#pw", CLAVE); page.click("#login-btn"); page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
        tok = page.evaluate("sessionStorage.getItem('vc_tok')"); usr = f"rosa{i}"
        r = api(page, "POST", "/api/taller/equipo", tok, {"nombre": f"Rosa {nombre}", "usuario": usr, "pin": "445566", "rol": "mecanico"}); uid = r["d"].get("id") or (r["d"].get("persona") or {}).get("id")
        lt = api(page, "POST", "/api/login", "", {"usuario": usr, "pin": "445566"})
        page.evaluate("abrirTab('jornada')"); page.wait_for_selector("#co-card", timeout=10000); check("aparece «Coste de personal en directo»", True)
        check("avisa de que falta la tarifa", "Falta la tarifa" in page.inner_text("#co-card"))
        page.click("[data-cotarifas] >> nth=0"); page.wait_for_selector("#dlg-co [data-couid]"); check("se abre «Tarifas por hora»", True)
        page.fill(f'#dlg-co [data-couid="{uid}"]', "abc"); page.click("#co-ok"); check("importe inválido: se avisa", "importe válido" in page.inner_text("#co-err"))
        page.fill(f'#dlg-co [data-couid="{uid}"]', "360"); page.screenshot(path=str(OUT / f"{nombre}-1-tarifas.png")); page.click("#co-ok")
        page.wait_for_function("!document.querySelector('#dlg-co[open]')", timeout=8000)
        page.wait_for_function("document.querySelector('#co-card') && !document.querySelector('#co-card .co-aviso')", timeout=8000); check("con tarifa desaparece el aviso", True)
        check("la tarifa se ve en la tabla (360 €/h)", "360" in page.inner_text("#co-card"))
        api(page, "POST", "/api/jornada/fichar", lt["d"]["token"], {"accion": "entrada"})
        page.evaluate("jgPlantilla()"); page.wait_for_function("document.querySelector('#co-card .co-est.trabajando')", timeout=8000); check("aparece «Trabajando» al fichar", True)
        v1 = num(page.inner_text('#co-card [data-cok="hoy"]')); page.wait_for_timeout(4000); v2 = num(page.inner_text('#co-card [data-cok="hoy"]'))
        check("el coste de hoy SUBE solo en tiempo real", v2 > v1, f"{v1} -> {v2}")
        check("«Ahora mismo» suma las tarifas de quien trabaja (múltiplo de 360 €/h)", num(page.inner_text('#co-card [data-cok="ahora"]').split("/h")[0]) % 360 == 0, page.inner_text('#co-card [data-cok="ahora"]'))
        check("el coste del mes acompaña", num(page.inner_text('#co-card [data-cok="mes"]')) >= v2 - 0.5)
        page.wait_for_timeout(1500); check("sobrevive al refresco del panel (jgPintar)", page.evaluate("jgPintar(), !!document.querySelector('#co-card [data-cov=hoy]')"))
        check("sin scroll horizontal", page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        page.evaluate("document.querySelector('#co-card').scrollIntoView()"); page.screenshot(path=str(OUT / f"{nombre}-2-coste.png"))
        check("el coste teórico del mes aparece bajo el registro", "Coste teórico" in page.inner_text("#jg"))
        # el trabajador no ve importes
        page.click("#logout"); page.wait_for_selector("#login-form")
        if not page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#eq-u", usr); page.fill("#eq-p", "445566"); page.click("#login-btn"); page.wait_for_selector("#s-fichar:not([hidden]), #tabsrow:not([hidden])", state="attached", timeout=15000); page.wait_for_timeout(1500)
        check("el trabajador no ve ningún importe de coste", "Coste de personal" not in page.inner_text("body") and "€/h" not in page.inner_text("body"))
        check("sin errores de consola", not errores, str(errores[:3]))
    b.close()
print(f"\n{ok} bien, {len(mal)} mal")
if mal: print("\n".join(mal)); sys.exit(1)
