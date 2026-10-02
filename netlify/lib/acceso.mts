// =====================================================================
// ACCESO AL PANEL POR PUESTO (27-09-2026)
// Antes cada función miraba solo la contraseña del gerente (isAdmin) y el equipo que entraba con
// usuario + PIN recibía «No autorizado» fuera del taller, aunque su puesto fuera Gerente o Calidad.
// Ahora todas las funciones del panel pasan por aquí:
//   · "equipo"  → cualquier persona activa del equipo (mecánico, calidad, recepción, gerente) y la contraseña.
//   · "gerente" → contraseña del panel o persona del equipo con puesto Gerente.
//   · "ventas"  → lo que cambia lo que ve el público (precios, estado de los coches, entregas): Gerente o Recepción.
//                 Mecánico y Calidad pueden verlo pero no cambiarlo (un error o un descuido dejaba un coche a 1 € en la web).
// El equipo tiene que haber fichado la entrada (registro de jornada obligatorio): si no, 423 y el panel
// enseña la pantalla de fichaje. La contraseña del gerente no ficha.
// =====================================================================
import { json } from "./shared.mts";
import { quien, type Quien } from "./taller.mts";
import { exigirJornada } from "./jornada.mts";

export type Nivel = "equipo" | "gerente" | "ventas";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Devuelve quién hace la petición o la respuesta de error lista para devolver. */
export async function permiso(req: Request, nivel: Nivel = "equipo"): Promise<Quien | Response> {
  const q = await quien(req);
  if (!q) { await espera(500); return json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, 401); }
  if (nivel === "gerente" && !q.admin) return json({ error: "Esta opción es solo para el puesto de Gerente. Pídesela al gerente." }, 403);
  if (nivel === "ventas" && !q.admin && q.rol !== "recepcion") return json({ error: "Cambiar coches y entregas es cosa de Recepción o del Gerente. Pídeselo a ellos." }, 403);
  const bloqueo = await exigirJornada(q);
  if (bloqueo) return bloqueo;
  return q;
}

export const esRespuesta = (x: unknown): x is Response => x instanceof Response;
