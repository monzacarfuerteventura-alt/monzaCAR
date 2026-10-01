import { createHash, randomUUID } from "node:crypto";
import { store } from "./shared.mts";

/*
  FACTURAS · numeración correlativa, registro inalterable y listado para la gestoría.

  - Series: F-AAAA-NNNN (facturas) y R-AAAA-NNNN (rectificativas por sustitución). El número se reserva SOLO al emitir,
    así que no hay huecos por presupuestos rechazados ni por órdenes sin factura.
  - Cada factura emitida deja un REGISTRO que no se edita ni se borra (almacén «facturas», clave reg/NNNNNN).
    Cada registro lleva una huella SHA-256 que incluye la huella del anterior (cadena), con los mismos campos y el mismo
    orden que el registro de facturación de alta del Reglamento (RD 1007/2023, Orden HAC/1177/2024). Si alguien tocara un
    registro antiguo, la cadena dejaría de cuadrar y «Comprobar integridad» lo diría.
  - Reserva de números sin duplicados: escritura «solo si no existe» (onlyIfNew) y, como segunda barrera, se relee lo escrito.
  Actualización 7: (1) si un fallo deja un número de registro reservado pero sin escribir, el siguiente «Emitir» SELLA el hueco con un
  registro «H» encadenado (no vuelve a bloquearse la facturación); «Comprobar integridad» lo muestra en «avisos»; (2) las lecturas
  de todos los registros se hacen por lotes de 25 para no saturar el servidor cuando haya miles de facturas.
  IMPORTANTE: esto cubre integridad, trazabilidad, conservación y numeración. Para cumplir Verifactu por completo faltan
  el certificado electrónico, el envío a la Agencia Tributaria y la declaración responsable (ver LEEME).
*/
const fs = () => store("facturas");
// Lee de 25 en 25 (en vez de miles a la vez): más lento por registro pero no revienta el tiempo ni la memoria de la función
export async function enLotes<T, R>(items: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) out.push(...(await Promise.all(items.slice(i, i + n).map(f))));
  return out;
}
const pad = (n: number, l = 6) => String(n).padStart(l, "0");

// ---------- números sin duplicados ----------
export async function reservarNumero(st: any, ambito: string): Promise<number> {
  let n = Number(await st.get("contador/" + ambito).catch(() => 0)) || 0;
  for (let i = 0; i < 60; i++) {
    n++;
    const nonce = randomUUID(), clave = `reserva/${ambito}/${pad(n)}`;
    const r: any = await st.set(clave, nonce, { onlyIfNew: true }).catch(() => null);
    if (r && r.modified === false) continue; // ya lo tiene otra persona
    if ((await st.get(clave).catch(() => null)) !== nonce) continue; // segunda barrera si el almacén no soporta «solo si no existe»
    await st.set("contador/" + ambito, String(n)).catch(() => {}); // solo una pista para empezar más cerca la próxima vez
    return n;
  }
  throw new Error("No se ha podido reservar un número; vuelve a intentarlo.");
}

