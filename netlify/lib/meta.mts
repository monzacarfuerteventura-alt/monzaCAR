import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

/*
  CANALES DE META · un solo agente para WhatsApp, Facebook Messenger e Instagram Direct
  ------------------------------------------------------------------------------------
  Los tres llegan al mismo webhook (/api/whatsapp, también /api/meta) con formas distintas. Aquí se
  normalizan a un «evento» y se envía la respuesta por el mismo canal. Messenger e Instagram solo se
  activan si existen sus variables (FB_PAGE_TOKEN / IG_TOKEN); sin ellas se ignoran sin romper nada.

    WhatsApp   object «whatsapp_business_account»  entry[].changes[].value.messages[]
    Messenger  object «page»                        entry[].messaging[]  (sender.id = PSID)
    Instagram  object «instagram»                   entry[].messaging[]  (sender.id = IGSID)
*/

export type Canal = "whatsapp" | "messenger" | "instagram";
export type Evento = {
  canal: Canal; id: string; mid: string; texto: string; tipo: string; nombre: string;
  eco?: boolean;   // mensaje que ha escrito una PERSONA del equipo desde la app (el agente se aparta)
  para?: string;   // en un eco: a quién iba
};
export const ETIQUETA: Record<Canal, string> = { whatsapp: "WhatsApp", messenger: "Facebook Messenger", instagram: "Instagram Direct" };
export const LIMITE: Record<Canal, number> = { whatsapp: 4000, messenger: 2000, instagram: 1000 };
export const clave = (canal: Canal, id: string) => (canal === "whatsapp" ? "c/" + id : `c/${canal === "messenger" ? "fb" : "ig"}:${id}`);

const norm = (v: unknown, n: number) => String(v ?? "").slice(0, n);

// Normaliza el cuerpo del webhook. WhatsApp se devuelve tal cual (lo procesa el código de siempre); Messenger e Instagram, ya normalizados.
export function eventosSociales(data: any): Evento[] {
  const canal: Canal | null = data?.object === "page" ? "messenger" : data?.object === "instagram" ? "instagram" : null;
  if (!canal) return [];
  const out: Evento[] = [];
  for (const e of Array.isArray(data.entry) ? data.entry : []) {
    for (const m of Array.isArray(e?.messaging) ? e.messaging : []) {
      const msg = m?.message;
      if (!msg) continue; // lecturas, entregas, reacciones…: nada que contestar
      if (msg.is_echo) { // lo ha escrito una persona desde la bandeja de la página / de Instagram
        const para = norm(m?.recipient?.id, 40);
        if (para) out.push({ canal, id: para, para, mid: norm(msg.mid, 120), texto: "", tipo: "eco", nombre: "", eco: true });
        continue;
      }
      const id = norm(m?.sender?.id, 40); if (!id) continue;
      const adj = Array.isArray(msg.attachments) && msg.attachments[0]?.type ? String(msg.attachments[0].type) : "";
      const texto = norm(msg.text || msg.quick_reply?.payload || "", 1200);
      out.push({ canal, id, mid: norm(msg.mid || `${m?.timestamp || ""}-${id}`, 120), texto, tipo: texto ? "text" : adj || "otro", nombre: "" });
    }
  }
  return out;
}

// Firma: vale la de cualquiera de los secretos configurados (una app de Meta o dos)
export function firmaMeta(cuerpo: string, firma: string, secretos: string[]) {
  if (!firma.startsWith("sha256=")) return false;
  return secretos.filter(Boolean).some((sec) => {
    const a = Buffer.from(createHmac("sha256", sec).update(cuerpo, "utf8").digest("hex")), b = Buffer.from(firma.slice(7));
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

// Texto para Messenger / Instagram: sin *negritas* de WhatsApp
export const sinFormato = (t: string) => t.replace(/\*(.+?)\*/g, "$1");

export async function enviarSocial(canal: "messenger" | "instagram", id: string, texto: string, token: string, base = "https://graph.facebook.com/v25.0"): Promise<boolean> {
  if (!token) return false;
  const host = canal === "instagram" && !/^EAA/.test(token) ? "https://graph.instagram.com/v25.0" : base; // token de «Instagram Login» → graph.instagram.com
  const r = await fetch(`${host}/me/messages`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ recipient: { id }, messaging_type: "RESPONSE", message: { text: sinFormato(texto).slice(0, LIMITE[canal]) } }), signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) console.error(`[${canal}] Meta respondió`, r.status, (await r.text().catch(() => "")).slice(0, 300));
  return r.ok;
}
