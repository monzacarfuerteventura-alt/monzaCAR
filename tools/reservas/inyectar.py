# Copia las reservas online (tools/reservas/reservas.js y reservas.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa de las reservas:  python3 tools/reservas/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "reservas.css").read_text(encoding="utf-8")
js = (R / "reservas.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*RSV-CSS-INICIO*/", "/*RSV-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*RSV-JS-INICIO*/", "/*RSV-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("reservas copiadas en admin.html")
