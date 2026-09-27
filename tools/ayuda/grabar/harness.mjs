import { createRequire } from "module"; const require=createRequire(import.meta.url);
export const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
import fs from "fs"; import path from "path";
globalThis.Netlify={env:{get:k=>({ADMIN_PASSWORD:"clave-larga-de-prueba-123",SESSION_SECRET:"ss",URL:"https://volcanocars.test"}[k]||"")},context:{deploy:{context:"dev"}}};
const rutas=[];
for(const f of fs.readdirSync("./netlify/functions")){ if(!f.endsWith(".mts")) continue;
  try{ const m=await import(`./netlify/functions/${f}`); const c=m.config||{}; let ps=c.path; if(!ps) continue; if(!Array.isArray(ps)) ps=[ps];
    for(const p of ps){ const re=new RegExp("^"+p.replace(/:[a-zA-Z]+\*?/g,"[^/]+").replace(/\*/g,".*")+"/?$"); rutas.push([re,m.default,f]); } }catch(e){ console.log("no carga",f,e.message.slice(0,80)); } }
export async function montar(ctx){ await ctx.route('**/*',async r=>{ const req=r.request(), u=new URL(req.url());
  if(u.hostname!=='volcanocars.test') return r.fulfill({status:404,body:''});
  const hit=rutas.find(([re])=>re.test(u.pathname));
  if(hit){ const h=await req.allHeaders(); try{ const res=await hit[1](new Request(u.href,{method:req.method(),headers:h,body:["GET","HEAD"].includes(req.method())?undefined:req.postDataBuffer()}),{ip:"83.45.1.2",geo:{},waitUntil:()=>{}});
      const hd={}; res.headers.forEach((v,k)=>hd[k]=v); return r.fulfill({status:res.status,headers:hd,body:Buffer.from(await res.arrayBuffer())}); }catch(e){ console.log("ERR fn",hit[2],e.message); return r.fulfill({status:500,body:'{}'}); } }
  let f=path.join('/home/claude/gh/public',u.pathname); if(fs.existsSync(f)&&fs.statSync(f).isDirectory()) f=path.join(f,'index.html');
  if(!fs.existsSync(f)) return r.fulfill({status:404,body:''}); return r.fulfill({path:f}); }); }
export async function loginGerente(p){ await p.goto('https://volcanocars.test/admin.html'); await p.waitForTimeout(500);
  if((await p.textContent('#login-modo')).includes("gerente")) await p.click('#login-modo');
  await p.fill('#pw','clave-larga-de-prueba-123'); await p.click('#login-btn'); await p.waitForTimeout(1200); }
