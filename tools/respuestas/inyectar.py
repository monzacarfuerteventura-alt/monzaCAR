# Copia «Respuestas» (tools/respuestas: respuestas-datos.js + respuestas.js + respuestas.css) en public/admin.html
# y añade (una sola vez) la pestaña «Respuestas» y su sección. Solo la ve el gerente.
# Ejecuta después de cambiar cualquier texto:  python3 tools/respuestas/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "respuestas.css").read_text(encoding="utf-8")
js = (R / "respuestas-datos.js").read_text(encoding="utf-8") + "\n" + (R / "respuestas.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*RESP-CSS-INICIO*/", "/*RESP-CSS-FIN*/", css, "/*AYUDA-CSS-INICIO*/")
s = bloque(s, "/*RESP-JS-INICIO*/", "/*RESP-JS-FIN*/", js, "/*AYUDA-JS-INICIO*/")

TAB = '<button type="button" role="tab" data-tab="resp" id="tab-resp" aria-selected="false">Respuestas</button>'
if 'data-tab="resp"' not in s:
    i = s.index('data-tab="ayuda"'); i = s.rindex("<button", 0, i)
    s = s[:i] + TAB + "\n    " + s[i:]

SEC = '''  <!-- RESPUESTAS: textos para contestar reseñas y mensajes con un clic (tools/respuestas) -->
  <section id="s-resp" hidden>
    <div class="head">
      <div><h1 style="font-size:28px">Respuestas</h1><p>Elige el caso y copia una respuesta personalizada: reseñas de Google y mensajes de WhatsApp.</p></div>
    </div>
    <div id="rs"></div>
  </section>

'''
if 'id="s-resp"' not in s:
    i = s.index('  <!-- AYUDA: manual')
    s = s[:i] + SEC + s[i:]

ADMIN.write_text(s, encoding="utf-8")
print("respuestas copiadas en admin.html")
