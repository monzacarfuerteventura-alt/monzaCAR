import pathlib, subprocess, re
# Regenera el CSS en línea de la portada. Ejecutar desde la raíz del proyecto:  python3 tools/pagespeed/inline-css.py  (necesita bun)
R = pathlib.Path(__file__).resolve().parent.parent.parent / "public"
css = ""
for n in ("taller", "conversion", "mejoras", "tema"):
    out = f"/tmp/inl_{n}.css"
    subprocess.run(["bun", "build", str(R/f"{n}.css"), "--minify", "--outfile", out], check=True, capture_output=True)
    css += open(out, encoding="utf-8").read().strip() + "\n"
assert "</style" not in css.lower()
bloque = "<!--CSS-INICIO--><style id=\"vc-css\">" + css + "</style><!--CSS-FIN-->"
links = ['<link rel="stylesheet" href="/taller.css">\n', '<link rel="stylesheet" href="/conversion.css">\n', '<link rel="stylesheet" href="/mejoras.css">\n', '<link rel="stylesheet" href="/tema.css">\n']
for p in (R/"index.html", R/"en/index.html", R/"comprar/index.html", R/"taller/index.html"):
    t = p.read_text(encoding="utf-8")
    if "<!--CSS-INICIO-->" in t: t = re.sub(r"<!--CSS-INICIO-->.*?<!--CSS-FIN-->", lambda m: bloque, t, flags=re.S)
    else:
        seq = "".join(links)
        assert seq in t, p
        t = t.replace(seq, bloque + "\n", 1)
    p.write_text(t, encoding="utf-8"); print(p.name, len(t))
