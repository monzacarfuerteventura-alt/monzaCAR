# Voz de Daniela para los vídeos de la Ayuda: mete en tools/voz/voz.js la lista de audios de public/ayuda/voz/<vídeo>/<n>.mp3
# (uno por línea de netlify/lib/guiones.mts) con su huella, para que el navegador nunca sirva uno viejo.
# Después:  python3 tools/voz/inyectar.py   (copia voz.js dentro de public/admin.html)
import json, pathlib, re, hashlib
R = pathlib.Path(__file__).resolve().parent; RAIZ = R.parent.parent
V = RAIZ / "public" / "ayuda" / "voz"
g = (RAIZ / "netlify" / "lib" / "guiones.mts").read_text(encoding="utf-8")
i = g.index("= [", g.index("export const GUIONES")) + 2
depth = 0; fin = None; en = False; esc = False
for k in range(i, len(g)):
    c = g[k]
    if en:
        if esc: esc = False
        elif c == "\\": esc = True
        elif c == '"': en = False
        continue
    if c == '"': en = True
    elif c == "[": depth += 1
    elif c == "]":
        depth -= 1
        if depth == 0: fin = k + 1; break
G = json.loads(g[i:fin]); d = {}
for m in G:
    fs = [V / m["id"] / f"{n}.mp3" for n in range(len(m["lineas"]))]
    if fs and all(f.exists() for f in fs):
        h = hashlib.sha1(b"".join(f.read_bytes() for f in fs)).hexdigest()[:10]
        d[m["id"]] = {"v": h, "dur": m["dur"], "l": [{"t": l["t"], "x": re.sub(r"<[^>]+>", "", l["txt"])} for l in m["lineas"]]}
p = R / "voz.js"; s = p.read_text(encoding="utf-8")
s = re.sub(r"/\*AY_VOZ\*/.*?/\*AY_VOZ_FIN\*/", lambda m: "/*AY_VOZ*/const AY_VOZ=" + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";/*AY_VOZ_FIN*/", s, flags=re.S)
p.write_text(s, encoding="utf-8")
print("vídeos con voz de Daniela:", ", ".join(d) or "ninguno")
