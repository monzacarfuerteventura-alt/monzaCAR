# Actualización 56: FORM-02 en el panel: casilla «el cliente autoriza reparar con los ROJOS» + nombre; sale en la impresión.
import sys, re, json, urllib.request
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1440,"height":900},locale="es-ES"); pg=ctx.new_page(); errs=[]; toks=[]
    pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.on("dialog",lambda d:d.accept())
    pg.on("request",lambda r:toks.append(re.search(r"/fichas/([A-Za-z0-9]+)/f5",r.url).group(1)) if re.search(r"/fichas/([A-Za-z0-9]+)/f5",r.url) else None)
    pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(1200)
    pg.evaluate("document.querySelector('#gd-bar [data-gd=factura]').click()"); pg.wait_for_selector("#dlg-gd[open]")
    pg.fill("#gd-nom","Cliente Rojos"); pg.fill("#gd-tel","612345678"); pg.fill("#gd-mat","56ROJ"); pg.fill("#gd-coche","Seat Ibiza")
    pg.click("[data-gdsig]"); pg.fill("[data-gdl=d][data-i='0']","Aceite"); pg.fill("[data-gdl=p][data-i='0']","107"); pg.click("[data-gdemitir]")
    pg.wait_for_selector("text=Cobro y cierre",timeout=15000); pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    check("hay orden para probar",len(toks)>=1,str(toks))
    pg.evaluate("async t=>{ await abrirFichas(t,'f2'); }",toks[-1]); pg.wait_for_selector("#tf [data-f=autorizaRojos]",timeout=10000)
    check("FORM-02: casilla «autoriza reparar con los ROJOS» visible",pg.is_visible("#tf [data-f=autorizaRojos]"))
    check("el texto dice que queda bajo su responsabilidad","bajo su responsabilidad" in pg.inner_text("#tf"))
    check("sin marcar no pide nombre",not pg.is_visible("#tf [data-f=autorizaNombre]"))
    pg.check("#tf [data-f=autorizaRojos]"); pg.wait_for_selector("#tf [data-f=autorizaNombre]",timeout=5000)
    pg.fill("#tf [data-f=autorizaNombre]","Juan Pérez García"); pg.wait_for_timeout(2500)
    f=pg.evaluate("async t=>{const r=await fetch('/api/taller/fichas/'+t,{headers:{authorization:'Bearer '+sessionStorage.getItem('vc_tok')}}); return r.ok?await r.json():null}",toks[-1])
    f2=(f or {}).get("fichas",{}).get("f2") or (f or {}).get("f2") or {}
    check("se guarda en el servidor (marca + nombre)",f2.get("autorizaRojos") is True and f2.get("autorizaNombre")=="Juan Pérez García",json.dumps(f2)[:200])
    html=pg.evaluate("(()=>{try{return tP2()}catch(e){return 'ERR '+e}})()")
    check("la impresión de la ficha lleva autorización y las dos firmas","autoriza reparar el vehículo" in html and "Firma del cliente" in html and "Firma del mecánico" in html,html[:120])
    check("sin errores de JavaScript",not errs,str(errs[:2]))
    b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
