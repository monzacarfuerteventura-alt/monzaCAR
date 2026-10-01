"""
VOLCANO CARS · Render de los clips 3D del taller en CÁMARA LENTA DE CINE (motor propio WebGL2, fotograma a fotograma).
  python3 tools/taller-vfx/3d/renderizar3d.py                 (todos)
  python3 tools/taller-vfx/3d/renderizar3d.py frenos pintura  (solo esos)
Cada fotograma = media de N subfotogramas (desenfoque de movimiento real, profundidad de campo, sombras suaves).
Se renderiza UN máster cuadrado por servicio y de él salen las dos versiones:
  horizontal 16:9 (ordenador) y vertical 9:16 (móvil), a 1024x576 / 576x1024 nativos, en AV1 (.webm, la más ligera) y H.264 (.mp4, para todos).
Se puede cortar y volver a lanzar: continúa donde se quedó (los fotogramas hechos se guardan en tools/taller-vfx/3d/.fotogramas).
"""
import asyncio, base64, os, pathlib, subprocess, sys, time
from playwright.async_api import async_playwright
RAIZ = pathlib.Path(__file__).resolve().parents[3]
SAL = RAIZ / "public" / "vfx" / "taller"
HTML = RAIZ / "tools" / "taller-vfx" / "3d" / "render.html"
TMP = pathlib.Path(os.environ.get("VFX_TMP", RAIZ / "tools" / "taller-vfx" / "3d" / ".fotogramas"))
S = int(os.environ.get("VFX_LADO", 1024))       # lado del máster cuadrado
NF = int(os.environ.get("VFX_NF", 192))         # fotogramas por bucle (8 s a 24 fps)
N = int(os.environ.get("VFX_SUB", 6))           # subfotogramas por fotograma
FPS = 24
ORDEN = ["frenos", "golpes", "pintura", "aranazos", "aceite", "neumaticos", "diagnosis", "itv", "aire", "distribucion", "bateria", "otro"]
POSTER = {"frenos": 0.3, "golpes": 0.3, "pintura": 0.35, "aranazos": 0.45, "aceite": 0.4, "neumaticos": 0.3, "diagnosis": 0.4, "itv": 0.45, "aire": 0.4, "distribucion": 0.3, "bateria": 0.25, "otro": 0.5}
# desplazamiento horizontal del recorte vertical (fracción del lado, 0 = centrado) por si la acción no está en el centro
CX_V = {"frenos": 0.05, "neumaticos": 0.12, "bateria": 0.04, "aceite": 0.08, "distribucion": 0.04, "pintura": 0.15, "aire": 0.06, "otro": 0.08}
# desplazamiento vertical del recorte horizontal (positivo = más abajo)
CY_H = {"frenos": -0.12, "neumaticos": -0.16, "bateria": -0.08, "aceite": -0.06, "itv": -0.06, "distribucion": -0.13, "golpes": -0.06, "pintura": -0.06, "aranazos": -0.06, "diagnosis": -0.04, "aire": -0.06, "otro": -0.06}

async def fotogramas(claves):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = await b.new_page(); pg.on("pageerror", lambda e: print("ERROR JS:", e, flush=True))
        await pg.goto(HTML.as_uri()); await pg.evaluate(f"preparar({S},{S})")
        for k in claves:
            d = TMP / k; d.mkdir(parents=True, exist_ok=True); t0 = time.time(); hechos = 0
            for f in range(NF):
                out = d / f"{f:04d}.jpg"
                if out.exists() and out.stat().st_size > 5000: continue
                data = await pg.evaluate(f"fotograma('{k}',{f / NF},0.97,{N},{NF})")
                tmp = out.with_suffix(".part"); tmp.write_bytes(base64.b64decode(data.split(",", 1)[1])); tmp.rename(out); hechos += 1
                if hechos % 12 == 0: print(f"  {k}: {f + 1}/{NF} · {(time.time() - t0) / hechos:.1f} s/fotograma", flush=True)
            print(f"{k}: fotogramas listos ({time.time() - t0:.0f} s)", flush=True)
            if os.environ.get("VFX_CODIFICAR", "1") != "0": codificar(k)
        await b.close()

def ff(*a): subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *map(str, a)], check=True)

def codificar(k):
    """Recorta el máster cuadrado en horizontal (16:9) y vertical (9:16) a su tamaño nativo (sin reescalar: el navegador
    ya lo amplía con object-fit, y así el vídeo pesa ~35 % menos) y lo codifica en AV1 y H.264."""
    SAL.mkdir(parents=True, exist_ok=True)
    c = S * 9 // 16 // 2 * 2
    cx = max(0, min(S - c, int((S - c) / 2 + CX_V.get(k, 0) * S)))
    cy = max(0, min(S - c, int((S - c) / 2 + CY_H.get(k, 0) * S)))
    recortes = {"h": f"crop={S}:{c}:0:{cy}", "v": f"crop={c}:{S}:{cx}:0"}
    ent = ["-framerate", FPS, "-i", TMP / k / "%04d.jpg"]
    for o, vf in recortes.items():
        base = SAL / f"{k}-{o}"
        # H.264 (lo reproduce cualquier navegador): fotograma clave cada 2 s, arranque rápido
        ff(*ent, "-vf", vf + ",format=yuv420p", "-c:v", "libx264", "-preset", "veryslow", "-crf", os.environ.get("VFX_CRF264", "28"), "-tune", "film",
           "-profile:v", "high", "-level", "4.0", "-g", 48, "-bf", 3, "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-tag:v", "avc1", "-an", f"{base}.mp4")
        # AV1 10 bits (Chrome, Edge, Firefox, Android, iPhone 15 Pro+): ~35 % menos que H.264 y sin bandas en los degradados oscuros
        ff(*ent, "-vf", vf + ",format=yuv420p10le", "-c:v", "libsvtav1", "-preset", os.environ.get("VFX_PRESETAV1", "4"), "-crf", os.environ.get("VFX_CRFAV1", "42"), "-g", 96,
           "-svtav1-params", "tune=0:enable-overlays=1:scd=0", "-pix_fmt", "yuv420p10le", "-an", f"{base}.webm")
        fp = int(POSTER.get(k, 0.3) * NF)
        ff("-i", TMP / k / f"{fp:04d}.jpg", "-vf", vf, "-q:v", "4", f"{base}.jpg")
        kb = lambda x: (SAL / x).stat().st_size // 1024
        print(f"  {k}-{o}: mp4 {kb(f'{k}-{o}.mp4')} KB · webm {kb(f'{k}-{o}.webm')} KB · jpg {kb(f'{k}-{o}.jpg')} KB", flush=True)

if __name__ == "__main__":
    claves = sys.argv[1:] or ORDEN
    if claves[0] == "--solo-codificar": [codificar(k) for k in (claves[1:] or ORDEN)]
    else: asyncio.run(fotogramas(claves))
