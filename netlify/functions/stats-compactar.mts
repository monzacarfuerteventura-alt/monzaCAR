import type { Config } from "@netlify/functions";
import { store, canarias, sumarDias } from "../lib/shared.mts";
import { clavesDelDia, resumir } from "../lib/analitica.mts";

// Cada noche: resume los días anteriores de la analítica en «agg/AAAA-MM-DD», borra los eventos
// sueltos y la sal diaria (a partir de aquí ya no se puede relacionar nada con ningún visitante).
export default async () => {
  const s = store("analitica");
  const { fecha: hoy } = canarias();
  for (let i = 1; i <= 10; i++) {
    const dia = sumarDias(hoy, -i);
    const claves = await clavesDelDia(dia);
    if (claves.length) await s.setJSON("agg/" + dia, resumir(claves));
    else if (!(await s.get("agg/" + dia))) await s.setJSON("agg/" + dia, resumir([]));
    for (let j = 0; j < claves.length; j += 50) await Promise.all(claves.slice(j, j + 50).map((k) => s.delete(k)));
    await s.delete("salt/" + dia);
  }
};

export const config: Config = { schedule: "20 2 * * *" };
