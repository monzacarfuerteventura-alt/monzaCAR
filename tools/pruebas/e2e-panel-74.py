# Panel en Chromium (actualización 74): Margen con desglose (taller y venta), avisos de ITV solo en Clientes 360,
# cobro dividido efectivo + transferencia, botones «Corregir» y «Empezar de cero».
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-panel-74.py [carpeta-capturas]
import sys, pathlib
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-74"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(x)); print("  ✘", n, x)
POST = "async (a)=>await api(a[0],{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(a[1])})"
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}, locale="es-ES"); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "favicon" not in m.text and "ERR_TUNNEL" not in m.text and "fonts" not in m.text and "ERR_NAME_NOT_RESOLVED" not in m.text else None)
    pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
    print("\n1) Datos de prueba")
    pg.evaluate(POST, ["/api/caja/abrir", {"desglose": {"10000": 5}}])
    pid = pg.evaluate(POST, ["/api/almacen/pieza", {"nombre": "Pastillas", "categoria": "Frenos", "unidad": "ud", "minimo": "1", "coste": "45", "pvp": "80", "stock": "0"}])["pieza"]["id"]
    pg.evaluate(POST, ["/api/almacen/entrada", {"albaran": "A-1", "proveedor": "Rec", "lineas": [{"pieza": pid, "cantidad": "5", "coste": "45"}]}])
    tok = pg.evaluate("""async ()=>{ const r=await tApi("recepcion","POST",{cliente:{nombre:"Cliente Uno",telefono:"600111222"},vehiculo:{matricula:"1010AAA",marcaModelo:"Renault Clio"},tipoEntrada:"reparacion",recibidoPor:"Test"}); return r.orden.token; }""")
    pg.evaluate(POST, ["/api/almacen/imputar", {"orden": tok, "pieza": pid, "cantidad": "1"}])
    body = {"cliente": {"nombre": "Cliente Uno", "doc": "12345678Z", "telefono": "600111222", "direccion": "", "cp": "", "email": ""}, "vehiculo": {"matricula": "1010AAA", "marcaModelo": "Renault Clio", "vin": "", "kmEntrada": "", "kmSalida": ""},
            "lineas": [{"tipo": "REC", "ref": "", "desc": "Pastillas delanteras", "cant": 1, "precio": 120, "dto": 0}, {"tipo": "MO", "ref": "", "desc": "Mano de obra", "cant": 2, "precio": 50, "dto": 0}], "descuentoGlobal": 0, "igicTipo": "7", "igicOtro": 0, "fechaOperacion": "", "observaciones": "t", "cerrar": True}
    r = pg.evaluate("async a=>await tApi('fichas/'+a[0]+'/f5','PUT',a[1])", [tok, body]); check("se emite la factura (220,00 + IGIC)", bool(r and r["fichas"]["f5"]["emision"]["numero"]))
    pg.evaluate("async t=>await api('/api/ordenes/'+t,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({estado:'entregado'})})", tok)
    pg.evaluate(POST, ["/api/finanzas/cobro/taller/" + tok, {"importe": "100", "metodo": "efectivo"}])
    cid = pg.evaluate(POST, ["/api/coches", {"marca": "Seat", "modelo": "Ibiza", "version": "1.0", "anio": 2015, "km": 90000, "combustible": "Gasolina", "cambio": "Manual", "precio": 5000, "estado": "disponible"}])
    cid = cid.get("id") or cid["coche"]["id"]
    pg.evaluate(POST, ["/api/finanzas/venta/" + cid, {"importe": "5000", "costeCompra": "3000", "fecha": pg.evaluate("hoyC()"), "igicPct": "7", "comprador": "Comprador Uno"}])

    print("\n2) Margen coches: venta + taller con desglose")
    pg.evaluate("abrirTab('mcar')"); pg.wait_for_selector("#s-mcar .pe-kpis", timeout=15000)
    t = pg.inner_text("#s-mcar")
    check("sale «Coches reparados en el taller»", "Coches reparados en el taller" in t)
    check("sale «Coches vendidos»", "Coches vendidos" in t)
    check("KPI Ganancia total y Ganancia en piezas", "Ganancia total" in t and "Ganancia en piezas" in t)
    check("la fila del taller muestra el Renault Clio", "Renault Clio" in t and "1010AAA" in t)
    pg.screenshot(path=str(OUT / "margen.png"), full_page=True)
    pg.click('[data-mdesg="taller"]'); pg.wait_for_selector("dialog.erp-dlg[open]")
    d = pg.inner_text("dialog.erp-dlg[open]")
    check("desglose taller: piezas cobradas, compradas y ganancia", "pastillas delanteras" in d.lower() and "ganancia en piezas" in d.lower() and "compradas al proveedor" in d.lower(), d[:700])
    check("desglose taller: mano de obra y beneficio", "mano de obra" in d.lower() and "beneficio de este coche" in d.lower())
    pg.screenshot(path=str(OUT / "desglose-taller.png")); pg.click("dialog.erp-dlg[open] [data-pecerrar]")
    pg.click('[data-mdesg="venta"]'); pg.wait_for_selector("dialog.erp-dlg[open]")
    d = pg.inner_text("dialog.erp-dlg[open]")
    check("desglose venta: compra, gastos y ganancia real", "compra del coche" in d.lower() and "ganancia real" in d.lower() and "Comprador Uno" in d, d[:300])
    pg.screenshot(path=str(OUT / "desglose-venta.png")); pg.click("dialog.erp-dlg[open] [data-pecerrar]")

    print("\n3) Avisos de ITV solo en Clientes 360")
    pg.evaluate("abrirTab('ordenes')"); pg.wait_for_selector("#t-barra")
    check("Taller YA NO tiene la vista «Avisos de ITV»", "Avisos de ITV" not in pg.inner_text("#t-barra"))
    pg.evaluate("abrirTab('cli')"); pg.wait_for_selector("#s-cli [data-peseg=clisub]")
    check("Clientes 360 tiene la pestaña «Avisos de ITV»", "Avisos de ITV" in pg.inner_text("#s-cli [data-peseg=clisub]"))
    pg.click('#s-cli [data-peseg=clisub] button[data-k=itv]'); pg.wait_for_selector("#cli-itv")
    pg.wait_for_function("!document.querySelector('#cli-itv').innerText.includes('Cargando')", timeout=10000)
    check("se pinta la lista de ITV dentro de Clientes 360", "caduca en 7 días" in pg.inner_text("#cli-itv").lower(), pg.inner_text("#cli-itv")[:200])

    print("\n4) Cobro dividido")
    pg.evaluate("abrirTab('ordenes')")
    tok2 = pg.evaluate("""async ()=>{ const r=await tApi("recepcion","POST",{cliente:{nombre:"Cliente Dos",telefono:"600333444"},vehiculo:{matricula:"2020BBB",marcaModelo:"Ford Fiesta"},tipoEntrada:"reparacion",recibidoPor:"Test"}); return r.orden.token; }""")
    pg.evaluate("""async t=>{ await api('/api/ordenes/'+t,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({presupuesto:{lineas:[{c:'Revisión',n:1,p:200}],igic:7,enviar:true}})}); await fetch('/api/seguimiento/'+t+'/respuesta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accion:'aceptar',nombre:'Cliente Dos',acepta:true})}); }""", tok2)
    pg.evaluate("fnAbrirTab()"); pg.wait_for_selector("#fn .fn-kpis", timeout=15000)
    pg.wait_for_selector("[data-fncobro]"); pg.click("[data-fncobro] >> nth=0"); pg.wait_for_selector("#dlg-fn[open] #fn-met")
    check("el diálogo ofrece «Efectivo + transferencia»", "Efectivo + transferencia" in pg.inner_text("#dlg-fn"))
    pg.click('#fn-met button[data-v="mixto"]')
    check("salen los dos campos", pg.is_visible("#fn-mx-ef") and pg.is_visible("#fn-mx-tr"))
    pg.fill("#fn-importe", "214,00"); pg.fill("#fn-mx-ef", "100"); pg.dispatch_event("#fn-mx-ef", "input")
    check("la transferencia se rellena sola con el resto (114,00)", pg.input_value("#fn-mx-tr") == "114,00", pg.input_value("#fn-mx-tr"))
    pg.fill("#fn-mx-ef", "214"); pg.click("#fn-ok"); pg.wait_for_timeout(400)
    check("si una parte es 0, avisa y no guarda", "mayores que 0" in pg.inner_text("#fn-err"), pg.inner_text("#fn-err"))
    pg.fill("#fn-mx-ef", "100"); pg.dispatch_event("#fn-mx-ef", "input"); pg.wait_for_timeout(1200); pg.click("#fn-ok"); pg.wait_for_timeout(1500); print("   estado:", pg.inner_text("#fn-err") if pg.is_visible("#fn-err") else "sin error", "| dialogo abierto:", pg.is_visible("#dlg-fn"))
    F = pg.evaluate("api('/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31')"); d2 = [z for z in F["emitidas"] if z["ref"] == tok2][0]
    check("quedan dos cobros: 100,00 efectivo y 114,00 transferencia", sorted([(c["metodo"], c["importe"]) for c in d2["cobros"]]) == [("efectivo", 10000), ("transferencia", 11400)], d2["cobros"])

    print("\n5) Botones «Corregir»")
    pg.evaluate("fnCargar()"); pg.wait_for_selector("[data-fncobroedit]")
    pg.click("[data-fncobroedit] >> nth=0"); pg.wait_for_selector("#f-corr")
    check("el diálogo de corregir cobro se abre", pg.is_visible("#co-imp2"))
    pg.screenshot(path=str(OUT / "corregir-cobro.png")); pg.click("#dlg-fn [data-fncancel]")
    pg.evaluate("abrirTab('caja')"); pg.wait_for_selector("#cj")

    print("\n6) Empezar de cero")
    pg.evaluate("fnAbrirTab()"); pg.wait_for_selector("#gd-reset", timeout=15000)
    pg.evaluate("document.querySelector('#gd-reset').open=true")
    check("el botón está bloqueado hasta escribir la frase", pg.is_disabled("#gd-reset-go"))
    pg.fill("#gd-reset-txt", "empezar de cero"); check("con la frase se activa", not pg.is_disabled("#gd-reset-go"))
    pg.screenshot(path=str(OUT / "reset.png"), full_page=True)
    pg.click("#gd-reset-go"); pg.wait_for_function("document.querySelector('#fn .fn-kpis') && !document.querySelector('[data-fncobroedit]')", timeout=15000)
    F = pg.evaluate("api('/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31')")
    check("Finanzas queda a cero", F["kpis"]["cobrado"] == 0 and F["kpis"]["facturado"] == 0 and not F["emitidas"], F["kpis"])
    pg.evaluate("abrirTab('mcar')"); pg.wait_for_timeout(800)
    check("Margen sin coches de taller de prueba", "Ningún coche de taller entregado" in pg.inner_text("#s-mcar"))

    print("\n7) Garantía: sin letras del navegador y «solo motor» solo para empresas")
    css = pg.evaluate("[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('')}catch(e){return ''}}).join('')")
    check("la hoja de impresión usa página sin márgenes (@page pe)", "@page pe" in css and "margin: 0" in css.split("@page pe")[1][:60])
    check("sin errores de JavaScript", not errs, errs[:3])
    b.close()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("\n".join(mal)); sys.exit(1)
