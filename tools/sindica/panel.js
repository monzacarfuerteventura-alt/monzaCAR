/* =====================================================================
   PANEL · MULTIPUBLICACIÓN EN OTROS PORTALES (tarjeta en la pestaña «Coches», solo gerente)
   (se copia dentro de public/admin.html con: python3 tools/sindica/inyectar.py)
   Lee GET /api/sindica y enseña: en qué punto estás (4 pasos), los enlaces para portales y multipublicadores,
   la conexión directa por API, el botón «Simular ahora» y el estado de cada coche con consejos para completarlo.
   ===================================================================== */
let MP = null, mpCargando = false, mpUlt = 0, mpMsg = "";
const mpMiles = (txt) => txt.replace(/\B(?=(\d{3})+(?!\d))/g, ".");   // 2999 → 2.999 (el navegador no agrupa los de 4 cifras en español)
const mpEur = (n) => { const [e, d] = Number(n).toFixed(2).split("."); return mpMiles(e) + (d === "00" ? "" : "," + d) + " €"; };
const mpKm = (n) => mpMiles(String(Math.round(n))) + " km";
const mpPlural = (n, a, b) => (n === 1 ? a : b);

function mpCrear() {
  if ($("#mp-cfg")) return true;
  const ref = $("#fin-cfg");
  if (!ref) return false;
  ref.insertAdjacentHTML("afterend", `<details class="card fin-cfg" id="mp-cfg">
    <summary><span><b>Multipublicación en otros portales</b><small id="mp-res">Cargando…</small></span><span class="fin-ab">Ver</span></summary>
    <div class="mp-body" id="mp-body"></div></details>`);
  $("#mp-cfg").addEventListener("toggle", () => { if ($("#mp-cfg").open) mpCargar(true); });
  $("#mp-body").addEventListener("click", mpClick);
  return true;
}

async function mpCargar(forzar) {
  if (!PW || mpCargando || !mpCrear()) return;
  if (!forzar && Date.now() - mpUlt < 20000) return;
  mpCargando = true;
  try { MP = await api("/api/sindica"); mpUlt = Date.now(); mpMsg = ""; }
  catch (err) { MP = null; mpMsg = err.message || "No se ha podido cargar."; }
  finally { mpCargando = false; }
  mpPintar();
}

function mpResumen() {
  if (!MP) return mpMsg ? "No se ha podido cargar · toca para reintentar" : "Cargando…";
  const r = MP.resumen, modo = MP.simulacro ? "Modo simulacro" : "Envío real activado";
  return `${modo} · ${r.enFeeds} de ${r.disponibles} ${mpPlural(r.disponibles, "coche listo", "coches listos")} · ${MP.feeds.activo ? "enlaces activos" : "enlaces apagados"}`;
}

function mpSemaforo() {
  const r = MP.resumen, f = MP.feeds, a = MP.canalesApi[0];
  if (r.disponibles === 0) return ["aviso", "No hay coches disponibles", "Publica un coche en «+ Añadir coche» y aparecerá aquí."];
  if (!f.activo) return ["aviso", "Falta un paso para empezar", "Los enlaces están apagados. Mira el paso 2."];
  if (r.conProblemas) return ["aviso", `${r.conProblemas} ${mpPlural(r.conProblemas, "coche necesita", "coches necesitan")} un arreglo`, "No saldrán en los portales hasta que lo completes (mira la lista de abajo)."];
  if (!a.activadoEnNetlify) return ["ok", "Tus coches ya están listos para los portales", "Dale el enlace del paso 2 a tu multipublicador o al portal. La conexión directa (paso 3) es opcional."];
  return ["ok", MP.simulacro ? "Conectado en modo prueba" : "Publicando en los portales", MP.simulacro ? "Solo calcula lo que enviaría. Para enviar de verdad, activa el envío real." : "Cada cambio de precio, venta o reserva se refleja solo."];
}

function mpFeedFila(clave, nombre, desc) {
  const url = MP.feeds[clave];
  return `<div class="mp-fila"><span><b>${esc(nombre)}</b><small>${esc(desc)}</small></span>${url
    ? `<span class="mp-acc"><button class="btn b-ghost b-sm" type="button" data-mp="copiar" data-k="${clave}">Copiar enlace</button><button class="btn b-ghost b-sm" type="button" data-mp="abrir" data-k="${clave}" aria-label="Ver el feed de ${esc(nombre)}">Ver</button></span>`
    : `<span class="chip">Apagado</span>`}</div>`;
}

