# Hoja de presupuesto rellenable en la ficha FORM-15 (actualización 61), en Chromium (escritorio y móvil).
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-presupuesto-ficha.py [carpeta-capturas]
# Comprueba: rellenar sin salir de la ficha, totales, traer puntos de la inspección, borrador que el cliente NO ve, enviar,
# lo que ve el cliente en su enlace, que lo guardado coincide con el cajón y el PDF, y el bloqueo al aceptar.
import sys, pathlib, json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-presu"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(x)); print("  ✘", n, x)
with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, vp in [("escritorio", {"width": 1366, "height": 900}), ("movil", {"width": 390, "height": 800})]:
        print("\n==", nombre)
        ctx = b.new_context(viewport=vp, locale="es-ES"); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "favicon" not in m.text and "ERR_TUNNEL" not in m.text else None)
        pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
        mat = "5555AAA" if nombre == "escritorio" else "6666BBB"
        tok = pg.evaluate("""async (mat)=>{ const r=await tApi("recepcion","POST",{cliente:{nombre:"Cliente Presu",telefono:"600111222"},vehiculo:{matricula:mat,marcaModelo:"Renault Clio"},tipoEntrada:"reparacion",recibidoPor:"Test"}); ORDENES.unshift(r.orden); return r.orden.token; }""", mat)
        # inspección con dos puntos: uno rojo y otro ámbar (para traerlos al presupuesto)
        pg.evaluate("""async (t)=>{ await tApi("fichas/"+t+"/f2","PUT",{mecanico:"",items:{d6:{e:"r",nota:"1 mm",extra:"",fotos:[]},c1:{e:"a",nota:"",extra:"",fotos:[]},a1:{e:"ok",nota:"",extra:"",fotos:[]}},horasEst:2.5,recomendacion:"",rechazoFirmado:false,autorizaRojos:false,autorizaNombre:"",firma:null,cerrada:false,inicio:""}); }""", tok)
        pg.evaluate("t=>abrirFichas(t,'pre')", tok); pg.wait_for_selector("#tpre")
        check("la pestaña FORM-15 es un formulario (ya no solo un resumen)", pg.locator("#tpre [data-plc]").count() >= 1 and pg.locator("[data-pguardar]").count() == 1)
        check("avisa de los puntos que dejó la inspección", "2" in pg.inner_text("#tpre") and "ámbar o rojo" in pg.inner_text("#tpre"))
        check("viene el cliente y el coche de la recepción", "Cliente Presu" in pg.inner_text("#tpre") and mat in pg.inner_text("#tpre").upper())
        pg.click("[data-plsug]"); pg.wait_for_function("document.querySelectorAll('#tpre .tpre-l[data-pl]').length==2")
        txt = [pg.input_value(f"#tpre .tpre-l[data-pl='{i}'] [data-plc]") for i in range(2)]
        check("trae primero el punto rojo y después el ámbar", "Pastillas delanteras" in txt[0] and "1 mm" in txt[0] and "Aceite motor" in txt[1], txt)
        pg.click("[data-pladd='mo']"); pg.wait_for_function("document.querySelectorAll('#tpre .tpre-l[data-pl]').length==3")
        check("añade «Mano de obra» con las horas de la inspección", pg.input_value("#tpre .tpre-l[data-pl='2'] [data-plc]") == "Mano de obra" and pg.input_value("#tpre .tpre-l[data-pl='2'] [data-pln]") == "2,5")
        # precios: 85,50 + 12 × 2 + 2,5 h × 40 = 85,50 + 24 + 100 = 209,50 ; IGIC 7 % = 14,67 (14,665) ; total 224,17
        pg.fill("#tpre .tpre-l[data-pl='0'] [data-plp]", "85,50")
        pg.fill("#tpre .tpre-l[data-pl='1'] [data-pln]", "2"); pg.fill("#tpre .tpre-l[data-pl='1'] [data-plp]", "12")
        pg.fill("#tpre .tpre-l[data-pl='2'] [data-plp]", "40")
        t = pg.inner_text("#tpre [data-ptot]")
        check("totales al momento: base 209,50 · IGIC 7 % · total", "209,50" in t and "Total" in t, t)
        check("cada línea muestra su importe", "100 €" in pg.inner_text("#tpre .tpre-l[data-pl='2']") and "24 €" in pg.inner_text("#tpre .tpre-l[data-pl='1']"), pg.inner_text("#tpre .tpre-l[data-pl='2']"))
        pg.fill("[data-pnota]", "Garantía 12 meses. Plazo: 2 días.")
        pg.screenshot(path=str(OUT / f"{nombre}-1-rellenando.png"), full_page=True)
        # --- borrador: se guarda solo y el cliente NO lo ve
        pg.wait_for_function("document.querySelector('#tpre [data-psv]').innerText.includes('Guardado')", timeout=9000)
        pub = pg.evaluate("async t=>await (await fetch('/api/seguimiento/'+t)).json()", tok)
        check("se guarda solo como borrador mientras escribes", pg.evaluate("t=>ORDENES.find(o=>o.token===t).presupuesto&&ORDENES.find(o=>o.token===t).presupuesto.estado", tok) == "borrador")
        check("el cliente NO ve el borrador en su enlace", pub.get("presupuesto") is None, pub.get("presupuesto"))
        # --- enviar
        pg.click("[data-penviar]"); pg.wait_for_function("document.querySelector('#tpre').innerText.includes('Actualizar y reenviar')", timeout=9000)
        pub = pg.evaluate("async t=>await (await fetch('/api/seguimiento/'+t)).json()", tok)
        P = pub.get("presupuesto") or {}
        check("el cliente ve el presupuesto enviado con 3 líneas", len(P.get("lineas", [])) == 3 and P.get("estado") == "enviado", P)
        check("base 209,5 · IGIC 14,67 · total 224,17 (como en el panel)", P.get("base") == 209.5 and P.get("igicImporte") == 14.67 and P.get("total") == 224.17, (P.get("base"), P.get("igicImporte"), P.get("total")))
        check("la nota llega al cliente", "Garantía 12 meses" in (P.get("nota") or ""))
        check("sale el botón «Avisar por WhatsApp»", pg.locator("[data-pwa]").count() == 1 and "wa.me/34600111222" in pg.get_attribute("[data-pwa]", "href"))
        check("la orden pasó sola a «Presupuesto»", pg.evaluate("t=>ORDENES.find(o=>o.token===t).estado", tok) == "presupuesto")
        check("la ficha muestra el estado «Enviado»", "Enviado" in pg.inner_text(".t-tabs"))
        # --- cambiar algo ya enviado NO se guarda solo: hace falta pulsar el botón
        pg.fill("#tpre .tpre-l[data-pl='0'] [data-plp]", "90"); pg.wait_for_timeout(3500)
        pub = pg.evaluate("async t=>await (await fetch('/api/seguimiento/'+t)).json()", tok)
        check("lo ya enviado no cambia solo mientras escribes", pub["presupuesto"]["lineas"][0]["p"] == 85.5, pub["presupuesto"]["lineas"][0])
        check("avisa de «Cambios sin guardar»", "Cambios sin guardar" in pg.inner_text("#tpre [data-psv]"))
        pg.click("[data-pguardar]"); pg.wait_for_function("document.querySelector('#tpre [data-psv]').innerText.includes('Guardado')", timeout=9000)
        pub = pg.evaluate("async t=>await (await fetch('/api/seguimiento/'+t)).json()", tok)
        check("al pulsar «Guardar cambios» el cliente ve 90,00", pub["presupuesto"]["lineas"][0]["p"] == 90 and pub["presupuesto"]["total"] == 228.98, pub["presupuesto"])
        # --- el cajón y el PDF dicen lo mismo
        pg.click("#tpre [data-tdrawer]"); pg.wait_for_selector("#dw-body [data-tot]")
        tot = pg.inner_text("#dw-body [data-tot]")
        check("el cajón del cliente enseña el mismo total (228,98 €)", "228,98" in tot, tot)
        pg.evaluate("cerrarDrawer()")
        check("el PDF de la ficha lleva el mismo total", "228,98" in pg.evaluate("tPpre()"), "")
        # --- aceptación del cliente → se bloquea
        r = pg.evaluate("async t=>{ const r=await fetch('/api/seguimiento/'+t+'/respuesta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accion:'aceptar',nombre:'Cliente Presu',acepta:true,comentario:''})}); return r.status }", tok)
        pg.evaluate("t=>abrirFichas(t,'pre')", tok); pg.wait_for_selector("#tpre")
        check("el cliente acepta (200)", r == 200, r)
        check("aceptado: la hoja queda bloqueada", pg.locator("#tpre fieldset:disabled").count() == 1 and pg.locator("[data-penviar]").count() == 0 and "Presupuesto aceptado" in pg.inner_text("#tpre"))
        pg.screenshot(path=str(OUT / f"{nombre}-2-aceptado.png"), full_page=True)
        pg.click("[data-preabrir]"); pg.wait_for_function("document.querySelector('#tpre fieldset:disabled')==null", timeout=9000)
        check("«Reabrir» la deja editable otra vez como borrador", pg.locator("[data-penviar]").count() == 1 and "Enviar al cliente" in pg.inner_text("#tpre"))
        check("sin scroll horizontal", pg.evaluate("document.documentElement.scrollWidth") <= vp["width"] + 1)
        check("sin errores de consola", not errs, errs[:3]); ctx.close()
    b.close()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("Fallos:", *mal, sep="\n - ")
sys.exit(1 if mal else 0)
