# Prueba del panel en un navegador real (Chromium) contra tools/pruebas/servidor-local.mjs
# Recorre el panel con Calidad (el puesto que recibía «No autorizado»), Lestter (Gerente con PIN) y Mecánico.
import json, sys, pathlib
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8888"
CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-capturas"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(nombre, cond, extra=""):
    global ok
    if cond: ok += 1; print("  ✔", nombre)
    else: mal.append(nombre + " " + extra); print("  ✘", nombre, extra)

def api(page, metodo, ruta, token, body=None):
    return page.evaluate("""async ([m,r,t,b])=>{ const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined}); return {s:x.status,d:await x.json().catch(()=>null)}; }""", [metodo, ruta, token, body])

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 900})
    page = ctx.new_page(); errores = []
    page.on("pageerror", lambda e: errores.append(str(e)))
    page.on("console", lambda m: errores.append("console: " + m.text) if m.type == "error" and "favicon" not in m.text else None)

    print("\n1) Gerente con contraseña")
    page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
    if page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#pw", CLAVE); page.click("#login-btn")
    page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
    check("entra y ve el Dashboard", page.is_visible("#s-dash"))
    tok = page.evaluate("sessionStorage.getItem('vc_tok')")
    for u, n, pin, rol in [("calidad1", "Lucía Calidad", "135791", "calidad"), ("lestter", "Lestter", "246810", "gerente"), ("pedro", "Pedro", "445566", "mecanico")]:
        r = api(page, "POST", "/api/taller/equipo", tok, {"nombre": n, "usuario": u, "pin": pin, "rol": rol})
        check(f"alta de {n} ({rol})", r["s"] in (201, 400), str(r))
    page.click("#logout")

    def entrar_equipo(usuario, pin):
        page.wait_for_selector("#login-form")
        if not page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#eq-u", usuario); page.fill("#eq-p", pin); page.click("#login-btn")
        page.wait_for_selector("text=Registrar entrada", timeout=15000)
        page.click("text=Registrar entrada")
        page.wait_for_selector("#s-ordenes:not([hidden])", timeout=15000)

    def visibles():
        return page.evaluate("""[...document.querySelectorAll('#tabs [data-tab]')].filter(b=>b.offsetParent!==null).map(b=>b.dataset.tab)""")

    print("\n2) Calidad (usuario + PIN) · el caso del «No autorizado»")
    entrar_equipo("calidad1", "135791")
    check("ficha la entrada y entra al taller", page.is_visible("#s-ordenes"))
    tabs = visibles(); print("     pestañas:", tabs)
    check("ve CRM, Agenda, Coches, Inventario, Respuestas y Ayuda", all(t in tabs for t in ["leads", "agenda", "coches", "alm", "resp", "ayuda", "ordenes"]), str(tabs))
    check("no ve Dashboard ni Finanzas (son del gerente)", "dash" not in tabs and "fin" not in tabs, str(tabs))
    page.click("[data-tnueva]"); page.wait_for_selector("#dlg-rec[open]")
    page.fill("#rc-nom", "Cliente Prueba"); page.fill("#rc-tel", "643566098"); page.fill("#rc-mat", "1234BCD"); page.fill("#rc-coche", "Seat Ibiza")
    page.click("#rc-ok")
    page.wait_for_timeout(1500)
    err = page.text_content("#rc-err") if page.is_visible("#rc-err") else ""
    check("«Crear y abrir FORM-01» funciona (sin «No autorizado»)", not err and page.is_visible("#s-ficha"), err)
    page.screenshot(path=str(OUT / "01-calidad-form01.png"))
    for tab, sec in [("leads", "#s-leads"), ("agenda", "#s-agenda"), ("coches", "#s-list"), ("alm", "#s-alm"), ("resp", "#s-resp")]:
        page.evaluate(f"abrirTab('{tab}')"); page.wait_for_timeout(700)
        txt = page.inner_text(sec) if page.is_visible(sec) else ""
        check(f"abre {tab} sin bloqueos", page.is_visible(sec) and "No tienes permiso" not in txt and "No autorizado" not in txt, txt[:120])
    page.click('[data-rscanal="redes"]'); page.wait_for_timeout(300)
    check("Respuestas · pestaña Instagram y Facebook activa", page.locator(".rs-perfiles").count() == 1 and page.locator("[data-rswcopiar^='rs-']").count() >= 10)
    page.screenshot(path=str(OUT / "02-respuestas-redes.png"), full_page=False)
    page.click('[data-rscanal="whatsapp"]'); page.wait_for_timeout(300)
    over = page.evaluate("(()=>{const f=document.querySelector('.rs-waform');return [...f.querySelectorAll('.field')].some(x=>x.getBoundingClientRect().right>f.getBoundingClientRect().right+1)||document.documentElement.scrollWidth>innerWidth})()")
    check("Respuestas · WhatsApp: ningún campo se corta", not over)
    check("botones de sonido y guía por voz en la barra", page.is_visible("#vc-bsfx") and page.is_visible("#vc-bvoz"))
    page.click("#logout")

    print("\n3) Lestter · puesto Gerente con PIN")
    entrar_equipo("lestter", "246810")
    tabs = visibles(); print("     pestañas:", tabs)
    check("ve todo el panel (Dashboard y Finanzas incluidos)", "dash" in tabs and "fin" in tabs, str(tabs))
    page.click("[data-tnueva]"); page.wait_for_selector("#dlg-rec[open]")
    page.fill("#rc-nom", "Cliente Lestter"); page.fill("#rc-mat", "5678FGH"); page.click("#rc-ok"); page.wait_for_timeout(1500)
    err = page.text_content("#rc-err") if page.is_visible("#rc-err") else ""
    check("Lestter crea la recepción y abre FORM-01", not err and page.is_visible("#s-ficha"), err)
    for tab, sec in [("dash", "#s-dash"), ("fin", "#s-fin"), ("leads", "#s-leads"), ("caja", "#s-caja"), ("jornada", "#s-jornada")]:
        page.evaluate(f"abrirTab('{tab}')"); page.wait_for_timeout(900)
        check(f"Lestter abre {tab}", page.is_visible(sec))
    page.click("#btn-seg"); page.wait_for_timeout(2500)
    check("Lestter abre Seguridad", "MURO DE SEGURIDAD" in page.inner_text("#dw-body").upper())
    page.keyboard.press("Escape")
    page.click("#logout")

    print("\n4) Mecánico (móvil 390 px)")
    page.set_viewport_size({"width": 390, "height": 844})
    entrar_equipo("pedro", "445566")
    page.click("[data-tnueva]"); page.wait_for_selector("#dlg-rec[open]")
    page.fill("#rc-nom", "Cliente Pedro"); page.fill("#rc-mat", "9999JKL"); page.click("#rc-ok"); page.wait_for_timeout(1500)
    check("Mecánico crea recepción desde el móvil", page.is_visible("#s-ficha"))
    page.evaluate("abrirTab('ayuda')"); page.wait_for_timeout(800)
    page.evaluate("document.querySelector('[data-aymod], [data-ay]') && 0")
    solapes = page.evaluate("""(()=>{ let n=0; document.querySelectorAll('.ay-mh').forEach(h=>{ const t=h.querySelector('h2'), b=h.querySelector('.btn'); if(!t||!b||!t.offsetParent) return; const a=t.getBoundingClientRect(), c=b.getBoundingClientRect(); if(a.right>c.left && a.left<c.right && a.bottom>c.top && a.top<c.bottom) n++; }); return n; })()""")
    check("Ayuda en móvil: títulos y botones no se solapan", solapes == 0, str(solapes))
    page.screenshot(path=str(OUT / "03-ayuda-movil.png"))
    mk = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--badge')")
    print("     --badge:", mk)

    print("\n5) Errores de JavaScript en la consola")
    reales = [e for e in errores if "401" not in e and "403" not in e and "423" not in e and "Failed to load resource" not in e]
    check("sin errores de JavaScript", not reales, json.dumps(reales[:5], ensure_ascii=False))
    b.close()

print(f"\nRESULTADO NAVEGADOR: {ok} correctas · {len(mal)} fallidas")
if mal: print(" - " + "\n - ".join(mal)); sys.exit(1)
