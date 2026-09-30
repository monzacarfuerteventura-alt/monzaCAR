# Voz de DAN en la pestaña Ayuda, en el navegador (escritorio y móvil 390 px), con un ElevenLabs de mentira.
# Uso:  python3 tools/pruebas/e2e-voz-panel.py   (arranca solo el ElevenLabs falso y el servidor de pruebas)
import sys, os, subprocess, time, threading, json, pathlib, http.server
from playwright.sync_api import sync_playwright
RAIZ = pathlib.Path(__file__).resolve().parents[2]
BASE = "http://localhost:8890"; CLAVE = "clave-de-pruebas-larga-2026"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-voz"); OUT.mkdir(parents=True, exist_ok=True)
ok = 0; mal = []
def check(n, c, x=""):
    global ok
    if c: ok += 1; print("  ✔", n)
    else: mal.append(n + " " + x); print("  ✘", n, x)
# --- ElevenLabs de mentira: devuelve un MP3 corto (ffmpeg) ---
TONO = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=330:duration=0.9", "-ar", "44100", "-b:a", "128k", "-f", "mp3", "-"], capture_output=True).stdout
PEDIDOS = []
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        PEDIDOS.append(("GET", self.path)); b = json.dumps({"voices": [{"voice_id": "vDAN", "name": "DAN"}]}).encode()
        self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        n = int(self.headers.get("content-length", 0)); body = json.loads(self.rfile.read(n) or b"{}"); PEDIDOS.append(("POST", self.path, body))
        self.send_response(200); self.send_header("content-type", "audio/mpeg"); self.end_headers(); self.wfile.write(TONO)
fake = http.server.ThreadingHTTPServer(("127.0.0.1", 8899), H); threading.Thread(target=fake.serve_forever, daemon=True).start()
env = {**os.environ, "PUERTO": "8890", "ELEVENLABS_API_BASE": "http://127.0.0.1:8899"}
srv = subprocess.Popen(["bun", "tools/pruebas/servidor-local.mjs"], cwd=RAIZ, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)
def api(page, m, r, t, b=None):
    return page.evaluate("""async ([m,r,t,b])=>{const x=await fetch(r,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+t},body:b?JSON.stringify(b):undefined});return {s:x.status,d:await x.json().catch(()=>({}))}}""", [m, r, t, b])
