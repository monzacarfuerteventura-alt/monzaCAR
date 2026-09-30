# Copia «Coste de personal» (tools/costes/costes.js y costes.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa:  python3 tools/costes/inyectar.py
# 
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "costes.css").read_text(encoding="utf-8")
js = (R / "costes.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*COSTES-CSS-INICIO*/", "/*COSTES-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*COSTES-JS-INICIO*/", "/*COSTES-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("coste de personal copiado en admin.html")
