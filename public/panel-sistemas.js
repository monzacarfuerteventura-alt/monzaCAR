/* =====================================================================
   VOLCANO CARS · PANEL: SISTEMAS VOLCANO CARS (MO-00 v3.0)  (panel-sistemas.js)
   ---------------------------------------------------------------------
   Pestaña Taller → tarjeta «Sistemas Volcano Cars»:
   · Biblioteca para el equipo: los 11 sistemas en su orden estricto
     (S01 → S11) con su PDF, y el índice MO-00 con el orden de implantación.
   · Formularios digitales que no existían en el panel:
       FORM-05 Cascos y abonos (S02)       FORM-06 Ronda 5S y seguridad (S03)
       FORM-07 Hoja de preparación (S04)   FORM-08 Prueba a domicilio · fianza (S06)
       FORM-09 Registro de postventa (S07) FORM-10 Plan semanal de marketing (S08, gerente)
       FORM-11 Auditoría del viernes (S09, gerente)
   FORM-01 a 04 y FORM-14 (Factura de reparación) siguen dentro de cada orden (S01) y la Guía de venta (S05)
   en su sitio: aquí solo se enlazan. Guarda en /api/sistemas (Netlify Blobs).
   Usa las funciones del panel: api, toast, ME, PUEDE_TODO, abrirGuia.
   ===================================================================== */