try:
  with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    for i, (nombre, vp, mod) in enumerate([("escritorio", {"width": 1366, "height": 900}, "inicio"), ("movil", {"width": 390, "height": 800}, "dash")]):
        print("\n==", nombre)
        ctx = b.new_context(viewport=vp, has_touch=(nombre == "movil"), accept_downloads=True); page = ctx.new_page(); errores = []
        page.on("pageerror", lambda e: errores.append(str(e)))
        page.on("console", lambda m: errores.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "favicon" not in m.text and "fonts.g" not in m.text and "404" not in m.text else None)
        page.add_init_script("""window.__audios=[]; const _A=window.Audio; window.Audio=function(u){ const a=new _A(u); window.__audios.push(a); return a; }; window.Audio.prototype=_A.prototype;""")
        page.goto(BASE + "/admin"); page.wait_for_selector("#login-form")
        if page.is_visible("#f-eq"): page.click("#login-modo")
        page.fill("#pw", CLAVE); page.click("#login-btn"); page.wait_for_selector("#s-dash:not([hidden])", timeout=15000)
        page.evaluate(f"ayAbrir('{mod}')"); page.wait_for_selector("#vz", timeout=10000)
        LIN = page.evaluate(f"VZ.modulos['{mod}'].lineas"); NL = len(LIN)
        check("la Ayuda enseña el bloque «Voz de DAN»", page.is_visible("#vz"))
        check("sin voz todavía: el gerente ve el botón de generar", page.locator(f'[data-vzgen="{mod}"]').count() == 1 and page.locator("#vz-on").count() == 0)
        check(f"el guion se puede leer ({NL} frases del vídeo)", page.locator("#vz .vz-g li").count() == NL)
        page.screenshot(path=str(OUT / f"{nombre}-1-sin-voz.png"), full_page=True)
        page.click(f'[data-vzgen="{mod}"]'); page.wait_for_selector("#vz-on", timeout=30000)
        check("genera la voz: aparece el interruptor", page.is_checked("#vz-on"))
        posts = [x for x in PEDIDOS if x[0] == "POST"]
        check(f"{NL} peticiones a ElevenLabs con el modelo y los ajustes pedidos", len(posts) >= NL and all(x[2]["model_id"] == "eleven_multilingual_v2" and x[2]["voice_settings"] == {"stability": 0.5, "similarity_boost": 0.8} for x in posts[-NL:]), str(posts[-1:]))
        check("usa la voz encontrada por nombre (DAN)", any("/text-to-speech/vDAN" in x[1] for x in posts))
        check("el rótulo del vídeo dice «con voz de DAN»", "con voz de DAN" in page.inner_text("#s-ayuda .ay-vh"))
        # el navegador de pruebas no reproduce H.264: se simula el reloj del vídeo
        page.evaluate("""()=>{ const v=document.querySelector('#ay-v'); window.__T=0; Object.defineProperty(v,'currentTime',{get:()=>window.__T,set:x=>{window.__T=x},configurable:true}); Object.defineProperty(v,'paused',{get:()=>false,configurable:true}); window.__tick=t=>{ window.__T=t; v.dispatchEvent(new Event('timeupdate')); }; }""")
        page.wait_for_timeout(600)
        page.evaluate("window.__audios.length=0")
        for t in [l["t"] + 0.1 for l in LIN[:3]]:
            page.evaluate(f"__tick({t})"); page.wait_for_timeout(1300)
        n = page.evaluate("window.__audios.length"); check("suenan las 3 primeras frases a su tiempo", n == 3, str(n))
        page.evaluate(f"__tick({LIN[2]['t'] + 0.15})"); page.wait_for_timeout(300); check("un mismo momento no repite la frase", page.evaluate("window.__audios.length") == 3)
        page.evaluate(f"window.__T={LIN[-1]['t']}; document.querySelector('#ay-v').dispatchEvent(new Event('seeking')); __tick({LIN[-1]['t'] + 0.2})"); page.wait_for_timeout(700)
        check("al saltar al último paso suena solo esa frase", page.evaluate("window.__audios.length") == 4, str(page.evaluate("window.__audios.length")))
        page.click("#vz-on", force=True); check("el interruptor se apaga", not page.is_checked("#vz-on") and "sin sonido" in page.inner_text("#s-ayuda .ay-vh"))
        page.evaluate("__tick(0.4)"); page.wait_for_timeout(500); check("apagado: no suena nada más", page.evaluate("window.__audios.length") == 4)
        page.click("#vz-on", force=True)
        with page.expect_download(timeout=15000) as dl: page.click(f'[data-vzdl="{mod}"]')
        d = dl.value; ruta = OUT / d.suggested_filename; d.save_as(str(ruta))
        check("descarga el MP3 entero", d.suggested_filename == f"volcano-cars-{mod}-voz-dan.mp3" and ruta.stat().st_size > NL * 3000, str(ruta.stat().st_size))
        page.screenshot(path=str(OUT / f"{nombre}-2-con-voz.png"), full_page=True)
        # otros vídeos: cambian de guion
        page.click('[data-aymod="agenda"]'); page.wait_for_selector("#vz .vz-g li", state="attached"); check("Agenda: su guion propio (5 frases) y aún sin voz", page.locator("#vz .vz-g li").count() == 5 and page.locator("#vz-on").count() == 0)
        ancho = page.evaluate("document.documentElement.scrollWidth"); check("sin scroll horizontal", ancho <= vp["width"] + (0 if nombre == "escritorio" else 60), str(ancho))
        check("sin errores de consola", not errores, str(errores[:3])); ctx.close()
    # equipo: solo escucha
    ctx = b.new_context(viewport={"width": 390, "height": 800}); page = ctx.new_page()
    page.goto(BASE + "/admin"); page.wait_for_selector("#login-form"); page.fill("#pw", CLAVE); page.click("#login-btn"); page.wait_for_selector("#s-dash:not([hidden])")
    tok = page.evaluate("PW"); api(page, "POST", "/api/taller/equipo", tok, {"nombre": "Pedro", "usuario": "pedro", "pin": "445566", "rol": "mecanico"})
    page.click("#logout"); page.wait_for_selector("#login-form")
    if not page.is_visible("#f-eq"): page.click("#login-modo")
    page.fill("#eq-u", "pedro"); page.fill("#eq-p", "445566"); page.click("#login-btn")
    page.wait_for_selector("#j-fichar .j-big", timeout=15000); page.wait_for_timeout(1500)
    for _ in range(4):  # ficha la entrada (sin jornada el panel del equipo no deja ir a otras pantallas)
        if page.evaluate("J&&J.estado")=="trabajando": break
        try: page.click('[data-jacc="entrada"]', timeout=3000)
        except Exception: pass
        page.wait_for_timeout(1500)
    page.evaluate("ayAbrir('inicio')"); page.wait_for_selector("#vz", timeout=10000)
    check("el equipo ve el interruptor (inicio ya tiene voz) y ningún botón de generar", page.locator("#vz-on").count() == 1 and page.locator("[data-vzgen]").count() == 0)
    ctx.close(); b.close()
finally:
    srv.terminate(); fake.shutdown()
print(f"\nRESULTADO: {ok} correctas · {len(mal)} fallidas")
if mal: print("\n".join(mal)); sys.exit(1)
