#!/usr/bin/env python3
"""Fichas del taller (6) como PDF VECTORIAL A4 a sangre completa, mismo diseño que las originales y SIN textos de ayuda en gris.
   Uso: python3 tools/fichas/construir.py <carpeta_salida>      (necesita Playwright + Chromium; datos en tools/fichas/datos.json)
   Orden: 1 Recepción FORM-01 · 2 Inspección FORM-02 (2 págs) · 3 Presupuesto FORM-15 · 4 Tiempos FORM-03 · 5 Calidad FORM-04 · 6 Factura FORM-14"""
import json, sys, os, html
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.join(AQUI, "..", "..")
D = json.load(open(os.path.join(AQUI, "datos.json"), encoding="utf-8"))
LOGO = open(os.path.join(RAIZ, "public/marca/logo-oscuro.svg"), encoding="utf-8").read()
E = html.escape
CSS = r"""
@page{size:210mm 297mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{font:8.6pt/1.2 Carlito,Calibri,"Liberation Sans",sans-serif;color:#1B1B1A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pag{width:210mm;height:297mm;padding:7mm 7mm 6mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden;position:relative}
.pag:last-child{page-break-after:auto}
.cab{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:3mm;border-bottom:.7mm solid #1B1B1A;position:relative;margin-bottom:3mm}
.cab::after{content:"";position:absolute;left:0;bottom:-.7mm;width:62mm;height:.7mm;background:#D9481C}
.cab .lg svg{height:15mm;width:auto;display:block}
.cab .tt{text-align:right}
.cab h1{font:700 18pt/1 "DejaVu Sans Condensed","Liberation Sans Narrow",Carlito,sans-serif;text-transform:uppercase;letter-spacing:-.2pt}
.cab p{font-size:8.6pt;color:#4a4742;margin:1.3mm 0 2mm}
.pill{display:inline-block;background:#D9481C;color:#fff;font:700 9.5pt/1 Carlito,sans-serif;letter-spacing:.12em;padding:1.6mm 4.2mm;border-radius:1.4mm}
table{border-collapse:collapse;width:100%}
td,th{border:.28mm solid #8c8780;padding:calc(1.1mm*var(--d,1)) 1.9mm;vertical-align:middle;text-align:left;font-weight:400}
th,.lb{background:#EFECE6;font-weight:700;font-size:8.4pt;letter-spacing:.02em}
.idr th,.idr td{height:calc(8.6mm*var(--d,1));font-size:9pt}
.sec{display:flex;align-items:center;gap:2.2mm;background:#1B1B1A;color:#fff;padding:1.2mm 2mm;margin-top:calc(2.4mm*var(--d,1));font:700 10.2pt/1 Carlito,sans-serif;letter-spacing:.03em;text-transform:uppercase}
.sec i{font-style:normal;background:#D9481C;color:#fff;width:5mm;height:5mm;border-radius:1mm;display:grid;place-items:center;font-size:9pt}
.sec small{font:400 8pt Carlito,sans-serif;text-transform:none;letter-spacing:0;color:#ddd}
.sec.o{background:#D9481C}.sec.o i{background:#fff;color:#D9481C}.sec.o small{color:#fff}
.cb{display:inline-block;width:3.4mm;height:3.4mm;border:.35mm solid #1B1B1A;border-radius:.5mm;vertical-align:-.7mm;background:#fff;margin-right:1.2mm}
.o{white-space:nowrap}.o+.o{margin-left:3mm}
.ln{display:inline-block;border-bottom:.3mm solid #1B1B1A;min-width:14mm;height:3.6mm;vertical-align:baseline}
.ln.s{min-width:9mm}.ln.l{min-width:22mm}
.chk th{font-size:8pt;letter-spacing:.05em;color:#fff;text-align:center;padding:.9mm .6mm}
.chk thead th:first-child,.chk thead th:last-child{text-align:left;background:#5b5752;padding-left:2mm}
.chk .ok{background:#2E7D32}.chk .am{background:#D9961C}.chk .rj{background:#B3261E}.chk .na{background:#5b5752}.chk .si{background:#2E7D32}.chk .no{background:#B3261E}
.chk td{padding:0 1mm;height:calc(4.9mm*var(--d,1))}.chk td.c{width:6.4mm;text-align:center;padding:0}.chk td.c .cb{margin:0;vertical-align:-.9mm}
.chk tbody tr:nth-child(even) td:not(.c){background:#F7F5F1}
.legend td{border:.28mm solid #8c8780}
.nota{font-size:8.3pt;margin:2mm 0 0;color:#2a2926}
.nota b{font-weight:700}
.dot{border-bottom:.25mm dashed #aaa59d;height:7mm}
.firmas td,.firmas th{height:auto}.firmas td{height:calc(16mm*var(--d,1))}
.pie{margin-top:auto;border-top:.28mm solid #8c8780;padding-top:1.6mm;display:flex;justify-content:space-between;font-size:8pt;color:#3a3834}
.pie b{color:#1B1B1A}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.cols .sec{margin-top:2.4mm}
.fo td.n{width:1%;white-space:nowrap}
tr.r td{height:calc(6.6mm*var(--d,1))}.chk tr.r td{height:calc(4.9mm*var(--d,1))}
.hl td{background:#FBE7E0!important}
.cro{display:grid;grid-template-columns:repeat(5,1fr);border:.28mm solid #8c8780;border-top:0}
.cro div{text-align:center;padding:1.4mm 0;border-right:.28mm solid #8c8780}.cro div:last-child{border-right:0}
.cro b{display:block;font-size:8pt;letter-spacing:.1em;margin-bottom:1mm}
.cro svg{height:13mm;width:auto}
.ley{border:.28mm solid #8c8780;border-top:0;padding:1.4mm 2mm;font-size:8.2pt}
.tx{border:.28mm solid #8c8780;border-top:0;padding:calc(2.4mm*var(--d,1)) 3mm;font-size:9.1pt;line-height:1.3}
.big td{height:calc(7.2mm*var(--d,1))}
.fp td,.fp th{font-size:8.6pt}
.det th{background:#1B1B1A;color:#fff;font-size:8pt;text-transform:uppercase;letter-spacing:.04em;text-align:left}
.det th.r,.det td.r{text-align:right}
.tot td{height:calc(6.6mm*var(--d,1));text-align:right}
.tot .t th,.tot .t td{background:#1B1B1A;color:#fff;font-size:10pt;font-weight:700}
.tot .t th{background:#1B1B1A}
.obs{min-height:22mm}
.rl{display:block;flex:1;min-height:6.4mm;border-bottom:.25mm solid #bdb8b0;background:#fff}.rl:last-child{border-bottom:0}
.ban{background:#D9481C;color:#fff;text-align:center;font:700 19pt/1 "DejaVu Sans Condensed",Carlito,sans-serif;letter-spacing:.14em;padding:4mm 0;margin-top:calc(2.4mm*var(--d,1))}
.casos{display:grid;grid-template-columns:1fr 1fr;border:.28mm solid #8c8780;border-top:0}.caso{display:flex;gap:2.4mm;padding:calc(2mm*var(--d,1)) 2.4mm;border-right:.28mm solid #8c8780;border-bottom:.28mm solid #8c8780;font-size:8.9pt;line-height:1.28}.caso:nth-child(2n){border-right:0}.caso:nth-last-child(-n+2){border-bottom:0}.caso i{font-style:normal;flex:none;width:6mm;height:6mm;border-radius:1mm;background:#D9481C;color:#fff;display:grid;place-items:center;font:700 9.5pt Carlito,sans-serif}.caso b{display:block;font-size:9.6pt;margin-bottom:.8mm}.caso p{margin:0}
.pt{margin:0;padding:0;list-style:none}.pt li{border:.28mm solid #8c8780;border-top:0;padding:calc(1.5mm*var(--d,1)) 2.4mm calc(1.5mm*var(--d,1)) 7mm;position:relative;font-size:9pt;line-height:1.28}.pt li::before{content:"";position:absolute;left:2.4mm;top:calc(2.4mm*var(--d,1));width:2.4mm;height:2.4mm;background:#D9481C;border-radius:.5mm}.pt li b{font-weight:700}

.rt th,.rt td{border:.6mm solid #1B1B1A}
.rt thead th{font-size:8.6pt;padding:1.4mm .8mm}
.chk.rt tr.r td{height:7.8mm;font-size:10.2pt}
.firmas.f3 td{height:15mm}
.rt td.ev{padding-left:2.2mm;font-size:10.4pt}
.rt td.hh{text-align:center;font-size:15pt;color:#1B1B1A;letter-spacing:.12em;font-weight:400}
.rt tr.pa td.ev{font-weight:700}
.rt tr.cn1 td.ev,.rt tr.cn2 td.ev{position:relative;padding-left:8.5mm}
.rt tr.cn1 td.ev::after{content:"";position:absolute;left:2.6mm;width:1.5mm;top:50%;bottom:-.7mm;background:#D9481C;z-index:2}
.rt tr.cn2 td.ev::before{content:"";position:absolute;left:2.6mm;width:1.5mm;top:-.7mm;height:calc(50% + .75mm);background:#D9481C;z-index:2}
.rt tr.cn2 td.ev::after{content:"";position:absolute;left:4.1mm;top:calc(50% - 1.7mm);width:0;height:0;border-left:2.6mm solid #D9481C;border-top:1.7mm solid transparent;border-bottom:1.7mm solid transparent;z-index:2}
"""
def cb(t="", cls="o"): return f'<span class="{cls}"><span class="cb"></span>{E(t)}</span>'
def ln(c="", w=""): return f'<span class="ln {w}"></span>{c}'
def sec(n, t, sub="", o=False): return f'<div class="sec{" o" if o else ""}"><i>{n}</i><b>{E(t)}</b>{f"<small>{E(sub)}</small>" if sub else ""}</div>'
REG_MERC = "Fuerteventura · hoja IF-10512"
REG_INSC = "1.ª · IRUS 1000478998399"
PIE_BASE = "Manual SOP-01 Recepción, inspección y control de tiempos"
def pagina(form, titulo, sub, hoja, cuerpo, ver="1.2", pag="", base=None, de=6):
    return f'''<section class="pag"><header class="cab"><div class="lg">{LOGO}</div><div class="tt"><h1>{E(titulo)}</h1><p>{E(sub)}</p><span class="pill">{form}</span></div></header>{cuerpo}
<footer class="pie"><span><b>Volcano Cars</b> · {base or PIE_BASE} · {form} · Versión {ver}</span><span>Hoja {hoja} de {de}{pag}</span></footer></section>'''
ORDEN = 'VC&nbsp;-&nbsp;<span class="ln s"></span>&nbsp;-&nbsp;<span class="ln s"></span>'
def idrow(*celdas):
    # celdas: (etiqueta, ancho%) ; la primera es siempre Nº de orden
    tds = f'<th style="width:15%">Nº de orden</th><td style="width:30%">{ORDEN}</td>'
    for et, w in celdas: tds += f'<th style="width:{w[0]}%">{E(et)}</th><td style="width:{w[1]}%"></td>'
    return f'<table class="idr"><tr>{tds}</tr></table>'
