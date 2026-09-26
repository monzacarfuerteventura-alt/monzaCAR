/* =====================================================================
   VOLCANO CARS · CONVERSIÓN  (conversion.js)
   ---------------------------------------------------------------------
   Cuatro módulos, sin librerías externas:
     1. RESERVA FLASH 50 € en la ficha del coche (tarjeta · Google Pay ·
        Apple Pay con Stripe, o transferencia / Bizum con justificante).
     2. LISTA DE ESPERA en los coches RESERVADOS.
     3. CONFIRMACIÓN + COMPROBANTE PDF (generado aquí mismo, sin jsPDF:
        la web no carga código de otras webs) y reenvío por WhatsApp.
     4. PRESUPUESTO POR FOTO en el taller (arrastrar o hacer la foto).
   Se usa en la web (index.html, /comprar, /taller, inglés) y en el
   enlace privado de cada reserva (/r/…, reserva.html).
   No toca nada de lo que ya funcionaba: si falta este archivo, la web
   sigue igual (sin reserva online ni presupuesto por foto).
   ===================================================================== */
(() => {
  "use strict";

  /* ---------------- utilidades ---------------- */
  const EN = document.documentElement.lang === "en";
  const L = (es, en) => (EN ? en : es);
  const LOC = EN ? "en-GB" : "es-ES";
  const EMP = typeof EMPRESA !== "undefined" ? EMPRESA : {
    telefono: "643 66 88 13", telefonoLlamar: "+34643668813", whatsapp: "34643668813", email: "volcanocars2026@gmail.com",
    direccion: "Calle Valle Largo, Nave 8, Polígono Industrial, 35610 Antigua, Las Palmas", mapaEnlace: "https://maps.app.goo.gl/dz8icDhkUkB4oznd8",
  };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const eur2 = (n) => Number(n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const eurP = (n) => { const v = Math.round(Number(n || 0) * 100) / 100, e = Math.trunc(v), c = Math.round((v - e) * 100); return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (c ? "," + String(c).padStart(2, "0") : "") + " €"; };
  const waEmpresa = (t) => "https://wa.me/" + EMP.whatsapp + "?text=" + encodeURIComponent(t);
  const waCompartir = (t) => "https://wa.me/?text=" + encodeURIComponent(t);
  const fechaLarga = (f) => (f ? new Date(f + "T12:00:00Z").toLocaleDateString(LOC, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "");
  const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString(LOC, { timeZone: "Atlantic/Canary", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "");
  const telOk = (v) => String(v).replace(/[^\d]/g, "").length >= 9;
  const ORIG = (typeof ORIGEN !== "undefined" && ORIGEN) || { landing: location.pathname, referrer: (document.referrer || "").slice(0, 300) };
  const medirC = (k) => { try { if (typeof medir === "function") medir(k); } catch (_) {} };
  const trk = (...a) => { try { if (typeof TRK === "function") TRK(...a); } catch (_) {} };
  const guardado = {
    leer(k) { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (_) { return {}; } },
    poner(k, id, v) { try { const o = this.leer(k); o[id] = v; localStorage.setItem(k, JSON.stringify(o)); } catch (_) {} },
  };
  async function api(url, opt = {}) {
    const r = await fetch(url, { cache: "no-store", ...opt });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || L("Algo ha fallado. Inténtalo de nuevo.", "Something went wrong. Please try again.")); Object.assign(e, j, { status: r.status }); throw e; }
    return j;
  }
  // ¿Está abierto ahora? (L–V, 8:00–16:00, hora de Canarias)
  function abiertoAhora() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return !["Sat", "Sun"].includes(p.weekday) && +p.hour >= 8 && +p.hour < 15;
  }
  // Reduce una foto en el móvil antes de subirla (máx. 1600 px, JPEG): sube rápido con datos móviles
  async function reducir(file, max = 1600) {
    let img;
    try { img = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (_) { img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(L("No se ha podido leer la foto.", "We couldn't read that photo."))); i.src = URL.createObjectURL(file); }); }
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.8));
  }
  async function copiar(txt, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; }
    catch (_) { const t = document.createElement("textarea"); t.value = txt; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); try { ok = document.execCommand("copy"); } catch (_) {} t.remove(); }
    if (btn) { const antes = btn.innerHTML; btn.classList.add("ok"); btn.innerHTML = ok ? L("✓ Copiado", "✓ Copied") : L("Mantén pulsado para copiar", "Long-press to copy"); setTimeout(() => { btn.classList.remove("ok"); btn.innerHTML = antes; }, 1600); }
  }

  /* ---------------- mensajes de WhatsApp (mismos textos que el servidor) ---------------- */
  const MSG = {
    // confirmación tras reservar
    confirmacion(r, enlace) {
      const n = r.nombre.split(" ")[0];
      const cuando = r.cita ? L(` Nos vemos el ${fechaLarga(r.cita.fecha)} a las ${r.cita.hora} en nuestra exposición de Antigua para probarlo.`, ` See you on ${fechaLarga(r.cita.fecha)} at ${r.cita.hora} at our showroom in Antigua to test drive it.`)
        : L(" Ven a probarlo a nuestra exposición de Antigua cuando te venga bien.", " Come and test drive it at our showroom in Antigua whenever suits you.");
      return L(`¡Enhorabuena, ${n}! Tu ${r.coche.titulo} ha sido bloqueado con éxito en Volcano Cars. Tienes 48 horas de reserva exclusiva.${cuando} Tu comprobante: ${enlace}`,
        `Congratulations, ${n}! Your ${r.coche.titulo} has been successfully reserved at Volcano Cars. You have 48 hours of exclusive reservation.${cuando} Your receipt: ${enlace}`);
    },
    // aviso a la lista de espera cuando se cancela una reserva
    vuelveDisponible(nombre, titulo, enlace) {
      return L(`¡Buenas noticias, ${nombre.split(" ")[0]}! El ${titulo} vuelve a estar disponible en Volcano Cars. Sé el primero en reservarlo: ${enlace}`,
        `Good news, ${nombre.split(" ")[0]}! The ${titulo} is available again at Volcano Cars. Be the first to reserve it: ${enlace}`);
    },
    justificante(r) { return L(`Hola, he hecho el pago de la reserva ${r.codigo} del ${r.coche.titulo} (50 €). Os mando el justificante.`, `Hi, I've paid the reservation ${r.codigo} for the ${r.coche.titulo} (€50). Here's the receipt.`); },
  };

  /* =====================================================================
     COMPROBANTE PDF · generador propio (PDF 1.4, Helvetica, A4)
     ===================================================================== */
  const ANCHOS = {
    F1: "278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,761,222,556,333,1000,556,556,333,1000,667,333,1000,761,611,761,761,222,222,333,333,350,556,1000,333,1000,500,333,944,761,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500",
    F2: "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,761,278,556,500,1000,556,556,333,1000,667,333,1000,761,611,761,761,278,278,500,500,350,556,1000,333,1000,556,333,944,761,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556",
  };
  const W = { F1: ANCHOS.F1.split(",").map(Number), F2: ANCHOS.F2.split(",").map(Number) };
  // Unicode → WinAnsi (lo que entiende Helvetica en un PDF): acentos, ñ, €, comillas…
  const EXTRA = { "€": 128, "‚": 130, "ƒ": 131, "„": 132, "…": 133, "†": 134, "‡": 135, "ˆ": 136, "‰": 137, "Š": 138, "‹": 139, "Œ": 140, "Ž": 142, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "˜": 152, "™": 153, "š": 154, "›": 155, "œ": 156, "ž": 158, "Ÿ": 159 };
  const winAnsi = (s) => [...String(s).normalize("NFC")].map((ch) => { const c = ch.codePointAt(0); if (EXTRA[ch]) return EXTRA[ch]; if ((c >= 32 && c < 127) || (c >= 160 && c <= 255)) return c; return 63; });
  const ancho = (s, f, t) => winAnsi(s).reduce((a, c) => a + (W[f][c - 32] || 556), 0) * t / 1000;
  const rgb = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(" "); };

  function PDF() {
    const A4 = [595.28, 841.89], ops = [];
    const Y = (y) => (A4[1] - y).toFixed(2);
    const n2 = (v) => Number(v).toFixed(2);
    const api = {
      texto(x, y, s, o = {}) {
        const f = o.negrita ? "F2" : "F1", t = o.tam || 10;
        let xx = x; const w = ancho(s, f, t);
        if (o.alinear === "der") xx = x - w; else if (o.alinear === "centro") xx = x - w / 2;
        const bytes = winAnsi(s).map((c) => (c === 40 || c === 41 || c === 92 ? "\\" + String.fromCharCode(c) : String.fromCharCode(c))).join("");
        ops.push(`BT ${rgb(o.color || "#1B1B1A")} rg /${f} ${t} Tf ${n2(xx)} ${Y(y)} Td (${bytes}) Tj ET`);
        return w;
      },
      // texto en varias líneas (devuelve la y final)
      parrafo(x, y, s, anchoMax, o = {}) {
        const f = o.negrita ? "F2" : "F1", t = o.tam || 10, alto = o.linea || t * 1.4;
        const palabras = String(s).split(/\s+/); let linea = "";
        for (const p of palabras) {
          const prueba = linea ? linea + " " + p : p;
          if (ancho(prueba, f, t) > anchoMax && linea) { api.texto(x, y, linea, o); y += alto; linea = p; } else linea = prueba;
        }
        if (linea) { api.texto(x, y, linea, o); y += alto; }
        return y;
      },
      rect(x, y, w, h, o = {}) {
        const r = Math.min(o.radio || 0, w / 2, h / 2), k = 0.5523 * r, x2 = x + w, y2 = y + h;
        const camino = r ? [`${n2(x + r)} ${Y(y)} m`, `${n2(x2 - r)} ${Y(y)} l`, `${n2(x2 - r + k)} ${Y(y)} ${n2(x2)} ${Y(y + r - k)} ${n2(x2)} ${Y(y + r)} c`, `${n2(x2)} ${Y(y2 - r)} l`, `${n2(x2)} ${Y(y2 - r + k)} ${n2(x2 - r + k)} ${Y(y2)} ${n2(x2 - r)} ${Y(y2)} c`, `${n2(x + r)} ${Y(y2)} l`, `${n2(x + r - k)} ${Y(y2)} ${n2(x)} ${Y(y2 - r + k)} ${n2(x)} ${Y(y2 - r)} c`, `${n2(x)} ${Y(y + r)} l`, `${n2(x)} ${Y(y + r - k)} ${n2(x + r - k)} ${Y(y)} ${n2(x + r)} ${Y(y)} c`, "h"].join(" ")
          : `${n2(x)} ${Y(y2)} ${n2(w)} ${n2(h)} re`;
        const pinta = o.relleno && o.borde ? "B" : o.relleno ? "f" : "S";
        ops.push(`q ${o.relleno ? rgb(o.relleno) + " rg" : ""} ${o.borde ? rgb(o.borde) + " RG " + n2(o.grosor || 1) + " w" : ""} ${camino} ${pinta} Q`);
      },
      linea(x1, y1, x2, y2, o = {}) { ops.push(`q ${rgb(o.color || "#DCD8D1")} RG ${n2(o.grosor || 0.8)} w ${n2(x1)} ${Y(y1)} m ${n2(x2)} ${Y(y2)} l S Q`); },
      // camino SVG (M L Q Z, coordenadas absolutas) → PDF, escalado y colocado en (x, y)
      svg(d, x, y, esc, color, parImpar) {
        const tok = d.match(/[MLQZ]|-?\d*\.?\d+/g) || []; let i = 0, cx = 0, cy = 0; const out = [];
        const P = (px, py) => `${n2(x + px * esc)} ${Y(y + py * esc)}`;
        while (i < tok.length) {
          const c = tok[i++];
          if (c === "M" || c === "L") { cx = +tok[i++]; cy = +tok[i++]; out.push(P(cx, cy) + (c === "M" ? " m" : " l")); }
          else if (c === "Q") { const qx = +tok[i++], qy = +tok[i++], ex = +tok[i++], ey = +tok[i++];
            out.push(`${P(cx + 2 / 3 * (qx - cx), cy + 2 / 3 * (qy - cy))} ${P(ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey))} ${P(ex, ey)} c`); cx = ex; cy = ey; }
          else if (c === "Z") out.push("h");
        }
        ops.push(`q ${rgb(color)} rg ${out.join(" ")} ${parImpar ? "f*" : "f"} Q`);
      },
      bytes(meta = {}) {
        const contenido = ops.join("\n");
        const lat = (s) => s.replace(/[^\x00-\xff]/g, "?");
        const objs = [
          "<< /Type /Catalog /Pages 2 0 R >>",
          "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
          `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
          "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
          "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
          `<< /Title (${lat(meta.titulo || "").replace(/[()\\]/g, "")}) /Author (Volcano Cars) /Creator (volcanocars web) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z) >>`,
        ];
        let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"; const off = [];
        objs.forEach((o, k) => { off.push(out.length); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
        const xref = out.length;
        out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
        out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF`;
        const b = new Uint8Array(out.length); for (let k = 0; k < out.length; k++) b[k] = out.charCodeAt(k) & 255;
        return b;
      },
    };
    return api;
  }
  let LOGO = null; // caminos del logo (se leen de /marca/logo-oscuro.svg, así el PDF lleva el logo de verdad)
  async function logo() {
    if (LOGO) return LOGO;
    try {
      const s = await (await fetch("/marca/logo-oscuro.svg")).text();
      LOGO = [...s.matchAll(/<path d="([^"]+)"([^>]*)>/g)].map((m) => ({ d: m[1], color: (m[2].match(/#[0-9A-Fa-f]{6}/) || ["#1B1B1A"])[0], parImpar: /evenodd/.test(m[2]) }));
    } catch (_) { LOGO = []; }
    return LOGO;
  }
  const ESTADO_PDF = {
    confirmada: [L("PAGADO", "PAID"), "#1F8B4C"], vendida: [L("PAGADO · A CUENTA", "PAID · DEDUCTED"), "#1F8B4C"],
    pendiente: [L("PAGO EN COMPROBACIÓN", "PAYMENT BEING CHECKED"), "#B26A00"], iniciada: [L("PENDIENTE DE PAGO", "AWAITING PAYMENT"), "#B26A00"],
    cancelada: [L("RESERVA CANCELADA", "RESERVATION CANCELLED"), "#B3261E"],
  };
  const METODO_TXT = { tarjeta: L("Tarjeta / Google Pay / Apple Pay", "Card / Google Pay / Apple Pay"), transferencia: L("Transferencia bancaria", "Bank transfer"), bizum: "Bizum" };
  async function comprobantePDF(r, enlace) {
    const p = PDF(), M = 48, D = 595.28 - M, NAR = "#D94A26", GRIS = "#67635D", TINTA = "#1B1B1A";
    // cabecera
    const lg = await logo();
    if (lg.length) lg.forEach((x) => p.svg(x.d, M, 46, 0.25, x.color, x.parImpar)); else p.texto(M, 70, "VOLCANO CARS", { negrita: true, tam: 22 });
    p.texto(D, 58, L("COMPROBANTE DE RESERVA", "RESERVATION RECEIPT"), { negrita: true, tam: 13, alinear: "der" });
    p.texto(D, 76, r.codigo, { negrita: true, tam: 18, alinear: "der", color: NAR });
    p.texto(D, 92, L("Emitido el ", "Issued on ") + new Date().toLocaleString(LOC, { timeZone: "Atlantic/Canary", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), { tam: 8.5, alinear: "der", color: GRIS });
    p.rect(M, 106, D - M, 3, { relleno: NAR });
    // sello de estado
    const [est, col] = ESTADO_PDF[r.estado] || ESTADO_PDF.iniciada;
    const we = ancho(est, "F2", 10) + 26;
    p.rect(M, 124, we, 24, { borde: col, grosor: 1.4, radio: 12 });
    p.texto(M + we / 2, 140, est, { negrita: true, tam: 10, alinear: "centro", color: col });
    // importe
    p.rect(D - 190, 118, 190, 64, { relleno: "#121212", radio: 10 });
    p.texto(D - 176, 138, L("IMPORTE DE LA RESERVA", "RESERVATION AMOUNT"), { negrita: true, tam: 7.5, color: "#FF8A5C" });
    p.texto(D - 176, 168, eur2(r.importe), { negrita: true, tam: 24, color: "#FFFFFF" });
    // bloques de datos
    let y = 206;
    const bloque = (titulo, filas) => {
      p.texto(M, y, titulo.toUpperCase(), { negrita: true, tam: 8, color: NAR }); y += 8;
      p.linea(M, y, D, y, { color: "#E3DED6" }); y += 16;
      filas.filter(([, v]) => v).forEach(([k, v]) => {
        p.texto(M, y, k, { tam: 9.5, color: GRIS });
        y = p.parrafo(M + 150, y, String(v), D - M - 150, { tam: 10, negrita: true, color: TINTA, linea: 14 }) + 4;
      });
      y += 12;
    };
    bloque(L("Cliente", "Customer"), [[L("Nombre", "Name"), r.nombre], [L("Teléfono", "Phone"), r.telefono]]);
    bloque(L("Vehículo", "Vehicle"), [[L("Modelo", "Model"), `${r.coche.titulo} ${r.coche.version || ""}`.trim()], [L("Año", "Year"), r.coche.anio], [L("Precio de venta", "Sale price"), eurP(r.coche.precio) + L(" (impuestos incluidos)", " (taxes included)")],
      [L("Si lo compras, pagas", "If you buy it, you pay"), eurP(Math.max(0, r.coche.precio - r.importe)) + L(` (precio – ${eur2(r.importe)} de la reserva)`, ` (price – ${eur2(r.importe)} reservation)`)]]);
    bloque(L("Reserva", "Reservation"), [
      [L("Código de reserva", "Reservation code"), r.codigo],
      [L("Forma de pago", "Payment method"), METODO_TXT[r.metodo] || r.metodo],
      [r.pagado ? L("Pagado el", "Paid on") : L("Pago", "Payment"), r.pagado ? fechaHora(r.pagado) : r.estado === "pendiente" ? L("Justificante recibido: estamos comprobando el pago", "Receipt received: we're checking the payment") : ""],
      [L("Reservado hasta", "Reserved until"), r.hasta ? fechaHora(r.hasta) : r.estado === "pendiente" ? L("48 horas desde que confirmemos el pago", "48 hours from payment confirmation") : ""],
      [L("Visita y prueba", "Visit & test drive"), r.cita ? `${fechaLarga(r.cita.fecha)}, ${r.cita.hora} h` : L("Cuando te venga bien (llámanos para quedar)", "Whenever suits you (call us to arrange)")],
    ]);
    // cláusula
    y += 4;
    p.rect(M, y, D - M, 78, { relleno: "#FBF1EC", borde: "#F1C9B8", radio: 8 });
    p.texto(M + 14, y + 20, L("Condiciones de la reserva", "Reservation terms"), { negrita: true, tam: 9.5, color: NAR });
    p.parrafo(M + 14, y + 36, L("Importe 100% reembolsable o aplicable como pago a cuenta al momento de la compra.", "Amount 100% refundable or applied as a down payment at the time of purchase.") + " " +
      L("Durante la reserva nadie más puede comprar el coche. Si decides no comprarlo, te devolvemos el importe por el mismo medio de pago.", "During the reservation nobody else can buy the car. If you decide not to buy it, we refund the amount by the same payment method."),
      D - M - 28, { tam: 8.8, color: TINTA, linea: 12.5 });
    y += 96;
    p.parrafo(M, y, L("Este documento no es una factura: la factura se emite al formalizar la compra. Condiciones completas en ", "This document is not an invoice: the invoice is issued on purchase. Full terms at ") + location.origin + "/condiciones#reserva", D - M, { tam: 8, color: GRIS, linea: 11 });
    // pie
    p.linea(M, 770, D, 770, { color: "#E3DED6" });
    p.texto(M, 788, "Volcano Cars · " + EMP.direccion, { tam: 8, color: GRIS });
    p.texto(M, 801, `${L("Tel. / WhatsApp", "Phone / WhatsApp")} ${EMP.telefono} · ${EMP.email}`, { tam: 8, color: GRIS });
    if (enlace) p.texto(M, 814, L("Estado de tu reserva en todo momento: ", "Your reservation status at any time: ") + enlace, { tam: 7.5, color: GRIS });
    return new Blob([p.bytes({ titulo: `${L("Reserva", "Reservation")} ${r.codigo} · Volcano Cars` })], { type: "application/pdf" });
  }
  async function descargarPDF(r, enlace, btn) {
    if (btn) btn.disabled = true;
    try {
      const blob = await comprobantePDF(r, enlace);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `reserva-${r.codigo}-volcano-cars.pdf`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      trk("clk", "comprobante", r.codigo);
    } finally { if (btn) btn.disabled = false; }
  }

  /* =====================================================================
     PASOS DE PAGO Y CONFIRMACIÓN (los usan la ficha y la página /r/…)
     ===================================================================== */
  const IC = {
    lock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/></svg>',
    bell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/></svg>',
    card: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6.5 15h4"/></svg>',
    bank: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.5L12 4l9 5.5M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8M3 20h18"/></svg>',
    bizum: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3M12 7v6M9.5 10.5L12 13l2.5-2.5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M12 11v6M9.5 14.5L12 17l2.5-2.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
    cam: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 20H4a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 014 8z"/><circle cx="12" cy="13.5" r="3.6"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  };
  const enlaceReserva = (token) => location.origin + "/r/" + token;

  // Datos de transferencia y Bizum: acordeón con copia rápida, subida del justificante y WhatsApp
  function htmlPago(r) {
    const p = r.pago || {}, tr = p.transferencia, bz = p.bizum;
    const fila = (k, v, copia = v, clase = "") => `<div class="rsv-row ${clase}"><span>${k}</span><b>${esc(v)}</b>${copia ? `<button type="button" class="rsv-copy" data-copy="${esc(copia)}" aria-label="${L("Copiar", "Copy")} ${esc(k)}">${L("Copiar", "Copy")}</button>` : ""}</div>`;
    const todo = tr ? `${L("Titular", "Account holder")}: ${tr.titular}\nIBAN: ${tr.iban}\n${L("Importe", "Amount")}: ${eur2(r.importe)}\n${L("Concepto", "Reference")}: ${p.concepto}` : "";
    return `<div class="rsv-timer" data-hasta="${esc(r.hastaPago)}">${IC.lock}<span>${L("Te lo guardamos mientras pagas:", "We're holding it while you pay:")} <b data-reloj>--:--</b></span></div>
      <p class="rsv-help">${L("Haz el pago desde la app de tu banco y sube aquí el justificante (una captura vale). El coche pasa a <b>RESERVADO</b> al momento.", "Pay from your banking app and upload the receipt here (a screenshot is fine). The car switches to <b>RESERVED</b> instantly.")}</p>
      ${tr ? `<details class="rsv-acc" ${r.metodo !== "bizum" ? "open" : ""}><summary><span class="rsv-acc-ic">${IC.bank}</span><span><b>${L("Transferencia bancaria", "Bank transfer")}</b><small>${L("Inmediata desde casi todos los bancos", "Instant from most banks")}</small></span></summary>
        <div class="rsv-acc-in">${fila(L("Titular", "Account holder"), tr.titular)}${fila("IBAN", tr.iban, tr.iban.replace(/\s/g, ""), "mono")}${tr.banco ? fila(L("Banco", "Bank"), tr.banco, "") : ""}${fila(L("Importe", "Amount"), eur2(r.importe), "50,00")}${fila(L("Concepto", "Reference"), p.concepto, p.concepto, "mono")}
        <button type="button" class="btn btn-ghost rsv-copy-all" data-copy="${esc(todo)}">${L("Copiar todos los datos", "Copy all details")}</button></div></details>` : ""}
      ${bz ? `<details class="rsv-acc" ${r.metodo === "bizum" || !tr ? "open" : ""}><summary><span class="rsv-acc-ic">${IC.bizum}</span><span><b>Bizum</b><small>${L("Al momento, desde la app de tu banco", "Instant, from your banking app")}</small></span></summary>
        <div class="rsv-acc-in">${fila(L("Enviar a", "Send to"), bz, bz.replace(/\s/g, ""), "mono")}${fila(L("Importe", "Amount"), eur2(r.importe), "50")}${fila(L("Concepto", "Reference"), p.concepto, p.concepto, "mono")}</div></details>` : ""}
      <label class="rsv-up" data-subir><input type="file" accept="image/*,application/pdf" hidden>
        ${IC.doc}<span><b>${L("Subir justificante y reservar", "Upload receipt and reserve")}</b><small>${L("Captura, foto o PDF · máx. 5 MB", "Screenshot, photo or PDF · max 5 MB")}</small></span></label>
      <div class="form-err" data-err role="alert" hidden></div>
      <div class="rsv-alt">
        <a class="rsv-link" target="_blank" rel="noopener" href="${waEmpresa(MSG.justificante(r))}">${IC.wa}${L("¿No puedes subirlo? Mándalo por WhatsApp", "Can't upload it? Send it on WhatsApp")}</a>
        ${r.tarjetaDisponible ? `<button type="button" class="rsv-link" data-tarjeta>${IC.card}${L("Prefiero pagar con tarjeta o Google Pay", "I'd rather pay by card or Google Pay")}</button>` : ""}
      </div>
      <p class="rsv-fine">${L("Si lo mandas por WhatsApp, el coche queda reservado cuando comprobemos el pago.", "If you send it on WhatsApp, the car is reserved once we've checked the payment.")}</p>`;
  }
  function htmlConfirmada(r, mensaje) {
    const pend = r.estado === "pendiente", enlace = enlaceReserva(r.token || "");
    return `<div class="rsv-done">
      <div class="rsv-done-ic">${IC.ok}</div>
      <p class="rsv-kicker">${pend ? L("Coche reservado · comprobando tu pago", "Car reserved · checking your payment") : L("Reserva confirmada", "Reservation confirmed")}</p>
      <h3>${L(`${esc(r.coche.titulo)} reservado`, `${esc(r.coche.titulo)} reserved`)}</h3>
      <p class="rsv-done-txt">${esc(mensaje || MSG.confirmacion(r, enlace)).replace(/(https?:\/\/\S+)/, '<span class="rsv-url">$1</span>')}</p>
      ${pend ? `<p class="rsv-fine">${L("Ya sale como RESERVADO en la web. Estamos comprobando tu pago; si hay cualquier problema te llamamos.", "It already shows as RESERVED on the website. We're checking your payment; if anything's wrong we'll call you.")}</p>` : ""}
      <dl class="rsv-sum">
        <div><dt>${L("Código", "Code")}</dt><dd class="rsv-code">${esc(r.codigo)}</dd></div>
        <div><dt>${L("Coche", "Car")}</dt><dd>${esc(r.coche.titulo)} ${esc(r.coche.anio)}</dd></div>
        <div><dt>${pend ? L("Importe", "Amount") : L("Pagado", "Paid")}</dt><dd>${eur2(r.importe)} · ${esc(METODO_TXT[r.metodo] || r.metodo)}</dd></div>
        <div><dt>${L("Reservado hasta", "Reserved until")}</dt><dd>${r.hasta ? esc(fechaHora(r.hasta)) : L("48 h desde que confirmemos el pago", "48 h from payment confirmation")}</dd></div>
        ${r.cita ? `<div><dt>${L("Visita y prueba", "Visit & test drive")}</dt><dd>${esc(fechaLarga(r.cita.fecha))} · ${esc(r.cita.hora)} h</dd></div>` : ""}
      </dl>
      <div class="rsv-acts">
        <button type="button" class="btn btn-rosso" data-pdf>${L("📄 Descargar comprobante PDF", "📄 Download PDF receipt")}</button>
        <a class="btn btn-wa" target="_blank" rel="noopener" data-reenviar href="${waCompartir(mensaje || MSG.confirmacion(r, enlace))}">${IC.wa}${L("Reenviar por WhatsApp", "Share on WhatsApp")}</a>
        ${r.cita && typeof ics === "function" ? `<a class="btn btn-ghost" download="visita-volcano-cars.ics" href="${ics(r.cita.fecha, r.cita.hora, "Volcano Cars · " + L("Prueba del ", "Test drive: ") + r.coche.titulo, L("Reserva ", "Reservation ") + r.codigo)}">${IC.cal}${L("Añadir la visita al calendario", "Add visit to calendar")}</a>` : ""}
        <a class="btn btn-ghost" href="${esc(EMP.mapaEnlace || "https://maps.google.com")}" target="_blank" rel="noopener">${L("Cómo llegar", "Directions")}</a>
      </div>
      <p class="rsv-fine">${L("Guarda este enlace: ahí verás tu reserva y podrás volver a descargar el comprobante.", "Keep this link: it shows your reservation and lets you download the receipt again.")} <a href="${esc(enlace)}">${esc(enlace.replace(/^https?:\/\//, ""))}</a></p>
    </div>`;
  }
  // Conecta botones de un bloque de pago / confirmación. alCambiar(reservaNueva, mensaje) repinta.
  function conectar(caja, r, alCambiar) {
    caja.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copiar(b.dataset.copy, b)));
    const reloj = caja.querySelector("[data-reloj]");
    if (reloj) {
      const hasta = Date.parse(caja.querySelector("[data-hasta]").dataset.hasta);
      const tic = () => {
        if (!reloj.isConnected) return clearInterval(t);
        const s = Math.max(0, Math.round((hasta - Date.now()) / 1000));
        reloj.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min`;
        if (!s) { reloj.textContent = L("tiempo agotado: si nadie lo ha reservado, aún puedes subir el justificante", "time's up: if nobody has reserved it, you can still upload the receipt"); clearInterval(t); }
      };
      const t = setInterval(tic, 1000); tic();
    }
    const up = caja.querySelector("[data-subir] input");
    if (up) up.addEventListener("change", async () => {
      const f = up.files && up.files[0]; up.value = ""; if (!f) return;
      const err = caja.querySelector("[data-err]"), lab = caja.querySelector("[data-subir]");
      err.hidden = true; lab.classList.add("busy"); lab.querySelector("b").textContent = L("Subiendo justificante…", "Uploading receipt…");
      try {
        let cuerpo = f, tipo = f.type;
        if (f.type.startsWith("image/")) { cuerpo = await reducir(f, 1800); tipo = "image/jpeg"; }
        else if (f.type !== "application/pdf") throw new Error(L("Sube una foto, una captura o un PDF.", "Upload a photo, screenshot or PDF."));
        if (cuerpo.size > 5 * 1024 * 1024) throw new Error(L("El archivo pesa más de 5 MB.", "The file is larger than 5 MB."));
        const j = await api(`/api/reservas/${r.token}/justificante`, { method: "POST", headers: { "content-type": tipo }, body: cuerpo });
        medirC("solicitud"); trk("clk", "reserva-justificante", r.coche.id);
        alCambiar({ ...j.reserva, token: r.token }, j.mensaje);
      } catch (e) {
        err.textContent = e.message; err.hidden = false; lab.classList.remove("busy");
        lab.querySelector("b").textContent = L("Subir justificante y reservar", "Upload receipt and reserve");
        if (e.conflicto && e.reserva) alCambiar({ ...e.reserva, token: r.token });
      }
    });
    const tj = caja.querySelector("[data-tarjeta]");
    if (tj) tj.addEventListener("click", async () => {
      tj.disabled = true;
      try { const j = await api(`/api/reservas/${r.token}/metodo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ metodo: "tarjeta" }) }); if (j.pagoUrl) location.href = j.pagoUrl; }
      catch (e) { const err = caja.querySelector("[data-err]"); err.textContent = e.message; err.hidden = false; tj.disabled = false; }
    });
    const pdf = caja.querySelector("[data-pdf]");
    if (pdf) pdf.addEventListener("click", () => descargarPDF(r, enlaceReserva(r.token), pdf));
    const re = caja.querySelector("[data-reenviar]");
    if (re) re.addEventListener("click", () => trk("clk", "reserva-reenviar", r.coche.id));
  }

  /* =====================================================================
     MÓDULOS 1 Y 2 · FICHA DEL COCHE: RESERVA FLASH Y LISTA DE ESPERA
     ===================================================================== */
  let CFG = null, cfgPromesa = null;
  const config = () => (cfgPromesa = cfgPromesa || api("/api/reservas/config").then((c) => (CFG = c)).catch(() => (CFG = { activa: false })));
  const MIS = "vc_reservas", ESPERA = "vc_espera";

  function pintarFicha(c) {
    const box = $("#m-rsv"); if (!box || !c) return;
    const m0 = guardado.leer(MIS)[c.id], mia = m0 && Date.now() - (m0.t || 0) < 4 * 864e5 ? m0 : null, espera = guardado.leer(ESPERA)[c.id];
    const pinta = () => {
      if (c.estado === "vendido") { box.hidden = true; return; }
      if (mia && c.estado === "reservado") {
        box.innerHTML = `<div class="rsv-card mine"><div class="rsv-top"><span class="rsv-st res">${L("RESERVADO", "RESERVED")}</span><span class="rsv-tag">${L("Es tu reserva", "Your reservation")} · ${esc(mia.codigo)}</span></div>
          <a class="rsv-cta" href="/r/${esc(mia.token)}">${IC.doc}<span>${L("VER MI RESERVA Y EL COMPROBANTE", "VIEW MY RESERVATION & RECEIPT")}</span></a></div>`;
      } else if (c.estado === "reservado") {
        box.innerHTML = `<div class="rsv-card res"><div class="rsv-top"><span class="rsv-st res">${L("RESERVADO", "RESERVED")}</span><span class="rsv-tag">${L("Bloqueado por otro comprador", "Held by another buyer")}</span></div>
          ${espera ? `<p class="rsv-ok">${IC.bell}<span>${L(`Estás en la lista de espera${espera.puesto ? ` (nº ${espera.puesto})` : ""}. Si se cancela la reserva, te escribimos por WhatsApp antes que a nadie.`, `You're on the waiting list${espera.puesto ? ` (no. ${espera.puesto})` : ""}. If the reservation is cancelled, we'll message you on WhatsApp first.`)}</span></p>`
            : `<button type="button" class="rsv-cta alt" data-espera>${IC.bell}<span>${L("🔔 AVISARME SI SE CANCELA LA RESERVA", "🔔 LET ME KNOW IF THE RESERVATION IS CANCELLED")}</span></button>
          <p class="rsv-micro">${L("Este coche está bloqueado temporalmente por otro comprador. Déjanos tu teléfono y serás el primero en enterarte si vuelve a estar disponible.", "This car is temporarily held by another buyer. Leave your number and you'll be the first to know if it becomes available again.")}</p>`}</div>`;
      } else if (CFG && CFG.activa) {
        box.innerHTML = `<div class="rsv-card"><div class="rsv-top"><span class="rsv-st ok"><i></i>${L("Disponible", "Available")}</span><span class="rsv-tag">${L("Reserva online · 48 h", "Online reservation · 48 h")}</span></div>
          <button type="button" class="rsv-cta" data-reservar>${IC.lock}<span>${L("RESERVAR POR 50 € <small>(REEMBOLSABLES)</small>", "RESERVE FOR €50 <small>(REFUNDABLE)</small>")}</span></button>
          <p class="rsv-micro">${L("🔒 Bloquéalo ahora para que no se lo lleven mientras vienes a probarlo. Sin compromiso, devuelves o aplicas a la compra.", "🔒 Lock it now so nobody takes it while you come to test drive it. No obligation: refunded or deducted from the price.")}</p>
          <ul class="rsv-trust"><li>${L("100 % reembolsable", "100% refundable")}</li><li>${L("Se descuenta del precio", "Deducted from the price")}</li><li>${[CFG.tarjeta && L("Tarjeta · Google Pay", "Card · Google Pay"), CFG.transferencia && L("Transferencia", "Transfer"), CFG.bizum && "Bizum"].filter(Boolean).join(" · ")}</li></ul></div>`;
      } else { box.hidden = true; return; }
      box.hidden = false;
    };
    pinta();
    if (!CFG) config().then(pinta);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("#m-rsv [data-reservar]")) { const c = typeof gal !== "undefined" && gal.c; if (c) abrirReserva(c); }
    if (e.target.closest("#m-rsv [data-espera]")) { const c = typeof gal !== "undefined" && gal.c; if (c) abrirEspera(c); }
  });

  // --- diálogo de la reserva ---
  let DLG = null, AG = null, R0 = null;
  function dialogo() {
    if (DLG) return DLG;
    DLG = document.createElement("dialog");
    DLG.className = "rsv-dlg"; DLG.id = "rsv-dlg"; DLG.setAttribute("aria-labelledby", "rsv-h");
    DLG.innerHTML = `<form method="dialog" class="rsv-x"><button aria-label="${L("Cerrar", "Close")}">×</button></form><div class="rsv-body"></div>`;
    document.body.appendChild(DLG);
    DLG.addEventListener("click", (e) => { if (e.target === DLG) DLG.close(); });
    return DLG;
  }
  function cabecera(c, paso) {
    const foto = c.fotos && c.fotos[0] ? (typeof FOTO === "function" ? FOTO(c.fotos[0]) : c.fotos[0]) : "";
    const pasos = [L("Tus datos", "Your details"), L("Pago", "Payment"), L("¡Reservado!", "Reserved!")];
    return `<header class="rsv-head">${foto ? `<img src="${esc(foto)}" alt="">` : ""}<div><span class="rsv-kicker">${L("Reserva online", "Online reservation")}</span>
        <h3 id="rsv-h">${esc(c.marca + " " + c.modelo)}</h3><small>${esc([c.version, c.anio].filter(Boolean).join(" · "))} · ${eurP(c.precio)}</small></div>
        <div class="rsv-amt"><small>${L("Reserva", "Reservation")}</small><b>50,00 €</b></div></header>
      <ol class="rsv-steps">${pasos.map((t, i) => `<li class="${i + 1 < paso ? "done" : i + 1 === paso ? "on" : ""}"><i>${i + 1}</i><span>${t}</span></li>`).join("")}</ol>`;
  }
  async function abrirReserva(c) {
    await config();
    const d = dialogo(), body = $(".rsv-body", d);
    if (!CFG.activa) { location.href = waEmpresa(L(`Hola, quiero reservar el ${c.marca} ${c.modelo} (${c.anio}).`, `Hi, I'd like to reserve the ${c.marca} ${c.modelo} (${c.anio}).`)); return; }
    const metodos = [CFG.tarjeta && ["tarjeta", IC.card, L("Tarjeta, Google Pay o Apple Pay", "Card, Google Pay or Apple Pay"), L("Pago seguro con Stripe · al instante", "Secure payment with Stripe · instant")],
      CFG.transferencia && ["transferencia", IC.bank, L("Transferencia bancaria", "Bank transfer"), L("Sube el justificante y listo", "Upload the receipt and you're done")],
      CFG.bizum && ["bizum", IC.bizum, "Bizum", L("Al momento desde tu banco", "Instant from your bank")]].filter(Boolean);
    body.innerHTML = cabecera(c, 1) + `<form class="rsv-form" novalidate>
      <div class="row2"><div class="field"><label for="rsv-n">${L("Tu nombre", "Your name")}</label><input class="input" id="rsv-n" autocomplete="name" required></div>
        <div class="field"><label for="rsv-t">WhatsApp</label><input class="input" id="rsv-t" type="tel" autocomplete="tel" inputmode="tel" required placeholder="6XX XX XX XX"></div></div>
      <div class="field"><label for="rsv-e">${L("Email (opcional, para el comprobante)", "Email (optional, for the receipt)")}</label><input class="input" id="rsv-e" type="email" autocomplete="email"></div>
      <fieldset class="rsv-fs"><legend>${L("¿Cuándo vienes a verlo y probarlo?", "When will you come to see and test drive it?")}</legend>
        <div class="modo" role="radiogroup"><label><input type="radio" name="rsv-cuando" value="cita" checked><span>${L("Elegir día y hora", "Pick a day and time")}</span></label><label><input type="radio" name="rsv-cuando" value="luego"><span>${L("Aún no lo sé", "Not sure yet")}</span></label></div>
        <div class="agenda" id="rsv-ag" aria-live="polite"></div></fieldset>
      <fieldset class="rsv-fs"><legend>${L("¿Cómo quieres pagar los 50 €?", "How do you want to pay the €50?")}</legend>
        <div class="rsv-met">${metodos.map(([k, ic, t, s], i) => `<label><input type="radio" name="rsv-m" value="${k}" ${i === 0 ? "checked" : ""}><span class="rsv-met-in"><span class="rsv-met-ic">${ic}</span><span><b>${t}</b><small>${s}</small></span></span></label>`).join("")}</div></fieldset>
      <input class="hp" type="text" id="rsv-web" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="consent"><input type="checkbox" id="rsv-ok"><span>${L(`Acepto las <a href="/condiciones#reserva" target="_blank" rel="noopener">condiciones de la reserva</a> (50 € reembolsables o a cuenta del precio) y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.`, `I accept the <a href="/condiciones#reserva" target="_blank" rel="noopener">reservation terms</a> (€50 refundable or deducted from the price) and the <a href="/privacidad" target="_blank" rel="noopener">privacy policy</a>.`)}</span></label>
      <div class="form-err" id="rsv-err" role="alert" hidden></div>
      <button class="btn btn-rosso rsv-go" type="submit">${IC.lock}<span>${L("Continuar al pago · 50,00 €", "Continue to payment · €50.00")}</span></button>
      <p class="rsv-fine">${L("No se cobra nada más. Si no te convence, te devolvemos los 50 €.", "Nothing else is charged. If it's not for you, we refund the €50.")}</p></form>`;
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    trk("clk", "reserva-abrir", c.id);
    const fallo = (m) => { const el = $("#rsv-err", d); el.textContent = m || ""; el.hidden = !m; if (m) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
    const agEl = $("#rsv-ag", d);
    AG = typeof Agenda === "function" ? Agenda(agEl, "visita", (m) => fallo(m || "")) : null;
    if (AG) AG.cargar(); else agEl.hidden = true;
    d.querySelectorAll("input[name=rsv-cuando]").forEach((x) => x.addEventListener("change", () => { agEl.hidden = !AG || x.value !== "cita" || !x.checked; }));
    $(".rsv-form", d).addEventListener("submit", async (e) => {
      e.preventDefault(); fallo("");
      const nombre = $("#rsv-n", d).value.trim(), telefono = $("#rsv-t", d).value.trim(), email = $("#rsv-e", d).value.trim();
      const conCita = AG && (d.querySelector("input[name=rsv-cuando]:checked") || {}).value === "cita";
      const metodo = (d.querySelector("input[name=rsv-m]:checked") || {}).value;
      if (nombre.length < 2) { fallo(L("Escribe tu nombre.", "Please write your name.")); $("#rsv-n", d).focus(); return; }
      if (!telOk(telefono)) { fallo(L("Revisa el número de WhatsApp.", "Please check your WhatsApp number.")); $("#rsv-t", d).focus(); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fallo(L("Revisa el email.", "Please check your email.")); $("#rsv-e", d).focus(); return; }
      if (conCita && !AG.st.hora) { fallo(L("Elige el día y la hora de la visita (o marca «Aún no lo sé»).", "Pick the visit day and time (or choose «Not sure yet»).")); agEl.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
      if (!$("#rsv-ok", d).checked) { fallo(L("Marca la casilla de las condiciones para continuar.", "Please tick the terms box to continue.")); return; }
      const btn = $(".rsv-go", d); btn.disabled = true; btn.classList.add("busy");
      try {
        const j = await api("/api/reservas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          cocheId: c.id, nombre, telefono, email, metodo, cita: conCita ? { fecha: AG.st.fecha, hora: AG.st.hora } : null,
          acepta: true, web: $("#rsv-web", d).value, idioma: EN ? "en" : "es", origen: ORIG }) });
        if (!j.token) return;
        guardado.poner(MIS, c.id, { token: j.token, codigo: j.codigo, t: Date.now() });
        medirC("solicitud"); trk("clk", "reserva-" + metodo, c.id);
        if (j.pagoUrl) { btn.querySelector("span").textContent = L("Abriendo el pago seguro…", "Opening secure payment…"); location.href = j.pagoUrl; return; }
        R0 = { ...j.reserva, token: j.token, tarjetaDisponible: !!CFG.tarjeta };
        pasoPago(c);
      } catch (err) {
        fallo(err.message);
        if (err.reservado) { c.estado = "reservado"; marcarCoche(c.id, "reservado"); setTimeout(() => { d.close(); abrirEspera(c); }, 1600); }
        else if (err.enProceso) { const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost"; b.innerHTML = IC.bell + L("Avisarme si queda libre", "Tell me if it frees up"); b.onclick = () => { d.close(); abrirEspera(c); }; $("#rsv-err", d).appendChild(b); }
        else if (err.ocupada && AG) AG.cargar();
      } finally { btn.disabled = false; btn.classList.remove("busy"); }
    });
  }
  function pasoPago(c) {
    const d = dialogo(), body = $(".rsv-body", d);
    body.innerHTML = cabecera(c, 2) + `<div class="rsv-pay">${htmlPago(R0)}</div>`;
    d.scrollTop = 0;
    conectar($(".rsv-pay", d), R0, (r, mensaje) => {
      R0 = { ...R0, ...r };
      if (["pendiente", "confirmada"].includes(r.estado)) {
        marcarCoche(c.id, "reservado");
        body.innerHTML = cabecera(c, 3) + htmlConfirmada(R0, mensaje);
        conectar(body, R0, () => {}); d.scrollTop = 0;
      }
    });
  }
  // El coche pasa a RESERVADO en la web al momento (tarjetas, ficha y catálogo)
  function marcarCoche(id, estado) {
    try {
      const x = typeof COCHES !== "undefined" && COCHES.find((k) => String(k.id) === String(id));
      if (x) x.estado = estado;
      if (typeof gal !== "undefined" && gal.c && String(gal.c.id) === String(id)) {
        gal.c.estado = estado;
        const m = $("#m-month"); if (m && estado === "reservado") m.textContent = L("Reservado", "Reserved");
        const bf = $("#book-form"); if (bf && estado === "reservado") bf.hidden = true;
        pintarFicha(gal.c);
      }
      if (typeof modal !== "undefined" && modal.open) { if (typeof renderPendiente !== "undefined") renderPendiente = true; } else if (typeof render === "function") render();
    } catch (_) {}
  }

  // --- lista de espera ---
  function abrirEspera(c) {
    const d = dialogo(), body = $(".rsv-body", d);
    body.innerHTML = `<div class="rsv-wait"><span class="rsv-wait-ic">${IC.bell}</span>
      <p class="rsv-kicker">${esc(c.marca + " " + c.modelo)} · ${L("reservado", "reserved")}</p>
      <h3 id="rsv-h">${L("Te avisamos si se cancela la reserva", "We'll tell you if the reservation is cancelled")}</h3>
      <p class="rsv-micro">${L("Este coche está bloqueado temporalmente por otro comprador. Déjanos tu teléfono y serás el primero en enterarte si vuelve a estar disponible.", "This car is temporarily held by another buyer. Leave your number and you'll be the first to know if it becomes available again.")}</p>
      <form class="rsv-form" novalidate>
        <div class="row2"><div class="field"><label for="w-n">${L("Nombre", "Name")}</label><input class="input" id="w-n" autocomplete="given-name" required></div>
        <div class="field"><label for="w-t">WhatsApp</label><input class="input" id="w-t" type="tel" inputmode="tel" autocomplete="tel" required placeholder="6XX XX XX XX"></div></div>
        <input class="hp" type="text" id="w-web" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="consent"><input type="checkbox" id="w-ok"><span>${L("Acepto que me escribáis por WhatsApp solo para avisarme de este coche. <a href=\"/privacidad\" target=\"_blank\" rel=\"noopener\">Privacidad</a>.", "I agree to be contacted on WhatsApp only about this car. <a href=\"/privacidad\" target=\"_blank\" rel=\"noopener\">Privacy</a>.")}</span></label>
        <div class="form-err" id="w-err" role="alert" hidden></div>
        <button class="btn btn-rosso rsv-go" type="submit">${IC.bell}<span>${L("Avisarme por WhatsApp", "Notify me on WhatsApp")}</span></button></form></div>`;
    if (!d.open) d.showModal(); d.scrollTop = 0;
    trk("clk", "espera-abrir", c.id);
    const fallo = (m) => { const el = $("#w-err", d); el.textContent = m || ""; el.hidden = !m; };
    $(".rsv-form", d).addEventListener("submit", async (e) => {
      e.preventDefault(); fallo("");
      const nombre = $("#w-n", d).value.trim(), telefono = $("#w-t", d).value.trim();
      if (nombre.length < 2) { fallo(L("Escribe tu nombre.", "Please write your name.")); return; }
      if (!telOk(telefono)) { fallo(L("Revisa el número de WhatsApp.", "Please check your WhatsApp number.")); return; }
      if (!$("#w-ok", d).checked) { fallo(L("Marca la casilla para que podamos avisarte.", "Please tick the box so we can notify you.")); return; }
      const btn = $(".rsv-go", d); btn.disabled = true;
      try {
        const j = await api("/api/reservas/espera", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cocheId: c.id, nombre, telefono, acepta: true, web: $("#w-web", d).value, idioma: EN ? "en" : "es", origen: ORIG }) });
        guardado.poner(ESPERA, c.id, { puesto: j.puesto || 0, t: Date.now() });
        medirC("solicitud"); trk("clk", "espera-ok", c.id);
        body.innerHTML = `<div class="rsv-done"><div class="rsv-done-ic">${IC.ok}</div><h3 id="rsv-h">${L("¡Apuntado!", "You're on the list!")}</h3>
          <p class="rsv-done-txt">${L(`Eres el nº ${j.puesto || 1} de la lista de espera del ${esc(c.marca + " " + c.modelo)}. Si la reserva se cancela, te escribimos por WhatsApp antes que a nadie.`, `You're no. ${j.puesto || 1} on the waiting list for the ${esc(c.marca + " " + c.modelo)}. If the reservation is cancelled, we'll message you on WhatsApp first.`)}</p>
          <div class="rsv-acts"><a class="btn btn-ghost" href="${EN ? "/en/#comprar" : "/comprar"}">${L("Ver otros coches", "See other cars")}</a></div></div>`;
        pintarFicha(c);
      } catch (err) {
        fallo(err.message);
        if (err.disponible) { marcarCoche(c.id, "disponible"); c.estado = "disponible"; setTimeout(() => abrirReserva(c), 1400); }
      } finally { btn.disabled = false; }
    });
  }

  /* =====================================================================
     PÁGINA PRIVADA DE LA RESERVA (/r/…): volver de Stripe, terminar el
     pago, ver el estado y descargar el comprobante
     ===================================================================== */
  async function paginaReserva(el) {
    const token = (location.pathname.split("/")[2] || new URLSearchParams(location.search).get("t") || "").trim();
    const sid = new URLSearchParams(location.search).get("sid") || "";
    const cancelado = new URLSearchParams(location.search).get("pago") === "cancelado";
    if (!/^[A-Za-z0-9_-]{24}$/.test(token)) { el.innerHTML = `<div class="rsv-page-card"><h1>${L("Enlace no válido", "Invalid link")}</h1><p>${L("Revisa que el enlace esté completo o escríbenos por WhatsApp.", "Check the link is complete or message us on WhatsApp.")}</p><a class="btn btn-wa" href="${waEmpresa(L("Hola, tengo un problema con el enlace de mi reserva.", "Hi, I have a problem with my reservation link."))}">WhatsApp</a></div>`; return; }
    let intentos = 0;
    const cargar = async () => {
      const j = await api(`/api/reservas/${token}${sid ? "?sid=" + encodeURIComponent(sid) : ""}`);
      const r = { ...j.reserva, token };
      await config();
      r.tarjetaDisponible = !!(CFG && CFG.tarjeta);
      guardado.poner(MIS, r.coche.id, { token, codigo: r.codigo, t: Date.now() });
      const cab = `<div class="rsv-page-car">${r.coche.foto ? `<img src="${esc(r.coche.foto.startsWith("/") ? r.coche.foto : "/api/fotos/" + encodeURIComponent(r.coche.foto))}" alt="">` : ""}<div><span class="rsv-kicker">${L("Tu reserva", "Your reservation")} · ${esc(r.codigo)}</span><h1>${esc(r.coche.titulo)}</h1><small>${esc([r.coche.version, r.coche.anio].filter(Boolean).join(" · "))} · ${eurP(r.coche.precio)}</small></div></div>`;
      if (r.estado === "pendiente" || r.estado === "confirmada" || r.estado === "vendida") {
        el.innerHTML = `<div class="rsv-page-card">${cab}${r.estado === "vendida" ? `<div class="rsv-done"><div class="rsv-done-ic">${IC.ok}</div><h3>${L("¡Disfruta de tu coche!", "Enjoy your car!")}</h3><p class="rsv-done-txt">${L("Los 50 € de la reserva se descontaron del precio.", "The €50 reservation was deducted from the price.")}</p><div class="rsv-acts"><button type="button" class="btn btn-rosso" data-pdf>${L("📄 Descargar comprobante PDF", "📄 Download PDF receipt")}</button></div></div>` : htmlConfirmada(r, j.mensaje)}</div>`;
        conectar(el, r, () => {});
      } else if (r.estado === "iniciada" && r.metodo !== "tarjeta") {
        el.innerHTML = `<div class="rsv-page-card">${cab}<h2 class="rsv-h2">${L("Termina tu reserva", "Finish your reservation")}</h2>${htmlPago(r)}</div>`;
        conectar(el, r, () => cargar());
      } else if (r.estado === "iniciada") {
        // volviendo de Stripe: el pago puede tardar unos segundos en confirmarse
        if (sid && intentos++ < 6) { el.innerHTML = `<div class="rsv-page-card">${cab}<div class="rsv-wait-pay"><span class="rsv-spin"></span><p>${L("Confirmando tu pago…", "Confirming your payment…")}</p></div></div>`; setTimeout(cargar, 2500); return; }
        el.innerHTML = `<div class="rsv-page-card">${cab}<h2 class="rsv-h2">${cancelado ? L("No se ha completado el pago", "Payment not completed") : L("Falta el pago", "Payment pending")}</h2>
          <p>${L("El coche sigue apartado para ti unos minutos más.", "The car is still held for you for a few more minutes.")}</p>
          <div class="rsv-acts">${j.reserva.tarjetaUrl ? `<a class="btn btn-rosso" href="${esc(j.reserva.tarjetaUrl)}">${IC.card}${L("Pagar 50 € con tarjeta o Google Pay", "Pay €50 by card or Google Pay")}</a>` : ""}
          ${CFG.transferencia || CFG.bizum ? `<button type="button" class="btn btn-ghost" data-cambiar>${IC.bank}${L("Pagar por transferencia o Bizum", "Pay by transfer or Bizum")}</button>` : ""}</div><div class="form-err" data-err hidden></div></div>`;
        const b = el.querySelector("[data-cambiar]");
        if (b) b.onclick = async () => { try { await api(`/api/reservas/${token}/metodo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ metodo: CFG.transferencia ? "transferencia" : "bizum" }) }); cargar(); } catch (e) { const x = el.querySelector("[data-err]"); x.textContent = e.message; x.hidden = false; } };
      } else {
        el.innerHTML = `<div class="rsv-page-card">${cab}<h2 class="rsv-h2">${L("Esta reserva ya no está activa", "This reservation is no longer active")}</h2>
          <p>${esc(r.motivo ? L("Motivo: ", "Reason: ") + r.motivo : "")}</p><p>${L("Si pagaste algo, te lo devolvemos. ¿Dudas? Escríbenos.", "If you paid anything, we'll refund it. Questions? Message us.")}</p>
          <div class="rsv-acts"><a class="btn btn-rosso" href="/comprar?coche=${encodeURIComponent(r.coche.id)}">${L("Ver el coche", "See the car")}</a><a class="btn btn-wa" href="${waEmpresa(L(`Hola, os escribo por la reserva ${r.codigo}.`, `Hi, I'm writing about reservation ${r.codigo}.`))}" target="_blank" rel="noopener">${IC.wa}WhatsApp</a></div></div>`;
      }
      if (sid || cancelado) try { history.replaceState(null, "", location.pathname); } catch (_) {}
    };
    try { await cargar(); }
    catch (e) { el.innerHTML = `<div class="rsv-page-card"><h1>${L("No encontramos esta reserva", "We can't find this reservation")}</h1><p>${esc(e.message)}</p><a class="btn btn-wa" href="${waEmpresa(L("Hola, no encuentro mi reserva.", "Hi, I can't find my reservation."))}">${IC.wa}WhatsApp</a></div>`; }
  }

  /* =====================================================================
     MÓDULO 4 · TALLER: PRESUPUESTO EXPRÉS POR FOTO
     ===================================================================== */
  function presupuestoFoto(box) {
    const fotos = []; // {blob, url}
    const MAX_F = 4;
    const rapido = abiertoAhora();
    const tactil = matchMedia("(pointer: coarse)").matches; // en el móvil, botón para abrir la cámara directamente
    box.innerHTML = `<div class="pf-txt">
        <span class="pf-kicker"><span class="tx-led" aria-hidden="true"></span>${L("Presupuesto exprés por foto", "Express quote from a photo")}</span>
        <h3 id="pf-h">${L("¿Tienes un golpe, arañazo o quieres pintar tu coche?", "Got a dent or scratch, or want your car painted?")}</h3>
        <p>${rapido ? L("Sube una foto del daño y te enviamos un presupuesto estimado por WhatsApp en menos de 1 hora.", "Upload a photo of the damage and we'll send you an estimated quote on WhatsApp in under 1 hour.")
          : L("Sube una foto del daño y te enviamos un presupuesto estimado por WhatsApp en menos de 1 hora desde que abrimos (L–V, 8:00).", "Upload a photo of the damage and we'll send you an estimated quote on WhatsApp within 1 hour of opening (Mon–Fri, 8:00).")}</p>
        <ul class="pf-pts"><li>${L("Gratis y sin compromiso", "Free, no obligation")}</li><li>${L("Respuesta por WhatsApp", "Reply on WhatsApp")}</li><li>${L("Precio final por escrito al ver el coche", "Final written price once we see the car")}</li></ul>
        <ol class="pf-steps" aria-label="${L("Cómo funciona", "How it works")}">
          <li><i>1</i><span><b>${L("Haz la foto", "Take the photo")}</b>${L("De cerca y de lejos, con buena luz", "Close-up and from further away, in good light")}</span></li>
          <li><i>2</i><span><b>${L("Te respondemos por WhatsApp", "We reply on WhatsApp")}</b>${L("Con un presupuesto estimado", "With an estimated quote")}</span></li>
          <li><i>3</i><span><b>${L("Lo traes el día que elijas", "Bring it in on the day you choose")}</b>${L("Precio cerrado por escrito antes de empezar", "Fixed written price before we start")}</span></li>
        </ol>
      </div>
      <form class="pf-box" novalidate>
        <div class="pf-drop" tabindex="0" role="button" aria-describedby="pf-hint">
          <span class="pf-drop-ic">${IC.cam}</span>
          <b>${L("Arrastra aquí las fotos", "Drag your photos here")}</b>
          <span class="pf-or">${L("o", "or")}</span>
          <span class="pf-btns">${tactil ? `<label class="btn btn-rosso"><input type="file" accept="image/*" capture="environment" hidden data-cam>${L("Hacer foto", "Take a photo")}</label>` : ""}
          <label class="btn ${tactil ? "btn-ghost" : "btn-rosso"}"><input type="file" accept="image/*" multiple hidden data-gal>${tactil ? L("Elegir de la galería", "Choose from gallery") : L("Elegir fotos", "Choose photos")}</label></span>
          <small id="pf-hint">${L("Hasta 4 fotos: una de cerca y otra de lejos ayuda mucho.", "Up to 4 photos: one close-up and one from further away helps a lot.")}</small>
        </div>
        <div class="pf-thumbs" aria-live="polite"></div>
        <div class="modo" role="radiogroup" aria-label="${L("Qué prefieres", "What would you like")}">
          <label><input type="radio" name="pf-modo" value="foto" checked><span>${L("Presupuesto por foto", "Quote from photo")}</span></label>
          <label><input type="radio" name="pf-modo" value="cita"><span>${L("Traerlo al taller", "Bring it in")}</span></label>
        </div>
        <div class="row2"><div class="field"><label for="pf-n">${L("Tu nombre", "Your name")}</label><input class="input" id="pf-n" autocomplete="name"></div>
          <div class="field"><label for="pf-t">WhatsApp</label><input class="input" id="pf-t" type="tel" inputmode="tel" autocomplete="tel" placeholder="6XX XX XX XX"></div></div>
        <div class="row2"><div class="field"><label for="pf-c">${L("Coche", "Car")}</label><input class="input" id="pf-c" placeholder="${L("Ej. Seat Ibiza 2015", "E.g. Seat Ibiza 2015")}"></div>
          <div class="field"><label for="pf-m">${L("¿Qué le pasó? (opcional)", "What happened? (optional)")}</label><input class="input" id="pf-m" placeholder="${L("Ej. Roce en la puerta trasera", "E.g. Scrape on the rear door")}"></div></div>
        <div class="agenda" id="pf-ag" aria-live="polite" hidden></div>
        <input class="hp" type="text" id="pf-web" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="consent"><input type="checkbox" id="pf-ok"><span>${L("Acepto que Volcano Cars use estos datos y fotos solo para darme el presupuesto. <a href=\"/privacidad\" target=\"_blank\" rel=\"noopener\">Política de privacidad</a>.", "I agree Volcano Cars may use these details and photos only to quote me. <a href=\"/privacidad\" target=\"_blank\" rel=\"noopener\">Privacy policy</a>.")}</span></label>
        <div class="form-err" id="pf-err" role="alert" hidden></div>
        <button class="btn btn-rosso pf-go" type="submit"><span>${L("Enviar fotos y pedir presupuesto", "Send photos and get a quote")}</span></button>
        <div class="pf-ok" hidden></div>
      </form>`;
    const form = $(".pf-box", box), drop = $(".pf-drop", box), th = $(".pf-thumbs", box), agEl = $("#pf-ag", box);
    const fallo = (m) => { const el = $("#pf-err", box); el.textContent = m || ""; el.hidden = !m; if (m) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
    let AGF = null;
    const modo = () => (form.querySelector("input[name=pf-modo]:checked") || {}).value || "foto";
    form.querySelectorAll("input[name=pf-modo]").forEach((x) => x.addEventListener("change", () => {
      const cita = modo() === "cita";
      agEl.hidden = !cita;
      if (cita && !AGF && typeof Agenda === "function") { AGF = Agenda(agEl, "taller", (m) => fallo(m || "")); AGF.cargar(); }
      $(".pf-go span", box).textContent = cita ? L("Enviar fotos y reservar cita", "Send photos and book") : L("Enviar fotos y pedir presupuesto", "Send photos and get a quote");
    }));
    const pintar = () => {
      th.innerHTML = fotos.map((f, i) => `<figure><img src="${f.url}" alt="${L("Foto", "Photo")} ${i + 1}"><button type="button" data-q="${i}" aria-label="${L("Quitar foto", "Remove photo")} ${i + 1}">×</button></figure>`).join("");
      drop.classList.toggle("has", fotos.length > 0);
    };
    async function añadir(lista) {
      fallo("");
      for (const f of [...lista]) {
        if (fotos.length >= MAX_F) { fallo(L("Máximo 4 fotos.", "4 photos maximum.")); break; }
        if (!/^image\//.test(f.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) { fallo(L("Eso no parece una foto.", "That doesn't look like a photo.")); continue; }
        try { const blob = await reducir(f); fotos.push({ blob, url: URL.createObjectURL(blob) }); pintar(); }
        catch (e) { fallo(e.message); }
      }
      if (fotos.length) trk("clk", "foto-subida", String(fotos.length));
    }
    box.querySelectorAll("[data-cam],[data-gal]").forEach((i) => i.addEventListener("change", () => { añadir(i.files || []); i.value = ""; }));
    th.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; const [f] = fotos.splice(+b.dataset.q, 1); URL.revokeObjectURL(f.url); pintar(); });
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => añadir(e.dataTransfer.files || []));
    drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("[data-gal]", box).click(); } });
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); fallo("");
      const nombre = $("#pf-n", box).value.trim(), telefono = $("#pf-t", box).value.trim(), coche = $("#pf-c", box).value.trim(), nota = $("#pf-m", box).value.trim();
      const cita = modo() === "cita";
      if (!fotos.length) { fallo(L("Añade al menos una foto del daño.", "Add at least one photo of the damage.")); drop.focus(); return; }
      if (nombre.length < 2) { fallo(L("Escribe tu nombre.", "Please write your name.")); $("#pf-n", box).focus(); return; }
      if (!telOk(telefono)) { fallo(L("Revisa el número de WhatsApp.", "Please check your WhatsApp number.")); $("#pf-t", box).focus(); return; }
      if (cita && !(AGF && AGF.st.hora)) { fallo(L("Elige día y hora para traerlo.", "Pick a day and time to bring it in.")); return; }
      if (!$("#pf-ok", box).checked) { fallo(L("Marca la casilla de privacidad para poder enviarlo.", "Please tick the privacy box so we can send it.")); return; }
      const btn = $(".pf-go", box); btn.disabled = true; btn.classList.add("busy");
      try {
        const claves = [];
        for (let i = 0; i < fotos.length; i++) {
          $("span", btn).textContent = L(`Subiendo foto ${i + 1} de ${fotos.length}…`, `Uploading photo ${i + 1} of ${fotos.length}…`);
          const j = await api("/api/fotos-cliente", { method: "POST", headers: { "content-type": "image/jpeg" }, body: fotos[i].blob });
          claves.push(j.key);
        }
        $("span", btn).textContent = L("Enviando…", "Sending…");
        await api("/api/solicitudes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          tipo: "taller", nombre, telefono, servicios: [L("Presupuesto por foto", "Quote from photo")], vehiculo: coche ? { coche } : {},
          mensaje: `📷 ${L("Presupuesto por foto", "Quote from photo")}${nota ? ": " + nota : ""}`, fotos: claves,
          cita: cita ? { fecha: AGF.st.fecha, hora: AGF.st.hora } : null, acepta: true, web: $("#pf-web", box).value, idioma: EN ? "en" : "es", origen: ORIG }) });
        medirC("solicitud"); trk("clk", "foto-enviada", cita ? "cita" : "foto");
        const ok = $(".pf-ok", box);
        ok.innerHTML = `<div class="rsv-done-ic">${IC.ok}</div><h4>${L("¡Fotos recibidas!", "Photos received!")}</h4>
          <p>${cita ? L(`Cita confirmada: ${fechaLarga(AGF.st.fecha)} a las ${AGF.st.hora}. Antes de que vengas te mandamos el presupuesto estimado por WhatsApp.`, `Appointment confirmed: ${fechaLarga(AGF.st.fecha)} at ${AGF.st.hora}. Before you come we'll send the estimated quote on WhatsApp.`)
            : rapido ? L("Te escribimos por WhatsApp con el presupuesto estimado en menos de 1 hora.", "We'll message you on WhatsApp with the estimated quote in under 1 hour.") : L("Te escribimos por WhatsApp con el presupuesto estimado en cuanto abramos (L–V, 8:00).", "We'll message you on WhatsApp with the estimated quote as soon as we open (Mon–Fri, 8:00).")}</p>
          <a class="btn btn-wa" target="_blank" rel="noopener" href="${waEmpresa(L(`Hola, soy ${nombre}. Acabo de mandaros ${fotos.length} foto${fotos.length > 1 ? "s" : ""} por la web para un presupuesto${coche ? " del " + coche : ""}.`, `Hi, I'm ${nombre}. I've just sent ${fotos.length} photo${fotos.length > 1 ? "s" : ""} on the website for a quote${coche ? " for my " + coche : ""}.`))}">${IC.wa}${L("¿Prisa? Escríbenos ya", "In a hurry? Message us now")}</a>`;
        form.querySelectorAll(":scope > :not(.pf-ok)").forEach((x) => (x.hidden = true));
        ok.hidden = false; ok.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch (err) { fallo(err.message); if (err.ocupada && AGF) AGF.cargar(); }
      finally { btn.disabled = false; btn.classList.remove("busy"); if (!$(".pf-ok", box).hidden) return; $("span", btn).textContent = modo() === "cita" ? L("Enviar fotos y reservar cita", "Send photos and book") : L("Enviar fotos y pedir presupuesto", "Send photos and get a quote"); }
    });
  }

  /* ---------------- arranque ---------------- */
  window.VC_RESERVA = { pintar: pintarFicha, abrir: abrirReserva, espera: abrirEspera, pdf: comprobantePDF, mensajes: MSG };
  const pagina = $("#rsv-page");
  if (pagina) paginaReserva(pagina);
  const pf = $("#t-foto");
  if (pf) presupuestoFoto(pf);
  if ($("#m-rsv")) {
    config();
    // enlace directo desde la página del coche: /comprar?coche=ID&reservar=1 (o &espera=1)
    const q = new URLSearchParams(location.search), quiere = q.get("reservar") ? "reservar" : q.get("espera") ? "espera" : "", id = q.get("coche");
    if (quiere && id) {
      try { q.delete("reservar"); q.delete("espera"); history.replaceState(null, "", location.pathname + "?" + q.toString() + location.hash); } catch (_) {}
      const t0 = Date.now(), mira = setInterval(() => {
        const c = typeof gal !== "undefined" && gal.c && String(gal.c.id) === id && typeof modal !== "undefined" && modal.open ? gal.c : null;
        if (c) { clearInterval(mira); config().then(() => (c.estado === "reservado" || quiere === "espera" ? (c.estado === "reservado" ? abrirEspera(c) : null) : abrirReserva(c))); }
        else if (Date.now() - t0 > 15000) clearInterval(mira);
      }, 300);
    }
  }
})();
