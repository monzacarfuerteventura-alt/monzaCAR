import { chromium, montar, loginGerente } from "./harness2.mjs";
import fs from "fs"; import { execSync } from "child_process";
const OVERLAY = `(() => { const inst = () => { if (window.__dz || !document.body) return;
const css = document.createElement('style'); css.textContent = \`
#dz-cur{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transition:transform .7s cubic-bezier(.3,.7,.2,1);filter:drop-shadow(0 3px 6px rgba(0,0,0,.45))}
#dz-cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147483646;pointer-events:none;max-width:min(88vw,900px);background:rgba(18,18,18,.94);color:#fff;border:2px solid #D94A26;border-radius:18px;padding:14px 22px;font:700 clamp(15px,2.1vw,22px)/1.35 system-ui,sans-serif;display:flex;gap:14px;align-items:center;box-shadow:0 14px 40px rgba(0,0,0,.45);opacity:0;transition:opacity .25s}
#dz-cap b{background:#D94A26;border-radius:10px;padding:4px 10px;font-size:.85em;white-space:nowrap}
.dz-rip{position:fixed;z-index:2147483646;pointer-events:none;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:3px solid #FF8A5C;animation:dzr .6s ease-out forwards}
@keyframes dzr{to{transform:scale(3.4);opacity:0}}
.dz-hl{position:fixed;z-index:2147483645;pointer-events:none;border:3px solid #FF8A5C;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.35);transition:all .4s}
#dz-card{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(60% 60% at 80% 0%,rgba(217,74,38,.45),transparent 60%),#121212;color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-family:system-ui,sans-serif;gap:14px;padding:24px}
#dz-card small{font:700 13px/1 system-ui;letter-spacing:4px;color:#FF8A5C;text-transform:uppercase}
#dz-card h1{font:900 clamp(30px,6vw,64px)/1 system-ui;text-transform:uppercase;margin:0;letter-spacing:-1px}
@media(max-width:600px){#dz-cap{width:88vw;bottom:18px;padding:12px 16px}}
#dz-card p{font:500 clamp(15px,2.2vw,22px)/1.4 system-ui;color:rgba(255,255,255,.8);margin:0;max-width:700px}
#dz-card .ok{width:90px;height:90px;border-radius:50%;background:#16794A;display:grid;place-items:center;font-size:52px}\`;
document.documentElement.appendChild(css);
const cur = document.createElement('div'); cur.id='dz-cur';
cur.innerHTML='<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l16 9-7 2 4 8-3 1.5-4-8-6 5z" fill="#fff" stroke="#121212" stroke-width="1.5" stroke-linejoin="round"/></svg>';
cur.style.transform='translate(60vw,60vh)'; document.documentElement.appendChild(cur);
const cap = document.createElement('div'); cap.id='dz-cap'; document.documentElement.appendChild(cap);
setInterval(()=>{ try{ const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ const v=n.nodeValue; if(v&&v.indexOf('localhost:88')>-1) n.nodeValue=v.split('http://localhost:8888').join('https://volcanocars.com').split('http://localhost:8889').join('https://volcanocars.com'); } }catch(_){ } },250);
window.__dz = {
  move(x,y){ cur.style.transform=\`translate(\${x-4}px,\${y-2}px)\`; },
  rip(x,y){ const r=document.createElement('div'); r.className='dz-rip'; r.style.left=x+'px'; r.style.top=y+'px'; document.documentElement.appendChild(r); setTimeout(()=>r.remove(),700); },
  cap(n,t){ cap.innerHTML=(n?'<b>'+n+'</b>':'')+'<span>'+t+'</span>'; cap.style.opacity=t?1:0; },
  hl(r){ document.querySelectorAll('.dz-hl').forEach(e=>e.remove()); if(!r) return; const d=document.createElement('div'); d.className='dz-hl'; Object.assign(d.style,{left:(r.x-6)+'px',top:(r.y-6)+'px',width:(r.w+12)+'px',height:(r.h+12)+'px'}); document.documentElement.appendChild(d); },
  card(html){ let c=document.getElementById('dz-card'); if(!html){ c&&c.remove(); return; } if(!c){ c=document.createElement('div'); c.id='dz-card'; document.documentElement.appendChild(c);} c.innerHTML=html; }
}; };
if (document.body) inst(); else document.addEventListener('DOMContentLoaded', inst);
})();`;
const DRY = !!process.env.FAST; const FAST = DRY ? 0.04 : 1; const OUT = process.env.VIDDIR || "/tmp/vid2";
const sleep = (ms) => new Promise(r => setTimeout(r, Math.round(ms * FAST)));
export async function grabar(nombre, { width = 1280, height = 800, movil = false, gerente = true, preparar } = {}, guion) {
  fs.mkdirSync(OUT, { recursive: true }); const dir = `${OUT}/${nombre}`; fs.rmSync(dir, { recursive: true, force: true });
  const b = await chromium.launch();
  const scale = movil ? 2 : 1;
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: movil, hasTouch: movil,
    userAgent: movil ? "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36" : undefined,
    recordVideo: { dir, size: { width: width * scale, height: height * scale } } });
  const tStart = Date.now();
  await montar(ctx); await ctx.addInitScript(OVERLAY);
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); p.on('dialog', d => d.accept().catch(() => {})); p.on('pageerror', e => console.log(nombre, "PAGEERR", e.message));
  if (preparar) await preparar(p); else if (gerente) await loginGerente(p);
  await p.evaluate(OVERLAY);
  let tIntro = 0, paso = 0, total = 0; const caps = [];
  const api = {
    p, sleep,
    async intro(titulo, sub, pasos) { total = pasos; await p.evaluate(OVERLAY); tIntro = Date.now() - tStart;
      await p.evaluate(([t, s]) => __dz.card(`<small>Ayuda · Volcano Cars</small><h1>${t}</h1><p>${s}</p>`), [titulo, sub]); await sleep(2600); await p.evaluate(() => __dz.card(null)); await sleep(300); },
    async paso(t, ms = 1600) { paso++; caps.push({ t: Math.max(0, +((Date.now() - tStart - tIntro) / 1000 - 0.4).toFixed(1)), txt: t }); await p.evaluate(([n, t]) => __dz.cap(n, t), [`${paso}/${total}`, t]); await sleep(ms); },
    async paso2(txt, voz, fn) { paso++; const t0 = Date.now();
      caps.push({ t: Math.max(0, +((Date.now() - tStart - tIntro) / 1000 - 0.3).toFixed(1)), txt, voz });
      await p.evaluate(([n, t]) => __dz.cap(n, t), [`${paso}/${total}`, txt]);
      if (fn) { try { await fn(); } catch (e) { console.log(nombre, "paso", paso, "FALLO:", String(e.message).split("\n")[0].slice(0, 160)); } }
      const palabras = String(voz || txt).trim().split(/\s+/).length;
      const quiero = Math.max(2200, palabras / 2.15 * 1000 + 700) / (FAST ? 1 : 1);
      const falta = quiero - (Date.now() - t0) / (FAST ? 1 : 1) * 1; if (!DRY && falta > 0) await new Promise(r => setTimeout(r, falta));
      if (DRY) { try { await p.screenshot({ path: `${OUT}/${nombre}-p${String(paso).padStart(2, "0")}.png` }); } catch (_) {} }
    },
    async cerrarAvisos() { await p.evaluate(() => { document.querySelectorAll("dialog[open]").forEach(d => d.close()); }); },
    async nota(t, ms = 1800) { await p.evaluate((t) => __dz.cap('', t), t); await sleep(ms); },
    async box(sel) { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded().catch(() => {}); const r = await el.boundingBox(); return r; },
    async mover(sel) { const r = await api.box(sel); if (!r) throw new Error("no encuentro " + sel); const x = r.x + r.width / 2, y = r.y + r.height / 2; await p.evaluate(([x, y]) => __dz.move(x, y), [x, y]); await sleep(750); return { x, y, r }; },
    async click(sel, espera = 700) { const { x, y } = await api.mover(sel); await p.evaluate(([x, y]) => __dz.rip(x, y), [x, y]); await sleep(150); await p.locator(sel).first().click(); await sleep(espera); await p.evaluate(OVERLAY); },
    async escribir(sel, texto, espera = 300) { await api.click(sel, 150); await p.locator(sel).first().fill(""); await p.locator(sel).first().pressSequentially(texto, { delay: 45, timeout: 40000 }); await sleep(espera); },
    async elegir(sel, valor) { await api.mover(sel); await p.locator(sel).first().selectOption(valor); await sleep(500); },
    async resaltar(sel, ms = 1600) { const r = await api.box(sel); if (r) await p.evaluate((r) => __dz.hl(r), { x: r.x, y: r.y, w: r.width, h: r.height }); await sleep(ms); await p.evaluate(() => __dz.hl(null)); },
    async fin(t = "Listo") { await p.evaluate(() => __dz.cap('', '')); await p.evaluate((t) => __dz.card(`<div class="ok">✓</div><h1>${t}</h1><p>¿Dudas? Vuelve a ver este vídeo en la pestaña Ayuda.</p>`), t); await sleep(2200); },
  };
  try { await guion(api); } catch (e) { console.log(nombre, "ERROR GUION", e.message); await p.screenshot({ path: `${OUT}/${nombre}-error.png` }); }
  const v = await p.video().path(); await ctx.close(); await b.close();
  if (DRY) { console.log(nombre, 'FAST ok', paso, 'pasos'); return; }
  const out = `${OUT}/${nombre}.mp4`; const ss = Math.max(0, (tIntro - 150) / 1000);
  const W = movil ? 540 : 1280;
  execSync(`ffmpeg -y -loglevel error -ss ${ss} -i ${v} -vf "${movil ? "crop=iw/2:ih/2:0:0," : ""}scale=${W}:-2:flags=lanczos,fps=25" -c:v libx264 -preset medium -crf 33 -pix_fmt yuv420p -movflags +faststart -an ${out}`);
  execSync(`ffmpeg -y -loglevel error -ss 1.2 -i ${out} -frames:v 1 -vf scale=640:-2 -q:v 4 ${OUT}/${nombre}.jpg`);
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${out}`).toString().trim();
  fs.writeFileSync(`${OUT}/${nombre}.json`, JSON.stringify({ dur: +(+dur).toFixed(1), movil, pasos: caps }));
  console.log(nombre, "→", out, Math.round(fs.statSync(out).size / 1024), "KB", dur, "s");
}