(() => {
  "use strict";
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const aviso = (t) => { try { toast(t); } catch (_) { alert(t); } };
  const sec = q("#s-ordenes");
  if (!sec || q("#sv-lib")) return;
  const esGerente = () => { try { return PUEDE_TODO(); } catch (_) { return true; } };
  const hoy = () => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date()); } catch (_) { return new Date().toISOString().slice(0, 10); } };
  const n = (v) => { const x = Number(String(v ?? "").replace(/\s|€/g, "").replace(",", ".")); return Number.isFinite(x) ? x : NaN; };
  const eu = (v) => { if (!Number.isFinite(v)) return "—"; const c = Math.round(Math.abs(v) * 100), e = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (v < 0 ? "−" : "") + e + "," + String(c % 100).padStart(2, "0") + " €"; };
  const dias = (a, b) => { if (!a) return NaN; const t0 = Date.parse(a + "T12:00:00Z"), t1 = b ? Date.parse(b + "T12:00:00Z") : Date.parse(hoy() + "T12:00:00Z"); return Math.round((t1 - t0) / 864e5); };
  const fch = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleString("es-ES", { timeZone: "Atlantic/Canary", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (_) { return iso; } };
  const fd = (d) => (d ? d.split("-").reverse().join("/") : "");
  const V = "?v=1";

  /* ------------------------------------------------------------------
     LOS 11 SISTEMAS · orden estricto (mismo que el índice MO-00 v3.0)
     ------------------------------------------------------------------ */
  const BLOQ = { A: "Taller", B: "Venta", C: "Cliente", D: "Dirección" };
  const SIS = [
    ["01", "A", "Taller: de la recepción a la entrega", "Recepción · Inspección · Presupuesto · Tiempos · Calidad · Factura y cobro", "VolcanoCars-S01-Taller-recepcion-a-entrega", ["FORM-01", "FORM-02", "FORM-03", "FORM-04", "FORM-14"], "hecho"],
    ["02", "A", "Recambios, almacén, cascos y abonos", "Pedir · recibir · dar salida · devolver cascos · cobrar abonos", "VolcanoCars-S02-Recambios-almacen-cascos-abonos", ["FORM-05"], "nuevo"],
    ["03", "A", "Instalaciones, seguridad y 5S", "Taller ordenado, seguro y en regla", "VolcanoCars-S03-Instalaciones-seguridad-5S", ["FORM-06"], "nuevo"],
    ["04", "B", "Preparación y detailing anti-salitre", "Del taller al escaparate: coche impecable y protegido", "VolcanoCars-S04-Preparacion-detailing-anti-salitre", ["FORM-07"], "nuevo"],
    ["05", "B", "El método de venta", "6 pasos · Chuleta · Anexo A prueba en carretera", "", ["Anexo A"], "hecho"],
    ["06", "B", "Embudo, prueba a domicilio y seguimiento", "Web + WhatsApp + CRM · fianza de 50 € · cadencia", "VolcanoCars-S06-Embudo-prueba-domicilio-seguimiento", ["FORM-08"], "nuevo"],
    ["07", "C", "Postventa, garantías y atención al cliente", "Respuesta en menos de 48 h", "VolcanoCars-S07-Postventa-garantias-atencion", ["FORM-09"], "nuevo"],
    ["08", "C", "Marketing digital, redes y marca", "Publicar con constancia y medir", "VolcanoCars-S08-Marketing-digital-redes-marca", ["FORM-10"], "nuevo"],
    ["09", "D", "Control financiero y anti-impagos", "Mermas · costes ocultos · tesorería · auditoría del viernes 15:00", "VolcanoCars-S09-Control-financiero-anti-impagos", ["FORM-11"], "nuevo"],
    ["10", "D", "Organización, puestos y matriz RACI", "Organigrama terminado y quién hace qué hoy", "VolcanoCars-S10-Organizacion-puestos-RACI", ["FORM-12"], "nuevo"],
    ["11", "D", "Cuadro de mando y métricas", "Los números que dirigen el negocio", "VolcanoCars-S11-Cuadro-de-mando-metricas", ["FORM-13"], "nuevo"],
  ];
  const INDICE = "VolcanoCars-S00-Indice-MO-00-v3.0";
  // Los manuales ya no son públicos: se piden con la sesión y se abren en otra pestaña
  const pdf = (f) => `#manual-${f}`;
  document.addEventListener("click", async (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#manual-"]'); if (!a) return; e.preventDefault();
    const w = window.open("", "_blank"); if (w) w.document.write("<p style='font:16px sans-serif;padding:24px'>Abriendo el manual…</p>");
    try {
      const r = await fetch("/api/manual/" + encodeURIComponent(a.getAttribute("href").slice(8)), { headers: { authorization: "Bearer " + (typeof PW !== "undefined" ? PW : "") } });
      if (!r.ok) throw new Error(r.status === 401 || r.status === 423 ? "Tu sesión ha caducado o falta fichar." : "No se ha podido abrir el manual.");
      const url = URL.createObjectURL(await r.blob()); if (w) w.location.href = url; else location.href = url;
    } catch (err) { if (w) w.close(); alert(err.message); }
  });

  /* ------------------------------------------------------------------
     FORMULARIOS DIGITALES (los que no tenían equivalente en el panel)
     tipos de campo: text · date · time · num · area · radio · checks · ok · info
     ------------------------------------------------------------------ */
  const OKNO = (k, items) => ({ k, type: "ok", items });
  const FORMS = {
    "FORM-05": {
      t: "Cascos y abonos", sis: "02", ger: false, uno: "casco o devolución",
      ayuda: "Una ficha por pieza. Se cierra (firma) solo cuando el abono está cobrado o descontado con su número.",
      campos: [
        { k: "fecha", l: "Fecha (montaje o recepción)", type: "date", req: 1, def: hoy },
        { k: "orden", l: "Nº de orden", ph: "VC-2026-0001" },
        { k: "pieza", l: "Pieza y referencia", req: 1 },
        { k: "proveedor", l: "Proveedor", req: 1 },
        { k: "tipo", l: "Tipo", type: "radio", req: 1, opts: [["C", "Casco"], ["E", "Error / sobrante"], ["D", "Defectuosa"]] },
        { k: "esperado", l: "Abono esperado (€)", type: "num" },
        { k: "chk", type: "checks", items: [["cliente", "El cliente decidió sobre su pieza vieja (FORM-04)"], ["caja", "Limpio, en la caja de la pieza nueva y etiquetado"], ["foto", "Foto del albarán de devolución firmado"]] },
        { k: "entregado", l: "Entregado al proveedor (fecha)", type: "date" },
        { k: "albaran", l: "Nº albarán de devolución" },
        { k: "nabono", l: "Nº de abono" },
        { k: "cobrado", l: "Importe cobrado (€)", type: "num" },
        { k: "nota", l: "Notas o reclamación", type: "area" },
      ],
      titulo: (d) => `${d.pieza || "Pieza"} · ${d.proveedor || "sin proveedor"}`,
      sub: (d) => `${d.orden || "sin orden"} · ${fd(d.fecha)}`,
      estado: (r) => {
        const d = r.datos; if (r.cerrado) return ["Cobrado", "ok"];
        const dd = dias(d.fecha, d.entregado || "");
        if (!d.entregado) return dd > 7 ? [`${dd} días sin entregar`, "mal"] : [`Pendiente · ${Number.isFinite(dd) ? dd : 0} días`, "ama"];
        return ["Entregado · falta abono", "ama"];
      },
      calc: (d) => {
        const dd = dias(d.fecha, d.entregado || ""), esp = n(d.esperado), cob = n(d.cobrado);
        const des = Number.isFinite(esp) && esp > 0 && Number.isFinite(cob) ? ((esp - cob) / esp) * 100 : NaN;
        return `<b>Días:</b> ${Number.isFinite(dd) ? dd : "—"} ${Number.isFinite(dd) && dd > 7 ? '<span class="sv-b mal">más de 7</span>' : ""} · <b>Desvío del abono:</b> ${Number.isFinite(des) ? des.toFixed(1).replace(".", ",") + " %" : "—"} ${Number.isFinite(des) && Math.abs(des) > 5 ? '<span class="sv-b mal">más del 5 %</span>' : ""}`;
      },
      cerrar: (d) => (!d.nabono || !Number.isFinite(n(d.cobrado)) ? "Para cerrar hace falta el nº de abono y el importe cobrado." : ""),
      resumen: (l) => {
        const ab = l.filter((r) => !r.cerrado), tarde = ab.filter((r) => !r.datos.entregado && dias(r.datos.fecha) > 7).length;
        const debe = ab.reduce((a, r) => a + (n(r.datos.esperado) || 0), 0);
        return `<span><b>${ab.length}</b> abiertos</span><span class="${tarde ? "mal" : ""}"><b>${tarde}</b> con más de 7 días</span><span><b>${eu(debe)}</b> nos deben</span>`;
      },
    },
    "FORM-06": {
      t: "Ronda 5S y seguridad", sis: "03", ger: false, uno: "ronda del viernes",
      ayuda: "Viernes 14:00. Marca cada punto OK o NO. Cada NO lleva una acción. Meta: 90 % o más.",
      campos: [
        { k: "semana", l: "Semana (viernes)", type: "date", req: 1, def: hoy },
        { k: "acompana", l: "Acompaña" },
        { k: "h_a", type: "info", html: "<h4>A · Seleccionar y ordenar</h4>" },
        OKNO("a", ["Zonas sin objetos que no se usan (tarjetas rojas resueltas)", "Herramientas en su silueta del panel", "Carros de herramientas ordenados y completos", "Líneas amarillas visibles y respetadas", "Estantes etiquetados; «Reservado» y «CASCOS» en orden", "Prueba del cronómetro: herramienta encontrada en ≤ 60 s"]),
        { k: "h_b", type: "info", html: "<h4>B · Limpiar</h4>" },
        OKNO("b", ["Suelo sin manchas de aceite ni arena", "Bancos y elevador limpios", "Zona de lavado y detailing recogida", "Recepción y aseo limpios"]),
        { k: "h_c", type: "info", html: "<h4>C · Seguridad</h4>" },
        OKNO("c", ["EPI disponibles y usándose en cada tarea", "Elevador: seguros, brazos y área libre", "Borriquetas junto a cada gato", "Extintores accesibles, con precinto y presión", "Botiquín completo", "Salidas de emergencia libres y señalizadas", "Cables y mangueras sin daños", "Compresor purgado y sin fugas"]),
        { k: "h_d", type: "info", html: "<h4>D · Residuos y cumplimiento</h4>" },
        OKNO("d", ["Cada residuo en su contenedor etiquetado y cerrado", "Ningún contenedor lleno; justificantes del gestor guardados", "Placa-distintivo, precio de la hora y cartel de reclamaciones visibles", "Revisiones de extintores, elevador y compresor al día"]),
        { k: "acciones", l: "Acciones (qué, quién, para cuándo)", type: "area", ph: "C3 · cambiar el extintor de la bahía 2 · Gerente · 10/10" },
      ],
      noNA: true,
      titulo: (d) => `Ronda del ${fd(d.semana)}`,
      sub: (d) => { const p = puntos(d, "abcd"); return p.tot ? `${p.ok} de ${p.tot} OK` : "sin puntos marcados"; },
      estado: (r) => { const p = puntos(r.datos, "abcd"); if (!p.tot) return ["Sin empezar", "ama"]; const pc = Math.round((p.ok / p.tot) * 100); return [`${pc} %`, pc >= 90 ? "ok" : pc >= 80 ? "ama" : "mal"]; },
      calc: (d) => { const p = puntos(d, "abcd"); const pc = p.tot ? Math.round((p.ok / p.tot) * 100) : NaN; return `<b>Puntuación:</b> ${Number.isFinite(pc) ? pc + " %" : "—"} (${p.ok} OK de ${p.tot}) ${Number.isFinite(pc) ? `<span class="sv-b ${pc >= 90 ? "ok" : pc >= 80 ? "ama" : "mal"}">${pc >= 90 ? "cumple" : "menos del 90 %"}</span>` : ""}`; },
      cerrar: (d) => { const p = puntos(d, "abcd"); if (p.tot < 22) return "Marca todos los puntos antes de firmar."; if (p.tot - p.ok > 0 && !String(d.acciones || "").trim()) return "Cada NO necesita una acción."; return ""; },
      resumen: (l) => { const u = l[0]; if (!u) return ""; const p = puntos(u.datos, "abcd"); return `<span>Última ronda: <b>${fd(u.datos.semana)}</b> · <b>${p.tot ? Math.round((p.ok / p.tot) * 100) : 0} %</b></span>`; },
    },
    "FORM-07": {
      t: "Hoja de preparación", sis: "04", ger: false, uno: "coche",
      ayuda: "Una por coche de venta. Empieza con FORM-04 «Inventario de venta» y termina en exposición. Meta: 24 h.",
      campos: [
        { k: "coche", l: "Marca y modelo", req: 1 },
        { k: "matricula", l: "Matrícula", req: 1 },
        { k: "orden", l: "Nº de orden", ph: "VC-2026-0001" },
        { k: "inicio", l: "Inicio", type: "datetime-local" },
        { k: "fin", l: "Fin", type: "datetime-local" },
        { k: "h_a", type: "info", html: "<h4>A · Exterior</h4>" },
        OKNO("a", ["Bajos y pasos de rueda con agua dulce (sin arena)", "Llantas y neumáticos", "Prelavado con espuma y lavado a dos cubos", "Descontaminado: pintura lisa al tacto", "Secado completo: retrovisores, juntas, tapa", "Cristales exteriores y marcos"]),
        { k: "h_b", type: "info", html: "<h4>B · Motor e interior</h4>" },
        OKNO("b", ["Motor limpio en frío y protector de plásticos", "Aspirado: raíles, bajo asientos, maletero, hueco de rueda", "Alfombrillas lavadas y secas", "Tapicería / cuero limpios", "Plásticos mate; cristales sin velo", "Sin olores (5 min puertas cerradas)", "Objetos del anterior dueño retirados; rueda y kit"]),
        { k: "h_c", type: "info", html: "<h4>C · Protección anti-salitre</h4>" },
        OKNO("c", ["Sellador o cera en toda la pintura", "Cera de cavidades en bajos, estribos y pasos de rueda", "Bisagras y cerraduras lubricadas; gomas protegidas", "Bornes de batería limpios y protegidos", "Faros pulidos y con protector UV", "Picaduras retocadas"]),
        { k: "h_d", type: "info", html: "<h4>D · Revisión final (gerente)</h4>" },
        { k: "chk", type: "checks", items: [["docs", "Documentación, 2 llaves y libro en la carpeta"], ["expo", "Llave etiquetada · coche en exposición"], ["fotos", "Vendedor avisado: listo para fotos (S05)"]] },
        { k: "defectos", l: "Defectos que quedan (→ foto 24)", type: "area" },
        { k: "productos", l: "Productos usados y coste aprox.", type: "area" },
        { k: "repasos", l: "Repasos en exposición (lunes y antes de pruebas)", type: "area", ph: "06/10 · 13/10 · prueba 15/10" },
      ],
      titulo: (d) => `${d.coche || "Coche"} · ${d.matricula || ""}`,
      sub: (d) => { const h = horas(d.inicio, d.fin); return Number.isFinite(h) ? `${h.toFixed(1).replace(".", ",")} h de preparación` : "en preparación"; },
      estado: (r) => (r.cerrado ? ["Aprobado", "ok"] : ["En preparación", "ama"]),
      calc: (d) => { const h = horas(d.inicio, d.fin); return `<b>Tiempo:</b> ${Number.isFinite(h) ? h.toFixed(1).replace(".", ",") + " h" : "—"} ${Number.isFinite(h) && h > 24 ? '<span class="sv-b mal">más de 24 h</span>' : ""}`; },
      cerrar: (d) => (!esGerente() ? "La revisión final la firma el gerente." : puntos(d, "abc").no > 0 ? "Hay puntos en NO: vuelve a preparación antes de firmar." : !(d.chk && d.chk.docs && d.chk.expo) ? "Marca documentación y exposición." : ""),
      resumen: (l) => `<span><b>${l.filter((r) => !r.cerrado).length}</b> en preparación</span>`,
    },
    "FORM-08": {
      t: "Prueba a domicilio · fianza 50 €", sis: "06", ger: false, uno: "prueba",
      ayuda: "Sin el «de acuerdo» del cliente a las 4 reglas no se cobra ni se agenda. Liquidación en 48 h como máximo.",
      campos: [
        { k: "cliente", l: "Cliente", req: 1 },
        { k: "telefono", l: "Teléfono", req: 1 },
        { k: "coche", l: "Coche y matrícula", req: 1 },
        { k: "fecha", l: "Fecha de la prueba", type: "date" },
        { k: "franja", l: "Franja", type: "radio", opts: [["m", "Mañana"], ["t", "Tarde"]] },
        { k: "direccion", l: "Dirección y municipio" },
        { k: "h_1", type: "info", html: "<h4>1 · Fianza y condiciones</h4>" },
        { k: "chk", type: "checks", items: [["reglas", "Mensaje de las 4 reglas enviado"], ["acuerdo", "El cliente contesta «de acuerdo» por escrito"], ["anexo", "Anexo A firmado antes de arrancar"], ["carnet", "Carnet en vigor y DNI/NIE"]] },
        { k: "medio", l: "Fianza cobrada con", type: "radio", opts: [["tpv", "Tarjeta/TPV"], ["enlace", "Enlace de pago"], ["bizum", "Bizum"]] },
        { k: "ref", l: "Referencia del cobro" },
        { k: "h_2", type: "info", html: "<h4>2 · Km y combustible</h4>" },
        { k: "km0", l: "Km salida del taller", type: "num" },
        { k: "km1", l: "Km vuelta al taller", type: "num" },
        { k: "consumo", l: "Consumo medio (l/100 km)", type: "num" },
        { k: "litro", l: "Precio del litro (€, ticket)", type: "num" },
        { k: "h_3", type: "info", html: "<h4>3 · Liquidación</h4>" },
        { k: "regla", l: "Qué pasó", type: "radio", opts: [["1", "1 · Canceló a tiempo (≥ 24 h) → 50 €"], ["2", "2 · No se presentó → se retienen 50 €"], ["3", "3 · Probó y no compra → 50 € − combustible"], ["4", "4 · Probó y compra → 50 € a cuenta"]] },
        { k: "devuelto", l: "Devuelto el", type: "date" },
        { k: "contrato", l: "Si compra: nº de contrato" },
        { k: "excepcion", type: "checks", items: [["dir", "Excepción autorizada por el Director (devolución íntegra)"]] },
        { k: "seg", l: "Seguimiento hecho (24 h · 48 h · 3 d · 7 d · 30 d · 6 meses)", type: "area" },
      ],
      titulo: (d) => `${d.cliente || "Cliente"} · ${d.coche || ""}`,
      sub: (d) => `${fd(d.fecha) || "sin fecha"} ${d.franja === "m" ? "· mañana" : d.franja === "t" ? "· tarde" : ""}`,
      estado: (r) => { const d = r.datos; if (r.cerrado) return ["Liquidada", "ok"]; if (!d.regla) return [d.chk && d.chk.acuerdo ? "Agendada" : "Falta el «de acuerdo»", d.chk && d.chk.acuerdo ? "ama" : "mal"]; const dd = dias(d.fecha); return [Number.isFinite(dd) && dd > 2 ? "Liquidar ya (más de 48 h)" : "Por liquidar", Number.isFinite(dd) && dd > 2 ? "mal" : "ama"]; },
      calc: (d) => { const l = liq(d); return `<b>Km:</b> ${Number.isFinite(l.km) ? l.km : "—"} · <b>Combustible real:</b> ${eu(l.comb)} · <b>A devolver:</b> ${eu(l.dev)} ${d.regla === "4" ? "· <b>50 € a cuenta del precio</b>" : ""}`; },
      cerrar: (d) => (!(d.chk && d.chk.acuerdo) ? "Falta el «de acuerdo» del cliente a las 4 reglas." : !d.regla ? "Marca qué pasó para liquidar la fianza." : d.regla === "3" && !Number.isFinite(liq(d).comb) ? "Faltan km, consumo o precio del litro." : (d.regla === "1" || d.regla === "3" || (d.excepcion && d.excepcion.dir)) && !d.devuelto ? "Pon la fecha en que se devolvió." : ""),
      resumen: (l) => { const ab = l.filter((r) => !r.cerrado); const tarde = ab.filter((r) => r.datos.regla && dias(r.datos.fecha) > 2).length; return `<span><b>${ab.length}</b> abiertas</span><span class="${tarde ? "mal" : ""}"><b>${tarde}</b> por liquidar con más de 48 h</span>`; },
    },
    "FORM-09": {
      t: "Registro de postventa", sis: "07", ger: false, uno: "incidencia",
      ayuda: "Acuse en 2 horas y solución o plan en 48 horas desde que se recibe. Se cierra solo con la confirmación del cliente.",
      campos: [
        { k: "recibida", l: "Recibida", type: "datetime-local", req: 1, def: () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) },
        { k: "canal", l: "Canal", type: "radio", opts: [["wa", "WhatsApp"], ["tel", "Teléfono"], ["taller", "Taller"], ["correo", "Correo"], ["google", "Google"]] },
        { k: "cliente", l: "Cliente", req: 1 },
        { k: "telefono", l: "Teléfono" },
        { k: "coche", l: "Coche y matrícula" },
        { k: "origen", l: "Viene de", type: "radio", opts: [["taller", "Taller (orden VC)"], ["venta", "Venta (contrato)"]] },
        { k: "ref", l: "Orden VC o contrato · fecha de entrega y km" },
        { k: "dice", l: "Lo que dice el cliente (sus palabras)", type: "area", req: 1 },
        { k: "tipo", l: "Tipo", type: "radio", opts: [["duda", "Duda"], ["inc", "Incidencia"], ["garr", "Garantía reparación (3 meses / 2.000 km)"], ["garc", "Garantía coche (12 meses)"], ["recl", "Reclamación"], ["hoja", "Hoja oficial"], ["resena", "Reseña"]] },
        { k: "acuse", l: "Acuse enviado", type: "datetime-local" },
        { k: "encontrado", l: "Qué encontramos", type: "area" },
        { k: "plan", l: "Plan (qué, quién, cuándo)", type: "area" },
        { k: "paga", l: "Quién paga", type: "radio", opts: [["vc", "Garantía Volcano Cars"], ["prov", "Garantía proveedor (S02)"], ["cli", "Cliente (presupuesto)"]] },
        { k: "coste", l: "Coste interno (piezas y horas)" },
        { k: "resuelto", l: "Resuelto el", type: "datetime-local" },
        { k: "chk", type: "checks", items: [["confirma", "El cliente confirma que está resuelto"], ["director", "Director informado (reclamación u hoja oficial)"], ["retraso", "Descuento por retraso aplicado (si procede)"]] },
        { k: "causa", l: "Causa raíz y qué cambiamos (sistema)", type: "area" },
      ],
      titulo: (d) => `${d.cliente || "Cliente"} · ${d.coche || ""}`,
      sub: (d) => `${fch(d.recibida)} · ${({ duda: "Duda", inc: "Incidencia", garr: "Garantía reparación", garc: "Garantía coche", recl: "Reclamación", hoja: "Hoja oficial", resena: "Reseña" })[d.tipo] || "sin clasificar"}`,
      estado: (r) => { if (r.cerrado) return ["Resuelta", "ok"]; const h = reloj(r.datos); if (!Number.isFinite(h)) return ["Abierta", "ama"]; if (h < 0) return [`Plazo de 48 h vencido`, "mal"]; return [`Quedan ${Math.floor(h)} h`, h < 12 ? "mal" : "ama"]; },
      calc: (d) => { const h = reloj(d), ac = d.acuse && d.recibida ? (Date.parse(d.acuse) - Date.parse(d.recibida)) / 36e5 : NaN; return `<b>Reloj de 48 h:</b> ${Number.isFinite(h) ? (h < 0 ? "vencido hace " + Math.ceil(-h) + " h" : "quedan " + Math.floor(h) + " h") : "—"} · <b>Acuse:</b> ${Number.isFinite(ac) ? ac.toFixed(1).replace(".", ",") + " h" : "—"} ${Number.isFinite(ac) && ac > 2 ? '<span class="sv-b mal">más de 2 h</span>' : ""}`; },
      cerrar: (d) => (!d.tipo ? "Clasifica la incidencia." : !d.plan ? "Escribe el plan." : !(d.chk && d.chk.confirma) ? "Solo se cierra con la confirmación del cliente." : (d.tipo === "recl" || d.tipo === "hoja") && !(d.chk && d.chk.director) ? "Informa al Director antes de cerrar." : ""),
      resumen: (l) => { const ab = l.filter((r) => !r.cerrado); const venc = ab.filter((r) => reloj(r.datos) < 0).length; return `<span><b>${ab.length}</b> abiertas</span><span class="${venc ? "mal" : ""}"><b>${venc}</b> con el plazo vencido</span>`; },
    },
    "FORM-10": {
      t: "Plan semanal de marketing", sis: "08", ger: true, uno: "semana",
      ayuda: "Lunes 8:30: un tema fijo por día. Viernes: números y marca. Solo el gerente.",
      campos: [
        { k: "semana", l: "Semana (lunes)", type: "date", req: 1, def: hoy },
        ...[["lu", "Lunes · Coche de la semana"], ["ma", "Martes · Antes y después"], ["mi", "Miércoles · Consejo de la isla"], ["ju", "Jueves · Coche en vídeo"], ["vi", "Viernes · Clientes y equipo"]].flatMap(([k, l]) => [
          { k: `${k}_q`, l, ph: "coche o trabajo" },
          { k: `${k}_c`, type: "checks", items: [["ig", "Instagram"], ["fb", "Facebook"], ["wa", "Estado WhatsApp"], ["port", "Portales"], ["hecho", "Hecho"]] },
        ]),
        { k: "numeros", l: "Números de la semana (campaña: visitas · solicitudes · ventas · gasto)", type: "area" },
        { k: "chk", type: "checks", items: [["marca", "Todo con logo, colores y letras de la marca"], ["verdad", "Precios con IGIC y datos reales"], ["garantia", "Sin garantía de reparaciones anunciada"], ["fotos", "Fotos de clientes solo con autorización"], ["masivos", "Ningún mensaje masivo por WhatsApp"], ["utm", "Cada enlace con UTM"]] },
        { k: "resenas", l: "Reseñas nuevas y contestadas", ph: "3 nuevas · todas contestadas" },
        { k: "decision", l: "Decisión del mes (última semana)", type: "area" },
      ],
      titulo: (d) => `Semana del ${fd(d.semana)}`,
      sub: (d) => `${["lu", "ma", "mi", "ju", "vi"].filter((k) => d[k + "_c"] && d[k + "_c"].hecho).length} de 5 días hechos`,
      estado: (r) => { const h = ["lu", "ma", "mi", "ju", "vi"].filter((k) => r.datos[k + "_c"] && r.datos[k + "_c"].hecho).length; return r.cerrado ? [`${h}/5 · cerrada`, h === 5 ? "ok" : "ama"] : [`${h}/5`, "ama"]; },
      calc: () => "",
      cerrar: () => "",
      resumen: () => "",
    },
    "FORM-11": {
      t: "Auditoría del viernes", sis: "09", ger: true, uno: "auditoría",
      ayuda: "Viernes 15:00 · 30 minutos · Director y Gerente. Máximo 3 acciones.",
      campos: [
        { k: "semana", l: "Viernes", type: "date", req: 1, def: hoy },
        { k: "h_a", type: "info", html: "<h4>A · Cobros y regla anti-impagos</h4>" },
        { k: "ent_t", l: "Coches entregados (taller)", type: "num" },
        { k: "ent_v", l: "Coches entregados (venta)", type: "num" },
        { k: "cobrados", l: "¿Todos cobrados al 100 %?", type: "radio", opts: [["si", "Sí"], ["no", "No"]] },
        { k: "pendientes", l: "Pendientes y excepciones (cliente · importe · motivo · fecha)", type: "area" },
        { k: "h_b", type: "info", html: "<h4>B · Caja · C · Fugas en euros</h4>" },
        { k: "descuadre", l: "Descuadre total de caja (€)", type: "num" },
        { k: "mermas", l: "Mermas de almacén (€)", type: "num" },
        { k: "herram", l: "Herramientas extraviadas (€)", type: "num" },
        { k: "abonos", l: "Abonos pendientes FORM-05 (€)", type: "num" },
        { k: "repetidos", l: "Trabajos repetidos (€)", type: "num" },
        { k: "retrasos", l: "Descuentos por retraso (€)", type: "num" },
        { k: "garantias", l: "Garantías FORM-09 (€)", type: "num" },
        { k: "comisiones", l: "Comisiones de cobro (€)", type: "num" },
        { k: "fuga", l: "Fuga más grande y por qué", type: "area" },
        { k: "h_d", type: "info", html: "<h4>D · Repostajes</h4>" },
        { k: "repostajes", l: "Repostajes (fecha · matrícula · km · litros · € · motivo · ticket)", type: "area" },
        { k: "h_e", type: "info", html: "<h4>E · Tesorería a 4 semanas</h4>" },
        { k: "saldo", l: "Saldo hoy (banco + caja, €)", type: "num" },
        { k: "cobros", l: "Cobros previstos 4 semanas (€)", type: "num" },
        { k: "pagos", l: "Pagos previstos 4 semanas (€)", type: "num" },
        { k: "colchon", l: "Colchón mínimo (€)", type: "num" },
        { k: "igic", l: "IGIC apartado esta semana (€)", type: "num" },
        { k: "h_f", type: "info", html: "<h4>F · Semáforo de los sistemas</h4>" },
        ...SIS.map((s) => ({ k: "s" + s[0], l: `S${s[0]} ${s[2]}`, type: "radio", opts: [["v", "Verde"], ["a", "Ámbar"], ["r", "Rojo"], ["-", "Aún no"]] })),
        { k: "h_g", type: "info", html: "<h4>G · Datos y facturas</h4>" },
        OKNO("g", ["Libro de facturas: «Comprobar integridad» dice Todo correcto", "Copia automática de anoche: /api/salud-web dice ok", "Copia externa de la semana guardada y verificada", "Total del listado de facturas = ingreso de taller en Finanzas (o la diferencia está explicada)", "Coste de personal de la semana revisado frente a las horas facturadas"]),
        { k: "acciones", l: "Acciones de la semana (máximo 3: qué · quién · cuándo · sistema)", type: "area" },
      ],
      titulo: (d) => `Auditoría del ${fd(d.semana)}`,
      sub: (d) => { const t = tes(d); return `Fugas: ${eu(fugas(d))} · Tesorería 4 sem.: ${eu(t)}`; },
      estado: (r) => { const d = r.datos, t = tes(d), c = n(d.colchon); const rojo = d.cobrados === "no" || (Number.isFinite(t) && Number.isFinite(c) && t < c); return r.cerrado ? [rojo ? "Firmada · con rojos" : "Firmada", rojo ? "mal" : "ok"] : ["Abierta", "ama"]; },
      calc: (d) => { const t = tes(d), c = n(d.colchon); return `<b>Fugas de la semana:</b> ${eu(fugas(d))} · <b>Saldo en 4 semanas:</b> ${eu(t)} ${Number.isFinite(t) && Number.isFinite(c) ? `<span class="sv-b ${t >= c ? "ok" : "mal"}">${t >= c ? "sobre el colchón" : "por debajo del colchón"}</span>` : ""}`; },
      cerrar: (d) => (!d.cobrados ? "Contesta si todo está cobrado al 100 %." : d.cobrados === "no" && !String(d.pendientes || "").trim() ? "Apunta los pendientes." : ""),
      resumen: (l) => (l[0] ? `<span>Última: <b>${fd(l[0].datos.semana)}</b></span>` : ""),
    },
  };
  function puntos(d, letras) { let ok = 0, no = 0; for (const L of letras) for (const [k, v] of Object.entries(d)) if (k.startsWith(L + "_") && /^[a-d]_\d+$/.test(k)) { if (v === "ok") ok++; else if (v === "no") no++; } return { ok, no, tot: ok + no }; }
  function horas(a, b) { if (!a || !b) return NaN; return (Date.parse(b) - Date.parse(a)) / 36e5; }
  function reloj(d) { if (!d.recibida) return NaN; return 48 - (Date.now() - Date.parse(d.recibida)) / 36e5; }
  function liq(d) { const km = n(d.km1) - n(d.km0), comb = Number.isFinite(km) && Number.isFinite(n(d.consumo)) && Number.isFinite(n(d.litro)) ? Math.floor(((km * n(d.consumo)) / 100) * n(d.litro) * 100) / 100 : NaN; let dev = NaN; const ex = d.excepcion && d.excepcion.dir; if (d.regla === "1" || ex) dev = 50; else if (d.regla === "2" || d.regla === "4") dev = 0; else if (d.regla === "3" && Number.isFinite(comb)) dev = Math.max(0, 50 - comb); return { km, comb, dev }; }
  function fugas(d) { return ["descuadre", "mermas", "herram", "abonos", "repetidos", "retrasos", "garantias", "comisiones"].reduce((a, k) => a + (Math.abs(n(d[k])) || 0), 0); }
  function tes(d) { const s = n(d.saldo), c = n(d.cobros), p = n(d.pagos); return Number.isFinite(s) ? s + (Number.isFinite(c) ? c : 0) - (Number.isFinite(p) ? p : 0) : NaN; }

  /* ---------------- estilos ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  #sv-lib summary .sv-ic{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;margin-right:12px;flex-shrink:0;color:#fff;background:linear-gradient(135deg,#1B1B19,#3a3733);box-shadow:inset 0 0 0 1.5px #D9481C}
  #sv-lib summary>span:first-child{display:flex;align-items:center}
  #sv-lib .sv-in{padding:0 20px 20px;display:grid;gap:14px}
  .sv-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .sv-bloq{display:grid;gap:8px}
  .sv-bloq h4{margin:6px 0 0;font-size:11.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:10px}
  .sv-bloq h4::after{content:"";flex:1;height:1px;background:var(--line)}
  .sv-row{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px 14px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface)}
  .sv-n{font-family:var(--display,inherit);font-stretch:80%;font-weight:900;font-size:26px;line-height:1;color:#D9481C;min-width:46px}
  .sv-n small{display:block;font-size:9.5px;letter-spacing:.14em;color:var(--muted);font-weight:800}
  .sv-t b{display:block;font-size:15px}
  .sv-t b .sv-b{display:inline-block!important;width:auto!important;margin:0 0 0 6px!important;vertical-align:2px}
  .sv-t>span{display:block;font-size:12.5px;color:var(--muted);margin-top:1px}
  .sv-t .sv-fs{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
  .sv-acts{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
  .sv-b{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--surface-2);color:var(--ink);vertical-align:1px}
  .sv-b.ok{background:var(--ok-soft,#E6F3EB);color:var(--ok,#1F8B4C)} .sv-b.mal{background:var(--bad-soft,#FCE4E0);color:var(--bad,#C0392B)} .sv-b.ama{background:#FDF1E2;color:#9A5410}
  .sv-f{font:inherit;font-size:12px;font-weight:800;padding:3px 9px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
  .sv-f.dig{border-color:#D9481C;color:#D9481C}
  @media(max-width:640px){.sv-row{grid-template-columns:auto 1fr}.sv-acts{grid-column:1/-1;justify-content:flex-start}}
  /* ventana del formulario */
  .sv-ov{position:fixed;inset:0;z-index:90;background:rgba(10,10,9,.55);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:24px 12px}
  .sv-win{width:min(820px,100%);background:var(--ground,#F7F5F1);border-radius:18px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);overflow:hidden}
  .sv-hd{background:#1B1B19;color:#F2EFEA;padding:16px 18px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
  .sv-hd small{display:block;color:#F2994A;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
  .sv-hd h3{margin:3px 0 0;font-size:20px;text-transform:uppercase;color:#F2EFEA}
  .sv-hd p{margin:4px 0 0;font-size:13px;color:#CFCAC2}
  .sv-x{border:0;background:#34322E;color:#fff;border-radius:10px;width:36px;height:36px;font-size:18px;cursor:pointer;flex-shrink:0}
  .sv-bd{padding:16px 18px;display:grid;gap:12px}
  .sv-res{display:flex;flex-wrap:wrap;gap:8px}
  .sv-res span{padding:6px 11px;border-radius:10px;background:var(--surface);color:var(--ink);border:1.5px solid var(--line);font-size:13px}
  .sv-res span.mal{border-color:var(--bad,#C0392B);color:var(--bad,#C0392B)}
  .sv-list{display:grid;gap:8px}
  .sv-it{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:11px 13px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
  .sv-it b{display:block;font-size:14.5px}.sv-it small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
  .sv-fm{display:grid;gap:12px}
  .sv-fm h4{margin:8px 0 -2px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#D9481C}
  .sv-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 12px}
  .sv-fm .field textarea.in{min-height:78px;resize:vertical}
  .sv-rad{display:flex;flex-wrap:wrap;gap:6px}
  .sv-rad label,.sv-chk label{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);font-size:14px;cursor:pointer;color:var(--ink);font-weight:600;text-transform:none;letter-spacing:0}
  .sv-rad input,.sv-chk input{width:18px;height:18px;accent-color:#D9481C}
  .sv-chk{display:grid;gap:6px}
  .sv-ok{display:grid;gap:6px}
  .sv-okr{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);font-size:14px}
  .sv-okb{display:flex;gap:4px}
  .sv-okb button{font:inherit;font-size:12.5px;font-weight:800;padding:6px 10px;border-radius:8px;border:1.5px solid var(--line);background:var(--surface-2);color:var(--ink);cursor:pointer}
  .sv-okb button[aria-pressed=true][data-v=ok]{background:#1F8B4C;border-color:#1F8B4C;color:#fff}
  .sv-okb button[aria-pressed=true][data-v=no]{background:#C0392B;border-color:#C0392B;color:#fff}
  .sv-okb button[aria-pressed=true][data-v=na]{background:#77726A;border-color:#77726A;color:#fff}
  .sv-calc{padding:10px 12px;border-radius:12px;background:var(--surface-2);color:var(--ink);border:1.5px dashed #D9481C;font-size:13.5px}
  .sv-ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:14px 18px;border-top:1.5px solid var(--line);background:var(--surface)}
  .sv-ft .sv-g2{display:flex;gap:8px;flex-wrap:wrap}
  .sv-firma{font-size:13px;color:var(--muted)}
  .sv-ro .sv-fm{pointer-events:none;opacity:.85}
  `;
  document.head.appendChild(css);

  /* ---------------- la tarjeta (biblioteca) ---------------- */
  const card = document.createElement("details");
  card.className = "card fin-cfg"; card.id = "sv-lib";
  const nuevos = SIS.filter((s) => s[6] === "nuevo").length;
  card.innerHTML = `<summary><span><span class="sv-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5M8 7h8M8 11h6"/></svg></span>
    <span><b>Sistemas Volcano Cars</b><small>MO-00 v3.0 · 11 sistemas en orden (S01 → S11) · PDF para el equipo y formularios digitales</small></span></span><span class="fin-ab">Abrir</span></summary>
    <div class="sv-in">
      <div class="sv-top">
        <a class="btn b-brand b-sm" href="${pdf(INDICE)}" target="_blank" rel="noopener">Índice MO-00 · orden de implantación ↗</a>
        <span class="hint" style="margin:0">Se implanta uno detrás de otro: un sistema pasa cuando lleva <b>dos viernes seguidos en verde</b> (auditoría FORM-11).</span>
      </div>
      ${["A", "B", "C", "D"].map((b) => `<div class="sv-bloq"><h4>Bloque ${b} · ${BLOQ[b]}</h4>${SIS.filter((s) => s[1] === b).map(fila).join("")}</div>`).join("")}
      <p class="hint" style="margin:0">Antes: «Manual SOP-01» = <b>S01</b> (los FORM-01 a 04 impresos siguen valiendo) · «SOP-02 El método de venta» = <b>S05</b> · Guía de WhatsApp = parte del <b>S06</b>. SOP-10 (tasación y compras) eliminado. ${nuevos} sistemas nuevos.</p>
    </div>`;
  function fila(s) {
    const [nn, , t, d, file, forms, est] = s;
    const fbtn = forms.map((f) => (FORMS[f] ? `<button type="button" class="sv-f dig" data-form="${f}" ${FORMS[f].ger ? 'data-ger="1"' : ""}>${f} · ${E(FORMS[f].t)}</button>` : `<span class="sv-b">${f}${f === "FORM-12" || f === "FORM-13" ? " · papel" : ""}</span>`)).join("");
    let acts = file ? `<a class="btn b-ghost b-sm" href="${pdf(file)}" target="_blank" rel="noopener">PDF ↗</a>` : "";
    if (nn === "01") acts += `<button type="button" class="btn b-ghost b-sm" data-ir="ordenes">Órdenes (FORM-01 a 04)</button>`;
    if (nn === "05") acts = `<button type="button" class="btn b-ghost b-sm" data-ir="guia">Abrir la Guía de venta</button>`;
    if (nn === "06") acts += `<button type="button" class="btn b-ghost b-sm" data-ir="resp">Guía WhatsApp · Respuestas</button>`;
    return `<div class="sv-row"><div class="sv-n"><small>S</small>${nn}</div>
      <div class="sv-t"><b>${E(t)} ${est === "hecho" ? '<span class="sv-b ok">en marcha</span>' : ""}</b><span>${E(d)}</span><div class="sv-fs">${fbtn}</div></div>
      <div class="sv-acts">${acts}</div></div>`;
  }
  // debajo de «Precios en la web» si existe; si no, bajo la cabecera del taller
  const ancla = q("#pt-cfg") || q(".head", sec) || sec.firstElementChild;
  ancla.insertAdjacentElement("afterend", card);

  card.addEventListener("click", (e) => {
    const b = e.target.closest("[data-form],[data-ir]"); if (!b) return;
    if (b.dataset.form) {
      if (b.dataset.ger && !esGerente()) { aviso("Este formulario es solo para el gerente."); return; }
      abrir(b.dataset.form); return;
    }
    const ir = b.dataset.ir;
    if (ir === "guia") { try { abrirGuia(); } catch (_) { location.hash = "guia"; } return; }
    if (ir === "resp") { const t = q("#tab-resp"); if (t) t.click(); return; }
    if (ir === "ordenes") { window.scrollTo({ top: q("#ordenes").getBoundingClientRect().top + scrollY - 80, behavior: "smooth" }); }
  });
  // el equipo no ve los botones de formularios del gerente
  const ocultarGer = () => qa("#sv-lib [data-ger]").forEach((b) => (b.hidden = !esGerente()));
  card.addEventListener("toggle", ocultarGer);

  /* ---------------- ventana de un formulario ---------------- */
  let OV = null, FORM = "", LISTA = [], ACT = null, YO = null;
  function cerrarOv() { if (OV) { OV.remove(); OV = null; document.body.style.overflow = ""; } }
  function marco(titulo, sub, cuerpo, pie) {
    cerrarOv();
    OV = document.createElement("div"); OV.className = "sv-ov"; OV.setAttribute("role", "dialog"); OV.setAttribute("aria-modal", "true");
    OV.innerHTML = `<div class="sv-win"><div class="sv-hd"><div><small>${E(sub)}</small><h3>${E(titulo)}</h3><p>${E(FORMS[FORM].ayuda)}</p></div><button type="button" class="sv-x" aria-label="Cerrar">✕</button></div><div class="sv-bd">${cuerpo}</div>${pie ? `<div class="sv-ft">${pie}</div>` : ""}</div>`;
    document.body.appendChild(OV); document.body.style.overflow = "hidden";
    q(".sv-x", OV).onclick = cerrarOv;
    OV.addEventListener("click", (e) => { if (e.target === OV) cerrarOv(); });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && OV) cerrarOv(); });

  async function abrir(form) {
    FORM = form; const F = FORMS[form];
    marco(`${form} · ${F.t}`, `Sistema ${F.sis}`, `<div class="empty">Cargando…</div>`);
    try { const r = await api("/api/sistemas?form=" + encodeURIComponent(form)); LISTA = r.registros || []; YO = r.yo || null; lista(); }
    catch (err) { q(".sv-bd", OV).innerHTML = `<div class="empty">${E(err.message)}</div>`; }
  }
  function lista() {
    const F = FORMS[FORM];
    const cuerpo = `<div class="sv-res">${F.resumen(LISTA) || ""}</div>
      <div class="sv-list">${LISTA.length ? LISTA.map((r) => { const [et, cl] = F.estado(r); return `<button type="button" class="sv-it" data-id="${r.id}"><span><b>${E(F.titulo(r.datos))}</b><small>${E(F.sub(r.datos))} · ${E(r.autor)}</small></span><span class="sv-b ${cl}">${E(et)}</span></button>`; }).join("") : `<div class="empty">Todavía no hay ninguno. Pulsa «+ Nuevo».</div>`}</div>`;
    const S = SIS.find((s) => s[0] === F.sis);
    marco(`${FORM} · ${F.t}`, `Sistema ${F.sis} · ${S ? S[2] : ""}`, cuerpo,
      `<div class="sv-g2"><button type="button" class="btn b-brand" id="sv-nuevo">+ Nuevo (${E(F.uno)})</button></div>${S && S[4] ? `<a class="btn b-ghost b-sm" href="${pdf(S[4])}" target="_blank" rel="noopener">PDF del sistema e impreso ↗</a>` : ""}`);
    q("#sv-nuevo", OV).onclick = () => editar(null);
    qa(".sv-it", OV).forEach((b) => (b.onclick = () => editar(LISTA.find((r) => r.id === b.dataset.id))));
  }

  function campo(c, d) {
    const v = d[c.k];
    if (c.type === "info") return `<div style="grid-column:1/-1">${c.html}</div>`;
    if (c.type === "ok") {
      const bs = FORMS[FORM].noNA ? [["ok", "OK"], ["no", "NO"]] : [["ok", "SÍ"], ["no", "NO"], ["na", "NA"]];
      return `<div class="sv-ok" style="grid-column:1/-1">${c.items.map((t, i) => { const k = `${c.k}_${i + 1}`; return `<div class="sv-okr"><span>${E(t)}</span><span class="sv-okb" data-k="${k}">${bs.map(([bv, bt]) => `<button type="button" data-v="${bv}" aria-pressed="${d[k] === bv}">${bt}</button>`).join("")}</span></div>`; }).join("")}</div>`;
    }
    if (c.type === "checks") { const o = v && typeof v === "object" ? v : {}; return `<div class="sv-chk" style="grid-column:1/-1" data-k="${c.k}">${c.items.map(([k, t]) => `<label><input type="checkbox" data-c="${k}" ${o[k] ? "checked" : ""}> ${E(t)}</label>`).join("")}</div>`; }
    if (c.type === "radio") return `<div class="field" style="grid-column:1/-1"><label>${E(c.l)}${c.req ? " *" : ""}</label><div class="sv-rad" data-k="${c.k}">${c.opts.map(([ov, ot]) => `<label><input type="radio" name="sv-${c.k}" value="${ov}" ${v === ov ? "checked" : ""}> ${E(ot)}</label>`).join("")}</div></div>`;
    if (c.type === "area") return `<div class="field" style="grid-column:1/-1"><label for="sv-${c.k}">${E(c.l)}${c.req ? " *" : ""}</label><textarea class="in" id="sv-${c.k}" data-k="${c.k}" placeholder="${E(c.ph || "")}">${E(v || "")}</textarea></div>`;
    const ty = c.type === "num" ? "text" : c.type || "text";
    return `<div class="field"><label for="sv-${c.k}">${E(c.l)}${c.req ? " *" : ""}</label><input class="in" id="sv-${c.k}" data-k="${c.k}" type="${ty}" ${c.type === "num" ? 'inputmode="decimal"' : ""} value="${E(v ?? "")}" placeholder="${E(c.ph || "")}"></div>`;
  }
  function leer() {
    const d = {};
    qa("[data-k]", OV).forEach((el) => {
      const k = el.dataset.k;
      if (el.classList.contains("sv-okb")) { const p = q("button[aria-pressed=true]", el); if (p) d[k] = p.dataset.v; }
      else if (el.classList.contains("sv-chk")) { const o = {}; qa("input[data-c]", el).forEach((i) => (o[i.dataset.c] = i.checked)); d[k] = o; }
      else if (el.classList.contains("sv-rad")) { const i = q("input:checked", el); if (i) d[k] = i.value; }
      else d[k] = el.value.trim();
    });
    return d;
  }
  function editar(r) {
    const F = FORMS[FORM];
    ACT = r;
    const d = r ? { ...r.datos } : {};
    if (!r) F.campos.forEach((c) => { if (c.def && !d[c.k]) d[c.k] = c.def(); });
    const ro = !!(r && r.cerrado);
    const cuerpo = `<form class="sv-fm" novalidate><div class="sv-g">${F.campos.map((c) => campo(c, d)).join("")}</div></form><div class="sv-calc" id="sv-calc"></div>
      ${r ? `<p class="sv-firma">Creado por ${E(r.autor)} el ${E(fch(r.creado))} · última edición: ${E(r.porUltimo)}, ${E(fch(r.actualizado))}${r.firma ? ` · <b>Firmado por ${E(r.firma.nombre)}</b> el ${E(fch(r.firma.t))}` : ""}</p>` : ""}`;
    const pie = ro
      ? `<div class="sv-g2"><button type="button" class="btn b-ghost" id="sv-volver">← Volver</button></div><div class="sv-g2">${esGerente() ? `<button type="button" class="btn b-ghost" id="sv-reabrir">Reabrir (gerente)</button>` : ""}</div>`
      : `<div class="sv-g2"><button type="button" class="btn b-ghost" id="sv-volver">← Volver</button>${r && esGerente() ? `<button type="button" class="btn b-ghost b-bad" id="sv-borrar">Borrar</button>` : ""}</div>
         <div class="sv-g2"><button type="button" class="btn b-ghost" id="sv-guardar">Guardar</button><button type="button" class="btn b-brand" id="sv-firmar">Guardar y firmar</button></div>`;
    marco(`${FORM} · ${F.t}`, r ? F.titulo(r.datos) : `Nuevo · ${F.uno}`, cuerpo, pie);
    const win = q(".sv-win", OV); if (ro) win.classList.add("sv-ro");
    const recalc = () => { const c = F.calc(leer()); const el = q("#sv-calc", OV); el.innerHTML = c; el.hidden = !c; };
    recalc();
    q(".sv-fm", OV).addEventListener("input", recalc);
    q(".sv-fm", OV).addEventListener("change", recalc);
    qa(".sv-okb", OV).forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const on = b.getAttribute("aria-pressed") === "true"; qa("button", g).forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", String(!on)); recalc(); }));
    q("#sv-volver", OV).onclick = () => lista();
    const guardar = async (cerrar) => {
      const datos = leer();
      const falta = F.campos.filter((c) => c.req && !String(datos[c.k] ?? "").trim()).map((c) => c.l);
      if (falta.length) { aviso("Falta: " + falta.join(", ")); return; }
      if (cerrar) { const m = F.cerrar(datos); if (m) { aviso(m); return; } }
      try {
        const res = ACT ? await api("/api/sistemas", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: FORM, id: ACT.id, datos, cerrar }) })
          : await api("/api/sistemas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: FORM, datos }) });
        let out = res;
        if (!ACT && cerrar) out = await api("/api/sistemas", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: FORM, id: res.id, datos, cerrar: true }) });
        LISTA = [out, ...LISTA.filter((x) => x.id !== out.id)].sort((a, b) => (a.id < b.id ? 1 : -1));
        aviso(cerrar ? "Guardado y firmado" : "Guardado"); lista();
      } catch (err) { aviso(err.message); }
    };
    const g = q("#sv-guardar", OV); if (g) g.onclick = () => guardar(false);
    const fi = q("#sv-firmar", OV); if (fi) fi.onclick = () => guardar(true);
    const bo = q("#sv-borrar", OV); if (bo) bo.onclick = async () => {
      if (!confirm("¿Borrar este formulario? No se puede deshacer.")) return;
      try { await api(`/api/sistemas?form=${encodeURIComponent(FORM)}&id=${encodeURIComponent(ACT.id)}`, { method: "DELETE" }); LISTA = LISTA.filter((x) => x.id !== ACT.id); aviso("Borrado"); lista(); } catch (err) { aviso(err.message); }
    };
    const re = q("#sv-reabrir", OV); if (re) re.onclick = async () => {
      try { const out = await api("/api/sistemas", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: FORM, id: ACT.id, reabrir: true }) }); LISTA = LISTA.map((x) => (x.id === out.id ? out : x)); aviso("Reabierto"); editar(out); } catch (err) { aviso(err.message); }
    };
  }
})();
