# Arqueo ciego con tolerancia cero + PIN de gerente (actualización 49). Servidor recién arrancado: bun tools/pruebas/servidor-local.mjs
import json, urllib.request, sys
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
    s,r=ll("POST","/api/taller/equipo",G,{"nombre":u.title(),"usuario":u,"pin":"445566","rol":rol,"caja":caja}); check("alta "+u,s in (200,201),str(r))
s,l=ll("POST","/api/login","",{"usuario":"recep","pin":"445566"}); R=l.get("token","")
check("el equipo entra con PIN",bool(R))
ll("POST","/api/jornada/fichar",R,{"accion":"entrada"})
s,r=ll("POST","/api/caja/abrir",R,{"desglose":{"5000":2}}); check("abre con 100,00 €",s==200,str(r))
s,r=ll("POST","/api/caja/movimiento",R,{"tipo":"ingreso","importe":"25,50","categoria":"taller","concepto":"Aceite","ref":"A1","metodo":"efectivo"}); check("cobro en efectivo 25,50 €",s in (200,201),str(r))
# esperado 125,50 = 100 + 25,50. Contamos 125,49 (1 céntimo menos)
d_ok={"5000":2,"2000":1,"500":1,"50":1}   # 100+20+5+0,50 = 125,50
d_mal={"5000":2,"2000":1,"500":1,"20":1,"10":2,"5":1,"2":2}  # 125,49
s,r=ll("POST","/api/caja/cerrar",R,{"desglose":d_mal}); check("1 céntimo de diferencia: no cierra sin explicación (409)",s==409,str(s)+str(r)[:80])
check("no revela cuánto falta (cierre ciego)","teorico" not in json.dumps(r))
s,r=ll("POST","/api/caja/cerrar",R,{"desglose":d_mal,"justificacion":"Falta un céntimo en el cambio de la mañana"}); check("con explicación pero sin PIN: 403 pide PIN de gerente",s==403 and r.get("pinGerente"),str(s)+str(r)[:100])
s,r=ll("POST","/api/caja/cerrar",R,{"desglose":d_mal,"justificacion":"Falta un céntimo en el cambio de la mañana","pinGerente":"000000"}); check("PIN de gerente erróneo: 403",s==403,str(s))
s,r=ll("POST","/api/caja/cerrar",R,{"desglose":d_mal,"justificacion":"Falta un céntimo en el cambio de la mañana","pinGerente":"445566"}); check("PIN de gerente correcto: cierra con descuadre",s==200 and r.get("descuadre") is True,str(s)+str(r)[:120])
check("el resumen no enseña la cifra al empleado","teorico" not in json.dumps(r.get("resumen",{})))
check("queda anotado quién autorizó",r.get("resumen",{}).get("autorizo")=="Ger2",str(r.get("resumen")))
# segundo turno: cuadra exacto
s,r=ll("POST","/api/caja/abrir",R,{"desglose":d_mal}); check("reabre con el fondo del último cierre",s==200,str(s)+str(r)[:100])
s,r=ll("POST","/api/caja/cerrar",R,{"desglose":d_mal}); check("cuadra al céntimo: cierra sin PIN",s==200 and r.get("descuadre") is False,str(s)+str(r)[:100])
check("resumen con diferencia 0",r.get("resumen",{}).get("diferencia")==0,str(r.get("resumen")))
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
