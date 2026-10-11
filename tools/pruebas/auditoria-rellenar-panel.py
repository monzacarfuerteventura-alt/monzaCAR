# Auditoría (actualización 63): N vueltas (por defecto 100) rellenando TODOS los campos de las 6 fichas del taller
# (cliente/gerente) con datos al azar —incluidos caracteres raros—, guardando, emitiendo la factura y comprobando que no hay
# errores de JavaScript, de consola, respuestas 5xx ni peticiones 4xx inesperadas.
# Uso: bun tools/pruebas/servidor-local.mjs (recién arrancado)  y  ITER=100 python3 tools/pruebas/auditoria-rellenar-panel.py
import os, sys, random, time, re
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8888"; CLAVE = "clave-de-pruebas-larga-2026"; N = int(os.environ.get("ITER", "100"))
random.seed(int(os.environ.get("SEMILLA", "63")))
RAROS = ["<script>alert(1)</script>", "'; DROP TABLE x;--", "Ñandú ✓ 日本語 😀", "&quot;%00", "a" * 300, "  espacios  ", "Pérez-García, J.", "O'Brien", "ñ\n2ª línea", "0,5", "-3", "1e9", "12/34"]
NOMBRES = ["Ana Pérez", "Luis Cabrera", "María Dolores Hernández", "José Ángel Rodríguez", "Yaiza Betancor", "Zebenzuí Santana"]
MARCAS = ["Seat Leon", "Renault Clio", "Opel Astra", "Ford Focus", "Toyota Yaris", "Mercedes Clase A"]
errs, avisos, r4 = [], [], []
def dato(el, tipo, i):
    r = random.random()
    if r < .12: return random.choice(RAROS)
    if tipo in ("number",): return str(random.randint(1, 900))
    if tipo == "tel": return "6" + "".join(random.choice("0123456789") for _ in range(8))
    if tipo == "email": return f"cliente{i}@ejemplo.es"
    if tipo == "date": return f"2026-10-{random.randint(1, 28):02d}"
    if tipo == "time": return f"{random.randint(8, 18):02d}:{random.randint(0, 59):02d}"
    if tipo == "datetime-local": return f"2026-10-{random.randint(1, 28):02d}T{random.randint(8, 18):02d}:30"
    if el == "textarea": return "Revisión de frenos y cambio de aceite. " + random.choice(NOMBRES)
    return random.choice(NOMBRES + MARCAS + ["12345", "Aceite 5W30", "Frenos"])