def kv(filas, anchos=(17, 33, 17, 33)):
    out = '<table class="kv">'
    for f in filas:
        if len(f) == 1:  # fila completa: (etiqueta, contenido-html)
            et, c = f[0]; out += f'<tr><th style="width:{anchos[0]}%">{et}</th><td colspan="3">{c}</td></tr>'
        else:
            (a, ca), (b, cb_) = f
            out += f'<tr><th style="width:{anchos[0]}%">{a}</th><td style="width:{anchos[1]}%">{ca}</td><th style="width:{anchos[2]}%">{b}</th><td style="width:{anchos[3]}%">{cb_}</td></tr>'
    return out + '</table>'
def firmas(*tit):
    n = len(tit); w = 100 // n
    return '<table class="firmas"><tr>' + ''.join(f'<th style="width:{w}%">{E(t)}</th>' for t in tit) + '</tr><tr>' + '<td></td>' * n + '</tr></table>'
def checklist(titulo, items, letra, cols=("OK","Á","R","NA"), sub="", o=False):
    cls = {"OK":"ok","Á":"am","R":"rj","NA":"na","SÍ":"si","NO":"no"}
    h = f'<tr><th>Punto a revisar</th>' + ''.join(f'<th class="{cls[c]}">{c}</th>' for c in cols) + '<th>Observaciones</th></tr>'
    r = ''.join(f'<tr class="r"><td>{E(t)}</td>' + ''.join('<td class="c"><span class="cb"></span></td>' for _ in cols) + f'<td>{extra}</td></tr>' for t, extra in items)
    return sec(letra, titulo, sub, o) + f'<table class="chk"><thead>{h}</thead><tbody>{r}</tbody></table>'
