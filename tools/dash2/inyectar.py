# Copia el Dashboard 2 y el panel «Marketing en vivo» (tools/dash2/*.js y *.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa de estos módulos:  python3 tools/dash2/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "dash2.css").read_text(encoding="utf-8") + "\n" + (R / "marketing.css").read_text(encoding="utf-8")
js = (R / "dash2.js").read_text(encoding="utf-8") + "\n" + (R / "marketing.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*DASH2-CSS-INICIO*/", "/*DASH2-CSS-FIN*/", css, "/*AYUDA-CSS-INICIO*/")
s = bloque(s, "/*DASH2-JS-INICIO*/", "/*DASH2-JS-FIN*/", js, "/*AYUDA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("dashboard 2 + marketing copiados en admin.html")
