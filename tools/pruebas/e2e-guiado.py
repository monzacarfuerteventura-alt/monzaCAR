# Prueba de la actualización 46 (panel guiado) en un navegador real contra tools/pruebas/servidor-local.mjs
#   bun tools/pruebas/servidor-local.mjs   y en otra ventana:   python3 tools/pruebas/e2e-guiado.py [carpeta-capturas]
import sys, pathlib, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8888"
CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-guiado"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, extra=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(extra)); print("  ✘", n, extra)

def api(page, metodo, ruta, token, body=None):
    return page.evaluate("""async ([m,r,t,b])=>{ const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined}); let j=null; try{ j=await x.json(); }catch(e){} return {s:x.status,j}; }""", [metodo, ruta, token, body])

with sync_playwright() as p:
    b = p.chromium.launch()
    # (47) En móvil la barra de 3 botones se sustituye por el botón «+» de la barra inferior (lo prueba e2e-app.py); aquí se prueba la versión de ordenador.
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, locale="es-ES", timezone_id="Atlantic/Canary")
    page = ctx.new_page(); errores = []
    page.on("pageerror", lambda e: errores.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
    if page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#pw", CLAVE); page.click("#login-btn")
    page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
    tok = page.evaluate("sessionStorage.getItem('vc_tok')")

    print("\n1) Barra de acciones principales")
    page.wait_for_selector("#gd-bar:not([hidden])", timeout=5000)
    txt = page.inner_text("#gd-bar")
    check("hay botón «+ Nueva Entrada / Recepción de Coche»", "+ Nueva Entrada / Recepción de Coche" in txt)
    check("hay botón «+ Factura Rápida / Cobro Directo»", "+ Factura Rápida / Cobro Directo" in txt)
    check("hay botón «Control de Caja (Entrada / Salida)»", "Control de Caja (Entrada / Salida)" in txt)
    check("solo 3 botones grandes + 1 desplegable", page.locator("#gd-bar .gd-big").count() == 3 and page.locator("#gd-bar details.gd-mas").count() == 1)
    page.click("#gd-bar .gd-mas summary")
    menu = page.inner_text("#gd-bar .gd-menu")
    check("«Más opciones / Utilidades» trae Otro ingreso, Excel emitidas/recibidas y PDF asesoría", all(x in menu for x in ["+ Otro ingreso", "Excel emitidas", "Excel recibidas", "PDF asesoría"]), menu)
    page.screenshot(path=str(OUT / "1-barra.png"))
    page.click("#gd-bar .gd-mas summary")

    print("\n2) Finanzas: 3 botones + desplegable y NO se ha quitado nada")
    page.evaluate("abrirTab('fin')"); page.wait_for_selector("#fn .fn-kpis", timeout=10000)
    acts = page.inner_text("#fn .fn-acts")
    check("Finanzas: botones principales", "− Nuevo gasto" in acts and "+ Factura Rápida / Cobro Directo" in acts and "Control de Caja (Entrada / Salida)" in acts)
    check("Finanzas: lo secundario sigue existiendo dentro del desplegable", page.locator("#fn .gd-menu [data-fningreso]").count() == 1 and page.locator("#fn .gd-menu [data-fnexp]").count() == 3)
    page.wait_for_timeout(800); check("la barra global no se duplica en Finanzas", not page.is_visible("#gd-bar"))
    page.click("#fn .gd-mas summary"); page.click("#fn [data-fningreso]")
    page.wait_for_selector("#dlg-fn[open] #f-fn"); check("«+ Otro ingreso» sigue abriendo su formulario", "Otro ingreso" in page.inner_text("#dlg-fn"))
    page.click("#dlg-fn [data-fncancel]")
    page.screenshot(path=str(OUT / "2-finanzas.png"), full_page=True)

    print("\n3) Agenda sin alta manual")
    page.evaluate("abrirTab('agenda')"); page.wait_for_selector("#s-agenda:not([hidden])")
    check("el botón de apuntar cita está oculto en la Agenda", not page.is_visible("#cita-nueva"))
    check("la Agenda explica que se rellena sola desde el CRM", "sola" in page.inner_text("#s-agenda .gd-nota") and "CRM" in page.inner_text("#s-agenda .gd-nota"))
    page.evaluate("abrirTab('leads')"); page.wait_for_selector("#s-leads:not([hidden])")
    check("en el CRM sí se puede apuntar la cita (sin duplicar aparatos)", page.is_visible("#s-leads [data-gdutil=cita]"))

    print("\n4) Asistente: factura rápida en persona (paso 1 → 3 → 4)")
    page.evaluate("abrirTab('dash')"); page.wait_for_selector("#gd-bar:not([hidden])")
    page.click("#gd-bar [data-gd=factura]"); page.wait_for_selector("#dlg-gd[open]")
    check("paso 1 de 4", "paso 1 de 4" in page.inner_text("#dlg-gd").lower())
    page.click("[data-gdsig]"); check("sin nombre no deja continuar", "Escribe el nombre" in page.inner_text("#gd-err"))
    page.fill("#gd-nom", "María Pérez"); page.fill("#gd-tel", "612345678"); page.fill("#gd-mat", "1234 abc"); page.fill("#gd-coche", "Seat Ibiza")
    page.click("[data-gdsig]")
    t3 = page.inner_text("#dlg-gd"); check("salta directo a la factura directa (paso 3)", "paso 3 de 4" in t3.lower() and "Factura directa" in t3)
    page.click("[data-gdemitir]"); check("sin concepto no emite", "Escribe qué se cobra" in page.inner_text("#gd-err"))
    page.fill("[data-gdl=d][data-i='0']", "Cambio de aceite y filtro"); page.fill("[data-gdl=p][data-i='0']", "107")
    check("calcula el total en pantalla", "107,00" in page.inner_text("#gd-tot"))
    page.screenshot(path=str(OUT / "4-factura-directa.png"))
    page.click("[data-gdemitir]")
    page.wait_for_selector("text=Cobro y cierre", timeout=15000)
    t4 = page.inner_text("#dlg-gd")
    check("indicador: factura emitida con número F-AAAA-NNNN", "✅" in t4 and "F-2026-" in t4, t4[:300])
    check("el paso 4 explica la transferencia (en cuenta, NO en el cajón)", "NO presente en el cajón físico de caja" in t4)
    page.click("[data-gdmet=transferencia]"); page.click("[data-gdcobrar]")
    page.wait_for_selector("text=Todo listo", timeout=15000)
    check("indicador: cobro registrado", "Cobro registrado" in page.inner_text("#dlg-gd"))
    page.screenshot(path=str(OUT / "4-cobrado.png"))
    page.click("#dlg-gd [data-gdcerrar]")

    print("\n5) La transferencia suma en ingresos pero NO en el cajón")
    r = api(page, "GET", "/api/finanzas/resumen", tok)["j"]
    check("Cobrado por transferencia = 107", r["porCanal"]["transferencia"] == 10700 and r["porCanal"]["efectivo"] == 0, r["porCanal"])
    check("el efectivo teórico del cajón sigue en 0", r["efectivo"]["teorico"] == 0, r["efectivo"])
    check("el acumulado de cobrado incluye la transferencia", r["kpis"]["cobrado"] == 10700)
    page.evaluate("abrirTab('fin')"); page.wait_for_selector("#fn .gd-canal-res", timeout=10000)
    ft = page.inner_text("#fn .gd-canal-res")
    check("el panel dice «Dinero abonado por Transferencia (En Cuenta Bancaria, NO presente en el cajón físico de caja)»", "Dinero abonado por Transferencia (En Cuenta Bancaria, NO presente en el cajón físico de caja)" in ft)
    check("y «Efectivo físico en cajón»", "Efectivo físico en cajón" in ft)
    page.screenshot(path=str(OUT / "5-canales.png"), full_page=True)

    print("\n6) Caja: el cajón solo admite efectivo")
    a = api(page, "POST", "/api/caja/abrir", tok, {"desglose": {"2000": 1}})
    m = api(page, "POST", "/api/caja/movimiento", tok, {"tipo": "ingreso", "importe": "50", "categoria": "taller", "concepto": "Cobro por transferencia", "ref": "x", "metodo": "transferencia"})
    check("una transferencia NO entra en el cajón", m["s"] == 400 and "solo guarda efectivo" in (m["j"] or {}).get("error", ""), (a["s"], m))
    m1 = api(page, "POST", "/api/caja/movimiento", tok, {"tipo": "ingreso", "importe": "20", "categoria": "otro", "concepto": "Venta de aceite suelto", "ref": "r1"})
    m2 = api(page, "POST", "/api/caja/movimiento", tok, {"tipo": "ingreso", "importe": "20", "categoria": "otro", "concepto": "Venta de aceite suelto", "ref": "r1"})
    check("el mismo apunte repetido en segundos NO se duplica en caja", m1["s"] in (200, 201) and m2["s"] == 409 and "No se ha duplicado" in (m2["j"] or {}).get("error", ""), (m1["s"], m2))

    print("\n7) Antiduplicados en recepción, gastos e ingresos")
    r1 = api(page, "POST", "/api/taller/recepcion", tok, {"cliente": {"nombre": "Luis"}, "vehiculo": {"matricula": "9999ZZZ", "marcaModelo": "Opel Corsa"}, "tipoEntrada": "reparacion"})
    r2 = api(page, "POST", "/api/taller/recepcion", tok, {"cliente": {"nombre": "Luis"}, "vehiculo": {"matricula": "9999 zzz", "marcaModelo": "Opel Corsa"}, "tipoEntrada": "reparacion"})
    check("la 2.ª recepción del mismo coche abierto se bloquea", r1["s"] == 201 and r2["s"] == 409 and (r2["j"] or {}).get("duplicado") is True, (r1["s"], r2))
    i1 = api(page, "POST", "/api/finanzas/ingreso", tok, {"fecha": api(page, "GET", "/api/finanzas/resumen", tok)["j"]["hasta"], "concepto": "Venta de accesorios", "base": "100", "impuestoPct": "7", "metodo": "transferencia"})
    i2 = api(page, "POST", "/api/finanzas/ingreso", tok, {"fecha": api(page, "GET", "/api/finanzas/resumen", tok)["j"]["hasta"], "concepto": "Venta de accesorios", "base": "100", "impuestoPct": "7", "metodo": "transferencia"})
    check("el mismo ingreso repetido no se guarda dos veces", i1["s"] == 201 and i2["s"] == 409 and (i2["j"] or {}).get("duplicado") is True, (i1["s"], i2))

    print("\n8) Anular (nada se borra) con recálculo y auditoría")
    page.evaluate("abrirTab('fin')"); page.wait_for_selector("[data-fncobroanular]", timeout=10000)
    antes = api(page, "GET", "/api/finanzas/resumen", tok)["j"]["kpis"]
    page.click("[data-fncobroanular]"); page.wait_for_selector("#dlg-gd-anular[open]")
    check("el cuadro avisa de que no se borra y que se recalcula", "No se borra" in page.inner_text("#dlg-gd-anular") and "recalculan" in page.inner_text("#dlg-gd-anular"))
    page.click("#dlg-gd-anular [type=submit]"); check("sin motivo no anula", "mínimo 5" in page.inner_text("#dlg-gd-anular")); page.wait_for_timeout(1000)
    page.click("#dlg-gd-anular [data-m='Registro de prueba']"); page.click("#dlg-gd-anular [type=submit]")
    try: page.wait_for_selector("#gd-banner:not([hidden])", timeout=10000)
    except Exception: print("   toast:", page.inner_text("#toast"), "| errores:", errores)
    check("indicador visual de anulación hecha", "Anulado" in page.inner_text("#gd-banner") or "anulado" in page.inner_text("#gd-banner"), page.inner_text("#gd-banner"))
    desp = api(page, "GET", "/api/finanzas/resumen", tok)["j"]
    check("los totales se recalculan (cobrado baja 107 €)", desp["kpis"]["cobrado"] == antes["cobrado"] - 10700, (antes, desp["kpis"]))
    check("la factura sigue existiendo (solo se anula el cobro) y vuelve a estar pendiente", desp["kpis"]["porCobrar"] >= 10700 - 1, desp["kpis"])
    page.screenshot(path=str(OUT / "8-anulado.png"), full_page=True)
    page.click("#gd-aud summary"); page.wait_for_selector("#gd-aud-c table", timeout=10000)
    aud = page.inner_text("#gd-aud-c")
    check("la auditoría muestra la anulación con motivo y libro íntegro", "Cobro anulado" in aud and "Registro de prueba" in aud and "Libro íntegro" in aud, aud[:300])
    dup = api(page, "POST", "/api/finanzas/cobro-anular/taller/" + page.evaluate("ORDENES.find(o=>o.vehiculo.matricula.replace(/\\s/g,'').toUpperCase()==='1234ABC').token"), tok, {"cobro": "x", "motivo": "otra vez"})
    check("anular un cobro que no existe da error claro", dup["s"] == 404)

    print("\n9) Doble envío de formularios")
    page.evaluate("""window.__n=0; const f=document.createElement('form'); f.id='ftest'; document.body.appendChild(f); f.addEventListener('submit',e=>{e.preventDefault(); window.__n++;});""")
    page.evaluate("const f=document.getElementById('ftest'); f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));")
    check("el segundo envío seguido se bloquea", page.evaluate("window.__n") == 1)

    print("\n10) Rol sin permisos: el mecánico no ve facturar ni anular")
    api(page, "POST", "/api/taller/equipo", tok, {"nombre": "Pedro", "usuario": "pedro", "pin": "445566", "rol": "mecanico"})
    lg = page.evaluate("""async()=>{ const r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({usuario:'pedro',pin:'445566'})}); return {s:r.status,j:await r.json().catch(()=>({}))}; }""")
    tk2 = (lg["j"] or {}).get("token") or (lg["j"] or {}).get("tok") or ""
    check("el mecánico puede entrar con su PIN", lg["s"] == 200 and tk2, lg)
    an = api(page, "POST", "/api/finanzas/cobro-anular/taller/xxxxxxxxxxxxxxxx", tk2, {"cobro": "x", "motivo": "intento"})
    check("el servidor le niega anular o tocar finanzas (403)", an["s"] == 403, an)
    an2 = api(page, "POST", "/api/caja/anular/abcdefabcdef", tk2, {"motivo": "intento"})
    check("el servidor le niega anular en caja (403/423)", an2["s"] in (403, 423), an2)

    page.screenshot(path=str(OUT / "fin.png"))
    check("sin errores de JavaScript en la página", not errores, errores)
    print(f"\n{ok} comprobaciones correctas, {len(mal)} fallos"); 
    for m_ in mal: print("  ✘", m_)
    b.close(); sys.exit(1 if mal else 0)