function mpCoche(c) {
  const hayApi = MP.canalesApi.some((x) => x.activadoEnNetlify);
  const chips = [];
  if (c.estado === "reservado") chips.push(`<span class="chip aviso">Reservado · sale de los feeds</span>`);
  else if (c.feeds.xml.ok) chips.push(`<span class="chip ok">Listo para los portales</span>`);
  else chips.push(...c.feeds.xml.problemas.map((p) => `<span class="chip rojo">Falta: ${esc(p)}</span>`));
  if (hayApi) for (const [k, v] of Object.entries(c.api)) {
    const t = { publicado: ["ok", "publicado"], error: ["aviso", "reintentando"], rechazado: ["rojo", "rechazado"], "sin-enviar": ["", "sin enviar"], retirado: ["", "retirado"], pendiente: ["", "pendiente"] }[v.estado] || ["", v.estado];
    chips.push(`<span class="chip ${t[0]}">${k === "autoscout24" ? "AutoScout24" : esc(k)}: ${t[1]}</span>`);
  }
  const cons = c.consejos.slice(0, 3).map((x) => `<li class="${x.nivel}">${esc(x.texto)}</li>`);
  if (c.dias >= 14 && c.estado === "disponible") cons.push(`<li>Lleva ${c.dias} días publicado: en portales que ordenan por fecha conviene renovarlo cada 7–10 días.</li>`);
  const err = Object.values(c.api).find((v) => v.ultimoError);
  return `<div class="mp-coche">${c.foto ? `<img src="${esc(FOTO(c.foto))}" alt="" loading="lazy">` : `<span></span>`}<div>
    <b>${esc(c.titulo)}</b><span class="sub">${c.anio} · ${mpKm(c.km)} · <strong>${mpEur(c.precio)}</strong> · ${c.fotos} ${mpPlural(c.fotos, "foto", "fotos")}</span>
    <div class="mp-chips">${chips.join("")}</div>
    ${err ? `<p class="mp-nota rojo">Último error: ${esc(err.ultimoError)}</p>` : ""}
    ${cons.length ? `<p class="mp-nota" style="margin-top:8px">Para mejorar el anuncio:</p><ul class="mp-cons">${cons.join("")}</ul>` : ""}</div></div>`;
}

