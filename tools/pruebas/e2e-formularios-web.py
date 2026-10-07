# Formulario de presupuesto de la web pública (actualización 55): campos válidos/inválidos/raros y doble envío (debe llegar 1 sola solicitud).
import sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
RAROS=["<img src=x onerror=alert(1)>","'; DROP TABLE x;--","Ñandú ✓ 日本語 😀","a"*300]
with sync_playwright() as p:
    b=p.chromium.launch()
    for nom,vp in {"móvil":{"width":390,"height":844},"escritorio":{"width":1440,"height":900}}.items():
        for ruta in ["/taller","/comprar","/"]:
            ctx=b.new_context(viewport=vp,locale="es-ES"); pg=ctx.new_page(); errs=[]; posts=[]
            pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.on("dialog",lambda d:d.accept())
            pg.on("request",lambda r:posts.append(r.url) if r.method=="POST" and "/api/solicitudes" in r.url else None)
            ctx.on("page",lambda q:q.close())
            pg.goto(BASE+ruta); pg.wait_for_timeout(1200)
            if not (pg.query_selector("#t-btn") and pg.is_visible("#t-btn")): print("  (sin formulario en",ruta,")"); ctx.close(); continue
            pg.eval_on_selector("#shop-form","e=>e.scrollIntoView()")
            pg.click("#t-btn"); pg.wait_for_timeout(200)
            check(f"{nom} {ruta}: sin datos muestra error claro y no envía",len(posts)==0 and pg.is_visible("#t-err"))
            pg.fill("#t-car","Seat Ibiza"); pg.fill("#t-name",RAROS[0]); pg.fill("#t-phone","abc"); pg.click("#t-btn"); pg.wait_for_timeout(200)
            check(f"{nom} {ruta}: teléfono inválido rechazado",len(posts)==0)
            for r in RAROS:
                pg.fill("#t-name",r); pg.fill("#t-phone","612345678"); pg.fill("#t-msg",r)
            pg.check("#t-ok") if pg.query_selector("#t-ok") else None
            pg.click("#t-agenda .ag-day:not([disabled])"); pg.wait_for_timeout(500); pg.click("#t-agenda .ag-h:not([disabled])"); pg.wait_for_timeout(200)
            for i in range(6): pg.dispatch_event("#t-btn","click")
            pg.wait_for_timeout(1500)
            check(f"{nom} {ruta}: 6 clics seguidos → 1 sola solicitud",len(posts)==1,str(len(posts)))
            check(f"{nom} {ruta}: sin errores de JS",not errs,str(errs[:2])); ctx.close()
    b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
