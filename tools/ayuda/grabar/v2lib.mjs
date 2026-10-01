// Ayudas comunes para los guiones largos de la Ayuda.
import { loginGerente, loginEquipo } from "./harness2.mjs";
// botón, resumen o enlace visible con ese texto dentro de una pestaña (#s-<id>)
export const tb = (sec, txt) => `#s-${sec} :is(button,summary,a,label):visible:has-text("${txt}")`;
export const gerente = (tab, extra = {}) => ({
  preparar: async (p) => { await loginGerente(p); await p.evaluate((t) => abrirTab(t), tab); await p.waitForTimeout(1500); }, ...extra,
});
export const equipo = (usuario, pin, extra = {}) => ({ preparar: async (p) => { await loginEquipo(p, usuario, pin); }, ...extra });
export const arriba = (a) => a.p.evaluate(() => scrollTo({ top: 0, behavior: "smooth" })).then(() => a.sleep(600));
export const bajar = (a, px = 500) => a.p.evaluate((n) => scrollBy({ top: n, behavior: "smooth" }), px).then(() => a.sleep(700));
// intenta resaltar; si el elemento no existe, no rompe el vídeo
export const res = async (a, sel, ms = 1600) => { try { await a.resaltar(sel, ms); } catch (_) { await a.sleep(ms); } };
export const clic = async (a, sel, ms = 700) => { try { await a.click(sel, ms); } catch (e) { console.log("  (sin clic)", sel.slice(0, 60)); await a.sleep(300); } };
