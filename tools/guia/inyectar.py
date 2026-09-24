# Copia la guía de venta (tools/guia/guia.js y guia.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier texto de la guía:  python3 tools/guia/inyectar.py
import pathlib, re
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "guia.css").read_text(encoding="utf-8")
js = (R / "guia.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*GUIA-CSS-INICIO*/", "/*GUIA-CSS-FIN*/", css, "</style>\n</head>")
s = bloque(s, "/*GUIA-JS-INICIO*/", "/*GUIA-JS-FIN*/", js, "</script>\n</body>")
ADMIN.write_text(s, encoding="utf-8")
print("guía copiada en admin.html")
