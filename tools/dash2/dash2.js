/* =====================================================================
   DASHBOARD 2 · centro de mando del negocio (solo gerente)
   Fuente: tools/dash2/dash2.js (+ dash2.css) → se copia dentro de admin.html con
   python3 tools/dash2/inyectar.py
   - Pulso del negocio: KPIs con mini-gráfico diario y cambio vs. periodo anterior
   - Previsión de cierre de mes (ritmo real + banda de confianza del 80 %)
   - Simulador «¿y si…?» con deslizadores (visitas, conversión, cierre, ticket, anuncios)
   - Mapa de calor de demanda (día × hora) y de interés por coche (coche × día)
   - Flujo de clientes y dinero (Sankey): canal → tipo de solicitud → resultado
   - Capas desplegables con TODO el detalle anterior (nada se pierde)
   - Informes automáticos (semanal / mensual): lista, vista ejecutiva e impresión
   Todo sale de datos reales del panel. Sin datos, lo dice; nunca inventa.
   ===================================================================== */
const D2={sim:null, heat:"mes", sk:"n", fc:"s", abiertas:new Set(["kpi"]), mk:null};
const d2n=v=>String(Math.round(v*10)/10).replace(".",",");
const d2e=v=>eur(Math.round(v));
function d2Spark(vals,{w=120,h=34,col="var(--d2-a)",area=true}={}){
  if(!vals.length) return "";
  const max=Math.max(1,...vals), n=vals.length, x=i=>n<2?w/2:i/(n-1)*w, y=v=>h-2-(v/max)*(h-6);
  const pts=vals.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="d2-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${area?`<polygon points="0,${h} ${pts} ${w},${h}" fill="${col}" opacity=".14"/>`:""}<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(n-1)}" cy="${y(vals[n-1])}" r="3" fill="${col}"/></svg>`;
}
function d2Chip(a,b,inv=false){
  if(b===null||b===undefined||(!a&&!b)) return '<span class="d2-chip">—</span>';
  if(!b) return '<span class="d2-chip up">nuevo</span>';
  const d=(a-b)/b*100, r=Math.round(d); if(!r) return '<span class="d2-chip">= que antes</span>';
  return `<span class="d2-chip ${(inv?d<0:d>0)?"up":"down"}">${d>0?"▲":"▼"} ${Math.abs(r)} %</span>`;
}
/* ---------- series diarias del mes ---------- */
function d2Series(M){
  const dias=M.t.dias.map(d=>d.f);
  const porDia=(lista,fecha)=>dias.map(f=>lista.filter(x=>fecha(x)===f));
  const leads=porDia(M.leads,x=>diaC(x.creado)), gan=porDia(M.gan,x=>diaC(cierre(x)));
  return {dias, v:M.t.dias.map(d=>d.v), s:leads.map(l=>l.length), c:leads.map(l=>l.filter(x=>x.cita).length), g:gan.map(l=>l.length), f:gan.map(l=>l.reduce((a,x)=>a+(x.importe||0),0)), clk:dias.map(f=>(STATS[f]&&STATS[f].clkV)||0)};
}
/* ---------- 1 · pulso del negocio ---------- */
function d2Kpis(M,P,S){
  const t=M.t, tp=P.t, conv=t.v?M.web.length/t.v:0, convP=tp.v?P.web.length/tp.v:0;
  const acum=a=>{ let s=0; return a.map(v=>s+=v); };
  const K=[
    {k:"fact",l:"Facturación",v:M.fact?d2e(M.fact):"—",s:M.ticket?`ticket medio ${d2e(M.ticket)}`:"apunta importes al cerrar en el CRM",d:d2Chip(M.fact,P.fact),sp:acum(S.f),hot:1,capa:"prom"},
    {k:"sol",l:"Solicitudes",v:nfmt(M.leads.length),s:`${M.web.length} desde la web`,d:d2Chip(M.leads.length,P.leads.length),sp:S.s,capa:"trafico"},
    {k:"vis",l:"Visitas web",v:nfmt(t.v),s:`${nfmt(t.pv)} páginas vistas`,d:d2Chip(t.v,tp.v),sp:S.v,capa:"trafico"},
    {k:"conv",l:"Conversión",v:t.v?d2n(conv*100)+" %":"—",s:"solicitudes web / visitas",d:d2Chip(conv,convP),sp:S.v.map((v,i)=>v?S.s[i]/v:0),capa:"canales",hot:t.v&&conv<0.015?2:0},
    {k:"cit",l:"Citas",v:nfmt(M.citas.length),s:"taller y visitas a coches",d:d2Chip(M.citas.length,P.citas.length),sp:S.c,capa:"trafico"},
    {k:"gan",l:"Cerradas",v:nfmt(M.gan.length),s:`${M.perd.length} perdidas`,d:d2Chip(M.gan.length,P.gan.length),sp:S.g,capa:"publico"},
    {k:"resp",l:"Tiempo de respuesta",v:M.mediana===null?"—":durM(M.mediana),s:M.nResp?`${pct(M.r15,M.nResp)} en menos de 15 min`:"en horario de apertura",d:d2Chip(M.mediana||0,P.mediana,true),sp:[],capa:"prom",hot:M.mediana>30?2:0},
    {k:"pres",l:"Presupuestos",v:M.pres.length?`${M.presA.length}/${M.pres.length}`:"—",s:M.presA.length?`aceptados · ${d2e(M.presImp)}`:"aceptados / enviados",d:d2Chip(M.presA.length,P.presA.length),sp:[],capa:"prom"},
  ];
  return `<div class="d2-kpis">${K.map(x=>`<button type="button" class="d2-kpi ${x.hot===1?"hero":x.hot===2?"warn":""}" data-d2capa="${x.capa}" aria-label="${esc(x.l)}: ${esc(x.v)}. Ver detalle">
    <span class="d2-kl">${esc(x.l)}</span><b class="d2-kv num">${x.v}</b><span class="d2-ks">${esc(x.s)}</span>
    <span class="d2-kf">${x.d}${x.sp.length?d2Spark(x.sp,{col:x.hot===1?"var(--d2-a2)":"var(--d2-a)"}):""}</span></button>`).join("")}</div>`;
}
/* ---------- 2 · previsión de cierre de mes ---------- */
function d2Forecast(M,P,S){
  const hoy=hoyC(), esAct=MES===hoy.slice(0,7), total=+finMes(MES).slice(8), n=S.dias.length;
  const serie={v:S.v,s:S.s,f:S.f}[D2.fc], nombre={v:"visitas",s:"solicitudes",f:"facturación"}[D2.fc], fmt=D2.fc==="f"?d2e:v=>nfmt(Math.round(v));
  const acum=[]; serie.reduce((a,v,i)=>acum[i]=a+v,0);
  const real=acum[n-1]||0, ult=serie.slice(-14), media=ult.length?ult.reduce((a,b)=>a+b,0)/ult.length:0;
  const sd=Math.sqrt(ult.length>1?ult.reduce((a,v)=>a+(v-media)**2,0)/(ult.length-1):0);
  const quedan=esAct?total-n:0, prev=real+media*quedan, banda=1.28*sd*Math.sqrt(Math.max(quedan,0));
  const anterior={v:P.t.v,s:P.leads.length,f:P.fact}[D2.fc]; // P es el mes anterior hasta los mismos días → usamos el mes completo:
  const Pfull=metricas(mesMas(MES,-1)), antTotal={v:Pfull.t.v,s:Pfull.leads.length,f:Pfull.fact}[D2.fc];
  const W=560,H=190,pl=6,pr=6,pt=12,pb=22, max=Math.max(1,prev+banda,antTotal,real)*1.08;
  const X=d=>pl+(d-1)/(total-1||1)*(W-pl-pr), Y=v=>H-pb-(v/max)*(H-pt-pb);
  const lineaReal=acum.map((v,i)=>`${X(i+1).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  let proy="", area="";
  if(esAct&&quedan>0){
    proy=`${X(n).toFixed(1)},${Y(real).toFixed(1)} ${X(total).toFixed(1)},${Y(prev).toFixed(1)}`;
    area=`${X(n)},${Y(real)} ${X(total)},${Y(prev+banda)} ${X(total)},${Y(Math.max(real,prev-banda))}`;
  }
  const yAnt=Y(antTotal);
  const txt=!n?"Todavía no hay datos este mes.":esAct&&quedan>0
    ?`Al ritmo de los últimos ${ult.length} días cerrarás el mes con <b>${fmt(prev)}</b> ${nombre} <span class="d2-mut">(entre ${fmt(Math.max(real,prev-banda))} y ${fmt(prev+banda)}, 80 % de confianza)</span>. El mes anterior: <b>${fmt(antTotal)}</b> ${d2Chip(prev,antTotal)}`
    :`Mes cerrado con <b>${fmt(real)}</b> ${nombre}. El anterior: <b>${fmt(antTotal)}</b> ${d2Chip(real,antTotal)}`;
  return `<section class="d2-card d2-fc"><header class="d2-h"><div><small>Predicción</small><h3>Cierre del mes</h3></div>
    <div class="d2-seg" role="group" aria-label="Métrica">${[["v","Visitas"],["s","Solicitudes"],["f","Facturación"]].map(([k,t])=>`<button type="button" data-d2fc="${k}" aria-pressed="${D2.fc===k}">${t}</button>`).join("")}</div></header>
    <svg class="d2-fcsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Acumulado de ${nombre} y previsión">
      ${[0.25,.5,.75,1].map(f=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(max*f/1.08)}" y2="${Y(max*f/1.08)}" class="d2-grid"/>`).join("")}
      <line x1="${pl}" x2="${W-pr}" y1="${yAnt}" y2="${yAnt}" class="d2-ref"/><text x="${W-pr}" y="${yAnt-5}" text-anchor="end" class="d2-reft">mes anterior ${esc(fmt(antTotal))}</text>
      ${area?`<polygon points="${area}" class="d2-band"/>`:""}
      <polyline points="${lineaReal}" class="d2-real"/>
      ${proy?`<polyline points="${proy}" class="d2-proy"/><circle cx="${X(total)}" cy="${Y(prev)}" r="5" class="d2-dot2"/>`:""}
      ${n?`<circle cx="${X(n)}" cy="${Y(real)}" r="5" class="d2-dot"/>`:""}
      <text x="${pl}" y="${H-5}" class="d2-ax">1</text><text x="${X(Math.ceil(total/2))}" y="${H-5}" text-anchor="middle" class="d2-ax">${Math.ceil(total/2)}</text><text x="${W-pr}" y="${H-5}" text-anchor="end" class="d2-ax">${total}</text>
    </svg><p class="d2-p">${txt}</p></section>`;
}
/* ---------- 3 · simulador ---------- */
function d2SimBase(M){
  const t=M.t, dias=Math.max(1,t.nDias), gastos=(D2.mk&&D2.mk.gastos)||[];
  const inv=gastos.filter(g=>(!g.desde||g.desde.slice(0,7)<=MES)&&(!g.hasta||g.hasta.slice(0,7)>=MES)).reduce((a,g)=>a+g.gasto,0);
  const tasa=M.leads.length?M.gan.length/M.leads.length:0;
  return {vd:Math.max(1,Math.round(t.v/dias)||20), conv:t.v?Math.max(.1,Math.round(M.web.length/t.v*1000)/10):2, cierre:Math.round((tasa||.25)*100), ticket:Math.round(M.ticket||450), inv:Math.round(inv), cpc:0.6, margen:35};
}
function d2SimCalc(x){
  const extra=x.cpc>0?x.inv/x.cpc:0, vis=x.vd*30+extra, sol=vis*x.conv/100, ventas=sol*x.cierre/100, fact=ventas*x.ticket;
  const solAds=extra*x.conv/100, ventasAds=solAds*x.cierre/100, benefAds=ventasAds*x.ticket*x.margen/100;
  return {vis,sol,ventas,fact,cpa:solAds?x.inv/solAds:null,roi:x.inv?(benefAds-x.inv)/x.inv:null,extra};
}
const D2_SL=[["vd","Visitas al día",1,400,1,v=>nfmt(v)],["conv","Conversión web",.1,10,.1,v=>d2n(v)+" %"],["cierre","Cierre de solicitudes",1,100,1,v=>v+" %"],["ticket","Ticket medio",50,25000,50,v=>eur(v)],["inv","Anuncios al mes",0,3000,25,v=>eur(v)],["cpc","Coste por clic del anuncio",.1,3,.05,v=>String(v.toFixed(2)).replace(".",",")+" €"],["margen","Margen bruto",5,80,1,v=>v+" %"]];
function d2Sim(M){
  const base=d2SimBase(M); if(!D2.sim||D2.sim._mes!==MES) D2.sim={...base,_mes:MES};
  return `<section class="d2-card d2-sim" id="d2-sim"><header class="d2-h"><div><small>Simulador</small><h3>¿Y si…?</h3></div><button type="button" class="d2-lnk" data-d2simreset>Volver a mis datos</button></header>
    <div class="d2-simg"><div class="d2-sls">${D2_SL.map(([k,l,mi,ma,st,f])=>`<label class="d2-sl"><span>${l}<b data-d2slv="${k}">${f(D2.sim[k])}</b></span><input type="range" min="${mi}" max="${ma}" step="${st}" value="${D2.sim[k]}" data-d2sl="${k}" aria-label="${l}" style="--p:${((D2.sim[k]-mi)/(ma-mi)*100).toFixed(1)}%"><small>Tus datos: ${f(base[k])}</small></label>`).join("")}</div>
    <div class="d2-simout" id="d2-simout">${d2SimOut(base)}</div></div>
    <p class="d2-foot">Parte de tus datos reales del mes. Mueve un deslizador y mira qué pasa con las ventas. «Coste por visita» es lo que te cobra el anuncio por cada clic.</p></section>`;
}
function d2SimOut(base){
  const a=d2SimCalc(base), b=d2SimCalc(D2.sim), fila=(l,x,y,f)=>{ const d=x?Math.round((y-x)/x*100):0; return `<div class="d2-so"><span>${l}</span><b class="num">${f(y)}</b><em class="${d>0?"up":d<0?"down":""}">${d?(d>0?"+":"")+d+" %":"="}</em></div>`; };
  return `<div class="d2-sobig"><small>Facturación al mes (proyección)</small><b class="num">${d2e(b.fact)}</b><span>${b.fact>=a.fact?"+":"−"}${d2e(Math.abs(b.fact-a.fact))} vs. tu ritmo actual</span></div>
    ${fila("Visitas al mes",a.vis,b.vis,v=>nfmt(Math.round(v)))}${fila("Solicitudes",a.sol,b.sol,v=>d2n(v))}${fila("Ventas y trabajos",a.ventas,b.ventas,v=>d2n(v))}
    <div class="d2-so"><span>Coste por cliente (CPA)</span><b class="num">${b.cpa===null?"—":d2e(b.cpa)}</b><em></em></div>
    <div class="d2-so"><span>Retorno de los anuncios</span><b class="num ${b.roi===null?"":b.roi>=0?"up":"down"}">${b.roi===null?"—":(b.roi>=0?"+":"")+Math.round(b.roi*100)+" %"}</b><em></em></div>`;
}
/* ---------- 4 · mapas de calor ---------- */
function d2HeatDemanda(){
  const dias=Object.keys(STATS).filter(f=>D2.heat==="mes"?f.slice(0,7)===MES:f>=sumaDias(hoyC(),-28)).sort();
  const m=Array.from({length:7},()=>Array(24).fill(0));
  for(const f of dias){ const d=STATS[f]; if(!d||!d.horas) continue; const w=(new Date(f+"T12:00:00Z").getUTCDay()+6)%7; d.horas.forEach((v,h)=>m[w][h]+=v); }
  const max=Math.max(1,...m.flat()), DS=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  let best=[0,0,0]; m.forEach((r,w)=>r.forEach((v,h)=>{ const s=v+(r[h+1]||0); if(s>best[2]) best=[w,h,s]; }));
  const hs=[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5,6];
  const cel=(v,w,h)=>`<i style="--h:${(v/max).toFixed(3)}" data-tip="${DS[w]} ${h}:00–${h}:59 · ${nfmt(v)} páginas vistas"></i>`;
  return `<section class="d2-card"><header class="d2-h"><div><small>Demanda</small><h3>Cuándo te buscan</h3></div>
    <div class="d2-seg" role="group" aria-label="Periodo">${[["mes","Este mes"],["28","Últimos 28 días"]].map(([k,t])=>`<button type="button" data-d2heat="${k}" aria-pressed="${D2.heat===k}">${t}</button>`).join("")}</div></header>
    <div class="d2-heat" role="img" aria-label="Mapa de calor de visitas por día de la semana y hora">
      <span></span>${hs.map(h=>`<b>${h%3===0?h:""}</b>`).join("")}
      ${m.map((r,w)=>`<span>${DS[w]}</span>${hs.map(h=>cel(r[h],w,h)).join("")}`).join("")}
    </div>
    <p class="d2-p">${best[2]?`Tu mejor franja: <b>${["lunes","martes","miércoles","jueves","viernes","sábado","domingo"][best[0]]} de ${best[1]} a ${best[1]+2} h</b>. Publica en redes y programa los anuncios justo antes.`:"Aún no hay visitas suficientes para ver un patrón."}</p></section>`;
}
function d2HeatCoches(M){
  const S=M.t.dias.map(d=>d.f), ids=Object.keys(M.t.cochesV).sort((a,b)=>M.t.cochesV[b]-M.t.cochesV[a]).slice(0,10);
  if(!ids.length) return `<section class="d2-card"><header class="d2-h"><div><small>Demanda por coche</small><h3>Qué coches se miran</h3></div></header><p class="d2-p d2-mut">Todavía nadie ha abierto la ficha de un coche este mes.</p></section>`;
  const val=(id,f)=>(STATS[f]&&STATS[f].cochesV&&STATS[f].cochesV[id])||0;
  const max=Math.max(1,...ids.flatMap(id=>S.map(f=>val(id,f))));
  return `<section class="d2-card"><header class="d2-h"><div><small>Demanda por coche</small><h3>Qué coches se miran</h3></div><span class="d2-mut d2-sm">personas distintas por día</span></header>
    <div class="d2-cheat" style="--n:${S.length}">${ids.map(id=>{ const c=CARS.find(x=>x.id===id), n=c?`${c.marca} ${c.modelo}`:"Coche retirado", l=M.cochesLeads[id]||0, viendo=VIENDO[id]||0;
      return `<span class="d2-cn" title="${esc(n)}">${esc(n)}${viendo?`<em class="d2-live">${viendo} ahora</em>`:""}</span>${S.map(f=>`<i style="--h:${(val(id,f)/max).toFixed(3)}" data-tip="${esc(n)} · ${fechaLarga(f)}: ${val(id,f)} personas"></i>`).join("")}<b class="num" data-tip="${M.t.cochesV[id]} personas · ${l} solicitudes">${M.t.cochesV[id]}<small>${l} sol.</small></b>`; }).join("")}</div></section>`;
}
/* ---------- 5 · Sankey: canal → tipo → resultado ---------- */
const D2_TIPO={taller:"Taller",coche:"Coches",financiacion:"Financiación",contacto:"Consultas",alerta:"Alertas",tasacion:"Tasaciones"};
function d2Sankey(M){
  const dinero=D2.sk==="e", L=M.leads.filter(x=>!dinero||(x.estado==="ganada"&&x.importe));
  const peso=x=>dinero?x.importe:1;
  if(!L.length) return `<section class="d2-card d2-wide"><header class="d2-h"><div><small>Flujo</small><h3>De dónde viene el dinero</h3></div>${d2SkSeg()}</header><p class="d2-p d2-mut">${dinero?"Aún no hay ventas con importe apuntado este mes. Al cerrar un cliente en el CRM, apunta el importe.":"Aún no hay solicitudes este mes."}</p></section>`;
  const canal=x=>x.manual?((x.origen&&x.origen.canal)||"En persona"):((x.origen&&x.origen.canal)||"Directo");
  const res=x=>x.estado==="ganada"?"Cerrada":x.estado==="perdida"?"Perdida":"En curso";
  const c0={}; L.forEach(x=>c0[canal(x)]=(c0[canal(x)]||0)+peso(x));
  const top=Object.entries(c0).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]), cn=x=>top.includes(canal(x))?canal(x):"Otros";
  const cols=[[...new Set(L.map(cn))],[...new Set(L.map(x=>D2_TIPO[x.tipo]||x.tipo))],dinero?["Cerrada"]:["Cerrada","En curso","Perdida"].filter(r=>L.some(x=>res(x)===r))];
  const links=new Map(), add=(a,b,v)=>links.set(a+"→"+b,(links.get(a+"→"+b)||0)+v);
  L.forEach(x=>{ add("0:"+cn(x),"1:"+(D2_TIPO[x.tipo]||x.tipo),peso(x)); add("1:"+(D2_TIPO[x.tipo]||x.tipo),"2:"+res(x),peso(x)); });
  const W=900,H=300,nw=14,gap=12,total=L.reduce((a,x)=>a+peso(x),0), xs=[210,W/2-nw/2,W-180];
  const vin={}, vout={}; for(const [k,v] of links){ const [a,b]=k.split("→"); vout[a]=(vout[a]||0)+v; vin[b]=(vin[b]||0)+v; }
  const K=(H-gap*Math.max(...cols.map(c=>c.length-1)))/total, nodos={};
  cols.forEach((col,ci)=>{ const vals=col.map(n=>{ const id=ci+":"+n; return [n,Math.max(vin[id]||0,vout[id]||0)]; }).sort((a,b)=>b[1]-a[1]);
    let y=0; vals.forEach(([n,v])=>{ const h=Math.max(3,v*K); nodos[ci+":"+n]={x:xs[ci],y,h,v,n,ci,oy:0,iy:0}; y+=h+gap; }); });
  const COL={Cerrada:"var(--d2-ok)",Perdida:"var(--d2-bad)","En curso":"var(--d2-mid)"};
  const paths=[...links].sort((a,b)=>b[1]-a[1]).map(([k,v])=>{ const [a,b]=k.split("→"), A=nodos[a], B=nodos[b]; if(!A||!B) return ""; const w=Math.max(1.5,v*K);
    const y0=A.y+A.oy+w/2, y1=B.y+B.iy+w/2; A.oy+=w; B.iy+=w; const x0=A.x+nw, x1=B.x, m=(x0+x1)/2;
    const col=B.ci===2?COL[B.n]:"var(--d2-a)";
    return `<path d="M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1}" stroke="${col}" stroke-width="${w.toFixed(1)}" class="d2-lk" data-tip="${esc(A.n)} → ${esc(B.n)}: ${dinero?eur(v):v+(v===1?" cliente":" clientes")}"/>`; }).join("");
  const rects=Object.values(nodos).map(n=>`<rect x="${n.x}" y="${n.y}" width="${nw}" height="${n.h}" rx="3" class="d2-nd ${n.ci===2?"r-"+n.n.replace(" ","")[0]:""}"/><text x="${n.ci===0?n.x-8:n.x+nw+8}" y="${n.y+n.h/2+4}" text-anchor="${n.ci===0?"end":"start"}" class="d2-nt">${esc(n.n)} · ${dinero?d2e(n.v):n.v}</text>`).join("");
  return `<section class="d2-card d2-wide"><header class="d2-h"><div><small>Flujo</small><h3>${dinero?"De dónde viene el dinero":"Cómo fluyen los clientes"}</h3></div>${d2SkSeg()}</header>
    <div class="d2-skw"><svg class="d2-sk" viewBox="-6 -10 ${W+12} ${H+20}" role="img" aria-label="Diagrama de flujo de clientes por canal, tipo y resultado">${paths}${rects}</svg></div>
    <div class="d2-legend"><span><i style="background:var(--d2-a)"></i>Canal → tipo</span><span><i style="background:var(--d2-ok)"></i>Cerrada</span><span><i style="background:var(--d2-mid)"></i>En curso</span><span><i style="background:var(--d2-bad)"></i>Perdida</span></div></section>`;
}
const d2SkSeg=()=>`<div class="d2-seg" role="group" aria-label="Medir en">${[["n","Clientes"],["e","Euros"]].map(([k,t])=>`<button type="button" data-d2sk="${k}" aria-pressed="${D2.sk===k}">${t}</button>`).join("")}</div>`;
/* ---------- 6 · capas con el detalle de siempre ---------- */
const D2_CAPAS=[["trafico","Tráfico y solicitudes día a día",["Visitas por día","Solicitudes por día"]],["canales","Canales y embudo",["Embudo de clientes","De dónde vienen"]],["coches","Coches y taller",["Coches: interés real","Servicios de taller más pedidos"]],["publico","Público, horarios y pérdidas",["Cuándo te visitan","Público"]],["prom","Promedios del mes (tabla)",["Promedios del mes"]]];
function d2Capas(legacy){
  const cards=[...legacy.querySelectorAll("section.card")], porTitulo=t=>cards.find(c=>{ const h=c.querySelector("h3"); return h&&h.textContent.trim()===t; });
  const usados=new Set(), html=D2_CAPAS.map(([id,t,ts])=>{ const cs=ts.map(porTitulo).filter(Boolean); cs.forEach(c=>usados.add(c));
    return `<details class="d2-capa" data-capa="${id}" ${D2.abiertas.has(id)?"open":""}><summary><span>${t}</span><small>${cs.length} bloque${cs.length===1?"":"s"}</small></summary><div class="d2-capa-in dgrid">${cs.map(c=>c.outerHTML).join("")}</div></details>`; }).join("");
  const resto=cards.filter(c=>!usados.has(c)&&!c.classList.contains("resumen"));
  return html+(resto.length?`<details class="d2-capa" data-capa="otros"><summary><span>Más detalle</span></summary><div class="d2-capa-in dgrid">${resto.map(c=>c.outerHTML).join("")}</div></details>`:"")
    +`<details class="d2-capa" data-capa="informes" ${D2.abiertas.has("informes")?"open":""}><summary><span>Informes automáticos</span><small>semanal cada lunes · mensual cada día 1</small></summary><div class="d2-capa-in" id="d2-inf">${D2.infHTML||'<p class="d2-mut">Cargando…</p>'}</div></details>`;
}
/* ---------- render ---------- */
const _d2Legacy=renderDash;
renderDash=function(){
  const box=$("#dash"); _d2Legacy(); // genera el dashboard de siempre (se reaprovecha su detalle)
  const legacy=document.createElement("div"); legacy.innerHTML=box.innerHTML;
  const esAct=MES===hoyC().slice(0,7), M=metricas(MES), P=metricas(mesMas(MES,-1),esAct?M.t.nDias:31), S=d2Series(M);
  const resumen=legacy.querySelector(".resumen"), ph=legacy.querySelector(".print-head");
  const viendo=Object.values(VIENDO||{}).reduce((a,b)=>a+b,0);
  box.innerHTML=`${ph?ph.outerHTML:""}
    <div class="d2">
      <header class="d2-top"><div><small class="d2-eyebrow">Centro de mando · ${esc(nombreMes(MES))}</small><h2>Pulso del negocio</h2></div>
        <span class="d2-pill ${viendo?"on":""}"><i></i>${esAct?(viendo?`${viendo} ${viendo===1?"persona viendo":"personas viendo"} coches ahora`:"En vivo"):"Mes cerrado"}</span></header>
      ${resumen?`<div class="d2-res">${resumen.querySelector("p").outerHTML}${resumen.querySelector("ul")?resumen.querySelector("ul").outerHTML:""}</div>`:""}
      ${d2Kpis(M,P,S)}
      <div class="d2-g2">${d2Forecast(M,P,S)}${d2Sim(M)}</div>
      <div class="d2-g2">${d2HeatDemanda()}${d2HeatCoches(M)}</div>
      ${d2Sankey(M)}
      <div class="d2-capas"><h3 class="d2-cap-t">Todo el detalle <small>ábrelo cuando lo necesites</small></h3>${d2Capas(legacy)}</div>
    </div>`;
  d2Informes();
};
/* ---------- informes automáticos ---------- */
async function d2Informes(forzar){
  const box=$("#d2-inf"); if(!box) return;
  if(!D2.infLista||forzar){ try{ D2.infLista=await api("/api/informes-auto"); }catch(err){ box.innerHTML=`<p class="d2-mut">${esc(err.message)}</p>`; return; } }
  const nombre=id=>{ const [t,...f]=id.split("-"), d=f.join("-"); return t==="mensual"?`Mensual · ${nombreMes(d.slice(0,7))}`:`Semanal · desde el ${fechaLarga(d).toLowerCase()}`; };
  D2.infHTML=`<div class="d2-infbar"><button type="button" class="btn b-ghost b-sm" data-d2gen="semanal">Generar el de la semana pasada</button><button type="button" class="btn b-ghost b-sm" data-d2gen="mensual">Generar el del mes pasado</button></div>
    ${D2.infLista.length?`<div class="d2-infl">${D2.infLista.map(id=>`<button type="button" class="d2-infi" data-d2inf="${esc(id)}"><span>${id.startsWith("mensual")?"📘":"📄"}</span><b>${esc(nombre(id))}</b><em>Ver e imprimir →</em></button>`).join("")}</div>`:'<p class="d2-mut">Todavía no hay informes. Cada lunes llega solo el de la semana (y el día 1 el del mes) a tu email y a Telegram.</p>'}`;
  box.innerHTML=D2.infHTML;
}
function d2InfHTML(inf){
  const k=inf.kpis, p=inf.prev;
  const K=[["Facturación",k.facturacion?d2e(k.facturacion):"—",d2Chip(k.facturacion,p.facturacion),1],["Solicitudes",nfmt(k.solicitudes),d2Chip(k.solicitudes,p.solicitudes)],["Visitas web",nfmt(k.visitas),d2Chip(k.visitas,p.visitas)],["Conversión",k.visitas?d2n(k.conversion*100)+" %":"—",d2Chip(k.conversion,p.conversion)],["Citas",nfmt(k.citas),d2Chip(k.citas,p.citas)],["Cerradas",nfmt(k.ganadas),d2Chip(k.ganadas,p.ganadas)],["Contactos (WhatsApp, llamar…)",nfmt(k.contactos),d2Chip(k.contactos,p.contactos)],["Respuesta (mediana)",k.respMediana===null?"—":durM(k.respMediana),d2Chip(k.respMediana||0,p.respMediana,true)]];
  const tabla=(t,cab,filas)=>filas.length?`<section class="d2r-b"><h4>${t}</h4><table class="d2r-t"><thead><tr>${cab.map((c,i)=>`<th${i?' class="n"':""}>${c}</th>`).join("")}</tr></thead><tbody>${filas.map(f=>`<tr>${f.map((c,i)=>`<td${i?' class="n num"':""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`:"";
  return `<article class="d2r" id="d2r">
    <header class="d2r-cov"><div class="d2r-logo"><svg viewBox="0 0 662 162" height="36" style="color:#F2EFEA;--logo-inv:#121211">${$(".logo svg")?$(".logo svg").innerHTML:""}</svg></div>
      <small>Informe ${inf.tipo} automático</small><h2>${esc(inf.titulo)}</h2><p>${esc(fechaLarga(inf.desde))} – ${esc(fechaLarga(inf.hasta).toLowerCase())} · comparado con ${inf.tipo==="mensual"?"el mes anterior":"la semana anterior"}</p></header>
    <div class="d2r-k">${K.map(([l,v,d,h])=>`<div class="${h?"hero":""}"><span>${l}</span><b class="num">${v}</b>${d}</div>`).join("")}</div>
    <section class="d2r-b"><h4>Visitas y solicitudes por día</h4>${columnas(inf.serie.map(x=>x.v),inf.serie.map(x=>String(+x.f.slice(8))),inf.serie.map(x=>`${fechaLarga(x.f)}: ${x.v} visitas · ${x.s} solicitudes`),{alto:120})}</section>
    <div class="d2r-2">${tabla("De dónde vienen",["Canal","Visitas","Solicitudes"],inf.canales.slice(0,8).map(([c,v,s])=>[esc(c),nfmt(v),nfmt(s)]))}
    ${tabla("Coches con más interés",["Coche","Personas","Solicitudes"],inf.coches.map(c=>[esc(c.titulo),nfmt(c.personas),nfmt(c.leads)]))}
    ${tabla("Servicios de taller",["Servicio","Veces"],inf.servicios.map(([s,n])=>[esc(s),nfmt(n)]))}
    ${tabla("Campañas",["Campaña","Visitas","Solicitudes"],inf.campanas.map(([c,v,s])=>[esc(c),nfmt(v),nfmt(s)]))}
    ${tabla("Por qué se pierden",["Motivo","Clientes"],inf.perdidas.map(([m,n])=>[esc(m),nfmt(n)]))}</div>
    <footer class="d2r-f">Volcano Cars · MAILIN Y YERAY SL · Generado el ${esc(new Date(inf.generado).toLocaleString("es-ES",{dateStyle:"long",timeStyle:"short"}))}. Visitas sin cookies ni datos personales; facturación = importes apuntados en el CRM.</footer>
  </article>`;
}
async function d2AbrirInforme(id){
  let inf; try{ inf=await api("/api/informes-auto/"+encodeURIComponent(id)); }catch(err){ toast(err.message); return; }
  let dlg=$("#d2-dlg"); if(!dlg){ dlg=document.createElement("dialog"); dlg.id="d2-dlg"; dlg.className="d2-dlg"; document.body.appendChild(dlg); }
  dlg.innerHTML=`<div class="d2-dlg-bar"><b>${esc(inf.titulo)}</b><span><button type="button" class="btn b-acc b-sm" data-d2print>Imprimir / PDF</button><button type="button" class="btn b-ghost b-sm" data-d2cerrar>Cerrar</button></span></div>${d2InfHTML(inf)}`;
  dlg.showModal();
}
function d2ImprimirInforme(){
  const dlg=$("#d2-dlg"), r=dlg&&dlg.querySelector("#d2r"); if(!r) return;
  let box=$("#d2-print"); if(!box){ box=document.createElement("div"); box.id="d2-print"; document.body.appendChild(box); }
  box.innerHTML=r.outerHTML; dlg.close(); document.body.classList.add("print-d2r");
  const t=document.title; document.title="Volcano Cars · "+(r.querySelector("h2")||{}).textContent;
  const fin=()=>{ document.body.classList.remove("print-d2r"); box.innerHTML=""; document.title=t; removeEventListener("afterprint",fin); };
  addEventListener("afterprint",fin); window.print();
}
/* ---------- eventos ---------- */
document.addEventListener("click",async e=>{ const t=e.target;
  const c=t.closest("[data-d2capa]"); if(c){ const d=document.querySelector(`.d2-capa[data-capa="${c.dataset.d2capa}"]`); if(d){ d.open=true; D2.abiertas.add(c.dataset.d2capa); d.scrollIntoView({behavior:"smooth",block:"start"}); } return; }
  const fc=t.closest("[data-d2fc]"); if(fc){ D2.fc=fc.dataset.d2fc; renderDash(); return; }
  const hm=t.closest("[data-d2heat]"); if(hm){ D2.heat=hm.dataset.d2heat; if(D2.heat==="28"&&!Object.keys(STATS).some(f=>f<MES+"-01")){ /* ya cargado: STATS incluye el mes anterior */ } renderDash(); return; }
  const sk=t.closest("[data-d2sk]"); if(sk){ D2.sk=sk.dataset.d2sk; renderDash(); return; }
  if(t.closest("[data-d2simreset]")){ D2.sim=null; renderDash(); return; }
  const g=t.closest("[data-d2gen]"); if(g){ g.disabled=true; g.textContent="Generando…"; try{ const inf=await api("/api/informes-auto",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tipo:g.dataset.d2gen})}); await d2Informes(true); d2AbrirInforme(inf.id); }catch(err){ toast(err.message); g.disabled=false; } return; }
  const i=t.closest("[data-d2inf]"); if(i){ d2AbrirInforme(i.dataset.d2inf); return; }
  if(t.closest("[data-d2cerrar]")){ $("#d2-dlg").close(); return; }
  if(t.closest("[data-d2print]")){ d2ImprimirInforme(); return; }
});
document.addEventListener("toggle",e=>{ const d=e.target; if(d.classList&&d.classList.contains("d2-capa")){ d.open?D2.abiertas.add(d.dataset.capa):D2.abiertas.delete(d.dataset.capa); } },true);
document.addEventListener("input",e=>{ const s=e.target.closest&&e.target.closest("[data-d2sl]"); if(!s||!D2.sim) return;
  const k=s.dataset.d2sl, def=D2_SL.find(x=>x[0]===k); D2.sim[k]=+s.value; const lab=document.querySelector(`[data-d2slv="${k}"]`); if(lab) lab.textContent=def[5](+s.value);
  s.style.setProperty("--p",((s.value-s.min)/(s.max-s.min)*100)+"%");
  const o=$("#d2-simout"); if(o) o.innerHTML=d2SimOut(d2SimBase(metricas(MES))); });
// Informe manual (botón «Informe PDF»): abre todas las capas para imprimir y las deja como estaban
addEventListener("beforeprint",()=>{ if(document.body.classList.contains("print-d2r")) return; document.querySelectorAll(".d2-capa").forEach(d=>{ d.dataset.pv=d.open?"1":""; d.open=true; }); document.querySelectorAll("#d2-sim input[type=range]").forEach(s=>s.style.setProperty("--p",((s.value-s.min)/(s.max-s.min)*100)+"%")); });
addEventListener("afterprint",()=>{ document.querySelectorAll(".d2-capa").forEach(d=>{ if(d.dataset.pv!==undefined){ d.open=d.dataset.pv==="1"; delete d.dataset.pv; } }); });
// Operación (inventario y taller): van en su propia capa, fuera del bloque que se repinta
(function(){ const a=$("#dash-alm"), tl=$("#dash-taller"); if(!a||!tl||$("#d2-op")) return;
  const d=document.createElement("details"); d.className="d2-capa d2-op"; d.id="d2-op"; d.dataset.capa="op"; d.innerHTML='<summary><span>Operación: taller e inventario</span><small>rendimiento de mecánicos, stock</small></summary><div class="d2-capa-in"></div>';
  a.parentNode.insertBefore(d,a); d.lastElementChild.append(a,tl); })();
// Enlace directo desde el email del informe: …/admin.html#informe=semanal-2026-09-14
(function(){ const m=location.hash.match(/^#informe=(.+)$/); if(!m) return; const id=decodeURIComponent(m[1]);
  const esperar=setInterval(()=>{ if(typeof ME!=="undefined"&&ME&&PUEDE_TODO()){ clearInterval(esperar); abrirTab("dash"); setTimeout(()=>d2AbrirInforme(id),400); } },500); setTimeout(()=>clearInterval(esperar),120000); })();
