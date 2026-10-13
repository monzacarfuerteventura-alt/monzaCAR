# Panel en Chromium (actualización 75): Devoluciones a proveedor dentro de Compras (seguimiento + abono a caja/banco),
# Pruebas a domicilio en Coches, «Herramientas de venta» plegadas y pliegues de tarjetas.
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-panel-75.py [carpeta-capturas]
import sys, pathlib
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-75"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(x)); print("  ✘", n, x)
POST = "async (a)=>await api(a[0],{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(a[1])})"
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}, locale="es-ES"); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text and "favicon" not in m.text else None)
    pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
    pg.evaluate(POST, ["/api/caja/abrir", {"desglose": {"10000": 5}}])
    print("\n1) Devoluciones dentro de Compras")
    pg.evaluate("abrirTab('compras')"); pg.wait_for_selector("#s-compras [data-peseg=csub]")
    check("Compras tiene la pestaña «Devoluciones»", "Devoluciones" in pg.inner_text("#s-compras [data-peseg=csub]"))
    pg.click("#s-compras [data-peseg=csub] button[data-k=dev]"); pg.wait_for_selector("[data-dev=nueva]")
    check("pestaña vacía con mensaje claro", "Todavía no hay devoluciones" in pg.inner_text("#s-compras"))
    pg.click("[data-dev=nueva]"); pg.wait_for_selector("#dv-p")
    pg.fill("#dv-p", "Pastillas ref. 123"); pg.fill("#dv-pr", "Recambios SL"); pg.fill("#dv-e", "5"); pg.click("dialog.erp-dlg[open] button[type=submit]")
    pg.wait_for_selector("[data-dev=ver]", timeout=8000)
    t = pg.inner_text("#s-compras")
    check("sale la devolución pendiente con 5,00 € esperados", "Pastillas ref. 123" in t and "5,00" in t and "Pendiente de entregar" in t, t[:300])
    pg.screenshot(path=str(OUT / "devoluciones.png"), full_page=True)
    pg.click("[data-dev=ver]"); pg.wait_for_selector("#sg-g")
    check("antes de entregar no se puede confirmar abono", "Primero apunta la fecha de entrega" in pg.inner_text("dialog.erp-dlg[open]"))
    pg.fill("#sg-ent", pg.evaluate("hoyC()")); pg.fill("#sg-alb", "ALB-77"); pg.click("#sg-g"); pg.wait_for_timeout(1200)
    pg.wait_for_selector("[data-dev=ver]"); check("estado «Entregada · falta el abono»", "Entregada" in pg.inner_text("#s-compras") and "ALB-77" in pg.inner_text("#s-compras"))
    pg.click("[data-dev=ver]"); pg.wait_for_selector("#sg-ab")
    pg.click("#sg-ab"); pg.wait_for_timeout(300); check("pide elegir efectivo o transferencia", "efectivo o por transferencia" in pg.inner_text("dialog.erp-dlg[open]"))
    antes = pg.evaluate("api('/api/caja/estado')")["calculo"]["teorico"]
    pg.click('#sg-met button[data-v=efectivo]'); pg.fill("#sg-na", "AB-001"); pg.click("#sg-ab"); pg.wait_for_timeout(1500)
    caja = pg.evaluate("api('/api/caja/estado')"); check("el abono en EFECTIVO entra en la caja (+5,00)", caja["calculo"]["teorico"] == antes + 500, caja["calculo"])
    F = pg.evaluate("api('/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31')")
    check("aparece como ingreso en Finanzas (5,00)", any("Abono de proveedor" in x["concepto"] and x["total"] == 500 for x in F["emitidas"]))
    pg.wait_for_selector("[data-dev=ver]"); t = pg.inner_text("#s-compras")
    check("la devolución queda «Abonada» en efectivo", "Abonada" in t and "efectivo" in t.lower(), t[:300])
    # segunda: transferencia
    pg.click("[data-dev=nueva]"); pg.wait_for_selector("#dv-p"); pg.fill("#dv-p", "Filtro"); pg.fill("#dv-pr", "Recambios SL"); pg.fill("#dv-e", "20"); pg.click("dialog.erp-dlg[open] button[type=submit]"); pg.wait_for_timeout(1200)
    pg.locator("[data-dev=ver]").first.click(); pg.wait_for_selector("#sg-g"); pg.fill("#sg-ent", pg.evaluate("hoyC()")); pg.click("#sg-g"); pg.wait_for_timeout(1200)
    pg.locator("[data-dev=ver]").first.click(); pg.wait_for_selector("#sg-ab"); pg.click('#sg-met button[data-v=transferencia]'); pg.click("#sg-ab"); pg.wait_for_timeout(1500)
    caja2 = pg.evaluate("api('/api/caja/estado')"); check("el abono por TRANSFERENCIA no toca la caja", caja2["calculo"]["teorico"] == caja["calculo"]["teorico"])
    F = pg.evaluate("api('/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31')"); check("…y entra en Finanzas como transferencia (20,00)", F["porCanal"]["transferencia"] == 2000, F["porCanal"])

    print("\n2) Documentación y Compras")
    pg.evaluate("abrirTab('docs')"); pg.wait_for_selector("#s-docs .dc-row")
    d = pg.inner_text("#s-docs")
    check("ya no se llama «Cascos y abonos»", "Cascos y abonos" not in d and "Devoluciones a proveedor" in d)
    check("FORM-07 y FORM-12 mandan a su sección", "Ir a Compras" in d and "Ir a Coches" in d)

    print("\n3) Coches: herramientas de venta en un pliegue")
    pg.evaluate("abrirTab('coches')"); pg.wait_for_selector("#vc-herr", timeout=10000)
    check("las herramientas están plegadas por defecto", not pg.is_visible("#fin-cfg"))
    pg.click("#vc-herr > .vc-herr-h"); pg.wait_for_timeout(300)
    check("un clic y salen Financiación, Multipublicación y Pruebas a domicilio", pg.is_visible("#fin-cfg") and pg.is_visible("#vc-pruebas"))
    check("Multipublicación, Publicar en portales y Reservas online están dentro", pg.evaluate("['mp-cfg','pp-cfg','rv-box'].every(i=>{const e=document.getElementById(i);return !e||document.getElementById('vc-herr').contains(e)})"))
    pg.screenshot(path=str(OUT / "coches-herramientas.png"))
    pg.click("#vc-herr > .vc-herr-h"); pg.wait_for_timeout(200); check("otro clic y se pliega", not pg.is_visible("#fin-cfg"))
    pg.evaluate("window.VCOrden.irPruebas()"); pg.wait_for_timeout(1500); check("desde Documentación se llega a las Pruebas a domicilio", pg.is_visible("#vc-pruebas"))
    pg.wait_for_timeout(600); check("Pruebas a domicilio abre su formulario", pg.is_visible("#vc-pr-abrir"))

    print("\n4) Pliegues de tarjetas")
    pg.evaluate("fnAbrirTab()"); pg.wait_for_selector("#fn .fn-kpis", timeout=15000); pg.wait_for_selector("#fn .card .vc-cph", timeout=8000)
    h = pg.locator("#fn .card .vc-cph").first; hijo = pg.evaluate("(()=>{const c=document.querySelector('#fn .card .vc-cph').parentNode;return [...c.children].filter(x=>!x.classList.contains('vc-cph'))[0]?.tagName||''})()")
    check("las tarjetas de Finanzas tienen título plegable", h.count() == 1)
    vis0 = pg.evaluate("(()=>{const c=document.querySelector('#fn .card .vc-cph').parentNode;const x=[...c.children].find(y=>!y.classList.contains('vc-cph'));return x?getComputedStyle(x).display!=='none':true})()")
    h.click(); pg.wait_for_timeout(300)
    vis1 = pg.evaluate("(()=>{const c=document.querySelector('#fn .card .vc-cph').parentNode;const x=[...c.children].find(y=>!y.classList.contains('vc-cph'));return x?getComputedStyle(x).display!=='none':false})()")
    check("al pulsar el título se pliega el contenido", vis0 and not vis1, (vis0, vis1))
    pg.reload(); pg.wait_for_function("typeof fnAbrirTab==='function' && !document.querySelector('#login-form')?.offsetParent", timeout=20000); pg.wait_for_timeout(1200)
    pg.evaluate("fnAbrirTab()"); pg.wait_for_selector("#fn .card .vc-cph", timeout=15000); pg.wait_for_timeout(500)
    check("se acuerda lo plegado al recargar", pg.evaluate("!!document.querySelector('#fn .card.vc-cpc')"))
    check("sin errores de JavaScript", not errs, errs[:3])
    b.close()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("\n".join(mal)); sys.exit(1)
