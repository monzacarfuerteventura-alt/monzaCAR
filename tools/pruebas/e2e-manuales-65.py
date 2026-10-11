# Actualización 65: botones de manual en cada pantalla, hoja v3.2 y validez de presupuesto = 12 días hábiles.
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado) y luego  python3 tools/pruebas/e2e-manuales-65.py
import re, datetime
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"
ok=0; mal=[]
def check(n,c,x=""):
    global ok
    if c: ok+=1; print("  ✔",n)
    else: mal.append(n); print("  ✘",n,x)
with sync_playwright() as p:
    b=p.chromium.launch()
    for nombre,vp in [("escritorio",{"width":1366,"height":900}),("movil",{"width":390,"height":800})]:
        print("==",nombre)
        ctx=b.new_context(viewport=vp,locale="es-ES"); pg=ctx.new_page(); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
        pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000)
        pg.wait_for_timeout(800)
        n=pg.evaluate("document.querySelectorAll('.vm-bar a[href^=\"#manual-\"]').length")
        check("botones de manual en las pantallas (>=14)", n>=14, n)
        for sid,man in [("s-ordenes","S01-Taller"),("s-alm","S02-Recambios"),("s-caja","S09-Control"),("s-fin","S09-Control"),("s-leads","S06-Embudo"),("s-resp","S07-Postventa"),("s-jornada","S10-Organizacion"),("s-list","S05-Ventas")]:
            ok_=pg.evaluate("([s,m])=>{const e=document.getElementById(s);return !!e&&!![...e.querySelectorAll('.vm-bar a')].find(a=>a.getAttribute('href').includes(m))}",[sid,man])
            check(f"{sid} enlaza {man}", ok_)
        # abrir un manual: la petición con sesión devuelve PDF
        r=pg.evaluate("""async()=>{const x=await fetch('/api/manual/VolcanoCars-S00-Hoja-v3.2-Fe-de-erratas',{headers:{authorization:'Bearer '+PW}});return [x.status,x.headers.get('content-type')]}""")
        check("la hoja v3.2 se entrega con sesión", r==[200,"application/pdf"], r)
        r2=pg.evaluate("""async()=>{const x=await fetch('/api/manual/VolcanoCars-S00-Hoja-v3.2-Fe-de-erratas');return x.status}""")
        check("sin sesión NO se entrega", r2 in (401,403), r2)
        for nm in ["S01-Taller-recepcion-a-entrega","S05-Ventas-hoja-v3.1","S11-Cuadro-de-mando-metricas"]:
            st=pg.evaluate("async(n)=>(await fetch('/api/manual/VolcanoCars-'+n,{headers:{authorization:'Bearer '+PW}})).status",nm)
            check("manual "+nm+" abre", st==200, st)
        # act. 67: la tarjeta de auditoría ya NO está en Taller; la hoja v3.2 y los formularios 01→17 salen en la biblioteca
        pg.evaluate("go&&go('ordenes')") if pg.evaluate("typeof go==='function'") else None
        pg.wait_for_timeout(1200)
        check("tarjeta de auditoría quitada de Taller", pg.evaluate("!document.getElementById('vm-aud')"))
        pg.evaluate("document.getElementById('sv-lib').open=true")
        check("biblioteca enlaza la Hoja v3.2", pg.evaluate("!!document.querySelector('#sv-lib a[href=\"#manual-VolcanoCars-S00-Hoja-v3.2-Fe-de-erratas\"]')"))
        check("biblioteca lista FORM-03, 06, 10 y 11", pg.evaluate("['FORM-06','FORM-03','FORM-11','FORM-10'].every(f=>[...document.querySelectorAll('#sv-lib .sv-f')].some(b=>b.textContent.startsWith(f)))"))
        # validez 12 días hábiles
        tok=pg.evaluate("""async(m)=>{const r=await tApi("recepcion","POST",{cliente:{nombre:"Cliente V",telefono:"600111222"},vehiculo:{matricula:m,marcaModelo:"Seat Ibiza"},tipoEntrada:"reparacion",recibidoPor:"Test"}); ORDENES.unshift(r.orden); return r.orden.token;}""", __import__("random").choice("0123456789")*4+"ZZZ")
        pg.evaluate("t=>abrirFichas(t,'pre')",tok); pg.wait_for_selector("#tpre")
        val=pg.input_value("#tpre [data-pval]")
        d=datetime.date.today(); n_=0
        while n_<12:
            d+=datetime.timedelta(days=1)
            if d.weekday()<5: n_+=1
        check("validez por defecto = 12 días hábiles ("+str(d)+")", val==str(d), val)
        pg.screenshot(path=f"/tmp/p65-{nombre}.png")
        check("sin errores JS", not errs, errs[:3])
    b.close()
print("OK",ok,"MAL",mal)
