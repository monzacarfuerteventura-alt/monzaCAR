import { store, sumarDias, canarias, enviarEmail } from "./shared.mts";
import { mk, telegram } from "./marketing.mts";
import { diaResumido } from "./analitica.mts";

/*
  INFORME EJECUTIVO (automático): semana o mes cerrado, comparado con el periodo anterior de la misma duración.
  Lo usan la función programada «informe-auto» (email + Telegram + copia en el panel) y el panel.
*/
export type Kpis = { visitas: number; paginas: number; solicitudes: number; web: number; citas: number; ganadas: number; facturacion: number; conversion: number; contactos: number; respMediana: number | null; movil: number };
export type Informe = {
  id: string; tipo: "semanal" | "mensual"; titulo: string; desde: string; hasta: string; generado: string;
  kpis: Kpis; prev: Kpis; serie: { f: string; v: number; s: number }[];
  canales: [string, number, number][]; coches: { id: string; titulo: string; personas: number; leads: number }[];
  servicios: [string, number][]; campanas: [string, number, number][]; perdidas: [string, number][];
};

const enRango = (iso: string | undefined | null, d: string, h: string) => { if (!iso) return false; const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date(iso)); return f >= d && f <= h; };
const cierre = (x: any) => { const h = (x.historial || []).filter((e: any) => e.estado === "ganada").pop(); return h ? h.t : x.estado === "ganada" ? x.creado : null; };
// minutos en horario (L–V 8–16) no se calculan aquí: la mediana usa minutos reales, sin contar fines de semana ni noches no es trivial; se aproxima con tiempo real.
async function todasLasSolicitudes(desde: string) {
  const s = store("solicitudes"); const { blobs } = await s.list({ prefix: "s/" });
  const lim = desde.replace(/-/g, "");
  const out: any[] = [];
  // las ganadas pueden venir de solicitudes creadas antes del periodo: se leen las de los 120 días previos
  const corte = sumarDias(desde, -120).replace(/-/g, "");
  const ks = blobs.map((b) => b.key).filter((k) => k.slice(2, 10) >= corte);
  for (let i = 0; i < ks.length; i += 25) out.push(...(await Promise.all(ks.slice(i, i + 25).map((k) => s.get(k, { type: "json" }).catch(() => null)))).filter(Boolean));
  void lim; return out;
}
async function kpis(desde: string, hasta: string, hoy: string, sol: any[]) {
  const dias: string[] = []; for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);
  const ds = []; for (let i = 0; i < dias.length; i += 8) ds.push(...(await Promise.all(dias.slice(i, i + 8).map((f) => diaResumido(f, hoy)))));
  const leads = sol.filter((x) => enRango(x.creado, desde, hasta)), web = leads.filter((x) => !x.manual);
  const gan = sol.filter((x) => x.estado === "ganada" && enRango(cierre(x), desde, hasta));
  const resp = web.filter((x) => x.primerContacto).map((x) => (Date.parse(x.primerContacto) - Date.parse(x.creado)) / 6e4).sort((a, b) => a - b);
  const v = ds.reduce((a, d) => a + d.v, 0);
  const k: Kpis = {
    visitas: v, paginas: ds.reduce((a, d) => a + d.pv, 0), solicitudes: leads.length, web: web.length, citas: leads.filter((x) => x.cita).length,
    ganadas: gan.length, facturacion: gan.reduce((a, x) => a + (x.importe || 0), 0), conversion: v ? web.length / v : 0,
    contactos: ds.reduce((a, d) => a + (d.clkV || 0), 0), respMediana: resp.length ? Math.round(resp[Math.floor(resp.length / 2)]) : null,
    movil: v ? ds.reduce((a, d) => a + (d.dev?.["Móvil"] || 0), 0) / v : 0,
  };
  return { k, ds, dias, leads, gan };
}
export async function calcularInforme(tipo: "semanal" | "mensual", desde: string, hasta: string, hoy: string): Promise<Informe> {
  const n = Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5) + 1;
  const pDesde = tipo === "mensual" ? new Date(Date.UTC(+desde.slice(0, 4), +desde.slice(5, 7) - 2, 1)).toISOString().slice(0, 10) : sumarDias(desde, -n);
  const pHasta = sumarDias(desde, -1);
  const sol = await todasLasSolicitudes(pDesde);
  const A = await kpis(desde, hasta, hoy, sol), P = await kpis(pDesde, pHasta, hoy, sol);
  const fuentes: Record<string, number> = {}, porCanal: Record<string, number> = {}, cv: Record<string, number> = {}, cl: Record<string, number> = {}, serv: Record<string, number> = {}, camp: Record<string, number> = {}, campL: Record<string, number> = {}, mot: Record<string, number> = {};
  const add = (o: Record<string, number>, k: string, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };
  for (const d of A.ds) { for (const [k, x] of Object.entries(d.fuentes || {})) add(fuentes, k, x); for (const [k, x] of Object.entries(d.cochesV || {})) add(cv, k, x); for (const [k, x] of Object.entries(d.camp || {})) add(camp, k, x); }
  for (const x of A.leads) { if (!x.manual) add(porCanal, x.origen?.canal || "Directo"); if (x.coche?.id) add(cl, x.coche.id); (x.servicios || []).forEach((s: string) => add(serv, s)); if (x.origen?.utm_campaign) add(campL, String(x.origen.utm_campaign).toLowerCase()); }
  for (const x of sol) if (x.estado === "perdida" && enRango((x.historial || []).filter((h: any) => h.estado === "perdida").pop()?.t || x.creado, desde, hasta)) add(mot, x.motivo || "Sin indicar");
  const cars = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as any[] | null) || [];
  const nombre = (id: string) => { const c = cars.find((x) => x.id === id); return c ? `${c.marca} ${c.modelo}` : "Coche retirado"; };
  const orden = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fb = (f: string) => `${+f.slice(8)} ${MES[+f.slice(5, 7) - 1].slice(0, 3)}`;
  return {
    id: `${tipo}-${desde}`, tipo, desde, hasta, generado: new Date().toISOString(),
    titulo: tipo === "mensual" ? `Informe de ${MES[+desde.slice(5, 7) - 1]} ${desde.slice(0, 4)}` : `Informe semanal · ${fb(desde)} – ${fb(hasta)}`,
    kpis: A.k, prev: P.k,
    serie: A.dias.map((f, i) => ({ f, v: A.ds[i].v, s: A.leads.filter((x) => enRango(x.creado, f, f)).length })),
    canales: [...new Set([...Object.keys(fuentes), ...Object.keys(porCanal)])].map((k) => [k, fuentes[k] || 0, porCanal[k] || 0] as [string, number, number]).sort((a, b) => b[1] - a[1]),
    coches: [...new Set([...Object.keys(cv), ...Object.keys(cl)])].map((id) => ({ id, titulo: nombre(id), personas: cv[id] || 0, leads: cl[id] || 0 })).sort((a, b) => b.personas - a.personas).slice(0, 8),
    servicios: orden(serv).slice(0, 8),
    campanas: [...new Set([...Object.keys(camp), ...Object.keys(campL)])].map((k) => [k, camp[k] || 0, campL[k] || 0] as [string, number, number]).sort((a, b) => b[1] - a[1]),
    perdidas: orden(mot),
  };
}