# ---------- croquis (vectoriales, propios) ----------
S = 'fill="none" stroke="#1B1B1A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"'
def car_lado(): return f'<svg viewBox="0 0 120 52" {S}><path d="M8 38 L8 30 Q8 26 13 25 L30 22 L42 10 Q44 8 48 8 L78 8 Q82 8 84 10 L96 22 L110 25 Q114 27 114 31 L114 38 Z"/><path d="M44 12 L40 22 L66 22 L66 12 Z M70 12 L70 22 L92 22 L82 12 Z"/><circle cx="30" cy="40" r="9"/><circle cx="30" cy="40" r="3.5"/><circle cx="92" cy="40" r="9"/><circle cx="92" cy="40" r="3.5"/><path d="M66 22 L66 34"/></svg>'
def car_frente(luz=True): return f'<svg viewBox="0 0 70 60" {S}><path d="M14 22 L20 8 Q21 6 24 6 L46 6 Q49 6 50 8 L56 22"/><path d="M8 44 L8 28 Q8 24 12 23 L58 23 Q62 24 62 28 L62 44 Z"/><path d="M20 10 L16 22 L54 22 L50 10 Z"/><rect x="13" y="30" width="12" height="7" rx="2"/><rect x="45" y="30" width="12" height="7" rx="2"/><path d="{"M29 33 L41 33" if luz else "M30 36 L40 36"}"/><rect x="14" y="44" width="9" height="10" rx="2"/><rect x="47" y="44" width="9" height="10" rx="2"/><path d="M4 26 L8 26 M62 26 L66 26"/></svg>'
def car_techo(): return f'<svg viewBox="0 0 40 78" {S}><rect x="5" y="4" width="30" height="70" rx="12"/><path d="M10 22 Q20 17 30 22 L28 36 L12 36 Z M12 42 L28 42 L30 58 Q20 62 10 58 Z"/><path d="M14 36 L26 36 L26 42 L14 42 Z"/><path d="M2 20 L5 20 M35 20 L38 20 M2 56 L5 56 M35 56 L38 56"/></svg>'
# ---------- FORM-01 ----------
def form01():
    inv_l = [("Llaves (nº: ____ )",), ("Rueda de repuesto / kit",), ("Gato y llave de ruedas",), ("Baliza V16 / triángulos y chaleco",)]
    inv_r = ["Documentación en el coche", "Radio / pantalla con código", "Objetos de valor", "Otros objetos personales"]
    inv_l = ['Llaves (nº: <span class="ln s" style="min-width:8mm"></span> )', "Rueda de repuesto / kit", "Gato y llave de ruedas", "Baliza V16 / triángulos y chaleco"]
    filas = ''.join(f'<tr class="r"><td>{a}</td><td class="c"><span class="cb"></span></td><td class="c"><span class="cb"></span></td><td></td><td>{b}</td><td class="c"><span class="cb"></span></td><td class="c"><span class="cb"></span></td><td></td></tr>' for a, b in zip(inv_l, inv_r))
    inv = f'<table class="chk" style="table-layout:fixed"><thead><tr><th style="width:27%">Elemento</th><th class="si" style="width:5.5%">Sí</th><th class="no" style="width:5.5%">No</th><th style="width:12%;background:#5b5752">Nota</th><th style="width:27%;background:#5b5752">Elemento</th><th class="si" style="width:5.5%">Sí</th><th class="no" style="width:5.5%">No</th><th style="width:12%;background:#5b5752">Nota</th></tr></thead><tbody>{filas}</tbody></table>'
    inv = inv.replace('<th style="width:27%">Elemento</th>', '<th style="width:27%;background:#5b5752">Elemento</th>')
    cuerpo = idrow(("Fecha", (11, 17)), ("Hora entrada", (14, 13))) .replace('width:30%">VC', 'width:20%">VC')
    cuerpo += sec(1, "Datos del cliente") + kv([
        [("Nombre y apellidos", ""), ("DNI / NIE / Pasaporte", "")],
        [("Teléfono", ""), ("Correo electrónico", "")],
        [("Recibido por", ""), ("Fecha entrega prometida", "")],
        [("¿Es el titular?", cb("Sí") + cb("No (adjuntar autorización)") + '<b style="margin-left:3mm">Contacto:</b> ' + cb("WhatsApp") + cb("Llamada") + cb("Correo"))],
        [("Tipo de entrada", cb("Reparación cliente") + cb("Compra para inventario") + cb("Retoma"))]])
    cuerpo += sec(2, "Datos del vehículo") + kv([
        [("Matrícula", ""), ("Marca / modelo", "")],
        [("Bastidor (VIN)", ""), ("Año / color", "")],
        [("Kilometraje entrada", '<span style="float:right">km&nbsp;&nbsp;<span class="cb" style="margin-right:1mm"></span>foto</span>'), ("ITV en vigor hasta", "")],
        [("Combustible", cb("Gasolina") + cb("Diésel") + cb("Híbrido") + cb("Eléctrico") + cb("GLP"))],
        [("Nivel de combustible", cb("Reserva") + cb("1/4") + cb("1/2") + cb("3/4") + cb("Lleno"))],
        [("Testigos encendidos", "")]])
    cuerpo += sec(3, "Motivo de entrada", "con las palabras del cliente") + '<div class="tx" data-grow style="min-height:13mm;border-top:0;background:#fff;display:flex;flex-direction:column;padding:0"><i class="rl"></i><i class="rl"></i><i class="rl"></i><i class="rl"></i></div>'
    cuerpo += sec(4, "Inventario de objetos y accesorios") + inv
    cuerpo += sec(5, "Daños previos", "marcar con letra sobre el dibujo y hacer foto")
    cuerpo += '<div class="cro">' + ''.join(f'<div><b>{t}</b>{s}</div>' for t, s in [("FRONTAL", car_frente()), ("LATERAL IZQUIERDO", car_lado()), ("TECHO / PLANTA", car_techo()), ("LATERAL DERECHO", car_lado()), ("TRASERA", car_frente(False))]) + '</div>'
    cuerpo += '<div class="ley"><b>Leyenda:</b> R = rayón · A = abolladura · P = picado · G = grieta o daño en cristal · S = suciedad excesiva · O = óxido</div>'
    cuerpo += sec(6, "Conformidad del cliente")
    cuerpo += '<div class="tx">Confirmo que los datos, el kilometraje, el nivel de combustible, los daños previos y los objetos anotados son correctos. Autorizo a Volcano Cars a inspeccionar el vehículo y a realizar una prueba en carretera. <b>No se realizará ninguna reparación sin mi autorización previa del presupuesto</b>, salvo el importe que autorizo a continuación. Los datos personales se tratarán según la política de privacidad de Volcano Cars.<div style="margin-top:2mm">' + cb("Autorizo reparar sin nuevo aviso hasta") + '<span class="ln"></span> € (IGIC incluido) &nbsp;&nbsp;&nbsp;' + cb("Acepto avisos y recordatorios por WhatsApp") + '</div></div>'
    cuerpo += firmas("Firma del cliente", "Firma de Volcano Cars", "Fecha")
    return [pagina("FORM-01", "Ficha de recepción", "Identificación del cliente y del vehículo", 1, cuerpo)]
