# Prueba de estrés E2E (actualización 55): N vueltas (por defecto 100) por sección del panel, clics rápidos, formularios con
# caracteres especiales, red caída/lenta, sesión caducada, fugas de memoria/DOM y desbordes en móvil/tablet/escritorio, y web pública.
# Uso: bun tools/pruebas/servidor-local.mjs &  ;  ITER=100 python3 tools/pruebas/e2e-estres.py
import os, sys, random, time
from playwright.sync_api import sync_playwright
BASE="http://localhost:8888"; CLAVE="clave-de-pruebas-larga-2026"; N=int(os.environ.get("ITER","100"))
ok=0; mal=0; fallos=[]
def check(n,c,e=""):
    global ok,mal
    if c: ok+=1; print("  ✔",n)
    else: mal+=1; fallos.append(n); print("  ✘",n,e)
VPS={"móvil":{"width":390,"height":844},"tablet":{"width":820,"height":1180},"escritorio":{"width":1440,"height":900}}
RUIDO=("favicon","net::ERR","Failed to load resource","googletagmanager","google","facebook","fonts.g","ERR_INTERNET","ERR_NAME","ERR_CONNECTION","status of 4","status of 5")
def nuevo(b,vp,errs):
    ctx=b.new_context(viewport=vp,locale="es-ES"); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append("JS: "+str(e)[:200]))
    pg.on("console",lambda m:errs.append("CONSOLA: "+m.text[:200]) if m.type=="error" and not any(r in m.text for r in RUIDO) else None)
    pg.on("dialog",lambda d:d.accept()); return ctx,pg
def entrar(pg):
    pg.goto(BASE+"/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw",CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])",timeout=15000); pg.wait_for_timeout(800)
