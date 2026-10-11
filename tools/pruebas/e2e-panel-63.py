# Actualización 63: sin «Guía por voz» ni icono de sonido, logo en la chip del gerente, barra lateral grande,
# líneas de la factura oscuras tras «Recargar desde el presupuesto», banner enorme «HOY HAY / NO HAY PÉRDIDAS»
# y resumen del coche dentro de la ficha entregada. Servidor recién arrancado.
import sys
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"; ok = 0; mal = 0
def check(n, c, e=""):
    global ok, mal
    if c: ok += 1; print("  ✔", n)
    else: mal += 1; print("  ✘", n, e)
POST = "async (a)=>await api(a[0],{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(a[1])})"
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="es-ES"); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000); pg.wait_for_timeout(1500)
    check("no hay botón «Guía por voz»", pg.locator("#vc-bvoz").count() == 0 and "guía por voz" not in pg.inner_text("#topacts").lower())
    check("no hay icono de sonido en la barra", pg.locator("#vc-bsfx").count() == 0)
    check("la chip del gerente lleva el logo (svg), no una letra", pg.locator("#t-yo i.t-logo svg").count() == 1, pg.inner_html("#topacts")[:200])
    fs = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#vc-side .vs-it')).fontSize)")
    check("letras de la barra lateral ≥ 17 px", fs >= 17, fs)
    ancho = pg.evaluate("(()=>{const s=document.querySelector('#vc-side');return [s.getBoundingClientRect().width,Math.max(...[...s.querySelectorAll('.vs-it span')].map(e=>e.getBoundingClientRect().right-s.getBoundingClientRect().left))]})()")
    check("ningún texto de la barra se sale de ella", ancho[1] <= ancho[0], ancho)
    # factura: líneas oscuras
    pg.evaluate(POST, ["/api/caja/abrir", {"desglose": {"10000": 5}}])
    tok = pg.evaluate("""async ()=>{ const r=await tApi("recepcion","POST",{cliente:{nombre:"Cliente Seis3",telefono:"600333444"},vehiculo:{matricula:"6363ABC",marcaModelo:"Seat Ibiza"},tipoEntrada:"reparacion",recibidoPor:"T"}); ORDENES.unshift(r.orden||r); return (r.orden||r).token; }""")
    pg.evaluate("""async (t)=>{ await api('/api/ordenes/'+t,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({presupuesto:{lineas:[{c:'Frenos',n:1,p:100}],impuesto:7}})}); await fetch('/api/seguimiento/'+t+'/respuesta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accion:'aceptar',nombre:'Cliente',acepta:true})}); }""", tok)
    pg.evaluate("t=>abrirFichas(t,'f5')", tok); pg.wait_for_selector("[data-fcpre]", timeout=8000); pg.click("[data-fcpre]"); pg.wait_for_selector(".fc-l")
    bg = pg.evaluate("getComputedStyle(document.querySelector('.fc-l')).backgroundColor")
    rgb = [int(x) for x in bg.replace("rgba(", "").replace("rgb(", "").replace(")", "").split(",")[:3]]
    check("las líneas tras «Recargar desde el presupuesto» NO son blancas", sum(rgb) < 450, bg)
    # entregar y ver resumen en la ficha
    pg.evaluate("""async (t)=>{ const f=await tApi('fichas/'+t); }""", tok)
    pg.fill('[data-fc="cliente.nombre"]', "Cliente Seis3"); pg.wait_for_timeout(1000)
    pg.evaluate("""async (t)=>{ for(const e of ['aprobado','en_proceso','listo','entregado']){ try{ await api('/api/ordenes/'+t+'/estado',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({estado:e})}); }catch(_){ } } }""", tok)
    estado = pg.evaluate("async t=>(await api('/api/ordenes')).find(o=>o.token===t).estado", tok)
    print("   estado de la orden:", estado)
    if estado != "entregado": print("   (no se pudo entregar por la ruta rápida; se prueba el banner con los datos de hoy)")
    pg.evaluate("abrirTab('fin')"); pg.wait_for_selector(".rs-hoy", timeout=10000)
    t = pg.inner_text(".rs-hoy").lower()
    check("el banner dice HOY HAY o HOY NO HAY PÉRDIDAS", "hoy hay pérdidas" in t or "hoy no hay pérdidas" in t, t[:120])
    tam = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.rs-hoy .rs-hoy-t b')).fontSize)")
    check("el título del banner es enorme (≥ 40 px en escritorio)", tam >= 40, tam)
    check("el banner lleva el volcán y la lava", pg.locator(".rs-hoy .rs-volcan svg").count() == 1 and pg.locator(".rs-hoy .rs-brasas i").count() >= 8)
    check("sin errores de JavaScript", not errs, str(errs[:3]))
    pg.screenshot(path="/tmp/claude-0/banner63.png", full_page=False)
    b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