# ---------- FORM-02 ----------
def form02():
    sem = '<table class="legend" style="margin-top:2.2mm"><tr><th style="width:13%;text-align:center">SEMÁFORO</th><td><span style="background:#2E7D32;color:#fff;font-weight:700;padding:.4mm 1.6mm;border-radius:.8mm">OK</span> Está bien</td><td><span style="background:#D9961C;color:#fff;font-weight:700;padding:.4mm 1.6mm;border-radius:.8mm">Á</span> Arreglar, pero puede circular</td><td><span style="background:#B3261E;color:#fff;font-weight:700;padding:.4mm 1.6mm;border-radius:.8mm">R</span> Peligroso: no sale así</td><td><span style="background:#5b5752;color:#fff;font-weight:700;padding:.4mm 1.6mm;border-radius:.8mm">NA</span> No aplica</td></tr></table>'
    nota = '<p class="nota"><b>Pregunta clave:</b> ¿dejarías que tu familia lo condujera hoy así? Si la respuesta es NO → Rojo. Una casilla por línea; todo Ámbar o Rojo lleva nota y foto. Si dudas, marca Rojo y consulta al gerente.</p>'
    S2 = {s[0]: s for s in D["F2_SECCIONES"]}
    def it(L): return [(x[1], "") for x in S2[L][3]]
    def blk(L): return checklist(S2[L][1].upper(), it(L), L, sub=S2[L][2])
    cab1 = idrow(("Matrícula", (11, 11)), ("Mecánico", (10, 11)), ("Fecha / hora", (11, 11))).replace('width:30%">VC', 'width:16%">VC')
    p1 = cab1 + sem + nota + blk("A") + blk("B") + blk("C")
    p2 = idrow(("Matrícula", (11, 11)), ("Mecánico", (10, 11))).replace('width:30%">VC', 'width:20%">VC') + blk("D") + blk("E") + blk("F") + blk("G")
    p2 += sec("!", "Resumen y decisión", "con algún ROJO el coche no se entrega ni se vende hasta corregirlo o rechazo firmado", o=True)
    p2 += kv([[("Puntos ROJO", ""), ("Puntos ÁMBAR", "")]], (16, 16, 16, 16)).replace('<th style="width:16%">Puntos ÁMBAR</th><td style="width:16%"></td>', '<th style="width:16%">Puntos ÁMBAR</th><td style="width:16%"></td><th style="width:18%">Horas estimadas</th><td style="width:18%"><span class="ln s" style="min-width:8mm"></span> h <span class="ln s" style="min-width:8mm"></span> min</td>')
    p2 += '<table class="kv"><tr><th style="width:15%">Recomendación</th><td>' + cb("Reparar") + cb("Reparar con reservas") + cb("No recomendable (si es compra)") + '</td></tr></table>'
    p2 += '<table class="kv"><tr><th style="width:15%">Autorización</th><td colspan="3">' + cb("El cliente AUTORIZA reparar el vehículo con los puntos en ROJO existentes y queda bajo su responsabilidad.") + '</td></tr><tr><th>Firma del cliente</th><td style="height:calc(15mm*var(--d,1));width:35%;vertical-align:top;font-size:7.5pt;color:#6b665e">Nombre:</td><th style="width:15%">Firma del mecánico</th><td style="width:35%;vertical-align:top;font-size:7.5pt;color:#6b665e">Nombre:</td></tr></table>'
    return [pagina("FORM-02", "Inspección de entrada 360°", "Checklist del mecánico · semáforo OK / Ámbar / Rojo", 2, p1, pag=" · pág. 1/2"),
            pagina("FORM-02", "Inspección de entrada 360°", "Checklist del mecánico · semáforo OK / Ámbar / Rojo", 2, p2, pag=" · pág. 2/2")]
# ---------- FORM-15 Presupuesto (nuevo) ----------
def lineas(n, cols=("Tipo", "Referencia", "Descripción", "Cant.", "Precio ud.", "Dto. %", "Importe €")):
    w = (7, 13, 38, 8, 13, 8, 13)
    h = '<tr>' + ''.join(f'<th class="{"r" if i>=3 else ""}" style="width:{w[i]}%">{c}</th>' for i, c in enumerate(cols)) + '</tr>'
    return f'<table class="det"><thead>{h}</thead><tbody>' + ('<tr class="r">' + '<td></td>' * 7 + '</tr>') * n + '</tbody></table>'
def totales(extra_izq):
    ig = '<div class="lb" style="padding:1.6mm 2mm;border:.28mm solid #8c8780;border-bottom:0"><b>Tipo de IGIC</b> &nbsp; ' + cb("7 % general") + cb("0 % exento") + cb("otro") + '<span class="ln s" style="min-width:8mm"></span> %</div>'
    izq = ig + f'<div style="border:.28mm solid #8c8780;flex:1;padding:1.6mm 2mm"><b>{extra_izq}</b></div>'
    der = '<table class="tot"><tr><th>Suma de líneas</th><td>€</td></tr><tr><th>Descuento global</th><td>€</td></tr><tr><th>Base imponible</th><td>€</td></tr><tr><th>IGIC (tipo <span class="ln s" style="min-width:7mm"></span> %)</th><td>€</td></tr><tr class="t"><th>TOTAL</th><td>€</td></tr></table>'
    return f'<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:0;margin-top:0"><div style="display:flex;flex-direction:column">{izq}</div>{der}</div>'
def form15():
    c = idrow(("Fecha", (11, 17)), ("Validez", (11, 16))).replace('width:30%">VC', 'width:22%">VC')
    c += sec(1, "Datos del cliente") + kv([[("Nombre / empresa", ""), ("DNI / NIE / CIF", "")], [("Teléfono", ""), ("Correo electrónico", "")]])
    c += sec(2, "Datos del vehículo") + kv([[("Matrícula", ""), ("Marca / modelo", "")], [("Bastidor (VIN)", ""), ("Kilometraje", '<span style="float:right">km</span>')]])
    c += sec(3, "Trabajos y recambios propuestos", "una línea por concepto · MO = mano de obra · REC = recambio") + lineas(9)
    c += sec(4, "Totales e IGIC", "importes sin impuestos hasta la base") + totales("Observaciones y condiciones")
    c += sec(5, "Plazo previsto") + kv([[("Tiempo estimado", '<span class="ln s" style="min-width:9mm"></span> h <span class="ln s" style="min-width:9mm"></span> min'), ("Entrega prometida", "")]])
    c += sec(6, "Aceptación del presupuesto", o=True)
    c += '<div class="tx" style="padding:2mm 3mm">Autorizo a Volcano Cars a realizar los trabajos indicados por el importe señalado. Cualquier trabajo adicional o importe superior se presupuestará y aprobará antes de ejecutarse.<div style="margin-top:1.8mm">' + cb("Acepto todo el presupuesto") + cb("Acepto solo las líneas marcadas") + cb("No acepto") + '</div></div>'
    c += firmas("Firma del cliente", "Firma de Volcano Cars", "Fecha")
    return [pagina("FORM-15", "Presupuesto", "Propuesta de trabajos y recambios para autorizar", 3, c)]
