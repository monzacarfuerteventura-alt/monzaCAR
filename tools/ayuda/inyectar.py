# Copia la Ayuda del panel (tools/ayuda/ayuda.js y ayuda.css) dentro de public/admin.html.
# También añade (una sola vez) la pestaña «Ayuda» y su sección.
# Ejecuta después de cambiar cualquier texto de la ayuda:  python3 tools/ayuda/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "ayuda.css").read_text(encoding="utf-8")
js = (R / "ayuda.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*AYUDA-CSS-INICIO*/", "/*AYUDA-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*AYUDA-JS-INICIO*/", "/*AYUDA-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")

TAB = '<button type="button" role="tab" data-tab="ayuda" id="tab-ayuda" aria-selected="false">Ayuda</button>'
if 'data-tab="ayuda"' not in s:
    i = s.index('data-tab="coches"'); i = s.index("</button>", i) + len("</button>")
    s = s[:i] + "\n    " + TAB + s[i:]

SEC = '''  <!-- AYUDA: manual de uso del panel (tools/ayuda) -->
  <section id="s-ayuda" hidden>
    <div class="head">
      <div><h1 style="font-size:28px">Ayuda</h1><p>Cómo se usa cada pestaña, paso a paso. Elige tu puesto para ver solo lo tuyo.</p></div>
      <div class="acts"><button class="btn b-brand b-sm" type="button" id="ay-pdf">Descargar PDF</button></div>
    </div>
    <div id="ay"></div>
  </section>

'''
if 'id="s-ayuda"' not in s:
    i = s.index('  <section id="s-guia"')
    s = s[:i] + SEC + s[i:]

# El equipo del taller también ve la pestaña Ayuda
REGLA = 'html body.modo-equipo #tabs #tab-ayuda{display:inline-flex!important}'
if REGLA not in css and REGLA not in s:
    s = s.replace("/*AYUDA-CSS-FIN*/", REGLA + "\n/*AYUDA-CSS-FIN*/", 1)

ADMIN.write_text(s, encoding="utf-8")
print("ayuda copiada en admin.html")
