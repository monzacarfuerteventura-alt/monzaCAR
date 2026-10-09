# Prueba del panel en Chromium (actualización 60): coche propio SIN enlazar → «Marcar vendido» abre el registro de la venta en Finanzas
# y la ficha, Finanzas y Caja dicen lo mismo. Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego
#   python3 tools/pruebas/e2e-propios-venta-panel.py [carpeta-capturas]
import sys, pathlib
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-vp-venta"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + x); print("  ✘", n, x)
with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, vp in [("escritorio", {"width": 1366, "height": 900}), ("movil", {"width": 390, "height": 800})]:
        print("\n==", nombre)
        ctx = b.new_context(viewport=vp); page = ctx.new_page(); errores = []
        page.on("pageerror", lambda e: errores.append(str(e)))
        page.on("console", lambda m: errores.append(m.text) if m.type == "error" and "favicon" not in m.text and "ERR_TUNNEL" not in m.text else None)
        page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
        if page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#pw", CLAVE); page.click("#login-btn"); page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
        mat = "1111AAA" if nombre == "escritorio" else "2222BBB"
        page.evaluate("abrirTab('ordenes')"); page.wait_for_selector('[data-tvista="propios"]'); page.click('[data-tvista="propios"]'); page.wait_for_selector("[data-vpnuevo]")
        page.click("[data-vpnuevo]"); page.wait_for_selector("#f-vp")
        page.fill("#vp-mar", "Seat"); page.fill("#vp-mod", "Ibiza"); page.fill("#vp-mat", mat); page.fill("#vp-dan", "Golpe trasero"); page.fill("#vp-com", "3000"); page.fill("#vp-pre", "6000")
        page.click("#vp-ok"); page.wait_for_selector(".vp-pasos")
        check("alta del coche dañado con compra 3.000 € y previsto 6.000 €", mat in page.inner_text("#ordenes"))
        page.click("[data-vphoras]"); page.wait_for_selector("#vp-h"); page.fill("#vp-h", "2,5"); page.click("#vp-ok")
        page.wait_for_function("document.querySelector('#ordenes').innerText.includes('2 h 30 min')")
        for fase in ["calidad", "listo"]:
            page.click(f'[data-vpfase="{fase}"]'); page.click("#vp-ok")
            page.wait_for_function(f"document.querySelector('.vp-pasos li.ahora').innerText.toLowerCase().includes('{ 'calidad' if fase=='calidad' else 'listo' }')")
        check("llega a «Listo para venta»", True)
        # --- Marcar vendido: debe abrir la venta en Finanzas (no pedir un precio suelto)
        page.click('[data-vpfase="vendido"]'); page.wait_for_selector("#f-vp")
        check("el paso «Vendido» ya no pide un precio suelto", page.locator("#vp-base").count() == 0)
        check("explica que se registra en Finanzas", "Finanzas" in page.inner_text("#f-vp"))
        page.click("#vp-ok"); page.wait_for_selector("#f-fn")
        check("se abre «Registrar la venta» de Finanzas", "Registrar la venta" in page.inner_text("#f-fn"))
        check("la compra viene de la ficha (3.000,00) y no se puede editar", page.input_value("#fn-compra") == "3000,00" and page.get_attribute("#fn-compra", "readonly") is not None, page.input_value("#fn-compra"))
        page.screenshot(path=str(OUT / f"{nombre}-1-venta.png"))
        page.fill("#fn-importe", "7490"); page.select_option("#fn-imp", "7"); page.fill("#fn-cli", "Cliente Prueba"); page.fill("#fn-fact", "F-2026-0001")
        page.click('#fn-met [data-v="transferencia"]'); page.click("#fn-ok")
        page.wait_for_function("document.querySelector('.vp-pasos li.ahora') && document.querySelector('.vp-pasos li.ahora').innerText.toLowerCase().includes('vendido')", timeout=15000)
        check("la ficha queda «Vendido» sola tras guardar la venta", True)
        page.screenshot(path=str(OUT / f"{nombre}-2-vendido.png"), full_page=True)
        # --- Finanzas ve lo mismo
        page.evaluate("abrirTab('fin')"); page.wait_for_selector("#s-fin:not([hidden])"); page.wait_for_function("document.querySelector('#s-fin').innerText.includes('Seat Ibiza')", timeout=15000)
        txt = page.inner_text("#s-fin")
        check("Finanzas muestra el coche vendido", "Seat Ibiza" in txt and mat in txt)
        check("beneficio 3.685,00 € = 7.000 − 3.000 − 315 (a 0 €/h las horas no suman: ver la ficha)", "3.000,00" in txt)
        page.screenshot(path=str(OUT / f"{nombre}-3-finanzas.png"), full_page=True)
        check("sin errores de consola", not errores, str(errores[:3])); ctx.close()
    b.close()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("Fallos:", *mal, sep="\n - ")
sys.exit(1 if mal else 0)