def metr(pg): return pg.evaluate("({n:document.getElementsByTagName('*').length,d:document.querySelectorAll('dialog').length,h:(performance.memory||{}).usedJSHeapSize||0})")
with sync_playwright() as p:
    b=p.chromium.launch(args=["--enable-precise-memory-info"]); t0=time.time()
    # ---------- 1. Secciones del panel, N vueltas ----------
    errs=[]; ctx,pg=nuevo(b,VPS["escritorio"],errs); entrar(pg)
    secc=pg.eval_on_selector_all("#vc-side [data-vs]","els=>els.map(e=>e.dataset.vs)")
    print(f"Panel: {len(secc)} secciones × {N} vueltas ->",secc)
    check("el panel tiene al menos 9 secciones",len(secc)>=9)
    base=metr(pg)
    for s in secc:
        malas=0
        for i in range(N):
            try:
                pg.click(f'#vc-side [data-vs="{s}"]',timeout=4000)
                if i%10==0: pg.wait_for_timeout(60)
                if not pg.evaluate("[...document.querySelectorAll('main section,[id^=s-]')].some(e=>!e.hidden&&e.offsetParent!==null&&e.id!='s-login')"): malas+=1
            except Exception as e: malas+=1
        check(f"sección «{s}»: {N} vueltas sin fallo ({malas} malas)",malas==0)
    check("sin errores de JS/consola tras las vueltas",not errs,str(errs[:3]))
    # ---------- 2. Clics rápidos en orden aleatorio ----------
    random.seed(7)
    for i in range(N*3):
        try: pg.click(f'#vc-side [data-vs="{random.choice(secc)}"]',timeout=3000,no_wait_after=True)
        except Exception: pass
    pg.wait_for_timeout(500); check("navegación rápida aleatoria sin errores",not errs,str(errs[:3]))
    # ---------- 3. Asistentes y formularios con caracteres especiales ----------
    RAROS=["<script>alert(1)</script>","'; DROP TABLE x;--","Ñandú ✓ 日本語 😀","&quot;%00\\u0000","   ","a"*400,"-1","1e999","0,00"]
    for i in range(N):
        pg.click("#vs-new"); pg.click('#vs-menu [data-g="entrada"]'); pg.wait_for_timeout(40)
        for c in pg.query_selector_all("dialog[open] input[type=text],dialog[open] input:not([type]),dialog[open] textarea")[:3]:
            try: c.fill(RAROS[i%len(RAROS)])
            except Exception: pass
        pg.keyboard.press("Escape"); pg.wait_for_timeout(20)
    pg.wait_for_timeout(400); m=metr(pg)
    check(f"asistente «Nueva entrada» abierto/cerrado {N} veces sin error",not errs,str(errs[:3]))
    check("sin fuga de diálogos (≤ 6 abiertos en el DOM)",m["d"]<=6,str(m))
    check(f"sin crecimiento anormal del DOM (+{m['n']-base['n']} nodos)",m["n"]-base["n"]<1500,str(m))
    check("memoria JS estable (<+60 MB)",m["h"]-base["h"]<60e6,f"{(m['h']-base['h'])/1e6:.1f} MB")
    # búsqueda Ctrl+K con entradas raras
    for i in range(N//2):
        pg.keyboard.press("Control+k"); pg.wait_for_selector("#vp-q",timeout=3000); pg.fill("#vp-q",RAROS[i%len(RAROS)]); pg.keyboard.press("Escape")
    check("buscador Ctrl+K con entradas raras sin errores",not errs,str(errs[:3]))
    # doble submit: pulsar muchas veces «Entrar» de factura rápida/guardar no debe duplicar
    pg.click("#vs-new"); 
    bt=pg.query_selector_all('#vs-menu button'); check("menú «+ Nuevo» responde",len(bt)>=3); pg.keyboard.press("Escape")
    # ---------- 4. Red lenta, caída y sesión caducada ----------
    pg.route("**/api/**",lambda r:(time.sleep(1.2),r.continue_())[1]) if False else None
    ctx.set_offline(True)
    for s in secc[:6]:
        try: pg.click(f'#vc-side [data-vs="{s}"]',timeout=3000)
        except Exception: pass
    pg.wait_for_timeout(800); check("sin excepciones con la red caída",not [e for e in errs if e.startswith("JS")],str(errs[:3]))
    ctx.set_offline(False)
    pg.route("**/api/**",lambda r:r.fulfill(status=503,body='{"error":"caído"}',content_type="application/json"))
    for s in secc[:6]:
        try: pg.click(f'#vc-side [data-vs="{s}"]',timeout=3000)
        except Exception: pass
    pg.wait_for_timeout(800); check("sin excepciones con el servidor devolviendo 503",not [e for e in errs if e.startswith("JS")],str(errs[:3]))
    pg.unroute("**/api/**")
    pg.evaluate("Object.keys(sessionStorage).forEach(k=>{ if(/tok|vc_s|sesion/i.test(k)) sessionStorage.setItem(k,'caducado.0') })"); pg.reload(); pg.wait_for_timeout(1800)
    check("sesión caducada → vuelve a la pantalla de acceso",pg.is_visible("#login-form"))
    check("sin excepciones de JS en todo el recorrido",not [e for e in errs if e.startswith("JS")],str(errs[:5]))
    ctx.close()
    # ---------- 5. Responsive: panel en 3 tamaños ----------
    for nom,vp in VPS.items():
        e2=[]; c2,p2=nuevo(b,vp,e2); entrar(p2)
        sc=p2.eval_on_selector_all('[data-vs],#app-bar [data-a],#app-bar button',"els=>[...new Set(els.map(e=>e.dataset.vs||''))].filter(Boolean)") or secc
        malas=[]
        for s in sc:
            try:
                if vp["width"]<900:
                    p2.evaluate("(s)=>{const x=document.querySelector('[data-vs=\"'+s+'\"]');x&&x.click()}",s)
                else: p2.click(f'#vc-side [data-vs="{s}"]',timeout=3000)
                p2.wait_for_timeout(250)
                w=p2.evaluate("document.documentElement.scrollWidth")
                if w>vp["width"]+2: malas.append(f"{s}:{w}")
            except Exception as ex: malas.append(f"{s}:ERR")
        check(f"{nom} ({vp['width']}px): sin scroll horizontal en {len(sc)} secciones",not malas,str(malas))
        check(f"{nom}: sin errores de JS",not [e for e in e2 if e.startswith("JS")],str(e2[:3])); c2.close()
    # ---------- 6. Web pública ----------
    import glob
    paginas=["/"]+["/"+os.path.dirname(f)[7:]+"/" for f in glob.glob("public/*/index.html") if not f.startswith("public/en")]+["/en/","/reserva.html","/seguimiento.html","/privacidad.html","/cookies.html","/aviso-legal.html","/condiciones.html"]
    paginas=sorted(set(paginas)); print("Web pública:",len(paginas),"páginas")
    for nom,vp in VPS.items():
        e3=[]; c3,p3=nuevo(b,vp,e3); malas=[]; lentas=[]
        for u in paginas:
            for k in range(max(2,N//25)):
                t=time.time()
                try:
                    p3.goto(BASE+u,wait_until="domcontentloaded",timeout=15000); p3.wait_for_timeout(120)
                    w=p3.evaluate("document.documentElement.scrollWidth")
                    if w>vp["width"]+2 and k==0: malas.append(f"{u}:{w}")
                    if time.time()-t>2.5: lentas.append(u)
                except Exception as ex: malas.append(f"{u}:ERR {str(ex)[:60]}")
        check(f"web pública {nom}: {len(paginas)} páginas sin desborde ni caídas",not malas,str(malas[:5]))
        check(f"web pública {nom}: sin errores de JS",not [e for e in e3 if e.startswith("JS")],str(e3[:3]))
        check(f"web pública {nom}: ninguna carga >2,5 s",not lentas,str(set(lentas))); c3.close()
    b.close()
print(f"\n{ok} bien, {mal} mal · {time.time()-t0:.0f}s"); 
if fallos: print("FALLOS:",fallos)
sys.exit(1 if mal else 0)