// ---------- email ejecutivo (tablas: se ve bien en Gmail, Outlook y el móvil) ----------
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nf = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const eur = (n: number) => nf(n) + " €";
const pc = (n: number) => String(Math.round(n * 1000) / 10).replace(".", ",") + " %";
function delta(a: number, b: number, inverso = false) {
  if (!b) return a ? `<span style="color:#1F8B4C">nuevo</span>` : `<span style="color:#8C867D">—</span>`;
  const d = (a - b) / b * 100, bueno = inverso ? d < 0 : d > 0; const r = Math.round(d);
  if (!r) return `<span style="color:#8C867D">= que antes</span>`;
  return `<span style="color:${bueno ? "#1F8B4C" : "#B3261E"}">${d > 0 ? "▲" : "▼"} ${Math.abs(r)} %</span>`;
}
export function emailInforme(inf: Informe, urlPanel: string) {
  const k = inf.kpis, p = inf.prev;
  const tarjetas: [string, string, string, boolean?][] = [
    ["Facturación", k.facturacion ? eur(k.facturacion) : "—", delta(k.facturacion, p.facturacion), true],
    ["Solicitudes", nf(k.solicitudes), delta(k.solicitudes, p.solicitudes)],
    ["Visitas web", nf(k.visitas), delta(k.visitas, p.visitas)],
    ["Conversión", k.visitas ? pc(k.conversion) : "—", delta(k.conversion, p.conversion)],
    ["Citas", nf(k.citas), delta(k.citas, p.citas)],
    ["Cerradas", nf(k.ganadas), delta(k.ganadas, p.ganadas)],
  ];
  const celda = ([l, v, d, top]: [string, string, string, boolean?]) => `<td width="33%" style="padding:6px"><div style="background:${top ? "#1B1B1A" : "#F6F4F1"};border-radius:12px;padding:14px 14px 12px;${top ? "border-bottom:4px solid #D9481C" : ""}">
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${top ? "#A9A49B" : "#67635D"};font-weight:bold">${l}</div>
    <div style="font-size:24px;font-weight:900;color:${top ? "#FFFFFF" : "#1B1B1A"};margin:4px 0 2px">${v}</div><div style="font-size:12px;font-weight:bold">${d}</div></div></td>`;
  const max = Math.max(1, ...inf.serie.map((x) => x.v));
  const barras = inf.serie.map((x) => `<td valign="bottom" style="padding:0 1px"><div title="${esc(x.f)}" style="height:${Math.max(2, Math.round(x.v / max * 70))}px;background:${x.s ? "#D9481C" : "#CFC9C0"};border-radius:3px 3px 0 0"></div></td>`).join("");
  const fila = (a: string, b: string, c = "") => `<tr><td style="padding:7px 0;border-bottom:1px solid #EEE9E2">${a}</td><td align="right" style="padding:7px 0;border-bottom:1px solid #EEE9E2;font-weight:bold">${b}</td>${c !== "" ? `<td align="right" style="padding:7px 0 7px 10px;border-bottom:1px solid #EEE9E2;color:#67635D">${c}</td>` : ""}</tr>`;
  const bloque = (t: string, cuerpo: string) => `<tr><td style="padding:18px 22px 4px"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#D9481C;font-weight:900;margin-bottom:8px">${t}</div>${cuerpo}</td></tr>`;
  const ideas: string[] = [];
  if (k.respMediana !== null && k.respMediana > 30) ideas.push(`Se tarda ${k.respMediana} min de media en contestar. Contestar en menos de 15 min es lo que más sube las ventas.`);
  if (k.visitas && k.conversion < 0.02) ideas.push("Menos de 2 de cada 100 visitas piden algo: revisa los botones de WhatsApp y las fotos de los coches.");
  const frio = inf.coches.filter((c) => c.personas >= 10 && !c.leads)[0]; if (frio) ideas.push(`El ${esc(frio.titulo)} lo han mirado ${frio.personas} personas sin pedir nada: prueba con la financiación o un vídeo 360°.`);
  if (k.movil > 0.6) ideas.push(`El ${pc(k.movil)} de las visitas son desde el móvil.`);
  return `<!doctype html><html><body style="margin:0;background:#EDE9E3;font-family:Arial,Helvetica,sans-serif;color:#1B1B1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE9E3;padding:22px 10px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#121211;padding:22px 22px 18px;border-bottom:5px solid #D9481C"><span style="font-weight:900;font-size:20px;letter-spacing:3px;color:#F2EFEA">VOLCANO</span> <span style="background:#D9481C;color:#121211;font-weight:900;font-size:11px;letter-spacing:2px;padding:3px 7px;border-radius:4px">CARS</span>
  <div style="color:#FF8A5C;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin-top:14px">Informe ${inf.tipo} automático</div>
  <div style="color:#FFFFFF;font-size:26px;font-weight:900;line-height:1.15;margin-top:4px">${esc(inf.titulo)}</div>
  <div style="color:#A9A49B;font-size:13px;margin-top:4px">Comparado con ${inf.tipo === "mensual" ? "el mes anterior" : "la semana anterior"}</div></td></tr>
<tr><td style="padding:14px 16px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tarjetas.slice(0, 3).map(celda).join("")}</tr><tr>${tarjetas.slice(3).map(celda).join("")}</tr></table></td></tr>
${bloque("Visitas por día", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:74px"><tr>${barras}</tr></table><div style="font-size:12px;color:#67635D;margin-top:6px">En naranja, los días con alguna solicitud.</div>`)}
${ideas.length ? bloque("Qué haría esta semana", ideas.map((x) => `<div style="padding:9px 12px;margin-bottom:6px;background:#FFF3EE;border-left:4px solid #D9481C;border-radius:6px;font-size:14px;line-height:1.4">${x}</div>`).join("")) : ""}
${inf.canales.length ? bloque("De dónde vienen", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${inf.canales.slice(0, 6).map(([c, v, s]) => fila(esc(c), `${nf(v)} visitas`, `${s} ${s === 1 ? "solicitud" : "solicitudes"}`)).join("")}</table>`) : ""}
${inf.coches.length ? bloque("Coches con más interés", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${inf.coches.slice(0, 5).map((c) => fila(esc(c.titulo), `${nf(c.personas)} personas`, `${c.leads} ${c.leads === 1 ? "solicitud" : "solicitudes"}`)).join("")}</table>`) : ""}
${inf.campanas.length ? bloque("Campañas", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${inf.campanas.map(([c, v, s]) => fila(esc(c), `${nf(v)} visitas`, `${s} ${s === 1 ? "solicitud" : "solicitudes"}`)).join("")}</table>`) : ""}
<tr><td style="padding:20px 22px 26px"><a href="${esc(urlPanel)}" style="display:inline-block;background:#D9481C;color:#fff;text-decoration:none;font-weight:bold;padding:13px 20px;border-radius:999px">Ver el informe completo en el panel</a>
<p style="color:#8C867D;font-size:12px;margin:16px 0 0">Visitas contadas sin cookies ni datos personales. Facturación = importes apuntados en el CRM al cerrar cada venta o trabajo.</p></td></tr>
</table></td></tr></table></body></html>`;
}

// Genera el último periodo cerrado, lo guarda y (si se pide) lo envía por email y Telegram
export async function generar(tipo: "semanal" | "mensual", origin: string, enviar: boolean) {
  const { fecha: hoy } = canarias();
  let desde: string, hasta: string;
  if (tipo === "semanal") { const dow = (new Date(hoy + "T12:00:00Z").getUTCDay() + 6) % 7; hasta = sumarDias(hoy, -dow - 1); desde = sumarDias(hasta, -6); }
  else { const y = +hoy.slice(0, 4), m = +hoy.slice(5, 7); desde = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10); hasta = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10); }
  const inf: Informe = await calcularInforme(tipo, desde, hasta, hoy);
  await mk().setJSON("informes/" + inf.id, inf);
  if (enviar) {
    const url = `${origin}/admin.html#informe=${encodeURIComponent(inf.id)}`;
    await enviarEmail(`📊 ${inf.titulo} · Volcano Cars`, [], [], "", [], emailInforme(inf, url)).catch(() => {});
    const k = inf.kpis;
    await telegram(`📊 <b>${inf.titulo}</b>\n👀 ${k.visitas} visitas · 📩 ${k.solicitudes} solicitudes · 📅 ${k.citas} citas\n✅ ${k.ganadas} cerradas${k.facturacion ? ` · 💶 ${Math.round(k.facturacion)} €` : ""}\n\nInforme completo: ${url}`);
  }
  return inf;
}

