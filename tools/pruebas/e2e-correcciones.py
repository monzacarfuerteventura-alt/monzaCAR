# Actualización 56: corregir descuadres, efectivo neto, cita «Ahora», avisos sobre el difuminado, menú sin duplicados, sin glosario suelto.
import json, urllib.request, sys, re, datetime
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
def ll(m,r,t="",b=None):
    req=urllib.request.Request(BASE+r,data=json.dumps(b).encode() if b is not None else None,method=m,headers={"content-type":"application/json",**({"authorization":"Bearer "+t} if t else {})})
    try:
        with urllib.request.urlopen(req) as x: return x.status,json.loads(x.read() or b"{}")
    except urllib.error.HTTPError as e:
        try: return e.code,json.loads(e.read())
        except Exception: return e.code,{}
s,l=ll("POST","/api/login","",{"clave":CLAVE}); G=l["token"]
for u,rol,caja in [("ger2","gerente",False),("recep","recepcion",True)]:
    ll("POST","/api/taller/equipo",G,{"nombre":u.title(),"usuario":u,"pin":"445566","rol":rol,"caja":caja})
s,l=ll("POST","/api/login","",{"usuario":"recep","pin":"445566"}); R=l.get("token","")
ll("POST","/api/jornada/fichar",R,{"accion":"entrada"})
print("== caja")
s,r=ll("POST","/api/caja/abrir",R,{"desglose":{"5000":2}}); check("abre con 100,00 €",s==200,str(r))
s,r=ll("POST","/api/caja/movimiento",R,{"tipo":"ingreso","importe":"25,50","categoria":"taller","concepto":"Aceite","ref":"A1","metodo":"efectivo"}); check("cobro efectivo 25,50",s in (200,201),str(r))
s,r=ll("POST","/api/caja/movimiento",R,{"tipo":"egreso","importe":"10","categoria":"otro","concepto":"Trapos","ref":"T1","metodo":"efectivo","sinTicket":True}); check("salida en efectivo 10,00",s in (200,201),str(r))
d_mal={"5000":2,"2000":1,"200":1,"100":1,"20":1,"10":1,"5":1}  # 100+20+2+1+0,2+0,1+0,05 = 123,35 ; teórico 115,50 -> sobran
s,r=ll("POST","/api/caja/cerrar",R,{"desglose":d_mal,"justificacion":"Prueba del sistema del gerente","pinGerente":"445566"}); check("cierra con descuadre (autoriza PIN gerente)",s==200 and r.get("descuadre"),str(s)+str(r)[:120])
hoy=datetime.date.today().isoformat()[:8]+"01"
s,r=ll("GET","/api/caja/resumen",G); t=r["turnos"][0]; dif=t["cierre"]["diferencia"]; check("el turno trae su diferencia",dif!=0,str(dif))
s,r2=ll("GET","/api/finanzas/resumen",G); k=r2["kpis"]; check("Finanzas incluye el descuadre antes de corregir",k["descuadres"]==dif,str(k["descuadres"]))
check("efectivoNeto = cobrado ef. − pagado ef. − retiros + descuadres",k["efectivoNeto"]==r2["porCanal"]["efectivo"]-r2["porPago"]["efectivo"]-sum(x["importe"] for x in r2["internos"])+k["descuadres"],str((k["efectivoNeto"],r2["porCanal"],r2["porPago"])))
check("el efectivo pagado (salida de 10 €) ya se resta",r2["porPago"]["efectivo"]>=1000 and k["efectivoNeto"]<r2["porCanal"]["efectivo"],str(r2["porPago"]))
s,r=ll("POST","/api/caja/corregir/"+t["id"],G,{"donde":"cierre","motivo":""}); check("corregir sin motivo: 400",s==400,str(s))
s,r=ll("POST","/api/caja/corregir/"+t["id"],R,{"donde":"cierre","motivo":"Era una prueba"}); check("el empleado no puede corregir: 403",s==403,str(s))
s,r=ll("POST","/api/caja/corregir/"+t["id"],G,{"donde":"apertura","motivo":"Era una prueba del sistema"}); check("donde no hay descuadre: 409",s==409,str(s)+str(r))
s,r=ll("POST","/api/caja/corregir/"+t["id"],G,{"donde":"cierre","motivo":"Era una prueba del sistema"}); check("gerente corrige el descuadre",s==200,str(s)+str(r))
s,r=ll("POST","/api/caja/corregir/"+t["id"],G,{"donde":"cierre","motivo":"Otra vez"}); check("no se puede corregir dos veces: 409",s==409,str(s))
s,r=ll("GET","/api/caja/resumen",G); check("queda marcado como corregido (no se borra)",r["turnos"][0]["cierre"].get("corregida") and r["turnos"][0]["cierre"]["diferencia"]==dif,str(r["turnos"][0]["cierre"].get("corregida")))
s,r2=ll("GET","/api/finanzas/resumen",G); check("Finanzas ya no cuenta el descuadre corregido",r2["kpis"]["descuadres"]==0,str(r2["kpis"]["descuadres"]))
s,r=ll("GET","/api/caja/libro",G); check("queda en el libro de registro","descuadre-corregido" in json.dumps(r),"")
print("== cita ahora")
hh=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1)))
s,r=ll("POST","/api/solicitudes",G,{"manual":True,"tipo":"taller","nombre":"Cliente Mostrador","telefono":"612345678","canal":"telefono","mensaje":"","cita":{"fecha":"2001-01-01","hora":"03:00","ahora":True},"vehiculo":{"coche":"Seat Ibiza","matricula":"1234ABC"}})
check("cita AHORA: se acepta aunque no haya hueco de la web",s==201,str(s)+str(r)[:160])
import zoneinfo
hoyC=datetime.datetime.now(zoneinfo.ZoneInfo("Atlantic/Canary")); c=r.get("cita") or {}
check("es de hoy y a la hora real (HH:MM)",c.get("fecha")==hoyC.date().isoformat() and re.match(r"^\d\d:\d\d$",c.get("hora","")) is not None and abs(int(c["hora"][:2])*60+int(c["hora"][3:])-(hoyC.hour*60+hoyC.minute))<=2,str(c))
s,r=ll("POST","/api/solicitudes",G,{"manual":True,"tipo":"taller","nombre":"Otro Cliente","telefono":"698765432","canal":"telefono","mensaje":"","cita":{"fecha":"2001-01-01","hora":"03:00","ahora":True},"vehiculo":{}})
check("otra cita AHORA seguida también entra",s==201,str(s)+str(r)[:120])
s,r=ll("POST","/api/solicitudes",G,{"manual":True,"tipo":"taller","nombre":"Pasado Mal","telefono":"612345679","canal":"telefono","cita":{"fecha":"2001-01-01","hora":"09:00"},"vehiculo":{}})
check("una cita normal en el pasado sigue rechazada",s==409,str(s))
print("== navegador")
with sync_playwright() as p:
    b=p.chromium.launch()
    for nombre,vp,m in [("ordenador",{"width":1440,"height":900},False),("móvil",{"width":390,"height":844},True)]:
        print("\n==",nombre)
        ctx=b.new_context(viewport=vp,has_touch=m,is_mobile=m,locale="es-ES"); pg=ctx.new_page(); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.on("dialog",lambda d:d.accept())
        pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
        if pg.is_visible("#f-eq"): pg.click("#login-modo")
        pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(1200)
        check(nombre+": el glosario de siglas ya no se ve en el Resumen",pg.evaluate("(()=>{const g=document.querySelector('#glosario17');return !g||g.offsetParent===null})()"))
        pg.evaluate("abrirTab('leads')"); pg.wait_for_timeout(800)
        check(nombre+": CRM sin el glosario",pg.evaluate("(()=>{const g=document.querySelector('#glosario17');return !g||g.offsetParent===null})()"))
        # aviso sobre el difuminado
        pg.evaluate("document.querySelector('#nuevo-cliente').click()"); pg.wait_for_selector("#dlg-nuevo[open]")
        pg.fill("#nc-nombre","Prueba Aviso"); pg.fill("#nc-tel","234234223"); pg.click("#nc-ok"); pg.wait_for_timeout(700)
        vis=pg.evaluate("""(()=>{const t=document.querySelector('#toast'); if(!t||t.hidden) return 'oculto'; const r=t.getBoundingClientRect(); const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return (e&&(e===t||t.contains(e)))?'encima':'tapado:'+(e&&e.tagName)+'#'+(e&&e.id)})()""")
        check(nombre+": el aviso de teléfono incorrecto sale ENCIMA del difuminado ("+vis+")",vis=="encima")
        pg.evaluate("document.querySelector('#nc-cancel').click()"); pg.wait_for_timeout(300)
        # cita ahora
        pg.evaluate("document.querySelector('#cita-nueva').click()"); pg.wait_for_selector("#dlg-cita[open]"); pg.wait_for_timeout(500)
        check(nombre+": la cita tiene la casilla «Ahora mismo»",pg.is_visible("#ct-ahora"))
        pg.check("#ct-ahora"); pg.wait_for_timeout(200)
        check(nombre+": al marcar «Ahora» se esconde día/hora y se ve la hora real",not pg.is_visible("#ct-dia") and re.search(r"\d\d:\d\d",pg.inner_text("#ct-ahora-h") or "") is not None,pg.inner_text("#ct-ahora-h"))
        pg.fill("#ct-nombre","Mostrador Test"); pg.fill("#ct-tel","611222333"); pg.click("#ct-ok"); pg.wait_for_timeout(1200)
        check(nombre+": cita AHORA guardada desde el panel",not pg.evaluate("document.querySelector('#dlg-cita').open") and "Cita apuntada" in (pg.inner_text("#toast") or ""),pg.inner_text("#toast"))
        # menú utilidades
        pg.evaluate("abrirTab('caja')"); pg.wait_for_timeout(1000)
        txt=pg.evaluate("(()=>{const u=[...document.querySelectorAll('[data-gdutil]')].map(x=>x.textContent.trim());return u.join('|')})()")
        check(nombre+": el menú «Más opciones» ya no repite «Apuntar cita» ("+txt[:80]+")","Apuntar cita" not in txt)
        # caja: faltante y corregir (solo ordenador para no repetir)
        if not m:
            pg.evaluate("abrirTab('fin')"); pg.wait_for_timeout(1500)
            pg.evaluate("[...document.querySelectorAll('#s-fin button,#s-fin [data-fnt]')].length")
            txt=pg.inner_text("main")
            check(nombre+": Finanzas: «Efectivo físico en cajón» explica el cálculo (cobrado − pagado)","pagado en efectivo" in txt,"")
        check(nombre+": sin errores de JavaScript",not errs,str(errs[:2]))
        ctx.close()
    b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
