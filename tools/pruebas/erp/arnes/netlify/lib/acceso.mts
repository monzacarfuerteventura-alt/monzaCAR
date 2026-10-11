// Misma idea que netlify/lib/acceso.mts: 401 sin sesión; devuelve quién es (el fichaje de la jornada no se simula)
import { quien, type Quien } from "./taller.mts";
export async function permiso(req: Request, _nivel: string = "equipo"): Promise<Quien | Response> {
  const q = await quien(req);
  if (!q) return new Response(JSON.stringify({ error: "Tu sesión ha caducado. Vuelve a entrar." }), { status: 401, headers: { "content-type": "application/json" } });
  return q;
}
export const esRespuesta = (x: unknown): x is Response => x instanceof Response;
