"""
VOLCANO CARS · Renderiza los clips VFX provisionales del taller.
  python3 tools/taller-vfx/renderizar.py            (todos)
  python3 tools/taller-vfx/renderizar.py frenos itv (solo esos)
  python3 tools/taller-vfx/renderizar.py --webm      (además en WebM)
Salida: public/vfx/taller/<servicio>-<v|h>.mp4 / .webm / .jpg
  v = vertical 720×1280 (móvil) · h = horizontal 1280×720 (ordenador)
  8 s a 24 fps, bucle perfecto, sin audio.
Necesita Playwright (Chromium) y ffmpeg con libx264 y libvpx-vp9.
Cuando tengas los vídeos definitivos (render 3D real), sustituye estos
archivos por los tuyos con el MISMO nombre: la web no cambia.
"""
import asyncio, base64, pathlib, subprocess, sys, time
from playwright.async_api import async_playwright

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "public" / "vfx" / "taller"
ESCENAS = RAIZ / "tools" / "taller-vfx" / "escenas.html"
FPS, N = 24, 192
POSTER_T = {"golpes": 0.3, "pintura": 0.3, "aranazos": 0.45, "frenos": 0.5, "itv": 0.5, "otro": 0.5}
FORMATOS = {"v": (720, 1280), "h": (1280, 720)}
WEBM = "--webm" in sys.argv  # opcional: también .webm (VP9). La web usa .webm solo si existe en VFX_WEBM


def ffmpeg(out, args):
    return subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-", *args, "-an", str(out)], stdin=subprocess.PIPE)


async def main(solo):
    SALIDA.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(ESCENAS.as_uri())
        ks = [k for k in await pg.evaluate("ESCENAS") if not solo or k in solo]
        for o, (w, h) in FORMATOS.items():
            await pg.evaluate(f"preparar({w},{h})")
            for k in ks:
                t0 = time.time()
                mp4 = ffmpeg(SALIDA / f"{k}-{o}.mp4", ["-c:v", "libx264", "-preset", "slow", "-crf", "29", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0", "-g", str(FPS * 2), "-movflags", "+faststart", "-tag:v", "avc1"])
                webm = None if not WEBM else ffmpeg(SALIDA / f"{k}-{o}.webm", ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "43", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-g", str(FPS * 2), "-pix_fmt", "yuv420p"])
                for f in range(N):
                    d = await pg.evaluate(f"fotograma('{k}',{f / N},0.93)")
                    jpg = base64.b64decode(d.split(",", 1)[1])
                    mp4.stdin.write(jpg)
                    if webm: webm.stdin.write(jpg)
                for e in [x for x in (mp4, webm) if x]:
                    e.stdin.close(); e.wait()
                d = await pg.evaluate(f"fotograma('{k}',{POSTER_T.get(k, 0.25)},0.72)")
                (SALIDA / f"{k}-{o}.jpg").write_bytes(base64.b64decode(d.split(",", 1)[1]))
                kb = lambda x: (SALIDA / f"{k}-{o}.{x}").stat().st_size // 1024
                print(f"{k}-{o}: mp4 {kb('mp4')} KB" + (f" · webm {kb('webm')} KB" if WEBM else "") + f" · jpg {kb('jpg')} KB · {time.time() - t0:.0f}s", flush=True)
        await b.close()

asyncio.run(main({a for a in sys.argv[1:] if not a.startswith("--")}))
