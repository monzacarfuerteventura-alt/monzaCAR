#!/usr/bin/env python3
"""Genera CLAUDE-INDICE.md: inventario de TODO el codigo (archivo, tamano, para que sirve, rutas, almacenes, funciones exportadas).
Uso: python3 tools/indice.py   (desde la raiz del repositorio). Claude lo ejecuta al final de cada actualizacion."""
import os, re, sys, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p):
    try: return open(os.path.join(R, p), encoding="utf-8", errors="replace").read()
    except Exception: return ""
def lineas(t): return t.count("\n") + 1 if t else 0
def cabecera(t, n=420):
    m = re.search(r"/\*+(.*?)\*/", t[:6000], re.S)
    if m: s = m.group(1)
    else:
        ls = []
        for l in t.split("\n")[:25]:
            if l.strip().startswith("//"): ls.append(l.strip().lstrip("/").strip())
            elif ls: break
        s = " ".join(ls)
    s = re.sub(r"[=\-_*]{3,}", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return (s[:n] + "…") if len(s) > n else s
def lista(files):
    return [f for f in sorted(files)]
def walk(base, exts):
    out = []
    for d, _, fs in os.walk(os.path.join(R, base)):
        for f in fs:
            if f.endswith(exts): out.append(os.path.relpath(os.path.join(d, f), R).replace("\\", "/"))
    return sorted(out)
o = []
o.append("# CLAUDE-INDICE.md · Inventario completo del código (GENERADO, no editar a mano)\n")
o.append(f"Generado con `python3 tools/indice.py` el {datetime.date.today().isoformat()}. Lo lee Claude junto a `CLAUDE.md`. "
         "Contiene qué hace cada archivo, sus rutas, almacenes de datos y funciones exportadas; para ver el código exacto, abrir el archivo.\n")
tot = 0
# ---- funciones
o.append("\n## 1. Funciones de servidor (`netlify/functions`)\n")
for f in walk("netlify/functions", (".mts", ".ts")):
    t = rd(f); tot += lineas(t)
    path = re.search(r"path:\s*(\[[^\]]*\]|\"[^\"]*\")", t)
    sch = re.search(r"schedule:\s*\"([^\"]+)\"", t)
    st = sorted(set(re.findall(r"store\(\"([a-z0-9-]+)\"\)", t)))
    env = sorted(set(re.findall(r"\b([A-Z][A-Z0-9]+_[A-Z0-9_]{2,})\b", t)) - {"CHECKOUT_SESSION_ID"})
    env = [e for e in env if re.search(r"KEY|TOKEN|SECRET|PASS|URL|ACTIVO|ID$|CANALES|MAX", e)]
    o.append(f"- **{os.path.basename(f)}** ({lineas(t)} líneas): {cabecera(t) or '(sin descripción en cabecera)'}")
    if path: o.append(f"  - rutas: `{re.sub(chr(10)+'|  +', ' ', path.group(1))}`")
    if sch: o.append(f"  - programada (cron UTC): `{sch.group(1)}`")
    if st: o.append(f"  - almacenes: {', '.join(st)}")
    if env: o.append(f"  - variables: {', '.join(env)}")
# ---- lib
o.append("\n## 2. Lógica compartida (`netlify/lib`)\n")
for f in walk("netlify/lib", (".mts", ".ts", ".js", ".mjs")):
    t = rd(f); tot += lineas(t)
    ex = re.findall(r"export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+([A-Za-z0-9_]+)", t)
    o.append(f"- **{f[len('netlify/lib/'):]}** ({lineas(t)} líneas): {cabecera(t) or '(sin descripción)'}")
    if ex: o.append(f"  - exporta: {', '.join(ex[:40])}{' …' if len(ex)>40 else ''}")
# ---- html
o.append("\n## 3. Páginas HTML (`public`)\n")
for f in walk("public", (".html",)):
    t = rd(f); tot += lineas(t)
    ti = re.search(r"<title>(.*?)</title>", t, re.S)
    sc = sorted(set(re.findall(r"<script[^>]+src=\"([^\"]+)\"", t)))
    vistas = re.findall(r"id=\"(v-[a-z]+)\"", t)
    tabs = sorted(set(re.findall(r"data-tab=\"([a-z0-9-]+)\"", t)))
    o.append(f"- **{f}** ({lineas(t)} líneas, {len(t)//1024} KB): {(ti.group(1).strip() if ti else '')[:110]}")
    if vistas: o.append(f"  - vistas: {', '.join(vistas)}")
    if tabs: o.append(f"  - pestañas del panel: {', '.join(tabs)}")
    if sc: o.append(f"  - scripts: {', '.join(s for s in sc if not s.startswith('http'))[:300]}")
# ---- js/css
o.append("\n## 4. JavaScript y CSS del navegador (`public/*.js|css`)\n")
for f in [x for x in walk("public", (".js", ".css")) if x.count("/") == 1]:
    t = rd(f); tot += lineas(t)
    o.append(f"- **{f[len('public/'):]}** ({lineas(t)} líneas): {cabecera(t) or '(sin descripción)'}")
# ---- tools
o.append("\n## 5. Herramientas y pruebas (`tools`)\n")
for f in walk("tools", (".py", ".mjs", ".js", ".md")):
    t = rd(f)
    if f.endswith(".md"): o.append(f"- **{f}** (nota, {lineas(t)} líneas): {cabecera(t.replace('#',''),200)}"); continue
    tot += lineas(t)
    o.append(f"- **{f}** ({lineas(t)} líneas): {cabecera(t) or '(sin descripción)'}")
# ---- carpetas de contenido
o.append("\n## 6. Carpetas de contenido\n")
for d in sorted(os.listdir(os.path.join(R, "public"))):
    p = os.path.join(R, "public", d)
    if os.path.isdir(p):
        n = sum(len(fs) for _, _, fs in os.walk(p))
        o.append(f"- `public/{d}/`: {n} archivos")
o.append(f"\n---\nTotal de líneas de código indexadas: {tot}.\n")
open(os.path.join(R, "CLAUDE-INDICE.md"), "w", encoding="utf-8").write("\n".join(o))
print("OK", tot, "lineas;", len("\n".join(o))//1024, "KB")
