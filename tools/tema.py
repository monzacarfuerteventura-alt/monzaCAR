# TEMA «HIGH-TECH» PARA TODA LA WEB Y EL PANEL
# ---------------------------------------------------------------------------------
# La web y el panel ya tenían un modo oscuro completo que solo se activaba si el
# móvil/ordenador estaba en modo oscuro. Este script lo deja SIEMPRE activo y
# añade las hojas del tema nuevo:
#   · /tema.css        → web pública, páginas de pueblos/servicios, fichas, legales, seguimiento
#   · /tema-admin.css  → panel (con su versión clara para imprimir)
# Es idempotente: se puede ejecutar las veces que haga falta.
# Se ejecuta solo desde tools/build-en.py (antes de generar inglés y rutas).
import pathlib, re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PUB = RAIZ / "public"
OSCURO = re.compile(r"@media\s*\(prefers-color-scheme:\s*dark\)\s*\{")

def oscuro_siempre(t: str) -> str:
    return OSCURO.sub("@media all{", t)

def enlazar(t: str, hoja: str) -> str:
    tag = f'<link rel="stylesheet" href="/{hoja}">'
    if tag in t or "</head>" not in t:
        return t
    return t.replace("</head>", tag + "\n</head>", 1)

def letra_tecnica(t: str) -> str:
    # añade Titillium Web (letra técnica del tema) al enlace de Google Fonts si falta
    return re.sub(r'(https://fonts\.googleapis\.com/css2\?family=Archivo[^"]*?)(&display=swap)',
                  lambda m: m.group(0) if "Titillium" in m.group(1) else m.group(1) + "&family=Titillium+Web:wght@600;700" + m.group(2), t)

def color_barra(t: str) -> str:
    return re.sub(r'<meta name="theme-color" content="[^"]*">', '<meta name="theme-color" content="#121212">', t)

cambiados = []
def guardar(f: pathlib.Path, nuevo: str, viejo: str):
    if nuevo != viejo:
        f.write_text(nuevo, encoding="utf-8")
        cambiados.append(str(f.relative_to(RAIZ)))

# 1) HTML de la web (la portada en español es la fuente del inglés y de /comprar, /taller, /contacto)
for f in list(PUB.glob("*.html")) + list(PUB.glob("*/index.html")):
    t = f.read_text(encoding="utf-8"); v = t
    t = oscuro_siempre(t)
    t = color_barra(t)
    t = letra_tecnica(t)
    t = enlazar(t, "tema-admin.css" if f.name == "admin.html" else "tema.css")
    guardar(f, t, v)

# 2) hojas de estilo y fuentes que se inyectan o generan páginas
for f in [PUB / "paginas.css", *RAIZ.glob("tools/*/*.css"), RAIZ / "tools/legal.py"]:
    if f.exists():
        t = f.read_text(encoding="utf-8"); v = t
        t = oscuro_siempre(t)
        if f.suffix == ".py":
            t = letra_tecnica(t)
            t = t.replace('<meta name="theme-color" content="#1B1B1A">', '<meta name="theme-color" content="#121212">')
            if "/tema.css" not in t and "</head>" in t:
                t = t.replace("</head>", '<link rel="stylesheet" href="/tema.css">\n</head>', 1)
        guardar(f, t, v)

print("OK tema:", ", ".join(cambiados) if cambiados else "sin cambios")
