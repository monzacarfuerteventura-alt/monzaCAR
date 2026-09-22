import type { Config } from "@netlify/functions";
import { json, isAdmin } from "../lib/shared.mts";

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (isAdmin(req)) return json({ ok: true });
  await new Promise((r) => setTimeout(r, 800));
  return json({ error: "Contraseña incorrecta." }, 401);
};

export const config: Config = { path: "/api/login" };
