# Copia el Inventario (tools/almacen/almacen.js y almacen.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa del inventario:  python3 tools/almacen/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "almacen.css").read_text(encoding="utf-8")
js = (R / "almacen.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*ALMACEN-CSS-INICIO*/", "/*ALMACEN-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*ALMACEN-JS-INICIO*/", "/*ALMACEN-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("inventario copiado en admin.html")
