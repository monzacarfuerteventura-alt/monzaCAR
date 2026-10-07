# Prueba de la actualización 47 (capa «app» para móvil) en un navegador real contra tools/pruebas/servidor-local.mjs
#   bun tools/pruebas/servidor-local.mjs   y en otra ventana:   python3 tools/pruebas/e2e-app.py [carpeta-capturas]
# Reinicia el servidor entre ejecuciones (guarda en memoria y las órdenes repetidas se bloquean a propósito).
import sys, pathlib
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8888"
CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-app"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, extra=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + str(extra)); print("  ✘", n, extra)

def entrar(ctx, errores):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errores.append(str(e))); page.on("dialog", lambda d: d.accept())
    page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
    if page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#pw", CLAVE); page.click("#login-btn")
    page.wait_for_selector("#s-dash:not([hidden])", timeout=15000); page.wait_for_timeout(900)
    return page

with sync_playwright() as p:
    b = p.chromium.launch(); errores = []
    movil = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2, locale="es-ES", timezone_id="Atlantic/Canary")
    page = entrar(movil, errores)
    api = lambda m, r, t, body=None: page.evaluate("""async ([m,r,t,b])=>{const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined});let j=null;try{j=await x.json()}catch(e){}return {s:x.status,j}}""", [m, r, t, body])
    tok = page.evaluate("sessionStorage.getItem('vc_tok')")

    print("\n1) Barra inferior en móvil")
    check("la barra inferior se ve", page.is_visible("#app-bar"))
    check("tiene 4 destinos + botón «+»", page.locator("#app-bar [data-apptab]").count() == 3 and page.locator("#app-bar [data-appmas]").count() == 1 and page.locator("#app-bar [data-appfab]").count() == 1, page.inner_text("#app-bar"))
    check("las pestañas de arriba ya no ocupan pantalla", not page.is_visible("#tabsrow"))
    check("la barra de 3 botones grandes no ocupa pantalla (está en el «+»)", not page.is_visible("#gd-bar"))
    check("las pestañas de arriba SIGUEN existiendo (nada eliminado)", page.locator("#tabs [data-tab]").count() >= 9)
    check("el contenido empieza arriba: el título del Dashboard se ve sin bajar", page.evaluate("(()=>{const h=document.querySelector('#s-dash h1,#s-dash .head h2,#s-dash .head');return h&&h.getBoundingClientRect().top<260})()"))
    check("«Inicio» marcado como activo", page.get_attribute('#app-bar [data-apptab="dash"]', "aria-current") == "true")
    page.screenshot(path=str(OUT / "1-inicio.png"))

    print("\n2) Moverse con la barra")
    page.tap('#app-bar [data-apptab="ordenes"]'); page.wait_for_selector("#s-ordenes:not([hidden])")
    check("Taller abre el Taller", True); page.wait_for_timeout(500)
    check("Taller queda marcado", page.get_attribute('#app-bar [data-apptab="ordenes"]', "aria-current") == "true")
    check("en Taller las órdenes salen antes que los ajustes de precios", page.evaluate("document.querySelector('#ordenes').getBoundingClientRect().top < document.querySelector('#pt-cfg').getBoundingClientRect().top"))
    page.screenshot(path=str(OUT / "2-taller.png"))
    page.tap('#app-bar [data-apptab="caja"]'); page.wait_for_selector("#s-caja:not([hidden])")
    check("Caja abre la Caja", True)

    print("\n3) Botón «+»: las 3 acciones y las utilidades")
    page.tap("[data-appfab]"); page.wait_for_selector("#app-sheet.in")
    txt = page.inner_text("#app-sheet")
    check("hoja con Nueva entrada, Factura rápida y Control de caja", all(x in txt for x in ["Nueva entrada", "Factura rápida", "Control de caja"]), txt[:200])
    check("trae las utilidades (Otro ingreso, Excel emitidas/recibidas, PDF asesoría)", all(x in txt for x in ["Otro ingreso", "Excel emitidas", "Excel recibidas", "PDF asesoría"]))
    page.screenshot(path=str(OUT / "3-mas-acciones.png"))
    page.keyboard.press("Escape"); page.wait_for_timeout(400)
    check("Esc cierra la hoja", page.locator("#app-sheet").count() == 0)
    page.tap("[data-appfab]"); page.wait_for_selector("#app-sheet.in"); page.tap(".app-bd", position={"x": 20, "y": 20}); page.wait_for_timeout(400)
    check("tocar fuera cierra la hoja", page.locator("#app-sheet").count() == 0)
    page.tap("[data-appfab]"); page.wait_for_selector("#app-sheet.in"); page.tap('#app-sheet [data-gd="entrada"]')
    page.wait_for_selector("#dlg-gd[open]", timeout=6000); page.wait_for_timeout(500)
    check("«Nueva entrada» abre el asistente de 4 pasos y cierra la hoja", "paso 1" in page.inner_text("#dlg-gd").lower() and page.locator("#app-sheet").count() == 0, page.inner_text("#dlg-gd")[:120])
    page.screenshot(path=str(OUT / "4-asistente.png"))
    page.evaluate("document.querySelector('#dlg-gd').close()"); page.wait_for_timeout(300)
    page.tap("[data-appfab]"); page.wait_for_selector("#app-sheet.in"); page.tap('#app-sheet [data-gd="factura"]')
    page.wait_for_selector("#dlg-gd[open]", timeout=6000); check("«Factura rápida» abre el asistente", True)
    page.evaluate("document.querySelector('#dlg-gd').close()"); page.wait_for_timeout(300)

    print("\n4) Hoja «Más»: todo el panel sigue a un toque")
    page.tap("[data-appmas]"); page.wait_for_selector("#app-sheet.in")
    t = page.inner_text("#app-sheet")
    check("están todas las secciones", all(x in t for x in ["Inicio", "CRM", "Taller", "Inventario", "Caja", "Jornada", "Finanzas", "Agenda", "Coches", "Respuestas", "Ayuda"]), t)
    check("están Ver web, Seguridad y Salir", all(x in t for x in ["Ver web", "Seguridad", "Salir"]))
    page.screenshot(path=str(OUT / "5-mas.png"))
    page.tap('#app-sheet [data-apptab="fin"]'); page.wait_for_selector("#s-fin:not([hidden])", timeout=8000)
    check("Finanzas se abre desde «Más»", True); page.wait_for_timeout(600)
    check("«Más» queda marcado cuando estás en una sección que no está en la barra", page.get_attribute("#app-bar [data-appmas]", "aria-current") == "true")

    print("\n5) Teclado y ficha de la orden")
    page.tap('#app-bar [data-apptab="ordenes"]'); page.wait_for_selector("#s-ordenes:not([hidden])")
    r = api("POST", "/api/taller/recepcion", tok, {"cliente": {"nombre": "Ana Prueba", "telefono": "611222333"}, "vehiculo": {"matricula": "5555KLM", "marcaModelo": "Renault Clio"}, "tipoEntrada": "reparacion"})
    tk = r["j"]["orden"]["token"]
    page.evaluate("t=>abrirFichas(t)", tk); page.wait_for_selector("#tf .t-tabs"); page.wait_for_timeout(700)
    check("dentro de una ficha no hay barra inferior (la ocupa «Guardar / Firmar»)", not page.is_visible("#app-bar"))
    alto = page.evaluate("(()=>{const a=document.querySelector('header.top').getBoundingClientRect().height,b=document.querySelector('#tf .t-tabs').getBoundingClientRect().height;return a+b})()")
    check(f"las barras fijas de arriba ocupan poco ({alto:.0f}px; antes 206px)", alto < 150, alto)
    check("las 5 pestañas de fichas van en UNA fila que se desliza", page.evaluate("(()=>{const n=document.querySelector('#tf .t-tabs');return getComputedStyle(n).display==='flex'&&n.scrollWidth>n.clientWidth})()"))
    nombres = page.evaluate("[...document.querySelectorAll('#tf .t-tabs b')].map(e=>e.scrollWidth<=e.clientWidth+1)")
    check("los nombres de las pestañas salen enteros (antes «Recepc…»)", all(nombres), nombres)
    check("imprimir / PDF / presupuesto están tras el botón «⋯»", not page.is_visible("#tf .t-facts") and page.is_visible("#tf .app-more"))
    page.tap("#tf .app-more"); page.wait_for_timeout(250)
    check("«⋯» los enseña (nada eliminado)", page.is_visible("#tf .t-facts") and "PDF de toda la orden" in page.inner_text("#tf .t-facts") and "Las 6 fichas" in page.inner_text("#tf .t-facts"))
    page.tap('#tf [data-ttabb="f2"]'); page.wait_for_selector("#tf [data-tsem]"); page.wait_for_timeout(400)
    alt = page.evaluate("Math.min(...[...document.querySelectorAll('#tf [data-tsem]')].slice(0,8).map(e=>e.getBoundingClientRect().height))")
    check(f"los botones OK/Ámbar/Rojo/NA son grandes ({alt:.0f}px)", alt >= 48, alt)
    check("el botón flotante verde no tapa el semáforo en la ficha", not page.is_visible("#mk-fab"))
    page.tap('#tf [data-tsem="a1"][data-v="ok"]'); page.wait_for_timeout(300)
    check("tocar OK marca el punto (sigue funcionando)", page.get_attribute('#tf [data-tsem="a1"][data-v="ok"]', "aria-pressed") == "true")
    page.screenshot(path=str(OUT / "6-ficha-inspeccion.png"))
    page.tap('#tf [data-ttabb="f5"]'); page.wait_for_timeout(600)
    check("en la factura los datos fijos del Emisor van plegados y se abren con un toque", page.evaluate("document.querySelector('#tf .fc-em').offsetParent===null") and (page.tap("#tf .t-sec.app-fold>h3") or True) and page.is_visible("#tf .fc-em") and "MAYLIN" in page.inner_text("#tf .fc-em"))
    page.tap("#tf .t-sec.app-fold>h3")
    page.screenshot(path=str(OUT / "7-ficha-factura.png"))
    page.tap('#tf [data-ttabb="f1"]'); page.wait_for_timeout(500)
    campo = page.locator("#tf input.in:visible").first; campo.tap(); page.wait_for_timeout(300)
    page.evaluate("document.querySelector('#tf-save') && 0")
    page.tap("#tf [data-tvolver]"); page.wait_for_selector("#s-ordenes:not([hidden])"); page.wait_for_timeout(700)
    check("al volver al Taller reaparece la barra inferior", page.is_visible("#app-bar"))
    page.tap('#app-bar [data-apptab="leads"]') if page.locator('#app-bar [data-apptab="leads"]').count() else None
    page.tap("[data-appmas]"); page.wait_for_selector("#app-sheet.in"); page.tap('#app-sheet [data-apptab="leads"]'); page.wait_for_selector("#s-leads:not([hidden])")
    inp = page.locator("#s-leads input:visible").first
    if inp.count():
        inp.tap(); page.wait_for_timeout(300)
        check("con el teclado abierto la barra se esconde", not page.is_visible("#app-bar"))
        page.evaluate("document.activeElement.blur()"); page.wait_for_timeout(400)
        check("y vuelve al cerrarlo", page.is_visible("#app-bar"))

    print("\n6) Permisos: un mecánico no ve lo del gerente")
    page.evaluate("ME={rol:'mecanico',equipo:true,nombre:'Pepe',caja:false}")
    page.tap("[data-appmas]"); page.wait_for_selector("#app-sheet.in"); t = page.inner_text("#app-sheet")
    check("sin Finanzas, Inicio ni Caja", not any(x in t for x in ["Finanzas", "Inicio", "Caja"]), t)
    page.keyboard.press("Escape"); page.wait_for_timeout(400)
    page.tap("[data-appfab]"); page.wait_for_selector("#app-sheet.in"); t = page.inner_text("#app-sheet")
    check("el «+» solo le ofrece la entrada de coches (sin factura ni caja)", "Nueva entrada" in t and "Factura rápida" not in t and "Control de caja" not in t and "Otro ingreso" not in t, t[:200])
    page.keyboard.press("Escape")

    print("\n7) Ordenador: no cambia nada")
    escritorio = b.new_context(viewport={"width": 1280, "height": 900}, locale="es-ES", timezone_id="Atlantic/Canary")
    d = entrar(escritorio, errores)
    check("sin barra inferior", not d.is_visible("#app-bar"))
    check("la barra lateral del ordenador ofrece todas las secciones", d.is_visible("#vc-side") and d.locator("#vc-side [data-vs]:visible").count() >= 9)
    check("los 3 botones grandes se ven", d.is_visible("#gd-bar") and d.locator("#gd-bar .gd-big").count() == 3)
    d.evaluate("t=>abrirFichas(t)", tk); d.wait_for_selector("#tf .t-tabs"); d.wait_for_timeout(500)
    tops = d.evaluate("[...document.querySelectorAll('#tf .t-tabs button')].map(b=>Math.round(b.getBoundingClientRect().top))")
    check("en ordenador las 7 pestañas de la ficha caben en UNA fila (antes «Auditoría» caía sola abajo)", len(set(tops)) == 1 and len(tops) == 7, tops)
    d.screenshot(path=str(OUT / "8-escritorio.png"))
    d.evaluate("t=>abrirFichas(t)", tk); d.wait_for_selector("#tf .t-tabs"); d.wait_for_timeout(500)
    check("en la ficha de escritorio se ven los botones de imprimir sin «⋯»", d.is_visible("#tf .t-facts") and not d.is_visible("#tf .app-more"))
    d.screenshot(path=str(OUT / "9-ficha-escritorio.png"))

    # tableta estrecha justo en el límite
    print("\n8) Sin errores de JavaScript")
    check("ningún error en la consola", not errores, errores)
    b.close()
print(f"\n{ok} bien, {len(mal)} mal")
for m in mal: print("  ✘", m)
sys.exit(1 if mal else 0)
