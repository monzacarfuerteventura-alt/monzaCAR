import type { Config } from "@netlify/functions";
import { store, enviarAviso } from "../lib/shared.mts";
import { ALMACENES, SOLO_NOMBRES, volcar, conservar } from "../lib/copia.mts";

/*
  COPIA DE SEGURIDAD AUTOMÁTICA · todos los días a las 03:05 (hora UTC)
  - Cada almacén se guarda en su propio archivo (diaria/AAAA-MM-DD/<almacén>.json) y un índice (diaria/AAAA-MM-DD.json):
    si uno falla o crece mucho, los demás se guardan igualmente y se avisa por email.
  - Se conservan: los últimos 30 días, el día 1 de cada mes durante 24 meses y el 1 de enero de cada año PARA SIEMPRE
    (la copia anual: guarda ahí todos los registros del año anterior).
  - Se descargan desde el panel con /api/copia?auto=lista y ?auto=AAAA-MM-DD (solo el gerente). ?auto=estado dice cómo fue la última.
  El código de la web ya tiene su copia en GitHub en cada publicación.
*/
export default async () => {
  const dia = new Date().toISOString().slice(0, 10), s = store("copias");
  const partes: Record<string, { bytes: number; error?: string }> = {};
  for (const n of ALMACENES) {
    try {
      const txt = JSON.stringify(await volcar(n));
      await s.set(`diaria/${dia}/${n}.json`, txt);
      partes[n] = { bytes: txt.length };
    } catch (e: any) { partes[n] = { bytes: 0, error: String(e?.message || e).slice(0, 200) }; }
  }
  const archivos: Record<string, string[]> = {};
  for (const n of SOLO_NOMBRES) archivos[n] = await store(n).list().then((r) => r.blobs.map((b) => b.key)).catch(() => []);
  await s.set(`diaria/${dia}.json`, JSON.stringify({ tipo: "volcano-cars-copia", version: 2, automatica: true, generado: new Date().toISOString(), partes, archivos }));
  const fallos = Object.entries(partes).filter(([, v]) => v.error).map(([k, v]) => [k, v.error!] as [string, string]);
  await s.set("estado.json", JSON.stringify({ fecha: dia, t: new Date().toISOString(), ok: !fallos.length, almacenes: Object.keys(partes).length, bytes: Object.values(partes).reduce((a, v) => a + v.bytes, 0), fallos }));
  try {
    const { blobs } = await s.list({ prefix: "diaria/" });
    const claves = blobs.map((b) => b.key);
    const fechas = [...new Set(claves.map((k) => k.slice(7, 17)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
    const borrar = new Set(conservar(fechas, dia).borrar);
    await Promise.all(claves.filter((k) => borrar.has(k.slice(7, 17))).map((k) => s.delete(k).catch(() => {})));
  } catch { /* la limpieza nunca impide la copia */ }
  if (fallos.length) await enviarAviso("Copia de seguridad: algo ha fallado", [["Día", dia], ...fallos.map(([k, v]) => [k, v] as [string, string])]).catch(() => {});
  else if (dia.slice(5) === "01-01") await enviarAviso("Copia anual de " + (Number(dia.slice(0, 4)) - 1) + " lista", [["Copia guardada para siempre", dia], ["Qué hacer", "Entra en el panel > Ajustes > Copias y descarga la del " + dia + " a tu ordenador."]]).catch(() => {});
  return new Response("ok");
};

export const config: Config = { schedule: "5 3 * * *" };
