import { store, enviarAviso } from "../shared.mts";
import { desdeCoche, consejos, type CocheWeb, type VehiculoUnificado } from "./esquema.mts";
import { CANALES } from "./adaptadores.mts";
import { calcularOperaciones, anotar, conReintentos, MAX_INTENTOS, ErrorCanal, esReintentable, circuitoNuevo, circuitoAbierto, pasarPorCircuito, type RegistroCanal, type Operacion, type Circuito } from "./estado.mts";
import { enviarAutoScout24 } from "./transporte.mts";

/*
  MOTOR DE MULTIPUBLICACIÓN
   · Fuente de verdad: los coches de la web (almacén «monzacar», clave «coches»). Este motor solo los LEE.
   · Cada pasada: valida → compara con el registro de cada canal → crea / actualiza / retira (máx. SINDICA_MAX por pasada).
   · Protecciones: cerrojo (dos pasadas a la vez no se pisan), interruptor de circuito por canal (si el portal cae, se deja de insistir
     y se avisa UNA vez), respeto de «Retry-After», reintentos con espera exponencial, y coches RESERVADOS que se mantienen tal cual.
*/
export const ORIGEN = "https://volcanocars.com";
export const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
export const S = () => store("sindica");
const dormirReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function cargar(canal: string) { return ((await S().get(`registro/${canal}.json`, { type: "json" }).catch(() => null)) as Record<string, RegistroCanal> | null) || {}; }
async function cargarCircuito(canal: string): Promise<Circuito> { return ((await S().get(`circuito/${canal}.json`, { type: "json" }).catch(() => null)) as Circuito | null) || circuitoNuevo(); }
export async function cargarCoches(): Promise<CocheWeb[]> { return ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as CocheWeb[] | null) || []; }

// ---- cerrojo: una sola pasada a la vez (caduca solo a los 10 min por si una pasada se corta) ----
async function tomarCerrojo(ahora = Date.now()): Promise<boolean> {
  const s = S(), actual = (await s.get("cerrojo.json", { type: "json" }).catch(() => null)) as { hasta: number } | null;
  if (actual && actual.hasta > ahora) return false;
  const r: any = await (s as any).setJSON("cerrojo.json", { hasta: ahora + 10 * 60_000 }, actual ? {} : { onlyIfNew: true }).catch(() => null);
  return !(r && r.modified === false);
}
async function soltarCerrojo() { try { await (S() as any).delete("cerrojo.json"); } catch { /* caduca solo */ } }

export function canalesApiConfigurados() { return env("SINDICA_CANALES").split(",").map((x) => x.trim()).filter((x) => CANALES[x]?.modo === "api"); }
export function faltanAs24() { return [["AS24_URL", env("AS24_URL")], ["AS24_TOKEN", env("AS24_TOKEN")]].filter(([, v]) => !v).map(([k]) => k); }

export async function pasada(opts: { simulacro?: boolean; dormir?: (ms: number) => Promise<void>; ahora?: () => Date } = {}) {
  const dormir = opts.dormir || dormirReal, reloj = opts.ahora || (() => new Date());
  const activo = env("SINDICA_ACTIVO") === "1" && !opts.simulacro;
  const max = Math.max(1, Math.min(50, Number(env("SINDICA_MAX")) || 10));
  if (!(await tomarCerrojo(reloj().getTime()))) return { omitido: "Ya hay otra pasada en marcha. Espera un minuto." };
  try {
    const canales = canalesApiConfigurados();
    const coches = await cargarCoches();
    const publicables = coches.filter((c) => c.estado === "disponible").map((c) => desdeCoche(c, ORIGEN));
    const reservados = new Set(coches.filter((c) => c.estado === "reservado").map((c) => c.id));   // siguen anunciados mientras dura la reserva
    const resumen: Record<string, any> = { t: reloj().toISOString(), modo: activo ? "real" : "simulacro", coches: publicables.length, canales: {} };

    for (const id of canales) {
      const canal = CANALES[id], reg = await cargar(id), ahora = reloj();
      let circ = await cargarCircuito(id);
      const invalidos: Record<string, string[]> = {}, mantener = new Set<string>(reservados);
      const aptos = publicables.filter((v) => { const pr = canal.validar(v); if (pr.length) { invalidos[v.id] = pr; mantener.add(v.id); return false; } return true; });
      const ops: Operacion[] = calcularOperaciones(aptos, reg, ahora, mantener).slice(0, max);
      const r: any = { invalidos, pendientes: ops.length, hechas: 0, fallos: 0, pausado: false, plan: ops.map((o) => ({ tipo: o.tipo, id: o.tipo === "retirar" ? o.idInterno : o.vehiculo.id, titulo: o.tipo === "retirar" ? "" : `${o.vehiculo.marca} ${o.vehiculo.modelo}` })) };
      const avisos: [string, string][] = [];
      if (activo && circuitoAbierto(circ, ahora)) { r.pausado = true; r.hasta = circ.abiertoHasta; }
      else if (activo) for (const op of ops) {
        if (circuitoAbierto(circ, reloj())) { r.pausado = true; r.hasta = circ.abiertoHasta; break; }
        const idOp = op.tipo === "retirar" ? op.idInterno : op.vehiculo.id, previo = reg[idOp];
        try {
          const res = await conReintentos(() => enviarAutoScout24(op, previo?.externalListingId ?? null), 3, dormir);
          reg[idOp] = anotar(previo, op, { ok: true, externalListingId: res.externalListingId }, reloj()); r.hechas++;
          circ = pasarPorCircuito(circ, "ok", reloj()).c;
        } catch (e: any) {
          const st = e instanceof ErrorCanal ? e.status : null;
          reg[idOp] = anotar(previo, op, { ok: false, error: String(e?.message || e) + (e?.detalle ? " · " + e.detalle : ""), status: st, esperaMs: e instanceof ErrorCanal ? e.esperaMs : null }, reloj()); r.fallos++;
          const pc = pasarPorCircuito(circ, esReintentable(st) ? "fallo" : "datos", reloj()); circ = pc.c;
          if (pc.avisar) avisos.push([canal.nombre, `${canal.nombre} falla varias veces seguidas (${String(e?.message || e).slice(0, 120)}). Se pausa 30 minutos y se reintentará solo.`]);
          const n = reg[idOp];
          if ((n.estado === "rechazado" || n.intentos >= MAX_INTENTOS) && previo?.estado !== n.estado) avisos.push([`${canal.nombre} · ${idOp.slice(0, 8)}`, n.ultimoError || "error"]);
        }
        await dormir(250);   // sin ráfagas: los portales limitan las llamadas por segundo
      }
      if (activo) { await S().setJSON(`registro/${id}.json`, reg); await S().setJSON(`circuito/${id}.json`, circ); }
      if (avisos.length) await enviarAviso(`Multipublicación: aviso de ${canal.nombre}`, avisos).catch(() => {});
      resumen.canales[id] = r;
    }
    await S().setJSON("ultimo.json", resumen);
    const hist = ((await S().get("historial.json", { type: "json" }).catch(() => null)) as any[] | null) || [];
    hist.unshift({ t: resumen.t, modo: resumen.modo, canales: Object.fromEntries(Object.entries(resumen.canales).map(([k, v]: any) => [k, { hechas: v.hechas, fallos: v.fallos, pendientes: v.pendientes }])) });
    await S().setJSON("historial.json", hist.slice(0, 40));
    return resumen;
  } finally { await soltarCerrojo(); }
}

