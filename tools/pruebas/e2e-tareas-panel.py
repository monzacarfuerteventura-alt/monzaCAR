# Fichaje de tareas en el navegador (escritorio y móvil 390 px). Uso: bun tools/pruebas/servidor-local.mjs  y  python3 tools/pruebas/e2e-tareas-panel.py
import sys, pathlib, json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-tk"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + x); print("  ✘", n, x)
def api(page, m, r, t, b=None):
    return page.evaluate("""async ([m,r,t,b])=>{const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined});return {s:x.status,d:await x.json().catch(()=>({}))}}""", [m, r, t, b])
def entrar(page):
    # la pantalla se repinta justo después de entrar al panel: se reintenta el toque si se perdió en el repintado
    for _ in range(4):
        page.wait_for_timeout(1500)
        if page.evaluate("J&&J.estado")=="trabajando": return
        try: page.click('[data-jacc="entrada"]', timeout=4000)
        except Exception: pass
        try: page.wait_for_function("J && J.estado==='trabajando'", timeout=4000); return
        except Exception: pass
    raise SystemExit("no se pudo fichar la entrada")
with sync_playwright() as p:
    b = p.chromium.launch()
    for i, (nombre, vp) in enumerate([("escritorio", {"width": 1366, "height": 900}), ("movil", {"width": 390, "height": 800})]):
        print("\n==", nombre)
        ctx = b.new_context(viewport=vp, has_touch=(nombre == "movil")); page = ctx.new_page(); errores = []
        page.on("pageerror", lambda e: errores.append(str(e)))
        page.on("console", lambda m: errores.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "favicon" not in m.text and "423" not in m.text and "403" not in m.text and "ERR_INTERNET_DISCONNECTED" not in m.text else None)
        page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
        if page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#pw", CLAVE); page.click("#login-btn"); page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
        tok = page.evaluate("sessionStorage.getItem('vc_tok')")
        usr = f"pedro{i}"
        api(page, "POST", "/api/taller/equipo", tok, {"nombre": "Pedro " + nombre, "usuario": usr, "pin": "445566", "rol": "mecanico"})
        r = api(page, "POST", "/api/vehiculos/crear", tok, {"marca": "Seat", "modelo": "Leon", "matricula": f"55{i}TKX"}); check("coche propio creado", r["s"] == 201, str(r))
        page.click("#logout"); page.wait_for_selector("#login-form")
        if not page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#eq-u", usr); page.fill("#eq-p", "445566"); page.click("#login-btn")
        page.wait_for_selector("#j-fichar .j-big", timeout=15000)
        check("aparece el fichaje de jornada de siempre", page.is_visible("#j-fichar .j-big"))
        check("el módulo de tareas aparece debajo", page.is_visible("#tk"))
        check("sin entrada: tareas desactivadas", page.locator("#tk .tk-off").count() == 1)
        entrar(page); page.evaluate("jAbrir()"); page.wait_for_selector("#j-fichar .j-big.j-b-pau", timeout=10000)
        page.wait_for_selector("#tk-v"); check("con jornada: se puede elegir coche", page.locator("#tk .tk-off").count() == 0)
        page.select_option("#tk-v", index=1); page.wait_for_selector("[data-tktipo]")
        page.click('[data-tktipo="limpieza"]'); page.click('[data-tkest="30"]')
        h = page.evaluate("document.querySelector('[data-tkiniciar]').getBoundingClientRect().height"); check("botón INICIAR ≥ 60 px de alto", h >= 60, str(h))
        page.screenshot(path=str(OUT / f"{nombre}-1-elegir.png"), full_page=True)
        page.click("[data-tkiniciar]"); page.wait_for_selector("[data-tkpausa]")
        check("tarea en marcha con PAUSAR y FINALIZAR", page.is_visible("[data-tkfin]"))
        for sel in ["[data-tkpausa]", "[data-tkfin]"]:
            hh = page.evaluate(f"document.querySelector('{sel}').getBoundingClientRect().height"); check(f"{sel} ≥ 60 px", hh >= 60, str(hh))
        page.click("[data-tkpausa]"); page.wait_for_selector("[data-tkmot]")
        hm = page.evaluate("document.querySelector('[data-tkmot]').getBoundingClientRect().height"); check("motivos de pausa ≥ 60 px", hm >= 60, str(hm))
        page.screenshot(path=str(OUT / f"{nombre}-2-motivos.png"))
        page.click('[data-tkmot="Recambio pendiente"]'); page.wait_for_selector("[data-tkreanudar]"); check("pausa con motivo", True)
        page.click("[data-tkreanudar]"); page.wait_for_selector("[data-tkpausa]"); check("reanudar", True)
        # jornada en segundo plano: pausa de jornada pausa la tarea
        page.click('[data-jacc="pausa"]'); page.wait_for_selector('[data-jacc="reanudar"]')
        page.click('[data-jacc="reanudar"]'); page.wait_for_function("J && J.estado==='trabajando'", timeout=10000); page.evaluate("jAbrir()"); page.wait_for_selector("[data-tkpausa]", timeout=10000)
        check("la tarea sigue en marcha tras pausar y volver de la jornada", True)
        ancho = page.evaluate("document.documentElement.scrollWidth"); check("sin scroll horizontal", ancho <= vp["width"] + 1, str(ancho))
        # terminar: PIN mal, luego bien
        page.click("[data-tkfin]"); page.wait_for_selector("#tk-pin")
        page.screenshot(path=str(OUT / f"{nombre}-3-terminar.png"))
        page.fill("#tk-pin", "000000"); page.click("#tk-ok"); page.wait_for_selector("#tk-err:not([hidden])"); check("PIN incorrecto: no cierra", "PIN" in page.inner_text("#tk-err"))
        page.fill("#tk-pin", "445566"); page.click("#tk-ok"); page.wait_for_selector("[data-tkiniciar]", timeout=10000); check("terminar con PIN: vuelve a elegir coche", True)
        # persistencia: sin red el toque se guarda y se envía solo
        page.select_option("#tk-v", index=1); page.click('[data-tktipo="reparacion"]'); page.click('[data-tkest="60"]')
        ctx.set_offline(True); page.click("[data-tkiniciar]"); page.wait_for_timeout(600)
        cola = page.evaluate("localStorage.getItem('vc_tk_cola')"); check("sin red: el toque queda guardado en el móvil", cola and len(json.loads(cola)) == 1, str(cola))
        ctx.set_offline(False); page.wait_for_selector("[data-tkpausa]", timeout=20000); check("con red: se envía solo y la tarea arranca", True)
        page.screenshot(path=str(OUT / f"{nombre}-4-recuperado.png"), full_page=True)
        check("sin errores de consola", not errores, str(errores[:3])); ctx.close()
    b.close()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas"); sys.exit(1 if mal else 0)
