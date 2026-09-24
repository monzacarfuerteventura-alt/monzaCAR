# Copia el módulo del taller (tools/taller/taller.js y taller.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa del taller:  python3 tools/taller/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "taller.css").read_text(encoding="utf-8")
js = (R / "taller.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*TALLER-CSS-INICIO*/", "/*TALLER-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*TALLER-JS-INICIO*/", "/*TALLER-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("taller copiado en admin.html")
