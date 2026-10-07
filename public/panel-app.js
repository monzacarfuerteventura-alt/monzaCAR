/* =====================================================================================================
   PANEL · CAPA «APP» PARA MÓVIL (actualización 47)
   Solo se activa con pantalla de móvil (≤ 720 px). En ordenador no cambia nada.
   NO quita ninguna función: lo que antes estaba arriba en pestañas y botones sigue ahí y funciona igual;
   en el móvil se llega a ello con la barra inferior, el botón «+» y la hoja «Más» (patrón de las apps de taller
   de EE. UU.: Tekmetric, Shopmonkey, Shop-Ware → barra inferior + acción principal + hojas deslizantes).
   Las pestañas de arriba (#tabs) y la barra de 3 botones (#gd-bar) se siguen pintando, solo quedan fuera de vista
   en móvil, y estos botones las pulsan por ti (así no hay dos códigos distintos para lo mismo).
   ===================================================================================================== */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MQ = window.matchMedia("(max-width:720px)");
  const visible = id => { const el = $("#" + id); return !!el && !el.hidden; };

  /* ---------- estilos (solo móvil) ---------- */
  const css = document.createElement("style"); css.id = "app-css";
  css.textContent = `
  #app-bar,#app-sheet{display:none}
  /* ordenador: las pestañas de la ficha son 6 (con Factura y Auditoría) y la rejilla era de 5 → «Auditoría» caía sola a una 2.ª fila */
  @media (min-width:721px){#tf .t-tabs{grid-template-columns:repeat(6,minmax(0,1fr)) auto}}
  @media (max-width:720px){
    :root{--app-h:64px}
    html.app-lock{overflow:hidden}
    /* las pestañas de arriba siguen en la página (otras partes las leen) pero fuera de vista */
    body.app-on #tabsrow{visibility:hidden!important;position:absolute!important;left:0;top:0;width:1px;height:1px;overflow:hidden;margin:0;padding:0}
    body.app-on #gd-bar{display:none!important}
    body.app-on:not(.app-nobar){padding-bottom:calc(var(--app-h) + env(safe-area-inset-bottom,0px) + 10px)}
    body.app-on #mk-fab{bottom:calc(var(--app-h) + env(safe-area-inset-bottom,0px) + 62px)}
    body.app-on.app-ficha #mk-fab{display:none}  /* rellenando una ficha el botón flotante tapa el semáforo; vuelve al salir */

    /* Taller: primero el trabajo (las órdenes); los ajustes de precios y sistemas quedan debajo, siguen ahí */
    body.app-on #s-ordenes:not([hidden]){display:flex;flex-direction:column}
    body.app-on #s-ordenes>.head{order:0}body.app-on #s-ordenes>#t-barra{order:1}body.app-on #s-ordenes>#ordenes{order:2}
    body.app-on #s-ordenes>#pt-cfg,body.app-on #s-ordenes>#sv-lib{order:3}

    /* ---- barra inferior ---- */
    body.app-on:not(.app-nobar):not(.app-kb) #app-bar{display:grid}
    #app-bar{position:fixed;left:0;right:0;bottom:0;z-index:30;grid-template-columns:1fr 1fr 76px 1fr 1fr;align-items:end;
      padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));min-height:var(--app-h);
      background:color-mix(in srgb,var(--ground) 90%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);
      border-top:1px solid var(--line);box-shadow:0 -8px 28px rgba(0,0,0,.18)}
    #app-bar button{position:relative;display:grid;justify-items:center;gap:2px;border:0;background:none;color:var(--muted);font:700 11px/1.1 var(--body,inherit);
      padding:6px 2px 4px;min-height:48px;border-radius:12px;cursor:pointer;-webkit-tap-highlight-color:transparent}
    #app-bar button svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #app-bar button[aria-current="true"]{color:var(--ink)}
    #app-bar button[aria-current="true"] svg{stroke:var(--brand-accent,#D9481C);stroke-width:2.2}
    #app-bar button[aria-current="true"]::before{content:"";position:absolute;top:-7px;left:30%;right:30%;height:3px;border-radius:0 0 4px 4px;background:var(--brand-accent,#D9481C)}
    #app-bar button:active{transform:scale(.94)}
    #app-bar .ab-n{position:absolute;top:2px;left:calc(50% + 6px);min-width:18px;height:18px;border-radius:99px;background:#D9481C;color:#fff;font:800 11px/18px var(--body,inherit);text-align:center;padding:0 5px}
    #app-bar .ab-fab{align-self:start;justify-self:center;margin-top:-26px;width:60px;height:60px;min-height:60px;border-radius:50%;background:#D9481C;color:#fff;
      box-shadow:0 8px 20px rgba(217,72,28,.5),0 0 0 5px var(--ground);padding:0;display:grid;place-items:center}
    #app-bar .ab-fab svg{width:30px;height:30px;stroke:#fff;stroke-width:2.4}
    #app-bar .ab-fab:active{transform:scale(.92)}

    /* ---- hojas deslizantes ---- */
    #app-sheet{position:fixed;inset:0;z-index:60}
    #app-sheet.on{display:block}
    #app-sheet .app-bd{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s}
    #app-sheet .app-pn{position:absolute;left:0;right:0;bottom:0;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;background:var(--surface);color:var(--ink);
      border-radius:24px 24px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.35);transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.8,.2,1);padding-bottom:env(safe-area-inset-bottom,0px)}
    #app-sheet.in .app-bd{opacity:1}#app-sheet.in .app-pn{transform:none}
    #app-sheet .app-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 18px 8px;position:relative;touch-action:none}
    #app-sheet .app-hd::before{content:"";position:absolute;top:7px;left:50%;width:42px;height:5px;margin-left:-21px;border-radius:9px;background:var(--line)}
    #app-sheet .app-hd b{font-size:20px;font-family:var(--display,inherit)}
    #app-sheet .app-x{width:44px;height:44px;border-radius:50%;border:0;background:var(--surface-2);color:var(--ink);font-size:18px;cursor:pointer}
    #app-sheet .app-by{overflow-y:auto;overscroll-behavior:contain;padding:6px 16px 18px;-webkit-overflow-scrolling:touch}
    .app-act{display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:0;border-radius:18px;padding:16px;margin:0 0 10px;color:#fff;font:inherit;cursor:pointer;min-height:76px}
    .app-act i{font-style:normal;font-size:28px;font-weight:800;width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.2);display:grid;place-items:center;flex:none}
    .app-act b{display:block;font-size:17px;line-height:1.2}.app-act small{display:block;font-size:13px;opacity:.9;margin-top:2px;font-weight:500}
    .app-act.a{background:#D9481C}.app-act.b{background:#1F7A55}.app-act.c{background:#1B1B1A;border:1.5px solid #4a4944}
    .app-act:active{transform:scale(.98)}
    .app-sub{margin:14px 2px 8px;font:800 12px/1 var(--body,inherit);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
    .app-chips{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .app-chips button{min-height:48px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:14px;font:700 14px/1.2 var(--body,inherit);padding:8px 10px;cursor:pointer}
    .app-chips button:active{background:var(--surface-2)}
    .app-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .app-tile{position:relative;display:grid;justify-items:center;align-content:center;gap:6px;min-height:92px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);
      border-radius:18px;font:700 13px/1.15 var(--body,inherit);padding:10px 4px;cursor:pointer;text-align:center}
    .app-tile svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .app-tile[aria-current="true"]{border-color:#D9481C;background:color-mix(in srgb,#D9481C 12%,var(--surface))}
    .app-tile .ab-n{position:absolute;top:6px;right:8px;min-width:20px;height:20px;border-radius:99px;background:#D9481C;color:#fff;font:800 11px/20px var(--body,inherit);padding:0 5px}
    .app-foot{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px}
    .app-foot a,.app-foot button{display:grid;place-items:center;min-height:48px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:700 14px/1.1 var(--body,inherit);text-decoration:none;cursor:pointer}
    .app-live{margin:12px 2px 0;font-size:12.5px;color:var(--muted);display:flex;gap:7px;align-items:center}
    .app-live i{width:9px;height:9px;border-radius:50%;background:#2fbf71;display:inline-block}

    /* ---- ficha de la orden (FORM-01 a FORM-04 y factura): cabecera compacta ---- */
    #tf .t-fhead{grid-template-columns:auto 1fr auto!important;gap:8px 10px}
    #tf .t-fcar{grid-column:1/-1!important;display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px}
    #tf .t-fcar small{flex:1 0 100%}
    #tf .t-fhead:not(.app-open) .t-facts{display:none}
    #tf .t-facts{grid-column:1/-1!important}
    #tf .t-facts .btn{flex:1 1 44%;min-height:44px}
    .app-more{order:2;width:44px;height:44px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-size:22px;line-height:1;cursor:pointer}
    #tf .t-fhead.app-open .app-more{background:var(--brand);color:var(--brand-ink)}
    /* las 5 pestañas de las fichas: UNA fila que se desliza, con el nombre entero (antes: «Recepc…», «Inspec…») */
    #tf .t-tabs{display:flex!important;gap:8px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;scrollbar-width:none;-webkit-overflow-scrolling:touch;
      margin:0 -16px 10px;padding:6px 16px;top:60px;position:sticky}
    #tf .t-tabs::-webkit-scrollbar{display:none}
    #tf .t-tabs button{flex:0 0 auto;min-width:112px;scroll-snap-align:center;justify-items:start;text-align:left;padding:8px 12px;min-height:56px}
    #tf .t-tabs b{font-size:14px;max-width:none;overflow:visible;text-overflow:clip}
    #tf .t-tabs small{font-size:10px}
    #tf .t-st{font-size:10.5px}
    /* progreso de la orden: línea fina en vez de 5 cajas */
    #tf .t-fases{gap:3px;margin-bottom:8px}
    #tf .t-fases li{padding:4px 2px!important}
    /* semáforo OK / Ámbar / Rojo / NA: botones grandes para el pulgar */
    .t-sem{gap:6px}
    .t-sem button{min-height:50px!important;font-size:14px!important;border-radius:12px!important}
    /* barra «Guardar / Firmar»: de 117 px a lo justo */
    .t-save{padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px))!important;gap:6px!important;margin:10px -12px 0!important}
    .t-save .t-sv{flex:1 0 100%;font-size:12px}
    .t-save .btn{min-height:48px;flex:1}
    .t-sticky{top:122px!important}
    /* factura: los datos fijos de la empresa (Emisor) ocupaban media pantalla; ahora van plegados (un toque los abre) */
    #tf .t-sec.app-fold>h3{cursor:pointer;display:flex;align-items:center}
    #tf .t-sec.app-fold>h3::after{content:"▾";margin-left:auto;padding-left:10px;font-size:16px;color:var(--muted);transition:transform .2s}
    #tf .t-sec.app-fold.app-open>h3::after{transform:rotate(180deg)}
    #tf .t-sec.app-fold:not(.app-open)>*:not(h3){display:none}
    input,select,textarea{font-size:16px}  /* iPhone: evita el zoom al tocar un campo */
    .btn{min-height:44px}
  }`;
  document.head.appendChild(css);

  /* ---------- iconos ---------- */
  const I = {
    dash: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4h6v4h-6zM4 20h6v-4H4z"/>',
    leads: '<path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    ordenes: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/>',
    alm: '<path d="M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8"/>',
    caja: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    jornada: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fin: '<path d="M4 19V9M10 19V4M16 19v-7M22 19H2"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    coches: '<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M3 16h18v3H3zM7 19v2M17 19v2"/>',
    resp: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
    mas: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k] || ""}</svg>`;
  const NOMBRE = { dash: "Inicio", leads: "CRM", ordenes: "Taller", alm: "Inventario", caja: "Caja", jornada: "Jornada", fin: "Finanzas", agenda: "Agenda", coches: "Coches", resp: "Respuestas", ayuda: "Ayuda" };

  /* ---------- lo que puede ver esta persona (mismas reglas que las pestañas de siempre) ---------- */
  const botonTab = t => $(`#tabs [data-tab="${t}"]`);
  function tabOk(t) {
    const b = botonTab(t); if (!b || b.hidden) return false;
    try { if (typeof puedeTab === "function" && !puedeTab(t)) return false; } catch (_) { }
    return true;
  }
  const cuenta = t => { const b = botonTab(t); const m = b && b.textContent.match(/(\d+)\s*$/); return m ? Number(m[1]) : 0; };
  const activa = () => { const b = $('#tabs [aria-selected="true"]'); return b ? b.dataset.tab : ""; };

  /* ---------- barra inferior ---------- */
  const barra = document.createElement("nav"); barra.id = "app-bar"; barra.setAttribute("aria-label", "Navegación principal");
  document.body.appendChild(barra);
  function item(t) { const n = cuenta(t); return `<button type="button" data-apptab="${t}" aria-current="${activa() === t}">${svg(t)}<span>${NOMBRE[t]}</span>${n ? `<em class="ab-n">${n > 99 ? "99+" : n}</em>` : ""}</button>`; }
  function pintarBarra() {
    const izq = [tabOk("dash") ? "dash" : (tabOk("leads") ? "leads" : ""), tabOk("ordenes") ? "ordenes" : ""].filter(Boolean);
    const der = [tabOk("caja") ? "caja" : (tabOk("agenda") ? "agenda" : "")].filter(Boolean);
    const principales = [...izq, ...der];
    const a = activa();
    const enMas = !principales.includes(a);
    const hayAcciones = tabOk("ordenes") || tabOk("caja");
    const sig = [izq.join(), der.join(), a, principales.map(cuenta).join(), hayAcciones].join("|");
    if (barra.dataset.sig === sig) return; barra.dataset.sig = sig;
    const relleno = n => Array.from({ length: n }, () => "<span></span>").join("");
    barra.innerHTML = izq.map(item).join("") + relleno(2 - izq.length) +
      (hayAcciones ? `<button type="button" class="ab-fab" data-appfab aria-label="Acciones rápidas: nueva entrada, factura, caja">${svg("plus")}</button>` : "<span></span>") +
      der.map(item).join("") + relleno(1 - der.length) +
      `<button type="button" data-appmas aria-current="${enMas}">${svg("mas")}<span>Más</span></button>`;
  }

  /* ---------- hojas ---------- */
  let hoja = null, foco = null;
  function cerrarHoja() {
    if (!hoja) return; const h = hoja; hoja = null; h.classList.remove("in");
    document.documentElement.classList.remove("app-lock");
    setTimeout(() => { h.remove(); }, 260); try { foco && foco.focus && foco.focus(); } catch (_) { }
  }
  function abrirHoja(titulo, html) {
    cerrarHoja(); foco = document.activeElement;
    const h = document.createElement("div"); h.id = "app-sheet"; h.className = "on";
    h.innerHTML = `<div class="app-bd" data-appclose></div><div class="app-pn" role="dialog" aria-modal="true" aria-label="${E(titulo)}"><div class="app-hd"><b>${E(titulo)}</b><button type="button" class="app-x" data-appclose aria-label="Cerrar">✕</button></div><div class="app-by">${html}</div></div>`;
    document.body.appendChild(h); hoja = h; document.documentElement.classList.add("app-lock");
    requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add("in")));
    // arrastrar hacia abajo para cerrar
    const pn = $(".app-pn", h), hd = $(".app-hd", h); let y0 = null, dy = 0;
    hd.addEventListener("touchstart", e => { y0 = e.touches[0].clientY; dy = 0; pn.style.transition = "none"; }, { passive: true });
    hd.addEventListener("touchmove", e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); pn.style.transform = `translateY(${dy}px)`; }, { passive: true });
    hd.addEventListener("touchend", () => { if (y0 == null) return; pn.style.transition = ""; pn.style.transform = ""; if (dy > 90) cerrarHoja(); y0 = null; });
    const x = $(".app-x", h); x && x.focus();
    return h;
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && hoja) cerrarHoja(); });

  function hojaAcciones() {
    const G = window.VCGuiado || {};
    const t = tabOk("ordenes"), c = tabOk("caja"); let pf = false; try { pf = G.puedeFactura ? G.puedeFactura() : false; } catch (_) { }
    let ut = []; try { ut = G.utilidades ? G.utilidades() : []; } catch (_) { }
    const h = abrirHoja("¿Qué quieres hacer?",
      (t ? `<button type="button" class="app-act a" data-gd="entrada"><i>＋</i><span><b>Nueva entrada · recepción de coche</b><small>Un coche llega: te guío paso a paso</small></span></button>` : "") +
      (pf ? `<button type="button" class="app-act b" data-gd="factura"><i>€</i><span><b>Factura rápida · cobro directo</b><small>El cliente está aquí y paga ya</small></span></button>` : "") +
      (c ? `<button type="button" class="app-act c" data-gd="caja"><i>⇄</i><span><b>Control de caja · entrada / salida</b><small>Abrir, cobrar, sacar dinero y cerrar</small></span></button>` : "") +
      (ut.length ? `<div class="app-sub">Más opciones / utilidades</div><div class="app-chips">${ut.map(([k, l]) => `<button type="button" data-gdutil="${E(k)}">${E(l)}</button>`).join("")}</div>` : ""));
    h.addEventListener("click", e => { if (e.target.closest("[data-gd],[data-gdutil]")) setTimeout(cerrarHoja, 0); });
  }
  function hojaMas() {
    const orden = ["dash", "leads", "ordenes", "alm", "caja", "jornada", "fin", "agenda", "coches", "resp", "ayuda"].filter(tabOk);
    const a = activa(); const live = $("#live-t"); const web = $('#topacts a[href]'), seg = $("#btn-seg"), sal = $("#logout");
    const h = abrirHoja("Todo el panel",
      `<div class="app-grid">${orden.map(t => { const n = cuenta(t); return `<button type="button" class="app-tile" data-apptab="${t}" aria-current="${a === t}">${svg(t)}<span>${NOMBRE[t]}</span>${n ? `<em class="ab-n">${n > 99 ? "99+" : n}</em>` : ""}</button>`; }).join("")}</div>` +
      `<div class="app-foot">${web ? `<a href="${E(web.getAttribute("href"))}" target="_blank" rel="noopener">Ver web</a>` : "<span></span>"}${seg ? `<button type="button" data-appclick="#btn-seg">Seguridad</button>` : "<span></span>"}${sal ? `<button type="button" data-appclick="#logout">Salir</button>` : "<span></span>"}</div>` +
      `<p class="app-live"><i></i>${E(live ? live.textContent : "En vivo")}</p>`);
    h.addEventListener("click", e => {
      const tl = e.target.closest("[data-apptab]"); if (tl) { const b = botonTab(tl.dataset.apptab); cerrarHoja(); if (b) b.click(); return; }
      const ck = e.target.closest("[data-appclick]"); if (ck) { const b = $(ck.dataset.appclick); cerrarHoja(); if (b) b.click(); }
    });
  }

  document.addEventListener("click", e => {
    if (e.target.closest("[data-appclose]") && hoja) { cerrarHoja(); return; }
    const t = e.target.closest("#app-bar [data-apptab]");
    if (t) { const b = botonTab(t.dataset.apptab); if (b) b.click(); setTimeout(sync, 60); try { navigator.vibrate && navigator.vibrate(6); } catch (_) { } return; }
    if (e.target.closest("[data-appfab]")) { hojaAcciones(); try { navigator.vibrate && navigator.vibrate(10); } catch (_) { } return; }
    if (e.target.closest("[data-appmas]")) { hojaMas(); return; }
    const fo = e.target.closest("#tf .t-sec.app-fold>h3"); if (fo) { fo.parentElement.classList.toggle("app-open"); return; }
    const m = e.target.closest(".app-more"); if (m) { const f = m.closest(".t-fhead"); if (f) f.classList.toggle("app-open"); }
  });
  // un toque en el semáforo vibra un poco (Android): sensación de botón de verdad
  document.addEventListener("click", e => { if (e.target.closest("[data-tsem]")) { try { navigator.vibrate && navigator.vibrate(8); } catch (_) { } } }, true);

  /* ---------- estado de la pantalla ---------- */
  function sync() {
    const body = document.body, movil = MQ.matches;
    const dentro = !!$("#topacts") && !$("#topacts").hidden && !visible("s-login");
    body.classList.toggle("app-on", movil && dentro);
    body.classList.toggle("app-ficha", visible("s-ficha"));
    body.classList.toggle("app-nobar", !dentro || visible("s-ficha") || visible("s-form"));
    if (movil && dentro) pintarBarra();
    if (!movil && hoja) cerrarHoja();
  }
  setInterval(function () { if (!document.hidden) sync(); }, 600); document.addEventListener("DOMContentLoaded", sync);
  MQ.addEventListener && MQ.addEventListener("change", sync);

  // con el teclado abierto la barra se esconde (si no, tapa lo que escribes)
  const campo = el => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|button|submit|file|range|color)$/.test(el.type || "");
  document.addEventListener("focusin", e => { if (campo(e.target)) document.body.classList.add("app-kb"); });
  document.addEventListener("focusout", () => setTimeout(() => { if (!campo(document.activeElement)) document.body.classList.remove("app-kb"); }, 120));

  /* ---------- fichas: botón «⋯» y pestaña activa a la vista ---------- */
  let ultimaTab = "";
  function afinarFicha() {
    const f = $("#tf .t-fhead");
    if (f && !$(".app-more", f)) { const b = document.createElement("button"); b.type = "button"; b.className = "app-more"; b.setAttribute("aria-label", "Imprimir, PDF y presupuesto"); b.textContent = "⋯"; const id = $(".t-fid", f); (id || f).insertAdjacentElement("afterend", b); }
    $$("#tf .t-sec").forEach(x => { if ($(".fc-em", x)) x.classList.add("app-fold"); });
    const nav = $("#tf .t-tabs"), sel = nav && $('[aria-selected="true"]', nav);
    if (sel) { const k = sel.dataset.ttabb; if (k !== ultimaTab || !nav.dataset.vista) { ultimaTab = k; nav.dataset.vista = "1"; nav.scrollTo({ left: Math.max(0, sel.offsetLeft - (nav.clientWidth - sel.offsetWidth) / 2), behavior: "smooth" }); } }
  }
  const tf = $("#tf");
  if (tf) new MutationObserver(() => { if (MQ.matches) afinarFicha(); }).observe(tf, { childList: true, subtree: true });
})();
