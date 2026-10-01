// Servidor local con datos de ejemplo para grabar los vídeos de la Ayuda (bun tools/ayuda/grabar/servidor-grabacion.mjs).
// Todo lo que sale en los vídeos es inventado: nombres, matrículas, importes y teléfonos.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
process.env.CLAVE = process.env.CLAVE || "clave-de-pruebas-larga-2026";
await import(join(RAIZ, "tools/pruebas/servidor-local.mjs"));
const PUERTO = process.env.PUERTO || 8888, BASE = "http://localhost:" + PUERTO, AUT = { authorization: "Bearer " + process.env.CLAVE, "content-type": "application/json", origin: BASE };
const TL = await import(join(RAIZ, "netlify/lib/taller.mts"));
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
const { sembrarDemo } = await import("./seed-demo.mjs");
// seed-demo importa ./netlify/lib/shared.mts (ruta relativa a la raíz): se resuelve con la raíz como carpeta actual
process.chdir(RAIZ);
await sembrarDemo();
await TL.tstore().setJSON("equipo", [
  { id: "u1", nombre: "Pedro Pérez", usuario: "pedro", rol: "mecanico", jornada: 8, activo: true, alta: "2026-01-01", pin: TL.hashPin("123456") },
  { id: "u2", nombre: "Ana Ruiz", usuario: "ana", rol: "recepcion", jornada: 8, activo: true, alta: "2026-02-01", pin: TL.hashPin("654321") },
  { id: "u3", nombre: "Lestter", usuario: "lestter", rol: "calidad", jornada: 8, activo: true, alta: "2025-06-01", pin: TL.hashPin("111222") },
]);
const SG = await import(join(RAIZ, "netlify/lib/seguridad.mts"));
await SG.fijarExige2FAEquipo(false);
const post = async (ruta, cuerpo) => { const r = await fetch(BASE + ruta, { method: "POST", headers: AUT, body: JSON.stringify(cuerpo) }); return r.json().catch(() => ({})); };
// Tres coches en el taller en distintos momentos
for (const [nom, tel, mat, coche] of [["Marta Díaz", "611223344", "4521KLM", "Seat Ibiza"], ["Jonay Cabrera", "622334455", "7788HJP", "Toyota Corolla"], ["Ana Pérez", "633445566", "1190LBC", "Renault Clio"]])
  await post("/api/taller/recepcion", { cliente: { nombre: nom, telefono: tel }, vehiculo: { matricula: mat, marcaModelo: coche }, tipoEntrada: "reparacion", recibidoPor: "Lestter" }).catch(() => {});
console.log("Datos de ejemplo listos");
