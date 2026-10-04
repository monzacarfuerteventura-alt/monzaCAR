import type { Config } from "@netlify/functions";
import { pasada } from "../lib/sindica/motor.mts";

/* Cada 15 minutos lanza una pasada de multipublicación (ver lib/sindica/motor.mts). Sin SINDICA_ACTIVO=1 solo hace el simulacro. */
export default async () => { try { await pasada(); } catch (e) { console.error("sindicar:", e); } };
export const config: Config = { schedule: "*/15 * * * *" };
