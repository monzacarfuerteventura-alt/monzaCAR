/* =====================================================================
   PANEL · DIAGNÓSTICO DEL SERVIDOR (actualización 71)
   Antes, cualquier fallo del servidor salía como «Algo ha fallado (404)» sin decir cuál. Ahora el mensaje dice qué ruta falló y por qué,
   y hay un diagnóstico que prueba las rutas principales y dice cuáles responden (se abre con volcanocars.com/admin.html#diagnostico
   o con el botón «Diagnóstico» de las pantallas del ERP cuando fallan). Solo LEE: no cambia ningún dato.
   ===================================================================== */
(function () {
  "use strict";
  if (typeof api !== "function") return;
  const _api = api, esc_ = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const corta = (p) => String(p).split("?")[0];
  // Mismo comportamiento que antes, pero el mensaje de error dice qué ruta falló
  api = async function (path, opts) {
    try { return await _api(path, opts); }
    catch (e) {
      const m = /^Algo ha fallado \((\d{3})\)/.exec(e && e.message || "");
      if (m) { const c = m[1]; e.estado = Number(c); e.ruta = corta(path); e.message = c === "404" ? `El servidor no tiene publicada la ruta ${corta(path)} (error 404). Abre el Diagnóstico para ver cuáles responden.` : `El servidor ha fallado en ${corta(path)} (error ${c}). Inténtalo de nuevo; si sigue, abre el Diagnóstico.`; }
      throw e;
    }
  };
  const RUTAS = [["Finanzas · resumen", "/api/finanzas/resumen"], ["ERP · permisos", "/api/erp/mis-permisos"], ["ERP · compras", "/api/erp/compras"], ["ERP · banco", "/api/erp/banco"], ["ERP · incentivos", "/api/erp/incentivos"], ["Coches", "/api/coches?todos=1"], ["Órdenes", "/api/ordenes"], ["Inventario", "/api/almacen/estado"], ["Mi usuario", "/api/taller/yo"]];
  async function probar(ruta) {
    const hoy = typeof hoyC === "function" ? hoyC() : new Date().toISOString().slice(0, 10), url = ruta.startsWith("/api/finanzas/resumen") ? `${ruta}?desde=${hoy}&hasta=${hoy}` : ruta, t0 = Date.now();
    try {
      const r = await fetch(url, { headers: { authorization: "Bearer " + (typeof PW !== "undefined" ? PW : "") } }), txt = await r.text(), ms = Date.now() - t0; let json = null; try { json = JSON.parse(txt); } catch (_) { }
      const tipo = json !== null ? "JSON" : /<html|<!doctype|not found/i.test(txt) ? "HTML" : "texto";
      let nota = "";
      if (r.ok) nota = "Funciona";
      else if (r.status === 404 && tipo !== "JSON") nota = "Netlify no encuentra esta función: NO está publicada";
      else if (r.status === 401) nota = "Sesión caducada (vuelve a entrar)";
      else if (r.status === 403) nota = "Sin permiso para esta parte";
      else if (r.status === 423) nota = "Hay que fichar la jornada";
      else nota = (json && json.error) || `Error ${r.status}`;
      return { ruta: url.split("?")[0], estado: r.status, ok: r.ok, tipo, ms, nota };
    } catch (e) { return { ruta: url.split("?")[0], estado: 0, ok: false, tipo: "-", ms: Date.now() - t0, nota: "Sin conexión" }; }
  }
  async function diagnostico() {
    const d = document.createElement("dialog"); d.className = "t-dlg fn-dlg erp-dlg"; d.innerHTML = '<div class="pe-in" style="padding:20px;display:grid;gap:12px"><h2 style="margin:0">Diagnóstico del servidor</h2><p class="hint">Probando las rutas principales (solo lectura)…</p><div id="dg-res"></div><div class="t-dlg-acts"><button class="btn b-ghost" type="button" id="dg-x">Cerrar</button></div></div>';
    document.body.appendChild(d); d.addEventListener("close", () => d.remove()); d.querySelector("#dg-x").onclick = () => d.close(); d.showModal();
    const res = await Promise.all(RUTAS.map(async ([n, r]) => ({ n, ...(await probar(r)) })));
    const mal = res.filter((x) => !x.ok && x.estado !== 401 && x.estado !== 403 && x.estado !== 423);
    d.querySelector("#dg-res").innerHTML = `<div class="msg ${mal.length ? "bad" : "ok"}">${mal.length ? mal.length + " ruta(s) NO responden. Hazme una captura de esta pantalla." : "Todas las rutas responden."}</div>${res.map((x) => `<div class="pe-lin"><b class="${x.ok ? "pe-bien" : "pe-mal"}">${x.ok ? "✓" : "✗"} ${x.estado || "—"}</b> · <b>${esc_(x.n)}</b><br><small>${esc_(x.ruta)}</small><div>${esc_(x.nota)} <small>(${x.tipo}, ${x.ms} ms)</small></div></div>`).join("")}<p class="hint">Hecho ${new Date().toLocaleString("es-ES", { timeZone: "Atlantic/Canary" })} · versión del panel 71</p>`;
    d.querySelector("p.hint").textContent = "Resultado:";
  }
  window.diagnosticoServidor = diagnostico;
  // volcanocars.com/admin.html#diagnostico lo abre solo al entrar (se recuerda al cargar, porque el panel cambia luego la dirección)
  let quiere = location.hash === "#diagnostico";
  const lanzar = () => { if (!quiere) return false; const l = document.getElementById("s-login"); if (l && l.hidden) { quiere = false; diagnostico(); return true; } return false; };
  let n = 0; const iv = setInterval(() => { if (lanzar() || ++n > 180) clearInterval(iv); }, 1000);
  window.addEventListener("hashchange", () => { if (location.hash === "#diagnostico") { quiere = true; lanzar(); } });
})();