# ---------- FORM-03 tiempos ----------
def form03():
    c = idrow(("Matrícula", (11, 15)), ("Mecánico", (11, 18))).replace('width:30%">VC', 'width:20%">VC')
    c += sec(1, "Datos del trabajo") + kv([[("Marca / modelo", ""), ("Tarifa mano de obra", '<span class="ln"></span> € / hora (sin impuestos)')],
        [("Tiempo estimado", '<span class="ln s"></span> h <span class="ln s"></span> min'), ("Hoja", '<span class="ln s"></span> de <span class="ln s"></span>')],
        [("Tipo de trabajo", cb("Inspección") + cb("Mantenimiento") + cb("Reparación") + cb("Preparación para venta"))]])
    c += sec(2, "Registro de tiempos", "hora exacta del reloj, sin redondear")
    ev = [("Entrada del vehículo (FORM-01)", ""), ("INICIO de trabajo", "hl"), ("PAUSA 1", "pa"), ("INICIO (después de la pausa 1)", "in"), ("PAUSA 2", "pa"), ("INICIO (después de la pausa 2)", "in"), ("PAUSA 3", "pa"), ("INICIO (después de la pausa 3)", "in cn1"), ("FIN de trabajo", "hl cn2"), ("Salida a control de calidad", "")]
    f = '<table class="chk rt"><thead><tr><th style="width:31%">Evento</th><th style="width:15%;background:#5b5752;text-align:center">Fecha</th><th style="width:13%;background:#5b5752;text-align:center">Hora exacta</th><th style="background:#5b5752">Motivo de la pausa / nota</th><th style="width:10%;background:#5b5752">Iniciales</th></tr></thead><tbody>'
    for e, k in ev:
        hl = "hl" in k
        f += f'<tr class="r {k}"><td class="ev" style="{"font-weight:700;" if hl or "in" in k.split() else ""}background:{"#FBE7E0" if hl else "inherit"}">{e}</td><td class="hh">&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;/</td><td class="hh">:</td><td></td><td></td></tr>'
    c += f + '</tbody></table><p class="nota">Cada PAUSA se cierra con un INICIO. Motivos típicos: recambio pendiente · otro coche urgente · comida · autorización del cliente. Más de 3 pausas → hoja adicional.</p>'
    c += sec(3, "Cálculo")
    c += '<div class="tx" style="padding:1.8mm 3mm"><b>Tiempo neto</b> = (FIN − primer INICIO) − suma de pausas (cada pausa = hora del INICIO siguiente − hora de la PAUSA) &nbsp;·&nbsp; <b>Desviación %</b> = (tiempo real − tiempo estimado) ÷ tiempo estimado × 100</div>'
    hm = '<span class="ln s"></span> h <span class="ln s"></span> min'
    c += kv([[("Tiempo total en taller", hm), ("Suma de pausas", hm)], [("TIEMPO NETO TRABAJADO", hm), ("Tiempo estimado", hm)],
             [("Desviación", '<span class="ln s"></span> min / <span class="ln s"></span> %'), ("Mano de obra a facturar", '<span class="ln s"></span> h × <span class="ln s"></span> € = <span class="ln s"></span> €')]], (23, 27, 23, 27))
    c += sec(4, "Justificación de la desviación", "obligatoria si supera el 15 % o 30 minutos", o=True)
    J = ["A. Avería adicional no detectada en la inspección", "B. Espera de recambio o proveedor", "C. Pieza atascada u oxidada (salitre, arena)", "D. Estimación inicial demasiado optimista", "E. Falta de herramienta o equipo", "F. Interrupción por otro vehículo urgente", "G. Espera de autorización del cliente", "H. Trabajo repetido por error", "I. Otra (explicar abajo)"]
    jt = '<table class="kv big">'
    for i in range(0, 9, 2): jt += f'<tr><td>{cb(J[i])}</td><td>{cb(J[i+1]) if i+1<9 else ""}</td></tr>'
    c += jt + '</table>'
    c += kv([[("Explicación breve", "")], [("¿Cliente avisado y sobrecoste autorizado?", cb("Sí") + cb("No") + cb("No aplica"))], [("¿Qué cambiamos para que no se repita?", "")]], (28, 0, 0, 0)).replace('<td colspan="3">', '<td colspan="3" style="height:7.4mm">')
    c += firmas("Firma del mecánico", "Visto bueno del gerente", "Fecha").replace('class="firmas"', 'class="firmas f3"')
    return [pagina("FORM-03", "Control de tiempos y mano de obra", "Registro de horas por vehículo", 4, c)]
