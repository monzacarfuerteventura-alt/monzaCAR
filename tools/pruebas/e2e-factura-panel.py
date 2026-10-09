# Factura de reparación (FORM-14), en el navegador (escritorio y móvil 390 px). Uso: bun tools/pruebas/servidor-local.mjs  y  python3 tools/pruebas/e2e-factura-panel.py [carpeta-capturas]
import sys, pathlib
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-fa"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + x); print("  ✘", n, x)
def api(page, m, r, t, b=None):
    return page.evaluate("""async ([m,r,t,b])=>{const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined});return {s:x.status,d:await x.json().catch(()=>({}))}}""", [m, r, t, b])
with sync_playwright() as p:
    b = p.chromium.launch()
    for i, (nombre, vp) in enumerate([("escritorio", {"width": 1366, "height": 900}), ("movil", {"width": 390, "height": 800})]):
        print("\n==", nombre)
        page = b.new_context(viewport=vp).new_page(); errores = []
        page.on("pageerror", lambda e: errores.append(str(e)))
        page.on("console", lambda m: errores.append(m.text) if m.type == "error" and not any(x in m.text for x in ("ERR_TUNNEL", "favicon", "423", "403", "ERR_INTERNET", "409", "400")) else None)
        page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
        if page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#pw", CLAVE); page.click("#login-btn"); page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
        tok = page.evaluate("sessionStorage.getItem('vc_tok')")
        mat = f"55{i}FAC"
        rc = api(page, "POST", "/api/taller/recepcion", tok, {"cliente": {"nombre": "Ana Pérez", "telefono": "643566098"}, "vehiculo": {"matricula": mat, "marcaModelo": "Seat Ibiza", "km": "120000"}, "tipoEntrada": "reparacion"})
        t = rc["d"]["orden"]["token"]
        pr = api(page, "PATCH", "/api/ordenes/" + t, tok, {"presupuesto": {"lineas": [{"c": "Pastillas de freno", "n": 1, "p": 60}, {"c": "Mano de obra", "n": 2, "p": 40}], "igic": 7}})
        check("el presupuesto de la orden existe", pr["s"] == 200, str(pr))
        page.evaluate("t=>{ORDENES=[];}", t) if False else None
        page.evaluate("async t=>{ await abrirFichas(t,'f5'); }", t); page.wait_for_selector("#tf .fc-l", timeout=10000)
        check("la pestaña Factura es la 6.ª (después de Calidad)", page.evaluate("[...document.querySelectorAll('.t-tabs [data-ttabb]')].map(b=>b.dataset.ttabb).join()") == "f1,f2,pre,f3,f4,f5,audit")
        check("se rellena sola desde el presupuesto (2 líneas)", page.locator("#tf .fc-l").count() == 2)
        check("cliente y matrícula vienen de la recepción", page.input_value('[data-fc="cliente.nombre"]') == "Ana Pérez" and page.input_value('[data-fc="vehiculo.matricula"]') == mat)
        check("IGIC 7 % preseleccionado y total 149,80 €", "149,80" in page.inner_text("#fc-tot"), page.inner_text("#fc-tot"))
        page.fill('[data-fcl="0.precio"]', "100"); check("el total se actualiza al escribir (140+... = 180 → 192,60)", "192,60" in page.inner_text("#fc-tot"), page.inner_text("#fc-tot"))
        page.click("[data-fcadd=REC]"); check("+ Recambio añade una línea", page.locator("#tf .fc-l").count() == 3)
        page.click('[data-fcdel="2"]'); check("✕ la quita", page.locator("#tf .fc-l").count() == 2)
        page.click('[data-fcigic="0"]'); check("IGIC exento: total 180,00 €", "180,00" in page.inner_text("#fc-tot"), page.inner_text("#fc-tot"))
        page.click('[data-fcigic="7"]')
        check("sin scroll horizontal", page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        page.screenshot(path=str(OUT / f"{nombre}-1-factura.png"), full_page=True)
        page.wait_for_function("document.querySelector('#tf-save .t-sv') && /Guardado/.test(document.querySelector('#tf-save .t-sv').textContent)", timeout=8000); check("se guarda sola", True)
        page.fill('[data-fc="cliente.nombre"]', ""); page.once("dialog", lambda d: d.accept()); page.click("[data-tcerrar]")
        page.wait_for_selector("#tf-faltan:not([hidden])", timeout=8000); check("sin nombre no emite y avisa de lo que falta", "cliente" in page.inner_text("#tf-faltan").lower())
        page.fill('[data-fc="cliente.nombre"]', "Ana Pérez"); page.once("dialog", lambda d: d.accept()); page.click("[data-tcerrar]")
        page.wait_for_selector(".t-lock", timeout=8000); check("emitida: queda bloqueada con su número", "Factura emitida" in page.inner_text("#tf"))
        check("los campos quedan deshabilitados", page.locator('[data-fc="cliente.nombre"]').is_disabled())
        check("el estado de la pestaña es «Emitida»", "Emitida" in page.inner_text('[data-ttabb="f5"]'))
        page.evaluate("()=>{window.print=()=>{window.__imp=1}}"); page.locator("#tf .app-more").click() if page.is_visible("#tf .app-more") else None; page.click('[data-tprint="uno"]'); page.wait_for_function("window.__imp===1", timeout=6000)
        html = page.inner_html("#t-print"); check("la impresión trae emisor, cliente, líneas y total", all(x in html for x in ("MAYLIN Y YERAY", "B93975647", "IF-10512", "1000478998399", "Ana Pérez", "Pastillas de freno", "TOTAL")) and "BORRADOR" not in html)
        page.click('[data-fclib="ver"]'); page.wait_for_function("/Todo correcto/.test(document.querySelector('#fc-lib').textContent)", timeout=8000); check("«Comprobar integridad» dice que todo cuadra", True)
        with page.expect_download(timeout=8000) as dl: page.click('[data-fclib="csv"]')
        check("«Descargar listado» baja un CSV", dl.value.suggested_filename.endswith(".csv"))
        page.once("dialog", lambda d: d.accept("error de precio")); page.click("[data-treabrir=f5]"); page.wait_for_selector('[data-fc="cliente.nombre"]:not([disabled])', timeout=8000); check("el gerente la reabre y vuelve a ser editable", True)
        check("sin errores de consola", not errores, str(errores[:3]))
    b.close()
print(f"\n{ok} bien, {len(mal)} mal")
if mal: print("\n".join(mal)); sys.exit(1)
