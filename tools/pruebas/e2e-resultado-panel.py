# Panel en Chromium (actualización 62): emitir la factura preguntando «¿cómo ha pagado?» (efectivo → Caja + Finanzas al céntimo),
# el resultado de cada coche entregado (precio final, sin IGIC, piezas, mano de obra por trabajador, beneficio),
# el botón activar/desactivar la mano de obra, los gastos fijos y el aviso «hoy hay pérdidas».
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-resultado-panel.py [carpeta-capturas]
import sys, pathlib, json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-resultado"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(x)); print("  ✘", n, x)
POST = "async (a)=>await api(a[0],{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(a[1])})"
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
        suf = "A" if nombre == "escritorio" else "B"
        # --- datos: caja abierta, una pieza de 45 € en el inventario, dos coches con presupuesto aceptado
        pg.evaluate(POST, ["/api/caja/abrir", {"desglose": {"10000": 5}}]) if nombre == "escritorio" else None
        pid = pg.evaluate(POST, ["/api/almacen/pieza", {"nombre": "Pastillas " + suf, "categoria": "Frenos", "unidad": "ud", "minimo": "1", "coste": "45", "pvp": "80", "stock": "0"}])["pieza"]["id"]
        pg.evaluate(POST, ["/api/almacen/entrada", {"albaran": "A-" + suf, "proveedor": "Rec", "lineas": [{"pieza": pid, "cantidad": "5", "coste": "45"}]}])
        def coche(mat, nom, conhoras):
            tok = pg.evaluate("""async (a)=>{ const r=await tApi("recepcion","POST",{cliente:{nombre:a[1],telefono:"600111222"},vehiculo:{matricula:a[0],marcaModelo:"Renault Clio"},tipoEntrada:"reparacion",recibidoPor:"Test"}); ORDENES.unshift(r.orden); return r.orden.token; }""", [mat, nom])
            if conhoras:
                pg.evaluate(POST, ["/api/almacen/imputar", {"orden": tok, "pieza": pid, "cantidad": "1"}])
                pg.evaluate("async t=>{ await tApi('fichas/'+t+'/f3','POST',{accion:'evento',tipo:'inicio'}); await tApi('fichas/'+t+'/f3','POST',{accion:'evento',tipo:'fin'}); }", tok)
                pg.evaluate("async t=>{ await tApi('fichas/'+t+'/f3','POST',{accion:'corregir',i:0,t:new Date(Date.now()-150*60000).toISOString(),motivo:'prueba de 2,5 horas'}); }", tok)
            pg.evaluate("""async (a)=>{ await api('/api/ordenes/'+a[0],{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({presupuesto:{lineas:[{c:'Pastillas delanteras',n:1,p:120},{c:'Mano de obra',n:3,p:50}],igic:7,enviar:true}})});
              await fetch('/api/seguimiento/'+a[0]+'/respuesta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accion:'aceptar',nombre:a[1],acepta:true})}); }""", [tok, nom])
            return tok
        T1 = coche("1010" + suf + "AA", "Cliente " + suf + "1", True)
        T2 = coche("2020" + suf + "BB", "Cliente " + suf + "2", False)
        # --- emitir la factura del coche 1: efectivo
        pg.evaluate("t=>abrirFichas(t,'f5')", T1); pg.wait_for_selector("[data-tcerrar]")
        pg.click("[data-tcerrar]"); pg.wait_for_selector("#f-fn")
        check("al emitir pregunta «¿Cómo ha pagado el cliente?»", "cómo ha pagado el cliente" in pg.inner_text("#f-fn").lower() and "288,90" in pg.inner_text("#f-fn"), pg.inner_text("#f-fn")[:200])
        pg.click("#f-fn #fn-ok"); check("no deja emitir sin elegir cómo pagó", "Elige cómo ha pagado" in pg.inner_text("#fn-err"))
        pg.click('#fn-met [data-v="efectivo"]')
        check("efectivo: propone el total (288,90) y avisa de que entra en la caja", pg.input_value("#fn-importe") == "288,90" and "caja" in pg.inner_text("#fn-met-h").lower(), pg.input_value("#fn-importe"))
        pg.screenshot(path=str(OUT / f"{nombre}-1-emitir.png"))
        pg.wait_for_timeout(1200)  # el panel no reenvía un formulario en menos de 0,9 s (antiduplicados)
        pg.click("#fn-ok")
        pg.wait_for_function("TF.fichas.f5&&TF.fichas.f5.cerrada", timeout=15000)
        check("factura emitida y cobro registrado en la caja", pg.evaluate("TF.fichas.f5&&TF.fichas.f5.cerrada") is True)
        # --- factura del coche 2: «todavía no ha pagado»
        pg.evaluate("t=>abrirFichas(t,'f5')", T2); pg.wait_for_selector("[data-tcerrar]"); pg.click("[data-tcerrar]"); pg.wait_for_selector("#f-fn")
        pg.click('#fn-met [data-v="pendiente"]'); check("«Todavía no ha pagado» no pide importe", pg.is_hidden("#fn-imp-box"))
        pg.wait_for_timeout(1200); pg.click("#fn-ok"); pg.wait_for_function("TF.fichas.f5&&TF.fichas.f5.cerrada", timeout=15000)
        # --- comprobación contra el servidor
        F = pg.evaluate("async()=>await api('/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31')")
        caja = pg.evaluate("async()=>await api('/api/caja/estado')")
        check("Finanzas: 288,90 € cobrados en efectivo del coche 1", F["porCanal"]["efectivo"] >= 28890, F["porCanal"])
        check("Caja y Finanzas dicen lo mismo (teórico = efectivo en cajón)", caja["calculo"]["teorico"] == F["efectivo"]["teorico"], (caja["calculo"].get("teorico"), F["efectivo"]["teorico"]))
        pc = [x for x in F["porCobrar"] if x["ref"] == T2]
        check("el coche 2 queda «Por cobrar» 288,90 €", len(pc) == 1 and pc[0]["pendiente"] == 28890, pc)
        check("el coche 1 NO queda por cobrar", not [x for x in F["porCobrar"] if x["ref"] == T1])
        # --- entregar el coche 1 y ver el resultado
        pg.evaluate("t=>api('/api/ordenes/'+t,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({estado:'entregado'})})", T1)
        pg.evaluate("async t=>{ const r=await tApi('fichas/'+t); tRecibir(r); }", T1)
        pg.evaluate("t=>abrirFichas(t,'f1')", T1); pg.wait_for_selector("#tf .t-tabs")
        if nombre == "movil" and pg.is_visible("#tf .app-more"): pg.click("#tf .app-more")
        pg.wait_for_selector("[data-rsficha]")
        pg.click("[data-rsficha]"); pg.wait_for_selector("#dlg-fn .rs-res")
        d = pg.inner_text("#dlg-fn")
        check("resultado: precio final 288,90 €", "288,90" in d)
        check("resultado: IGIC 18,90 € apartado", "18,90" in d and "no tuyo" in d)
        check("resultado: precio sin IGIC 270,00 €", "270,00" in d)
        check("resultado: piezas del inventario 45,00 €", "Pastillas" in d and "45,00" in d)
        check("resultado: mano de obra por trabajador (Gerente · 2 h 30 min)", "Gerente" in d and "2 h 30 min" in d, d[:400])
        check("resultado: beneficio = 270,00 − 45,00 − mano de obra", "BENEFICIO" in d)
        pg.screenshot(path=str(OUT / f"{nombre}-2-resultado.png"))
        pg.click("#dlg-fn [data-fncancel]")
        # --- Finanzas: hoy, tabla, botón activar/desactivar
        pg.evaluate("abrirTab('fin')"); pg.wait_for_selector(".rs-hoy", timeout=15000)
        H = pg.evaluate("async()=>(await api('/api/finanzas/resumen')).hoy")
        txt = pg.inner_text(".rs-hoy").lower()
        check("el banner de hoy dice si hay pérdidas o no", ("hoy hay pérdidas" in txt) == H["perdida"] and ("hoy no hay pérdidas" in txt) != H["perdida"], txt[:120])
        check("el banner enseña el beneficio, los fijos del día y el resultado", "resultado de hoy" in txt and "gastos fijos" in txt)
        check("sale la tabla «Coches de taller entregados»", pg.locator("#fn-resultados .rs-tabla tbody tr").count() >= 1 and pg.is_visible("#fn-resultados .rs-tot"))
        igic = pg.inner_text("#fn-resultados .rs-igic")
        check("IGIC apartado visible (no es tuyo)", "no es tuyo" in igic and ("18,90" in igic or "37,80" in igic), igic)
        ben_on = pg.inner_text("#fn-resultados .rs-ben")
        check("botón de mano de obra ACTIVADO por defecto", pg.get_attribute("[data-rsmo]", "aria-checked") == "true" and "ACTIVADO" in pg.inner_text("[data-rsmo]"))
        pg.screenshot(path=str(OUT / f"{nombre}-3-finanzas.png"), full_page=True)
        pg.click("[data-rsmo]"); pg.wait_for_function("document.querySelector('[data-rsmo]').getAttribute('aria-checked')==='false'", timeout=10000)
        ben_off = pg.inner_text("#fn-resultados .rs-ben")
        check("DESACTIVADO: el beneficio sube (ya no resta a los trabajadores)", ben_off != ben_on and "DESACTIVADO" in pg.inner_text("[data-rsmo]"), (ben_on, ben_off))
        pg.click("[data-rsmo]"); pg.wait_for_function("document.querySelector('[data-rsmo]').getAttribute('aria-checked')==='true'", timeout=10000)
        check("al volver a activarlo, el beneficio es el de antes", pg.inner_text("#fn-resultados .rs-ben") == ben_on)
        pg.fill("#rs-fijos", "6000"); pg.fill("#rs-dias", "20"); pg.click("[data-rsguardar]")
        pg.wait_for_function("document.querySelector('#rs-fijos').value==='6000,00'", timeout=10000)
        check("gastos fijos 6.000 € ÷ 20 = 300,00 €/día", "300,00" in pg.inner_text("#fn-resultados"))
        pg.fill("#rs-fijos", "9000"); pg.click("[data-rsguardar]"); pg.wait_for_function("document.querySelector('#rs-fijos').value==='9000,00'", timeout=10000)
        check("vuelven los 9.000 € (450,00 €/día)", "450,00" in pg.inner_text("#fn-resultados"))
        pg.click("[data-rsver]"); pg.wait_for_selector("#dlg-fn .rs-res"); check("«Ver» abre el detalle desde la tabla", "BENEFICIO" in pg.inner_text("#dlg-fn")); pg.click("#dlg-fn [data-fncancel]")
        check("sin scroll horizontal", pg.evaluate("document.documentElement.scrollWidth") <= vp["width"] + 1, pg.evaluate("document.documentElement.scrollWidth"))
        check("sin errores de consola", not errs, errs[:3]); ctx.close()
    b.close()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("Fallos:", *mal, sep="\n - ")
sys.exit(1 if mal else 0)