/* ---------- informe para el panel (solo gerente): todo lo que la pantalla necesita en una llamada ---------- */
export async function informe() {
  const coches = await cargarCoches(), token = env("FEED_TOKEN"), feedOn = token.length >= 24;
  const url = (ruta: string) => feedOn ? `${ORIGEN}${ruta}?token=${encodeURIComponent(token)}` : null;
  const activos = coches.filter((c) => c.estado === "disponible" || c.estado === "reservado");
  const canalesApi = canalesApiConfigurados();
  const registros: Record<string, Record<string, RegistroCanal>> = {}, circuitos: Record<string, Circuito> = {};
  for (const id of canalesApi) { registros[id] = await cargar(id); circuitos[id] = await cargarCircuito(id); }
  const ahora = Date.now();
  const lista = activos.map((c) => {
    const v: VehiculoUnificado = desdeCoche(c, ORIGEN);
    const feeds = Object.fromEntries(["xml", "meta", "json"].map((k) => { const pr = c.estado === "disponible" ? CANALES[k].validar(v) : ["reservado: sale del feed hasta que se libere"]; return [k, { ok: pr.length === 0, problemas: pr }]; }));
    const api = Object.fromEntries(canalesApi.map((k) => { const r = registros[k][c.id]; return [k, r ? { estado: r.estado, intentos: r.intentos, ultimoError: r.ultimoError, proximoIntento: r.proximoIntento, externalListingId: r.externalListingId } : { estado: "sin-enviar" }]; }));
    return { id: c.id, titulo: `${v.marca} ${v.modelo}`.trim(), version: v.version, anio: v.matriculacion.anio, km: v.km, precio: v.precio.contado, fotos: v.fotos.length, foto: c.fotos?.[0] || null, estado: c.estado, dias: Math.max(0, Math.floor((ahora - Date.parse(c.creado || c.actualizado || "")) / 864e5) || 0), feeds, api, consejos: consejos(v) };
  });
  const dispo = lista.filter((x) => x.estado === "disponible");
  return {
    simulacro: env("SINDICA_ACTIVO") !== "1",
    feeds: { activo: feedOn, falta: feedOn ? null : "FEED_TOKEN", xml: url("/feeds/xml.xml"), meta: url("/feeds/meta.csv"), json: url("/feeds/json.json") },
    canalesApi: [{ id: "autoscout24", nombre: "AutoScout24", activadoEnNetlify: canalesApi.includes("autoscout24"), faltan: faltanAs24(), circuito: circuitos["autoscout24"] || null,
      resumen: Object.values(registros["autoscout24"] || {}).reduce((a: Record<string, number>, x) => (a[x.estado] = (a[x.estado] || 0) + 1, a), {}) }],
    resumen: { disponibles: dispo.length, enFeeds: dispo.filter((x) => x.feeds.xml.ok).length, conProblemas: dispo.filter((x) => !x.feeds.xml.ok).length, conConsejos: lista.filter((x) => x.consejos.length).length },
    coches: lista,
    ultimo: await S().get("ultimo.json", { type: "json" }).catch(() => null),
    historial: (((await S().get("historial.json", { type: "json" }).catch(() => null)) as any[] | null) || []).slice(0, 5),
  };
}
