// Almacén de Netlify Blobs SIMULADO EN MEMORIA (solo para pruebas)
const bd = new Map();
export const __reset = () => bd.clear();
function mk(name) {
  const m = bd.get(name) || (bd.set(name, new Map()), bd.get(name));
  const raw = (v) => (typeof v === "string" ? Buffer.from(v) : v instanceof ArrayBuffer ? Buffer.from(v) : Buffer.isBuffer(v) ? v : v && v.arrayBuffer ? null : Buffer.from(JSON.stringify(v)));
  return {
    async get(k, o) { const v = m.get(k); if (!v) return null; if (o && o.type === "json") return JSON.parse(v.toString()); if (o && o.type === "arrayBuffer") return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength); return v.toString(); },
    async getMetadata(k) { return m.has(k) ? { etag: "x" } : null; },
    async set(k, v, o) { if (o && o.onlyIfNew && m.has(k)) return { modified: false }; if (v && v.arrayBuffer && !Buffer.isBuffer(v)) v = Buffer.from(await v.arrayBuffer()); m.set(k, raw(v)); return { modified: true }; },
    async setJSON(k, v, o) { if (o && o.onlyIfNew && m.has(k)) return { modified: false }; m.set(k, Buffer.from(JSON.stringify(v))); return { modified: true }; },
    async delete(k) { m.delete(k); },
    async list(o) { return { blobs: [...m.keys()].filter((k) => k.startsWith((o && o.prefix) || "")).map((key) => ({ key, etag: "x" })), directories: [] }; },
  };
}
export const getStore = (o) => mk(typeof o === "string" ? o : o.name);
export const getDeployStore = (n) => mk(typeof n === "string" ? n : n.name);
