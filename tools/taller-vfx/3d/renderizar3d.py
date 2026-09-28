"""
VOLCANO CARS · Render de los 12 clips 3D del taller (motor propio WebGL2, fotograma a fotograma).
  python3 tools/taller-vfx/3d/renderizar3d.py h        (horizontal 1280x720)
  python3 tools/taller-vfx/3d/renderizar3d.py v frenos (vertical, solo frenos)
Salida: public/vfx/taller/<servicio>-<v|h>.mp4 + .jpg · 8 s, 24 fps, bucle perfecto.
"""
import asyncio, base64, pathlib, subprocess, sys, time
from playwright.async_api import async_playwright
RAIZ = pathlib.Path(__file__).resolve().parents[3]
SAL = RAIZ / "public" / "vfx" / "taller"
HTML = RAIZ / "tools" / "taller-vfx" / "3d" / "render.html"
FPS, N = 24, 192
o = sys.argv[1]; solo = set(sys.argv[2:])
W, H = (1280, 720) if o == "h" else (720, 1280)
POSTER = {"golpes": 0.62, "pintura": 0.3, "aranazos": 0.45, "frenos": 0.45, "itv": 0.45, "otro": 0.5, "diagnosis": 0.4}
async def main():
    SAL.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = await b.new_page(); await pg.goto(HTML.as_uri()); await pg.evaluate(f"preparar({W},{H})")
        for k in [k for k in await pg.evaluate("ESCENAS()") if not solo or k in solo]:
            t0 = time.time(); out = SAL / f"{k}-{o}.mp4"
            ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0", "-g", "48", "-movflags", "+faststart", "-tag:v", "avc1", "-an", str(out)], stdin=subprocess.PIPE)
            for f in range(N):
                d = await pg.evaluate(f"fotograma('{k}',{f / N},0.94)"); ff.stdin.write(base64.b64decode(d.split(",", 1)[1]))
            ff.stdin.close(); ff.wait()
            d = await pg.evaluate(f"fotograma('{k}',{POSTER.get(k, 0.3)},0.74)"); (SAL / f"{k}-{o}.jpg").write_bytes(base64.b64decode(d.split(",", 1)[1]))
            print(f"{k}-{o}: {out.stat().st_size // 1024} KB · {time.time() - t0:.0f}s", flush=True)
        await b.close()
asyncio.run(main())
