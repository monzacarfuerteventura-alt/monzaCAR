# Copia la voz de DAN (tools/voz/voz.js y voz.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa:  python3 tools/voz/inyectar.py
# (después de tools/ayuda/inyectar.py: la voz se engancha a la Ayuda)
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "voz.css").read_text(encoding="utf-8")
js = (R / "voz.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*VOZ-CSS-INICIO*/", "/*VOZ-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*VOZ-JS-INICIO*/", "/*VOZ-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("voz de DAN copiada en admin.html")