# ---------- FORM-04 calidad ----------
def form04():
    S4 = {s[0]: s for s in D["F4_SECC"]}
    c = idrow(("Matrícula", (11, 12)), ("Revisado por", (12, 12)), ("Fecha / hora", (12, 12))).replace('width:30%">VC', 'width:16%">VC')
    c += '<table class="kv" style="margin-top:2.2mm"><tr><th style="width:17%">Destino del vehículo</th><td>' + cb("Entrega a cliente") + cb("Inventario de venta") + '</td></tr></table>'
    c += '<p class="nota"><b>Lo firma una persona distinta al mecánico que hizo el trabajo.</b> Un solo NO → el coche vuelve a taller y se anota la causa en FORM-03.</p>'
    ex = {9: cb("Informe final guardado", "o"), 11: '<span class="ln"></span> km'}
    A = [(x[1], ex.get(i, "")) for i, x in enumerate(S4["A"][2])]
    c += checklist("VERIFICACIÓN DEL TRABAJO", A, "A", cols=("SÍ", "NO", "NA"))
    B = [(x[1], "") for x in S4["B"][2]]
    c += checklist("PRESENTACIÓN DEL VEHÍCULO", B, "B", cols=("SÍ", "NO", "NA"))
    def mini(L, t):
        rows = ''.join(f'<tr class="r"><td>{E(x[1])}</td><td class="c"><span class="cb"></span></td><td class="c"><span class="cb"></span></td></tr>' for x in S4[L][2])
        return f'<div>{sec(L, t)}<table class="chk"><thead><tr><th>Punto a revisar</th><th class="si">SÍ</th><th class="no">NO</th></tr></thead><tbody>{rows}</tbody></table></div>'
    c += '<div class="cols">' + mini("C", "Si se entrega a cliente") + mini("D", "Si va a inventario de venta") + '</div>'
    c += sec("E", "Cierre de la orden", o=True)
    c += ('<table class="kv"><tr><th style="width:22%">Resultado</th><td colspan="3">' + cb("Aprobado") + cb("Aprobado con observaciones") + cb("Rechazado → vuelve a taller") + '</td></tr>'
           '<tr><th>Motivo / observaciones</th><td colspan="3" style="height:7.4mm"></td></tr>'
           '<tr><th>Horas netas (FORM-03)</th><td style="width:30%"><span class="ln s"></span> h <span class="ln s"></span> min</td><th style="width:20%">Desviación total</th><td><span class="ln s"></span> %</td></tr></table>')
    c = c.replace('<tr><th style="width:22%">Horas netas (FORM-03)</th><td colspan="3">', '<tr><th style="width:22%">Horas netas (FORM-03)</th><td colspan="3">')
    c += firmas("Firma responsable de calidad", "Firma del gerente (cierre)", "Fecha de cierre")
    return [pagina("FORM-04", "Control de calidad pre-entrega", "Cierre de la orden de trabajo", 5, c)]
# ---------- FORM-14 factura ----------
def form14():
    num = '<table class="idr"><tr><th style="width:17%">Nº de factura</th><td style="width:25%">F&nbsp;-&nbsp;<span class="ln s"></span>&nbsp;-&nbsp;<span class="ln s"></span></td><th style="width:14%">Fecha emisión</th><td style="width:14%"></td><th style="width:16%">Fecha operación</th><td></td></tr><tr><th>Nº de orden</th><td colspan="5">' + ORDEN + '</td></tr></table>'
    c = num + '<p class="nota"><b>El nº de factura es correlativo (F-AAAA-NNNN), lo asigna el sistema al emitir y no se repite. No es el nº de la orden de trabajo (VC-AAAA-NNNN).</b> Un error no se tacha: se emite factura rectificativa.</p>'
    c += sec(1, "Datos del emisor", "quien factura") + kv([[("Razón social", "MAYLIN Y YERAY S.L."), ("NIF / CIF", "B93975647")], [("Dirección", "CALLE VALLE LARGO 8"), ("CP / localidad", "35610 - Polígono Industrial Costa de Antigua")], [("Teléfono", "643 56 60 98"), ("Correo electrónico", "volcanocars2026@gmail.com")], [("Registro Mercantil", REG_MERC), ("Inscripción", REG_INSC)]])
    c += sec(2, "Datos del cliente") + kv([[("Nombre / empresa", ""), ("DNI / NIE / CIF", "")], [("Dirección", ""), ("CP / localidad", "")], [("Teléfono", ""), ("Correo electrónico", "")]])
    c += sec(3, "Datos del vehículo") + kv([[("Matrícula", ""), ("Marca / modelo", "")], [("Bastidor (VIN)", ""), ("Kilometraje", 'entrada <span class="ln s"></span> km &nbsp; salida <span class="ln s"></span> km')]])
    c += sec(4, "Detalle de la reparación", "una línea por concepto · MO = mano de obra (horas de FORM-03 × tarifa) · REC = recambio") + lineas(9)
    c += sec(5, "Totales e IGIC", o=True) + '<p class="nota" style="margin:1.4mm 0"><b>Base imponible</b> = suma de líneas − descuento global &nbsp;·&nbsp; <b>IGIC</b> = base × tipo &nbsp;·&nbsp; <b>Total</b> = base + IGIC</p>' + totales("Observaciones")
    c = c.replace('<td></td>' * 7, '<td></td>' * 7)
    return [pagina("FORM-14", "Factura de reparación", "Documento de cobro al cliente", 6, c)]
