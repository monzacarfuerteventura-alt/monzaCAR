# Mete en ayuda.js la lista de vídeos de public/ayuda/videos (<modulo>.mp4 + .jpg + .json con los pasos).
# Los vídeos se graban con el panel real (ver tools/ayuda/README-VIDEOS.md). Después: python3 tools/ayuda/inyectar.py
import json, pathlib, re
R = pathlib.Path(__file__).resolve().parent
V = R.parent.parent / "public" / "ayuda" / "videos"
d = {}
for j in sorted(V.glob("*.json")):
    if (V / (j.stem + ".mp4")).exists():
        d[j.stem] = json.loads(j.read_text(encoding="utf-8"))
p = R / "ayuda.js"; s = p.read_text(encoding="utf-8")
s = re.sub(r"/\*AY_VID\*/.*?/\*AY_VID_FIN\*/", lambda m: "/*AY_VID*/const AY_VID=" + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";/*AY_VID_FIN*/", s, flags=re.S)
p.write_text(s, encoding="utf-8")
print("vídeos:", ", ".join(d) or "ninguno")
