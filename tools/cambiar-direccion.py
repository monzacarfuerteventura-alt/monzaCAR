# Cambia la dirección de la web en todos los archivos (canonical, sitemap, Google, redes).
# Uso:  python3 tools/cambiar-direccion.py lestter5th.netlify.app monzacar-antigua.netlify.app
import pathlib, sys
if len(sys.argv) != 3:
    sys.exit("Uso: python3 tools/cambiar-direccion.py DIRECCION_VIEJA DIRECCION_NUEVA")
vieja, nueva = sys.argv[1], sys.argv[2]
raiz = pathlib.Path(__file__).resolve().parent.parent
for f in [*raiz.glob("public/**/*.html"), raiz / "public/sitemap.xml", raiz / "public/robots.txt", raiz / "tools/build-en.py", raiz / "LEEME.md"]:
    t = f.read_text(encoding="utf-8")
    if vieja in t:
        f.write_text(t.replace(vieja, nueva), encoding="utf-8")
        print("cambiado:", f.relative_to(raiz))
