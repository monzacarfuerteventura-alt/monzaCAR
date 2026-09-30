# Copia «Factura de reparación» (tools/factura/factura.js y factura.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa:  python3 tools/factura/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "factura.css").read_text(encoding="utf-8")
js = (R / "factura.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*FACTURA-CSS-INICIO*/", "/*FACTURA-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*FACTURA-JS-INICIO*/", "/*FACTURA-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("factura de reparación copiada en admin.html")
