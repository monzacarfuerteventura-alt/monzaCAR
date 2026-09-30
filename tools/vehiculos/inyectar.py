# Copia «Coches propios» (tools/vehiculos/vehiculos.js y vehiculos.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa:  python3 tools/vehiculos/inyectar.py
# (y, si has tocado el Taller:  python3 tools/taller/inyectar.py  ANTES que este)
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "vehiculos.css").read_text(encoding="utf-8")
js = (R / "vehiculos.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*VEHICULOS-CSS-INICIO*/", "/*VEHICULOS-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*VEHICULOS-JS-INICIO*/", "/*VEHICULOS-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("coches propios copiado en admin.html")
