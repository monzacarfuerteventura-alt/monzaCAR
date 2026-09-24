# Copia el módulo de Finanzas (tools/finanzas/finanzas.js y finanzas.css) dentro de public/admin.html.
# Ejecuta después de cambiar cualquier cosa de finanzas:  python3 tools/finanzas/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "finanzas.css").read_text(encoding="utf-8")
js = (R / "finanzas.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*FINANZAS-CSS-INICIO*/", "/*FINANZAS-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*FINANZAS-JS-INICIO*/", "/*FINANZAS-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")
ADMIN.write_text(s, encoding="utf-8")
print("finanzas copiadas en admin.html")