// ---------- huella ----------
export const dd = (iso: string) => iso.slice(8, 10) + "-" + iso.slice(5, 7) + "-" + iso.slice(0, 4);
export const eur2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
export function ahoraConHuso(d = new Date()): string { // 2026-09-30T15:49:00+01:00 (hora de Canarias)
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d);
  const g = (t: string) => f.find((x) => x.type === t)!.value;
  const local = `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
  const off = Math.round((Date.parse(local + "Z") - Math.floor(d.getTime() / 1000) * 1000) / 60000), s = off < 0 ? "-" : "+", a = Math.abs(off);
  return `${local}${s}${pad(Math.floor(a / 60), 2)}:${pad(a % 60, 2)}`;
}
export function huellaAlta(r: { nif: string; numero: string; fecha: string; tipo: string; cuota: number; total: number; prev: string; ts: string }) {
  const cad = `IDEmisorFactura=${r.nif}&NumSerieFactura=${r.numero}&FechaExpedicionFactura=${dd(r.fecha)}&TipoFactura=${r.tipo}&CuotaTotal=${eur2(r.cuota)}&ImporteTotal=${eur2(r.total)}&Huella=${r.prev}&FechaHoraHusoGenRegistro=${r.ts}`;
  return createHash("sha256").update(cad, "utf8").digest("hex").toUpperCase();
}
export const qrUrl = (nif: string, numero: string, fecha: string, total: number) =>
  `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=${encodeURIComponent(nif)}&numserie=${encodeURIComponent(numero)}&fecha=${dd(fecha)}&importe=${eur2(total)}`;

export type Registro = {
  seq: number; numero: string; serie: "F" | "R" | "H"; tipo: "F1" | "R1" | "H0"; fecha: string; ts: string; nif: string; emisor: string;
  cliente: { nombre: string; doc: string; direccion: string; cp: string; telefono: string; email: string };
  matricula: string; orden: string; ordenNum: string; rectifica: string; motivo: string;
  lineas: unknown[]; suma: number; dto: number; base: number; pct: number; cuota: number; total: number;
  prev: string; huella: string; por: string; nombre: string;
};

// Registro «H»: ocupa el lugar de un registro que se reservó pero no llegó a escribirse (fallo de red, función cortada...).
// Va encadenado como cualquier otro, no tiene importe ni número de factura, y no sale en el listado de la gestoría.
export async function sellarHuecos(s: any, hasta: number): Promise<Registro> {
  const leer = async (n: number) => (await s.get("reg/" + pad(n), { type: "json" }).catch(() => null)) as Registro | null;
  const ya = await leer(hasta); if (ya) return ya;
  let desde = hasta; while (desde > 1 && !(await leer(desde - 1))) desde--; // primer hueco de la racha
  let ant: Registro | null = desde > 1 ? await leer(desde - 1) : null, ult: Registro | null = null;
  for (let n = desde; n <= hasta; n++) {
    let r = await leer(n);
    if (!r) {
      const ts = ahoraConHuso(), prev = ant ? ant.huella : "", numero = "HUECO-" + pad(n), fecha = ts.slice(0, 10);
      const h: Registro = { seq: n, numero, serie: "H", tipo: "H0", fecha, ts, nif: "", emisor: "", cliente: { nombre: "", doc: "", direccion: "", cp: "", telefono: "", email: "" },
        matricula: "", orden: "", ordenNum: "", rectifica: "", motivo: "Hueco sellado automáticamente: el registro se reservó pero no llegó a escribirse.",
        lineas: [], suma: 0, dto: 0, base: 0, pct: 0, cuota: 0, total: 0, prev, huella: huellaAlta({ nif: "", numero, fecha, tipo: "H0", cuota: 0, total: 0, prev, ts }), por: "sistema", nombre: "Sistema (hueco sellado)" };
      const w: any = await s.setJSON("reg/" + pad(n), h, { onlyIfNew: true });
      r = w && w.modified === false ? await leer(n) : h; // si otro proceso lo escribió justo antes, se respeta lo suyo
      if (!r) throw new Error("No se ha podido sellar el hueco del registro " + n + "; vuelve a pulsar Emitir.");
    }
    ant = r; ult = r;
  }
  return ult as Registro;
}

export async function emitirFactura(d: Omit<Registro, "seq" | "numero" | "serie" | "tipo" | "ts" | "prev" | "huella"> & { rect: number; token: string }): Promise<Registro> {
  const s = fs(), llave = `orden/${d.token}~${d.rect}`;
  const ya = (await s.get(llave, { type: "json" }).catch(() => null)) as { seq: number } | null; // reintento tras un fallo: mismo número
  if (ya) { const r = (await s.get("reg/" + pad(ya.seq), { type: "json" }).catch(() => null)) as Registro | null; if (r) return r; }
  const serie = d.rect > 0 ? "R" : "F", tipo = d.rect > 0 ? "R1" : "F1", anio = d.fecha.slice(0, 4);
  const nNum = await reservarNumero(s, `${serie}-${anio}`), numero = `${serie}-${anio}-${pad(nNum, 4)}`;
  const seq = await reservarNumero(s, "registro");
  let prev = "";
  if (seq > 1) { // la huella del registro anterior (si aún se está escribiendo, se espera un momento)
    for (let i = 0; i < 16 && !prev; i++) { const a = (await s.get("reg/" + pad(seq - 1), { type: "json" }).catch(() => null)) as Registro | null; if (a) prev = a.huella; else await new Promise((ok) => setTimeout(ok, 250)); }
    if (!prev) prev = (await sellarHuecos(s, seq - 1)).huella; // tras ~4 s sin aparecer, se sella el hueco (antes aquí se bloqueaba la facturación para siempre)
  }
  const ts = ahoraConHuso(), { rect: _r, token: _t, ...resto } = d;
  const reg: Registro = { ...resto, seq, numero, serie, tipo: tipo as "F1" | "R1", ts, prev, huella: huellaAlta({ nif: d.nif, numero, fecha: d.fecha, tipo, cuota: d.cuota, total: d.total, prev, ts }) };
  const w: any = await s.setJSON("reg/" + pad(seq), reg, { onlyIfNew: true });
  if (w && w.modified === false) throw new Error("Conflicto al registrar la factura; vuelve a pulsar Emitir.");
  await s.setJSON("num/" + numero, { seq }).catch(() => {});
  await s.setJSON(llave, { seq, numero }).catch(() => {});
  return reg;
}

export async function todosLosRegistros(): Promise<Registro[]> {
  const s = fs(), { blobs } = await s.list({ prefix: "reg/" });
  const r = await enLotes(blobs, 25, (b: { key: string }) => s.get(b.key, { type: "json" }).catch(() => null));
  return (r.filter(Boolean) as Registro[]).sort((a, b) => a.seq - b.seq);
}
export async function comprobarIntegridad() {
  const r = await todosLosRegistros(), fallos: string[] = [];
  let prev = "";
  r.forEach((x, i) => {
    if (x.seq !== i + 1) fallos.push(`Falta el registro nº ${i + 1} (o está repetido).`);
    if (x.prev !== prev) fallos.push(`${x.numero}: no encadena con la anterior.`);
    if (huellaAlta({ nif: x.nif, numero: x.numero, fecha: x.fecha, tipo: x.tipo, cuota: x.cuota, total: x.total, prev: x.prev, ts: x.ts }) !== x.huella) fallos.push(`${x.numero}: los datos no coinciden con su huella (¿modificada?).`);
    prev = x.huella;
  });
  for (const serie of ["F", "R"]) { // numeración correlativa sin huecos dentro de cada serie y año
    const por: Record<string, number[]> = {};
    r.filter((x) => x.serie === serie).forEach((x) => { const [, a, n] = x.numero.split("-"); (por[a] ||= []).push(Number(n)); });
    for (const [a, l] of Object.entries(por)) l.sort((p, q) => p - q).forEach((n, i) => { if (n !== i + 1) fallos.push(`Serie ${serie}-${a}: falta el nº ${i + 1}.`); });
  }
  const avisos = r.filter((x) => x.serie === "H").map((x) => `Registro nº ${x.seq}: hueco sellado automáticamente el ${dd(x.fecha)} (un intento de emitir una factura se cortó a medias). Revisa que no falte ninguna factura de esa fecha.`);
  return { ok: !fallos.length, registros: r.length, ultima: r.length ? r[r.length - 1].numero : "", fallos, avisos };
}

// ---------- listado para la gestoría ----------
const coma = (n: number) => eur2(n).replace(".", ",");
const cel = (v: unknown) => { const t = String(v ?? ""); return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
export function listado(r: Registro[], desde = "", hasta = "") {
  const rect = new Set(r.filter((x) => x.rectifica).map((x) => x.rectifica));
  return r.filter((x) => x.serie !== "H" && (!desde || x.fecha >= desde) && (!hasta || x.fecha <= hasta)).map((x) => ({ ...x, estado: rect.has(x.numero) ? "Rectificada" : x.serie === "R" ? "Rectificativa" : "Vigente" }));
}
export function csv(r: ReturnType<typeof listado>) {
  const cab = ["Nº factura", "Fecha expedición", "Tipo", "Estado", "Cliente", "NIF/CIF cliente", "Base imponible", "Tipo IGIC %", "Cuota IGIC", "Total", "Matrícula", "Orden de trabajo", "Rectifica a", "Motivo rectificación", "Huella"];
  const fil = r.map((x) => [x.numero, dd(x.fecha), x.tipo === "R1" ? "R1 Rectificativa" : "F1 Ordinaria", x.estado, x.cliente.nombre, x.cliente.doc, coma(x.base), String(x.pct).replace(".", ","), coma(x.cuota), coma(x.total), x.matricula, x.ordenNum, x.rectifica, x.motivo, x.huella].map(cel).join(";"));
  const tot = (k: "base" | "cuota" | "total") => coma(r.filter((x) => x.estado !== "Rectificada").reduce((a, x) => a + x[k], 0));
  fil.push(["", "", "", "", "", "TOTAL (sin las rectificadas)", tot("base"), "", tot("cuota"), tot("total"), "", "", "", "", ""].join(";"));
  return "﻿" + [cab.join(";"), ...fil].join("\r\n");
}