# ---------- FORM-16 factura de venta de coche ----------
VENTA = "Venta de coches de ocasión"
def form16():
    num = '<table class="idr"><tr><th style="width:17%">Nº de factura</th><td style="width:25%">F&nbsp;-&nbsp;<span class="ln s"></span>&nbsp;-&nbsp;<span class="ln s"></span></td><th style="width:14%">Fecha emisión</th><td style="width:14%"></td><th style="width:16%">Fecha de entrega</th><td></td></tr></table>'
    c = num + '<p class="nota"><b>El nº de factura es correlativo (F-AAAA-NNNN), lo asigna el sistema al emitir y no se repite.</b> Un error no se tacha: se emite factura rectificativa.</p>'
    c += sec(1, "Vendedor") + kv([[("Razón social", "MAYLIN Y YERAY S.L. (Volcano Cars)"), ("NIF / CIF", "B93975647")], [("Dirección", "CALLE VALLE LARGO 8"), ("CP / localidad", "35610 - Polígono Industrial Costa de Antigua")], [("Teléfono", "643 56 60 98"), ("Correo electrónico", "volcanocars2026@gmail.com")], [("Registro Mercantil", REG_MERC), ("Inscripción", REG_INSC)]])
    c += sec(2, "Comprador") + kv([[("Nombre / empresa", ""), ("DNI / NIE / CIF", "")], [("Dirección", ""), ("CP / localidad", "")], [("Teléfono", ""), ("Correo electrónico", "")], [("Tipo de comprador", cb("Particular (consumidor)") + cb("Empresa o autónomo para su actividad"))]])
    c += sec(3, "Vehículo vendido") + kv([[("Matrícula", ""), ("Marca / modelo / versión", "")], [("Bastidor (VIN)", ""), ("Año / color", "")], [("Kilometraje en la entrega", '<span style="float:right">km</span>'), ("ITV en vigor hasta", "")], [("Combustible", cb("Gasolina") + cb("Diésel") + cb("Híbrido") + cb("Eléctrico") + cb("GLP"))]])
    c += sec(4, "Precio", "el precio es final, con todos los impuestos incluidos") + '<table class="tot" style="margin-top:0"><tr><th style="width:62%;text-align:left">Precio del vehículo (base imponible)</th><td>€</td></tr><tr><th style="text-align:left">Impuesto (IGIC / REBU según régimen) <span class="ln s" style="min-width:8mm"></span> %</th><td>€</td></tr><tr><th style="text-align:left">Cambio de titularidad en Tráfico · Entrega a domicilio</th><td style="text-align:center">incluidos · 0 €</td></tr><tr class="t"><th style="text-align:left">TOTAL A PAGAR</th><td>€</td></tr></table>'
    c += '<div class="ley" style="border-top:0">' + '<b>Régimen:</b> ' + cb("General (IGIC)") + cb("Bienes usados (REBU)") + cb("Otro") + '<br><b>Forma de pago:</b> ' + cb("Efectivo") + cb("Transferencia") + cb("Tarjeta") + cb("Financiación") + ' &nbsp; <b>Reserva descontada:</b> ' + cb("Sí") + cb("No") + '</div>'
    c += sec(5, "Lo que incluye tu compra", "garantía y servicios de Volcano Cars", o=True) + '<ul class="pt">' + ''.join(f'<li>{x}</li>' for x in [
        "<b>12 meses de garantía legal desde la entrega</b> (particulares): cubre cualquier defecto que el coche ya tuviera al entregártelo, sea del motor o de otra parte; es la garantía mínima que marca la ley (RDL 1/2007) y no puede reducirse. Empieza a contar el día que recibes el coche.",
        "<b>Coche revisado en nuestro taller</b> y control de calidad de 30 puntos (FORM-04) firmado antes de la venta. Puedes pedir una copia al comprar.",
        "<b>Precio final con todos los impuestos incluidos</b> y cambio de titularidad en Tráfico hecho por Volcano Cars, listo para conducir.",
        "<b>Entrega a domicilio gratis</b> en cualquier punto de Fuerteventura, el día y a la hora que acordemos, o recogida en nuestro taller de Costa de Antigua.",
        "<b>Documentación:</b> permiso de circulación, ficha técnica con la ITV en vigor, llaves y el historial que tengamos."]) + '</ul>'
    c += sec(6, "Cómo usar la garantía y qué no cubre") + '<div class="tx" style="font-size:8.7pt"><b>Para reclamarla:</b> avísanos en cuanto notes el fallo, por teléfono (643 56 60 98), WhatsApp o en el taller, con este documento. Revisamos el coche y, si procede, lo reparamos sin coste; si no es posible o no lo resuelve, puedes pedir una rebaja del precio o, si el defecto es relevante, la devolución.<br><b>No cubre:</b> el desgaste normal por uso y edad (pastillas, neumáticos, embrague, batería, escobillas…), las averías por mal uso, accidente o falta de mantenimiento, ni los defectos informados por escrito antes de la venta. <div style="margin-top:1.6mm"><b>Empresas y autónomos que compran para su actividad:</b> garantía pactada en este documento &nbsp; ' + cb("Solo el motor") + cb("Motor y caja de cambios") + cb("Otra") + ' <span class="ln l" style="min-width:34mm"></span> &nbsp; durante <span class="ln s" style="min-width:9mm"></span> meses.</div><div style="margin-top:1.6mm"><b>Defectos informados por escrito antes de la venta:</b> <span class="ln l" style="min-width:104mm"></span></div><div style="margin-top:1.4mm"><b>Documentación entregada:</b> ' + cb("Permiso de circulación") + cb("Ficha técnica + ITV") + cb("Llaves (nº ___)") + cb("Historial") + cb("Copia FORM-04") + '</div></div>'
    c += firmas("Firma del comprador (conforme)", "Firma de Volcano Cars", "Fecha")
    return [pagina("FORM-16", "Factura de venta de vehículo", "Compraventa con garantía de 12 meses · Documento de entrega", 1, c, ver="1.0", base=VENTA, de=1)]
