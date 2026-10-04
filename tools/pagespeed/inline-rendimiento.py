import pathlib, subprocess, re
# Mete el rendimiento en las 4 páginas SPA (index, en, comprar, taller). Ejecutar desde la raíz del proyecto:
#   python3 tools/pagespeed/inline-rendimiento.py      (necesita bun, como inline-css.py)
# Es repetible: se puede ejecutar las veces que haga falta, siempre deja el mismo resultado.
#  · rendimiento.js  → <script id="vc-perf-js"> en la cabecera (sustituye a la línea que solo ponía la clase «js»)
#  · taller-vfx.css, precios-taller.css y rendimiento.css → en línea, justo después del CSS principal
#    (así el fondo del taller y los precios ya salen con su estilo y la página no da saltos al cargar)
#  · «Cargando coches…» lleva la clase .cargando (reserva el hueco del catálogo)
#  · el cambio de vista con transición animada no se usa en el modo ligero
R = pathlib.Path(__file__).resolve().parent.parent.parent / "public"

def minimo(nombre, ext):
    out = f"/tmp/perf_{nombre}.{ext}"
    subprocess.run(["bun", "build", str(R / f"{nombre}.{ext}"), "--minify", "--outfile", out], check=True, capture_output=True)
    return open(out, encoding="utf-8").read().strip()

js = minimo("rendimiento", "js")
vfx, pt, perf = minimo("taller-vfx", "css"), minimo("precios-taller", "css"), minimo("rendimiento", "css")
for t in (js, vfx, pt, perf): assert "</script" not in t.lower() and "</style" not in t.lower()
bloque_js = '<script id="vc-perf-js">' + js + "</script>"
bloque_css = ("<!--PERF-INICIO--><style id=\"vfx-css\">" + vfx + "</style><style id=\"pt-css\">" + pt +
              "</style><style id=\"vc-perf\">" + perf + "</style><!--PERF-FIN-->")

VIEJO_JS = '<script>document.documentElement.classList.add("js")</script>'
VT_ANTES = 'if(push && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches)'
VT_DESPUES = 'if(push && document.startViewTransition && !document.documentElement.classList.contains("lite") && !matchMedia("(prefers-reduced-motion: reduce)").matches)'

for p in (R / "index.html", R / "en/index.html", R / "comprar/index.html", R / "taller/index.html"):
    t = p.read_text(encoding="utf-8")
    # 1) script de la cabecera
    if '<script id="vc-perf-js">' in t:
        t = re.sub(r'<script id="vc-perf-js">.*?</script>', lambda m: bloque_js, t, count=1, flags=re.S)
    else:
        assert t.count(VIEJO_JS) == 1, p
        t = t.replace(VIEJO_JS, bloque_js, 1)
    # 2) estilos en línea
    if "<!--PERF-INICIO-->" in t:
        t = re.sub(r"<!--PERF-INICIO-->.*?<!--PERF-FIN-->", lambda m: bloque_css, t, count=1, flags=re.S)
    else:
        assert t.count("<!--CSS-FIN-->") == 1, p
        t = t.replace("<!--CSS-FIN-->", "<!--CSS-FIN-->\n" + bloque_css, 1)
    # 3) «Cargando coches…» con su clase
    t = re.sub(r'<div class="empty"( style="grid-column:1/-1">(?:Cargando coches…|Loading cars…)</div>)', r'<div class="empty cargando"\1', t)
    # 4) sin transición de vistas en modo ligero
    if VT_DESPUES not in t:
        assert t.count(VT_ANTES) == 1, p
        t = t.replace(VT_ANTES, VT_DESPUES, 1)
    p.write_text(t, encoding="utf-8")
    print(p.relative_to(R), len(t))