function mpPintar() {
  mpCrear();
  const res = $("#mp-res"), box = $("#mp-body");
  if (!res || !box) return;
  res.textContent = mpResumen();
  if (!MP) { box.innerHTML = `<div class="empty">${esc(mpMsg || "Cargando…")}<br><button class="btn b-ghost b-sm" type="button" data-mp="recargar" style="margin-top:10px">Reintentar</button></div>`; return; }
  const [tipo, tit, sub] = mpSemaforo(), a = MP.canalesApi[0], f = MP.feeds;
  const ult = MP.ultimo ? `Última revisión: ${new Date(MP.ultimo.t).toLocaleString("es-ES", { timeZone: "Atlantic/Canary", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (${MP.ultimo.modo})` : "Todavía no se ha hecho ninguna revisión automática.";
  const faltan = a.faltan.length ? `Falta en Netlify: ${a.faltan.join(", ")}.` : "";
  box.innerHTML = `
    <div class="mp-sem ${tipo}"><span aria-hidden="true">${tipo === "ok" ? "✅" : "⚠️"}</span><div><b>${esc(tit)}</b><span>${esc(sub)}</span></div></div>

    <div class="mp-sec"><h3><i>1</i>Tus coches</h3>
      <p>Salen en los portales los coches «Disponibles» con fotos, precio y datos básicos. Los vendidos se retiran solos; los reservados se mantienen sin tocar.</p>
      ${MP.coches.length ? MP.coches.map(mpCoche).join("") : `<div class="empty">Aún no hay coches publicados.</div>`}
    </div>

    <div class="mp-sec"><h3><i>2</i>Enlaces para portales</h3>
      <p>Pégalos donde te lo pida el portal o el multipublicador. Son privados: no los publiques en redes.</p>
      ${f.activo ? "" : `<p class="mp-nota rojo">Apagados: falta la variable FEED_TOKEN en Netlify (Project configuration → Environment variables). Pon un texto largo al azar, de 24 letras o más, y vuelve a publicar la web.</p>`}
      ${mpFeedFila("xml", "Feed XML", "El formato general · lo entienden casi todos")}
      ${mpFeedFila("json", "Feed JSON", "Todos los datos del coche · para multipublicadores")}
      ${mpFeedFila("meta", "Facebook e Instagram", "Catálogo de vehículos de Meta (anuncios de pago)")}
    </div>

    <div class="mp-sec"><h3><i>3</i>Conexión directa (opcional)</h3>
      <p>Para que los cambios lleguen solos al portal, sin multipublicador.</p>
      <div class="mp-fila"><span><b>AutoScout24</b><small>${a.activadoEnNetlify ? (faltan || "Conectado") : "Sin activar · " + (faltan || "listo para activar")}</small></span>
        <span class="chip ${a.activadoEnNetlify && !a.faltan.length ? "ok" : ""}">${a.activadoEnNetlify && !a.faltan.length ? "Conectado" : "Sin configurar"}</span></div>
      ${a.circuito && a.circuito.abiertoHasta && Date.parse(a.circuito.abiertoHasta) > Date.now() ? `<p class="mp-nota rojo">AutoScout24 está fallando: se ha pausado hasta ${new Date(a.circuito.abiertoHasta).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Atlantic/Canary" })}.</p>` : ""}
    </div>

    <div class="mp-sec"><h3><i>4</i>Probar sin riesgo</h3>
      <p>«Simular» calcula qué crearía, cambiaría o retiraría, sin enviar nada. ${MP.simulacro ? "Ahora estás en <b>modo simulacro</b>: aunque haya canales conectados, nada se envía." : "El <b>envío real</b> está activado."}</p>
      <div class="mp-acc" style="width:100%"><button class="btn b-acc b-sm" type="button" data-mp="simular">Simular ahora</button>${MP.simulacro ? "" : `<button class="btn b-ghost b-sm" type="button" data-mp="enviar">Enviar ahora</button>`}</div>
      <div id="mp-plan" class="mp-res" hidden></div>
      <p class="mp-nota">${esc(ult)}</p>
    </div>

    <details class="mp-ayuda"><summary>¿Qué portal me conviene y cómo se conecta?</summary><div>
      <span><b>Coches.net y Milanuncios:</b> se alimentan desde un multipublicador (por ejemplo StockSpark, Maxterauto, Inventario.pro o Portalclub) o con alta profesional en cada portal.</span>
      <span><b>Wallapop PRO Coches:</b> su plan Advanced admite catálogo por API o por multipublicador. Pídele a su equipo el acceso.</span>
      <span><b>AutoScout24:</b> su API es para socios de datos; lo habitual es pasar por un multipublicador o pedir acceso.</span>
      <span><b>Facebook e Instagram:</b> el catálogo de Meta sirve para anuncios de pago, no para publicar gratis.</span>
      <span><b>Consejo del sector:</b> mejor 3 o 4 portales bien trabajados que 10 descuidados. Las tarifas se contratan con cada portal.</span>
    </div></details>`;
}

async function mpClick(e) {
  const b = e.target.closest("[data-mp]");
  if (!b || !MP) { if (b && b.dataset.mp === "recargar") mpCargar(true); return; }
  const acc = b.dataset.mp;
  if (acc === "copiar" || acc === "abrir") {
    const url = MP.feeds[b.dataset.k];
    if (!url) return;
    if (acc === "abrir") { window.open(url, "_blank", "noopener,noreferrer"); return; }
    try { await navigator.clipboard.writeText(url); }
    catch (_) { const t = document.createElement("textarea"); t.value = url; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (_) {} t.remove(); }
    toast("Enlace copiado. Pégalo donde te lo pida el portal.");
    return;
  }
  if (acc === "simular" || acc === "enviar") {
    if (acc === "enviar" && !confirm("Se enviarán ahora a los portales todos los cambios pendientes. ¿Seguro?")) return;
    b.disabled = true; const caja = $("#mp-plan"); caja.hidden = false; caja.textContent = acc === "simular" ? "Calculando…" : "Enviando…";
    try {
      const r = await api("/api/sindica" + (acc === "simular" ? "?simulacro=1" : ""), { method: "POST" });
      if (r.omitido) { caja.textContent = r.omitido; }
      else {
        const cs = Object.entries(r.canales || {});
        if (!cs.length) caja.innerHTML = "No hay ningún canal de API activado, así que no hay nada que enviar. Los enlaces del paso 2 se leen solos.";
        else caja.innerHTML = cs.map(([k, v]) => {
          const g = (t) => v.plan.filter((p) => p.tipo === t).map((p) => esc(p.titulo || p.id));
          const lin = [["crear", "Publicaría"], ["actualizar", "Actualizaría"], ["retirar", "Retiraría"]].filter(([t]) => g(t).length).map(([t, txt]) => `<li><b>${txt}:</b> ${g(t).join(", ")}</li>`);
          const inv = Object.entries(v.invalidos || {}).map(([id, pr]) => `<li><b>No puede salir:</b> ${esc((MP.coches.find((x) => x.id === id) || {}).titulo || id)} (${esc(pr.join("; "))})</li>`);
          const cab = acc === "enviar" ? `Enviado: ${v.hechas} bien, ${v.fallos} con fallo.` : "Esto es lo que haría:";
          return `<b>${esc(k === "autoscout24" ? "AutoScout24" : k)}</b>${v.pausado ? "<span>Pausado porque el portal está fallando.</span>" : ""}<span>${cab}</span>${lin.length || inv.length ? `<ul>${lin.join("")}${inv.join("")}</ul>` : "<span>Todo está al día: no hay nada que cambiar.</span>"}`;
        }).join("");
      }
      mpUlt = 0; if (acc === "enviar") mpCargar(true);
    } catch (err) { caja.textContent = err.message; }
    b.disabled = false;
  }
}

/* Aparece (y se actualiza) cada vez que se abre la pestaña «Coches», solo para el gerente */
(function mpArrancar() {
  const lista = $("#s-list");
  if (!lista) return;
  const mirar = () => { if (!lista.hidden && typeof PUEDE_TODO === "function" && ME && PUEDE_TODO()) { mpCrear(); mpCargar(false); } };
  new MutationObserver(mirar).observe(lista, { attributes: true, attributeFilter: ["hidden"] });
  mirar();
})();
