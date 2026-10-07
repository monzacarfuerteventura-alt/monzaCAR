# Fichas en blanco (sin textos grises) + Factura Rápida con el formulario completo (actualización 52). Servidor recién arrancado.
import sys, re, json
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; ok=0; mal=0
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; print("  ✘",n,e)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_context(viewport={"width":1366,"height":900},locale="es-ES").new_page()
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{window.__p=[];window.print=()=>window.__p.push(document.title)}")
    # --- PDF en blanco (los originales del usuario) servidos con sesión
    for nom in ["FORM-01","FORM-02","FORM-03","FORM-04","FORM-14","FORM-15","FORM-16","FORM-17","FICHAS-TALLER"]:
        r=pg.evaluate("async n=>{const r=await fetch('/api/manual/'+n,{headers:{authorization:'Bearer '+PW}});const b=new Uint8Array(await r.arrayBuffer());return [r.status,r.headers.get('content-type'),String.fromCharCode(...b.slice(0,4))]}",nom)
        check("PDF en blanco "+nom,r[0]==200 and "pdf" in r[1] and r[2]=="%PDF",str(r))
    r=pg.evaluate("fetch('/api/manual/FORM-14').then(r=>r.status)"); check("sin sesión no se entrega",r in (401,403,423),str(r))
    check("el menú ofrece «Fichas en blanco (PDF)»",pg.evaluate("document.querySelector('#gd-bar [data-gdutil=blanco]').textContent")=="Fichas en blanco (PDF)")
    check("ya no existe el botón «Original PDF»","Original PDF" not in pg.content())
    check("ya no existe el generador de fichas en blanco",pg.evaluate("typeof tEnBlanco")=="undefined")
    # --- factura rápida completa
    pg.evaluate("document.querySelector('#gd-bar [data-gd=\"factura\"]').click()"); pg.wait_for_selector("[data-gdf=nombre]")
    pg.fill("[data-gdf=nombre]","Cliente Completo"); pg.fill("[data-gdf=tel]","600111222"); pg.fill("[data-gdf=mat]","5555ZZZ"); pg.fill("[data-gdf=coche]","Renault Clio")
    pg.click("[data-gdsig]"); pg.wait_for_selector("[data-gdl=d]")
    for k in ["doc","dir","cp","email","vin","fOp","kmE","kmS","dtoG"]:
        check("campo del formulario completo: "+k,pg.locator("#dlg-gd [data-gdf=%s]"%k).count()==1)
    check("línea con tipo, referencia, cant., precio y dto.",all(pg.locator("#dlg-gd [data-gdl=%s]"%k).count()>=1 for k in ["t","r","d","n","p","dt"]))
    check("IGIC 7 %, 0 % exento y otro %",pg.locator("#gd-igic button").count()==3)
    pg.fill("[data-gdf=doc]","12345678Z"); pg.fill("[data-gdf=dir]","Calle Mayor 1"); pg.fill("[data-gdf=cp]","35610 Antigua"); pg.fill("[data-gdf=email]","c@x.es")
    pg.fill("[data-gdf=vin]","VF1ABCDEFGH123456"); pg.fill("[data-gdf=kmE]","120000"); pg.fill("[data-gdf=kmS]","120005")
    pg.select_option("[data-gdl=t][data-i='0']","MO"); pg.fill("[data-gdl=r][data-i='0']","MO-01"); pg.fill("[data-gdl=d][data-i='0']","Mano de obra frenos")
    pg.fill("[data-gdl=n][data-i='0']","2"); pg.fill("[data-gdl=p][data-i='0']","50"); pg.fill("[data-gdl=dt][data-i='0']","10")
    pg.click("#gd-igic [data-v=otro]"); pg.fill("[data-gdf=igicOtro]","3"); pg.fill("[data-gdf=dtoG]","5")
    # 2×50×0,9 = 90 − 5 = 85 con IGIC 3 % incluido
    check("total en vivo = 85,00 €","85,00" in pg.inner_text("#gd-tot"),pg.inner_text("#gd-tot"))
    pg.click("[data-gdemitir]"); pg.wait_for_selector("[data-gdmet]",timeout=15000)
    txt=pg.inner_text("#dlg-gd"); m=re.search(r"F-\d{4}-\d{4}",txt)
    check("factura emitida con número F-AAAA-NNNN",bool(m),txt[:200])
    check("total cobrado 85,00 €","85,00" in txt)
    pg.click("[data-gdcerrar]"); pg.wait_for_timeout(500)
    pg.evaluate("abrirTab('ordenes')"); pg.wait_for_timeout(500)
    pg.evaluate("abrirFichas(ORDENES.find(o=>o.vehiculo&&o.vehiculo.matricula==='5555ZZZ').token,'f5')"); pg.wait_for_selector("#tf .fc-ok, #tf [data-fc], #tf .fp-tot, #tf",timeout=10000); pg.wait_for_timeout(1200)
    pg.screenshot(path="/tmp/claude-0/fin/factura-rapida-guardada.png")
    h=pg.evaluate("[...document.querySelectorAll('#tf input,#tf textarea')].map(i=>i.value).join('|')")+pg.inner_text("#tf")
    check("la factura guardó dirección, VIN y km",all(x in h for x in ["Calle Mayor 1","VF1ABCDEFGH123456","120000"]))
    # --- orden de las fichas: Recepción, Inspección, Presupuesto, Tiempos, Calidad, Factura
    tabs=pg.evaluate("[...document.querySelectorAll('#tf [data-ttabb]')].map(b=>b.dataset.ttabb)")
    check("pestañas: f1,f2,pre,f3,f4,f5,audit",tabs==["f1","f2","pre","f3","f4","f5","audit"],str(tabs))
    pg.evaluate("document.querySelector('#tf [data-ttabb=pre]').click()"); pg.wait_for_timeout(500)
    check("la ficha de presupuesto se abre",pg.locator("#tf-body").inner_text().find("FORM-15")>=0)
    check("botón «Ficha en blanco (PDF)» del presupuesto",pg.locator("#tf a[href='#manual-FORM-15']").count()>=1)
    pg.evaluate("abrirTab('coches')"); pg.wait_for_selector("#s-list:not([hidden])"); pg.wait_for_timeout(400)
    check("Coches: botón «Factura de venta (PDF)»",pg.is_visible("#pdf-venta") and "Factura de venta" in pg.inner_text("#pdf-venta"))
    check("Coches: botón «Parte de reserva (PDF)»",pg.is_visible("#pdf-reserva") and "reserva" in pg.inner_text("#pdf-reserva").lower())
    check("los botones de Coches apuntan a FORM-16 y FORM-17",pg.get_attribute("#pdf-venta","href")=="#manual-FORM-16" and pg.get_attribute("#pdf-reserva","href")=="#manual-FORM-17")
    with pg.context.expect_page() as nueva: pg.click("#pdf-venta")
    check("pulsar «Factura de venta (PDF)» abre una pestaña",nueva.value is not None); nueva.value.close()
    pg.evaluate("tPanelFichas(TF.orden.token)"); pg.wait_for_selector("#vc-fichas")
    ks=pg.evaluate("[...document.querySelectorAll('#vc-fichas [data-vf=r][data-k]')].map(b=>b.dataset.k).filter(k=>k!=='f1'||true)")
    check("recuadro de fichas: 6 y en orden",ks[:6]==["f1","f2","pre","f3","f4","f5"],str(ks))
    check("sin errores de JavaScript",not errs,str(errs)); b.close()
print(f"\n{ok} bien, {mal} mal"); sys.exit(1 if mal else 0)