# ---------- FORM-17 parte de reserva ----------
def bullets(items): return '<ul class="pt">' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'
def form17():
    c = '<table class="idr"><tr><th style="width:15%">Nº de reserva</th><td style="width:14%"></td><th style="width:19%">Fecha y hora de confirmación</th><td style="width:17%"></td><th style="width:15%">Válida hasta (48 h)</th><td></td></tr></table>'
    c += '<div class="ban">VEHÍCULO RESERVADO</div>'
    c += sec(1, "Datos del emisor", "quien recibe la reserva") + kv([[("Razón social", "MAYLIN Y YERAY S.L. (Volcano Cars)"), ("NIF / CIF", "B93975647")], [("Dirección", "CALLE VALLE LARGO 8, 35610 - Polígono Industrial Costa de Antigua"), ("Teléfono", "643 56 60 98")], [("Registro Mercantil", REG_MERC), ("Inscripción", REG_INSC)]])
    c += sec(2, "Cliente que reserva") + kv([[("Nombre y apellidos", ""), ("DNI / NIE / Pasaporte", "")], [("Teléfono", ""), ("Correo electrónico", "")]])
    c += sec(3, "Vehículo reservado") + kv([[("Marca / modelo / versión", ""), ("Matrícula", "")], [("Año / color", ""), ("Kilometraje", '<span style="float:right">km</span>')], [("Bastidor (VIN)", ""), ("Reservado en", cb("la web (online)") + cb("el taller"))], [("Pago de la reserva", cb("Tarjeta") + cb("Transferencia") + cb("Bizum") + cb("Efectivo") + ' &nbsp; confirmado: ' + cb("Sí") + cb("Pendiente"))]])
    c += sec(4, "Qué significa esta reserva", "tal y como figura en la web de Volcano Cars", o=True) + bullets([
        "<b>El coche queda apartado a tu nombre durante 48 horas</b> desde que confirmamos la reserva. Mientras dure, nadie más puede comprarlo ni reservarlo.",
        "<b>No es una señal de arras:</b> no te obliga a comprar ni tiene penalización. Tampoco es una factura ni el contrato de compraventa: la factura se emite al formalizar la compra, que se firma en nuestras instalaciones.",
        "<b>Transferencia o Bizum:</b> el coche aparece como reservado al subir el justificante; si en 12 horas no hemos recibido el dinero, la reserva se anula y te avisamos.",
        "<b>Si dos personas pagan a la vez,</b> el coche es para quien completó antes el pago; a la otra persona le devolvemos todo.",
        "<b>Si compras,</b> tu coche lleva 12 meses de garantía legal, cambio de nombre hecho y entrega gratis a domicilio en Fuerteventura."])
    c += sec(5, "Seguimiento de la reserva") + kv([[("Ampliada", cb("No") + cb("Sí, hasta"), ), ("Fecha y hora", "")], [("Resultado", cb("Ha comprado") + cb("Reserva liberada (se devuelve lo pagado)") + cb("Pendiente"))], [("Observaciones", '<div data-grow style="min-height:9mm"></div>')]])
    p1 = pagina("FORM-17", "Parte de reserva de vehículo", "Justificante de que el coche está apartado para ti", 1, c, ver="1.1", base=VENTA, de=2)
    d = sec(6, "Devoluciones: las 4 situaciones de la reserva", "tal y como figuran en la web de Volcano Cars (condiciones, apartado 5)", o=True)
    caso = lambda l, t, x: f'<div class="caso"><i>{l}</i><div><b>{t}</b><p>{x}</p></div></div>'
    d += '<div class="casos">' + caso("A", "No compras el coche", "100 % reembolsable por el motivo que sea: te devolvemos todo lo pagado por el mismo medio de pago en un máximo de 14 días naturales desde que nos lo pidas. Por ley tienes 14 días naturales para desistir sin dar explicaciones; en la práctica te lo devolvemos siempre que nos lo pidas, aunque hayan pasado, mientras no hayas comprado el coche.") \
        + caso("B", "Compras el coche", "Lo pagado en la reserva se descuenta del precio final, a cuenta del precio, y consta en la factura.") \
        + caso("C", "Pasan las 48 horas", "Te llamamos. Si lo necesitas (por ejemplo, porque esperas la respuesta de la financiera) podemos ampliar la reserva; si no, la liberamos y te devolvemos todo lo pagado.") \
        + caso("D", "Otra persona pagó antes o no llegó tu pago", "Si dos personas pagan a la vez, el coche es para quien completó antes el pago y a la otra le devolvemos el importe íntegro. Si con transferencia o Bizum no recibimos el dinero en 12 horas, la reserva se anula y te avisamos.") + '</div>'
    d += sec(6, "Prueba a domicilio con fianza", "solo si se aparta una prueba · no es la reserva: es la garantía de la prueba · 4 reglas") + kv([[("¿Se aparta una prueba a domicilio?", cb("No") + cb("Sí, el día"), ), ("Fecha y hora", "")]])
    d += '<div class="casos" style="border-top:0">' + caso("1", "Cancelas con 24 h o más de antelación", "Te devolvemos la fianza íntegra.") \
        + caso("2", "No te presentas y no avisas", "Nos quedamos con la fianza por el tiempo y el desplazamiento perdidos.") \
        + caso("3", "Pruebas el coche y no lo compras", "Te devolvemos la fianza menos el combustible gastado en la prueba. Lo calculamos con los kilómetros recorridos, el consumo medio del coche y el precio del litro que figura en el ticket, y te enseñamos el cálculo.") \
        + caso("4", "Pruebas el coche y lo compras", "La fianza se descuenta del precio final.") + '</div>'
    d += '<div class="ley" style="border-top:0"><b>Antes de agendar</b> te enviamos estas reglas por WhatsApp y la prueba se agenda cuando contestas «de acuerdo» por escrito. <b>Necesitamos</b> carnet de conducir en vigor y DNI o NIE, y firmar un documento de prueba antes de arrancar. <b>Liquidación:</b> en un máximo de 48 horas desde la prueba, por el mismo medio con el que pagaste.</div>'
    d += sec(7, "Notas de la prueba o de la reserva", "kilómetros recorridos, combustible, acuerdos") + '<div class="tx" data-grow style="min-height:22mm;border-top:.28mm solid #8c8780"></div>'
    d += sec(8, "Conformidad") + '<div class="tx">' + cb("He leído y acepto las condiciones de la reserva y, en su caso, las 4 reglas de la prueba a domicilio.") + ' Los datos personales se tratarán según la política de privacidad de Volcano Cars. Esta reserva no obliga a comprar.</div>'
    d += '<table class="firmas"><tr>' + ''.join(f'<th style="width:{w}%">{t}</th>' for t, w in [("Firma del cliente", 34), ("Firma de Volcano Cars", 33), ("Fecha", 33)]) + '</tr><tr class="r">' + '<td></td>' * 3 + '</tr></table>'
    p2 = pagina("FORM-17", "Parte de reserva de vehículo", "Condiciones y devoluciones", 2, d, ver="1.1", base=VENTA, de=2)
    return [p1, p2]
FORMS = [("FORM-01", form01), ("FORM-02", form02), ("FORM-15", form15), ("FORM-03", form03), ("FORM-04", form04), ("FORM-14", form14)]
AJUSTE = r"""<script>
/* a sangre completa: reparte el hueco que sobra entre las filas (hasta +2,6 mm cada una); lo que queda va antes del pie */
function ajusta(){ document.querySelectorAll('.pag').forEach(p=>{
  const pie=p.querySelector('.pie'); pie.style.marginTop='0';
  const fin=()=>pie.previousElementSibling.getBoundingClientRect().bottom-p.getBoundingClientRect().top;
  const alto=p.clientHeight-parseFloat(getComputedStyle(p).paddingBottom)-pie.offsetHeight-8;
  let d=1; p.style.setProperty('--d',d);
  while(fin()>alto&&d>0.5){ d=Math.round((d-0.03)*100)/100; p.style.setProperty('--d',d); }
  let hueco=alto-fin(); const filas=[...p.querySelectorAll('tr.r')]; const grow=p.querySelector('[data-grow]');
  if(hueco>2&&filas.length){ const px=Math.min(hueco/filas.length,9.8); filas.forEach(r=>{ r.style.height=(r.getBoundingClientRect().height+px)+'px'; }); }
  hueco=alto-fin(); if(hueco>2&&grow){ grow.style.minHeight=(grow.getBoundingClientRect().height+hueco)+'px'; }
  p.dataset.d=d; pie.style.marginTop='auto'; }); }
document.fonts.ready.then(()=>{ajusta();document.body.dataset.listo=1});
</script>"""
VENTAS = [("FORM-16", form16), ("FORM-17", form17)]
def html_de(forms):
    pags = ''.join(p for _, f in forms for p in f())
    return f'<!doctype html><html lang="es"><meta charset="utf-8"><title>Fichas Volcano Cars</title><style>{CSS}</style><body>{pags}{AJUSTE}</body></html>'
if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fichas"; os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        def render(nombre, forms, png=False):
            h = html_de(forms); ruta = os.path.join(out, nombre + ".html"); open(ruta, "w", encoding="utf-8").write(h)
            pg.goto("file://" + os.path.abspath(ruta)); pg.wait_for_selector("body[data-listo]")
            pg.pdf(path=os.path.join(out, nombre + ".pdf"), width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
        for cod, f in FORMS: render(cod, [(cod, f)])
        render("FICHAS-TALLER", FORMS)
        for cod, f in VENTAS: render(cod, [(cod, f)])
        b.close()
    print("hecho en", out)
