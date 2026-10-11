"""Auditoría de la web pública: recorre todas las páginas (escritorio y móvil), baja hasta el final para activar
las cargas perezosas, abre las fichas de coche y apunta cualquier petición fallida (404/5xx), error de consola
o desbordamiento horizontal. Uso (con el servidor local arrancado): python3 tools/pruebas/auditoria-publica.py [vueltas]"""
import sys, re, json, pathlib
from playwright.sync_api import sync_playwright
B = "http://localhost:8888"; RAIZ = pathlib.Path(__file__).resolve().parents[2] / "public"
vueltas = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rutas = sorted({"/" + str(p.parent.relative_to(RAIZ)).replace("\\", "/") + "/" if p.name == "index.html" and p.parent != RAIZ else "/" if p.name == "index.html" else "/" + str(p.relative_to(RAIZ))
                for p in RAIZ.rglob("*.html") if not re.search(r"(^|/)(admin|404|seguimiento|reserva)", str(p.relative_to(RAIZ)))})
fallos = {}
def anota(k, v): fallos.setdefault(k, set()).add(v)
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for v in range(vueltas):
        for nombre, vp in (("escritorio", {"width": 1366, "height": 800}), ("movil", {"width": 390, "height": 844})):
            ctx = br.new_context(viewport=vp, has_touch=nombre == "movil"); pg = ctx.new_page()
            def resp(r, n=nombre):
                u = r.url
                if r.status >= 400 and u.startswith(B) and "/.netlify/" not in u: anota("HTTP %d" % r.status, u.replace(B, "") + " ← " + pg.url.replace(B, ""))
            pg.on("response", resp)
            pg.on("requestfailed", lambda r: anota("petición fallida", r.url[:120]) if r.url.startswith(B) else None)
            pg.on("pageerror", lambda e: anota("error JS", str(e)[:160] + " ← " + pg.url.replace(B, "")))
            pg.on("console", lambda m: anota("consola", m.text[:160] + " ← " + pg.url.replace(B, "")) if m.type == "error" and "Failed to load resource" not in m.text and "net::ERR" not in m.text else None)
            for ruta in rutas:
                try:
                    pg.goto(B + ruta, wait_until="load", timeout=20000)
                    for _ in range(6): pg.mouse.wheel(0, 1400); pg.wait_for_timeout(120)
                    if pg.evaluate("document.documentElement.scrollWidth>innerWidth+2"): anota("desborda en horizontal", nombre + " " + ruta)
                    for h in pg.eval_on_selector_all("a[href^='/']", "e=>[...new Set(e.map(a=>a.getAttribute('href').split('#')[0].split('?')[0]))]")[:60]:
                        if re.search(r"\.(jpg|jpeg|png|webp|svg|pdf|js|css|xml|txt|json|mp4|ico)$", h) or h.startswith(("/api/", "/admin", "/seguimiento", "/reserva", "/r/", "/s/", "/coches-segunda-mano-", "/taller-mecanico-", "/aviso-legal", "/coches-vendidos", "/privacidad", "/cookies", "/condiciones")) or h == "": continue
                        r = ctx.request.get(B + h, timeout=15000, max_redirects=5)
                        if r.status >= 400: anota("enlace roto HTTP %d" % r.status, h + " ← " + ruta)
                except Exception as e: anota("no carga", ruta + " " + str(e)[:100])
            ctx.close()
    br.close()
if not fallos: print("✔ sin fallos en %d páginas × 2 pantallas × %d vueltas" % (len(rutas), vueltas))
else:
    for k, vs in fallos.items():
        print("✘", k)
        for x in sorted(vs)[:25]: print("    ", x)
print("páginas:", len(rutas)); sys.exit(1 if fallos else 0)