def rellenar(pg, i):
    n = 0
    for e in pg.query_selector_all("#tf-body input:not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]):not([type=range]), #tf-body select, #tf-body textarea"):
        try:
            if not e.is_visible() or not e.is_enabled(): continue
            tag = e.evaluate("e=>e.tagName.toLowerCase()"); tipo = (e.get_attribute("type") or "text").lower()
            if tag == "select":
                ops = e.evaluate("e=>[...e.options].filter(o=>!o.disabled).map(o=>o.value)")
                if ops: e.select_option(random.choice(ops)); n += 1
            elif tipo in ("checkbox", "radio"):
                if random.random() < .5: e.check(timeout=800) if tipo == "checkbox" else e.click(timeout=800)
                n += 1
            else: e.fill(dato(tag, tipo, i), timeout=1500); n += 1
        except Exception: pass
    for b in pg.query_selector_all("#tf-body [data-fset]"):
        try:
            if random.random() < .5 and b.is_visible() and b.is_enabled(): b.click(timeout=800)
        except Exception: pass
    return n
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    ctx = b.new_context(viewport={"width": 1366, "height": 900}, locale="es-ES"); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("JS: " + str(e)[:200]))
    pg.on("console", lambda m: errs.append("CONSOLA: " + m.text[:200]) if m.type == "error" and not re.search(r"favicon|ERR_|Failed to load|googletag|status of 4", m.text) else None)
    def resp(r):
        if r.status >= 500: errs.append(f"HTTP {r.status} {r.url[:100]}")
        elif r.status >= 400 and "/api/" in r.url: r4.append(f"{r.status} {r.request.method} {r.url.replace(BASE, '')[:90]}")
    pg.on("response", resp); pg.on("dialog", lambda d: d.accept())
    pg.goto(BASE + "/admin"); pg.wait_for_selector("#login-form")
    if pg.is_visible("#f-eq"): pg.click("#login-modo")
    pg.fill("#pw", CLAVE); pg.click("#login-btn"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=15000); pg.wait_for_timeout(800)
    pg.evaluate("async()=>{ await api('/api/caja/abrir',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({desglose:{'10000':5}})}) }")
    campos = 0; emitidas = 0; fallidas = 0
    for i in range(N):
        try:
            tok = pg.evaluate("""async (a)=>{ const r=await tApi("recepcion","POST",{cliente:{nombre:a[0],telefono:"600"+String(100000+a[2])},vehiculo:{matricula:String(1000+a[2])+"ABC",marcaModelo:a[1]},tipoEntrada:"reparacion",recibidoPor:"Auditoría"}); ORDENES.unshift(r.orden||r); return (r.orden||r).token; }""", [random.choice(NOMBRES), random.choice(MARCAS), i])
            pg.evaluate("t=>abrirFichas(t,'f1')", tok); pg.wait_for_selector("#tf .t-tabs", timeout=8000)
            for k in ("f1", "f2", "pre", "f3", "f4"):
                if pg.query_selector(f'[data-ttabb="{k}"]'): pg.click(f'[data-ttabb="{k}"]'); pg.wait_for_timeout(120); campos += rellenar(pg, i)
            pg.wait_for_timeout(250)
            if pg.query_selector('[data-ttabb="f5"]'):
                pg.click('[data-ttabb="f5"]'); pg.wait_for_timeout(150)
                for _ in range(random.randint(1, 3)):
                    t = random.choice(["MO", "REC", "OTRO"]); pg.click(f"[data-fcadd={t}]", timeout=1500); pg.wait_for_timeout(60)
                campos += rellenar(pg, i)
                for l in pg.query_selector_all('[data-fcl$=".precio"]'): l.fill(str(random.randint(5, 300)), timeout=1000)
                for l in pg.query_selector_all('[data-fcl$=".cant"]'): l.fill(str(random.randint(1, 3)), timeout=1000)
                for l in pg.query_selector_all('[data-fcl$=".dto"]'): l.fill("", timeout=1000)
                for l in pg.query_selector_all('[data-fcl$=".desc"]'): l.fill("Concepto " + random.choice(MARCAS), timeout=1000)
                pg.fill('[data-fc="cliente.nombre"]', random.choice(NOMBRES), timeout=1500)
                pg.wait_for_timeout(1000)
                if pg.query_selector("[data-tcerrar]"):
                    pg.click("[data-tcerrar]"); pg.wait_for_selector("#f-fn", timeout=3000)
                    met = random.choice(["efectivo", "transferencia", "tarjeta", "pendiente"]); pg.click(f'#fn-met [data-v="{met}"]')
                    if met != "pendiente" and random.random() < .5: pg.fill("#fn-importe", "1,00")
                    pg.click("#fn-ok"); pg.wait_for_timeout(900)
                    if pg.query_selector(".t-lock"): emitidas += 1
                    else:
                        falta = pg.evaluate("()=>{const a=document.querySelector('#tf-faltan');const b=document.querySelector('#fn-err');return (a&&!a.hidden?a.innerText:'')+' '+(b&&!b.hidden?b.innerText:'')}")
                        avisos.append(f"vuelta {i}: factura no emitida: {falta.strip()[:140]}")
                        if pg.query_selector("#f-fn"): pg.keyboard.press("Escape")
            overflow = pg.evaluate("document.documentElement.scrollWidth>innerWidth+2")
            if overflow: avisos.append(f"vuelta {i}: desbordamiento horizontal")
            pg.wait_for_timeout(200); pg.evaluate("()=>{ try{ tVolver&&tVolver() }catch(_){ } }")
        except Exception as e:
            fallidas += 1; avisos.append(f"vuelta {i}: {str(e)[:140]}")
            try: pg.keyboard.press("Escape"); pg.goto(BASE + "/admin"); pg.wait_for_selector("#s-dash:not([hidden])", timeout=10000)
            except Exception: pass
        if i % 10 == 9: print(f"  … vuelta {i+1}/{N} · campos rellenados {campos} · facturas emitidas {emitidas} · errores {len(errs)} · {time.time()-t0:.0f}s", flush=True)
    b.close()
print(f"\nVueltas {N} · campos rellenados {campos} · facturas emitidas {emitidas} · vueltas fallidas {fallidas}")
print("ERRORES JS/consola/5xx:", len(errs)); [print("  ✘", x) for x in sorted(set(errs))[:20]]
print("avisos:", len(avisos)); [print("  !", x) for x in avisos[:15]]
from collections import Counter
print("4xx de la API (validaciones esperadas):", dict(Counter(r4).most_common(12)))
sys.exit(1 if errs else 0)
