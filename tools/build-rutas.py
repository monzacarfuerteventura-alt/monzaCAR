# Genera /comprar, /taller y /contacto a partir de public/index.html (la misma web, con su propio
# título, descripción y dirección canónica para Google y para cuando se comparte el enlace).
# Se ejecuta solo al final de tools/build-en.py. Si cambias los títulos, cámbialos también en
# META_VISTA dentro de public/index.html (es lo que usa la web al cambiar de sección sin recargar).
import pathlib, re, html

ROOT = pathlib.Path(__file__).resolve().parent.parent / "public"
BASE = "https://volcanocars.com"
RUTAS = {
    "comprar": ("Coches de ocasión en Fuerteventura con 1 año de garantía | Volcano Cars",
                "Coches de segunda mano revisados en nuestro taller de Antigua, con 12 meses de garantía y entrega gratis en toda Fuerteventura. Precios desde 2.500 €."),
    "taller": ("Taller mecánico, chapa y pintura en Antigua, Fuerteventura | Volcano Cars",
               "Pide cita o presupuesto sin compromiso en nuestro taller de Antigua: mecánica, chapa y pintura, pre-ITV. Garantía de reparación y fecha de entrega por escrito."),
    "contacto": ("Contacto y cómo llegar | Volcano Cars, Antigua (Fuerteventura)",
                 "Teléfono, WhatsApp, horario y mapa de Volcano Cars en el Polígono Industrial de Antigua, Fuerteventura."),
}
src = (ROOT / "index.html").read_text(encoding="utf-8")

def sub1(pat, rep, s):
    out, n = re.subn(pat, lambda m: rep, s, count=1)
    if n != 1:
        raise SystemExit(f"ERROR build-rutas: no encuentro {pat}")
    return out

# comprobación: los títulos de aquí y los de la web tienen que coincidir
for k, (t, d) in RUTAS.items():
    if t not in src or d not in src:
        raise SystemExit(f"ERROR build-rutas: el título o la descripción de /{k} no coincide con META_VISTA de index.html")

for k, (t, d) in RUTAS.items():
    s = src
    url = f"{BASE}/{k}"
    s = sub1(r"<title>[^<]*</title>", f"<title>{html.escape(t, quote=False)}</title>", s)
    s = sub1(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(d)}">', s)
    s = sub1(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(t)}">', s)
    s = sub1(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(d)}">', s)
    s = sub1(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', s)
    s = sub1(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', s)
    s = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', "", s)
    # la sección correcta ya visible al cargar (sin parpadeo de la portada)
    s = s.replace('<html lang="es">', f'<html lang="es" data-vista="{k}">', 1)
    d_out = ROOT / k
    d_out.mkdir(exist_ok=True)
    (d_out / "index.html").write_text(s, encoding="utf-8")
print("OK: /comprar, /taller y /contacto generados")
