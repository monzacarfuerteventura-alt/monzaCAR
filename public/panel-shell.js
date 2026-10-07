/* Panel · estructura de ordenador (actualización 48): barra lateral, buscador y paleta de comandos (Ctrl/⌘+K).
   No contiene lógica de negocio: solo reutiliza lo que ya existe (abrirTab, abrirFichas, abrirLead, openForm, VCGuiado). */
(function(){
  "use strict";
  var $=function(s,r){return (r||document).querySelector(s)};
  var ancho=function(){return window.matchMedia("(min-width:721px)").matches};
  var I={
    dash:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    leads:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M17 11a3 3 0 100-6M21.5 20c-.4-2.3-1.7-3.9-3.5-4.8"/>',
    ordenes:'<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    alm:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    caja:'<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M7 15h3"/>',
    jornada:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fin:'<path d="M3 20h18M6 16v-4M10 16V8M14 16v-6M18 16V5"/>',
    agenda:'<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
    coches:'<path d="M5 16h14M6.5 16l1.3-4.3A2 2 0 019.7 10h4.6a2 2 0 011.9 1.7L17.5 16M7 16v2M17 16v2"/><circle cx="8.5" cy="14" r=".6"/><circle cx="15.5" cy="14" r=".6"/>',
    resp:'<path d="M4 5h16v11H9l-5 4z"/>',
    ayuda:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4M12 17h.01"/>'
  };
  var NOMBRE={dash:"Resumen",leads:"CRM · Clientes",ordenes:"Taller",alm:"Inventario",caja:"Caja",jornada:"Jornada",fin:"Finanzas",agenda:"Agenda",coches:"Coches",resp:"Respuestas",ayuda:"Ayuda"};
  var GRUPOS=[["","",["dash"]],["Taller","t",["ordenes","agenda","alm","jornada"]],["Venta de coches","v",["coches","leads","resp"]],["Dinero","",["caja","fin"]],["Soporte","",["ayuda"]]];
  var svg=function(k){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(I[k]||"")+'</svg>'};
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var mac=/Mac|iPhone|iPad/.test(navigator.platform||"");

  function visible(t){var b=$('#tabs [data-tab="'+t+'"]');return !!b&&b.offsetParent!==null}
  function activa(){var b=$('#tabs [aria-selected="true"]');return b?b.dataset.tab:""}

  function construir(){
    if($("#vc-side")) return;
    var logo=$(".top .logo svg");
    var nav=document.createElement("aside");nav.id="vc-side";nav.setAttribute("aria-label","Menú principal");
    var h='<a class="vs-logo" href="/" target="_blank" rel="noopener" aria-label="Ver la web">'+(logo?logo.outerHTML:"<b>Volcano Cars</b>")+'</a>';
    h+='<button class="vs-new" type="button" id="vs-new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Nuevo</span><kbd>N</kbd></button>';
    GRUPOS.forEach(function(g){
      if(g.length===2)g=[g[0],"",g[1]];
      h+=(g[0]?'<div class="vs-grp'+(g[1]?' vs-'+g[1]:'')+'" data-g>'+g[0]+'</div>':"");
      g[2].forEach(function(t){h+='<button class="vs-it" type="button" data-vs="'+t+'" hidden>'+svg(t)+'<span>'+NOMBRE[t]+'</span><b class="vs-n" hidden></b></button>'});
    });
    h+='<div class="vs-sp"></div><div class="vs-foot"><div class="vs-live" id="vs-live"><i></i><span>En vivo</span></div>'+
      '<button class="vs-it" type="button" data-vs-x="web"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><span>Ver web</span></button></div>';
    nav.innerHTML=h;document.body.appendChild(nav);
    nav.addEventListener("click",function(e){
      var b=e.target.closest("button");if(!b) return;
      if(b.id==="vs-new"){menuNuevo(b);return}
      if(b.dataset.vs){abrir(b.dataset.vs);return}
      var x=b.dataset.vsX;
      if(x==="seg"){var s=$("#btn-seg");if(s)s.click()}
      else if(x==="out"){var o=$("#logout");if(o)o.click()}
      else if(x==="web"){window.open("/#comprar","_blank","noopener")}
    });
    var bar=$(".top .bar");
    if(bar){
      var sb=document.createElement("button");sb.type="button";sb.id="vc-search-btn";
      sb.innerHTML='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Buscar órdenes, clientes, coches…</span><kbd>'+(mac?"⌘":"Ctrl")+' K</kbd>';
      sb.onclick=function(){paleta()};
      bar.insertBefore(sb,bar.firstChild);
    }
  }

  function abrir(t){if(typeof abrirTab==="function")abrirTab(t)}

  function sync(){
    var tr=$("#tabsrow"),ta=$("#topacts");
    var logeado=!!tr&&!!ta&&!ta.hidden&&!$("#s-login:not([hidden])");
    var tengo=!!document.querySelector("#vc-side [data-vs]:not([hidden])");
    var on=ancho()&&logeado&&(!tr.hidden||tengo);
    document.body.classList.toggle("vc-shell",on);
    if(!on) return;
    construir();
    if(tr.hidden){var q=$("#vc-side [data-vs][aria-current]");if(q&&!$("#s-ficha:not([hidden])"))q.removeAttribute("aria-current");return}
    var a=activa();
    document.querySelectorAll("#vc-side [data-vs]").forEach(function(b){
      var t=b.dataset.vs,v=visible(t);b.hidden=!v;
      if(v&&t===a)b.setAttribute("aria-current","true");else b.removeAttribute("aria-current");
    });
    document.querySelectorAll("#vc-side .vs-grp").forEach(function(g){
      var n=g.nextElementSibling,alguno=false;
      while(n&&!n.classList.contains("vs-grp")&&!n.classList.contains("vs-sp")){if(n.dataset&&n.dataset.vs&&!n.hidden)alguno=true;n=n.nextElementSibling}
      g.hidden=!alguno;
    });
    contadores();
    var lv=$("#live"),vl=$("#vs-live");
    if(lv&&vl){vl.classList.toggle("off",/off|sin|error/i.test(lv.className+" "+lv.textContent));var s=vl.querySelector("span");if(s)s.textContent=($("#live-t")||{}).textContent||"En vivo"}
  }

  function contadores(){
    var n={};
    try{
      if(typeof LEADS!=="undefined")n.leads=LEADS.filter(function(l){return l.estado==="nueva"||!l.estado}).length;
      if(typeof ORDENES!=="undefined")n.ordenes=ORDENES.filter(function(o){return o.estado==="recibido"}).length;
    }catch(e){}
    ["leads","ordenes"].forEach(function(t){
      var b=$('#vc-side [data-vs="'+t+'"] .vs-n');if(!b) return;
      var v=n[t]||0;b.hidden=!v;b.textContent=v>99?"99+":v;
    });
  }

  /* menú rápido «+ Nuevo» (reutiliza las 3 acciones grandes del asistente guiado) */
  function menuNuevo(ancla){
    cerrarMenu();
    var m=document.createElement("div");m.className="vs-menu";m.id="vs-menu";
    var items=[["a","+","Nueva entrada de coche","Recepción en el taller · paso a paso","entrada"],["b","€","Nueva factura","Datos, líneas y cobro","factura"],["c","↔","Caja","Cobrar, apuntar un gasto o cerrar","caja"]];
    m.innerHTML=items.map(function(i){return '<button type="button" class="'+i[0]+'" data-g="'+i[4]+'"><i>'+i[1]+'</i><span>'+i[2]+'<small>'+i[3]+'</small></span></button>'}).join("");
    var r=ancla.getBoundingClientRect();m.style.left=(r.left)+"px";m.style.top=(r.bottom+8)+"px";
    document.body.appendChild(m);
    m.addEventListener("click",function(e){
      var b=e.target.closest("button");if(!b) return;cerrarMenu();
      var g=document.querySelector('#gd-bar [data-gd="'+b.dataset.g+'"]');
      if(g)g.click();
    });
    setTimeout(function(){document.addEventListener("click",cerrarMenu,{once:true})},0);
  }
  function cerrarMenu(){var m=$("#vs-menu");if(m)m.remove()}

  /* paleta de comandos */
  function fuentes(){
    var r=[],i;
    var ac=[["Nueva entrada de coche","entrada","Recepción paso a paso","E"],["Nueva factura / cobro directo","factura","Cobrar a un cliente","F"],["Control de caja","caja","Abrir, cobrar o cerrar","C"]];
    ac.forEach(function(a){r.push({t:a[0],s:"Acción · "+a[2],k:"+",a:1,kb:a[3],f:function(){var g=document.querySelector('#gd-bar [data-gd="'+a[1]+'"]');if(g)g.click()}})});
    var cj=function(sel){return function(){abrir("caja");setTimeout(function(){var b=document.querySelector(sel);if(b)b.click()},700)}};
    if(visible("caja")){
      r.push({t:"Cobro en efectivo",s:"Acción · apunta un ingreso en la caja",k:"caja",a:1,h:"cobrar ingreso efectivo",f:cj('[data-cjform="ingreso"]')});
      r.push({t:"Salida de dinero",s:"Acción · proveedor, compra o retiro con ticket",k:"caja",a:1,h:"gasto retiro egreso",f:cj('[data-cjform="egreso"]')});
      r.push({t:"Cerrar la caja (arqueo ciego)",s:"Acción · cuenta billetes y monedas",k:"caja",a:1,h:"cierre arqueo",f:cj('[data-cjmodo="cerrar"]')});
    }
    Object.keys(NOMBRE).forEach(function(t){if(visible(t))r.push({t:NOMBRE[t],s:"Ir a",k:t,f:function(){abrir(t)}})});
    try{(ORDENES||[]).forEach(function(o){var c=(o.cliente&&o.cliente.nombre)||"",v=o.vehiculo||{};
      if(o.estado!=="entregado"&&typeof abrirFichas==="function")r.push({t:"Cobrar · "+(v.matricula||"")+" · "+c,s:"Factura de la orden "+(o.numero||"")+" · "+(v.marcaModelo||""),k:"caja",a:1,h:"cobrar factura facturar pagar "+[c,v.matricula,v.marcaModelo].join(" "),f:function(){abrirFichas(o.token,"f5")}});
      r.push({t:(v.matricula||"Orden")+" · "+c,s:"Orden · "+(v.marcaModelo||"")+" · "+(o.estado||""),k:"ordenes",h:[c,v.matricula,v.marcaModelo,o.token].join(" "),f:function(){if(typeof abrirFichas==="function")abrirFichas(o.token)}})})}catch(e){}
    try{(LEADS||[]).forEach(function(l){r.push({t:l.nombre||"Cliente",s:"CRM · "+(l.mensaje||"").slice(0,60),k:"leads",h:[l.nombre,l.telefono,l.mensaje,l.email].join(" "),f:function(){abrir("leads");if(typeof abrirLead==="function")abrirLead(l.id)}})})}catch(e){}
    try{(CARS||[]).forEach(function(c){r.push({t:(c.marca||"")+" "+(c.modelo||""),s:"Coche · "+(c.anio||"")+" · "+(c.estado||""),k:"coches",h:[c.marca,c.modelo,c.version,c.anio].join(" "),f:function(){abrir("coches");if(typeof openForm==="function")openForm(c)}})})}catch(e){}
    return r;
  }
  var norm=function(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")};
  function paleta(){
    if($("#vc-pal-w")) return;
    var w=document.createElement("div");w.id="vc-pal-w";
    w.innerHTML='<div class="vp-box" role="dialog" aria-modal="true" aria-label="Buscar"><div class="vp-in"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="vp-q" autocomplete="off" spellcheck="false" placeholder="Matrícula, cliente, «cobrar», «caja»…  (> solo acciones)"><kbd>Esc</kbd></div><div class="vp-l" id="vp-l" role="listbox"></div></div>';
    document.body.appendChild(w);
    var src=fuentes(),sel=0,vis=[],q=$("#vp-q"),L=$("#vp-l");
    function pintar(){
      var raw=q.value,solo=raw.charAt(0)===">";var t=norm(solo?raw.slice(1):raw).split(/\s+/).filter(Boolean);
      vis=src.filter(function(x){if(solo&&!x.a)return false;var h=norm(x.t+" "+x.s+" "+(x.h||""));return t.every(function(p){return h.indexOf(p)>-1})}).slice(0,40);
      if(sel>=vis.length)sel=0;
      L.innerHTML=vis.length?vis.map(function(x,i){return '<button type="button" role="option" data-i="'+i+'"'+(i===sel?' aria-selected="true"':"")+'><span class="vp-i">'+svg(x.k)+'</span><span class="vp-t">'+esc(x.t)+'<small>'+esc(x.s)+'</small></span></button>'}).join(""):'<div class="vp-0">Nada coincide con «'+esc(q.value)+'»</div>';
    }
    function ir(i){var x=vis[i];if(!x)return;cerrar();setTimeout(x.f,30)}
    function cerrar(){w.remove();document.removeEventListener("keydown",kd,true)}
    function kd(e){
      if(e.key==="Escape"){e.preventDefault();cerrar()}
      else if(e.key==="ArrowDown"){e.preventDefault();sel=Math.min(sel+1,vis.length-1);pintar();var a=L.querySelector('[aria-selected="true"]');if(a)a.scrollIntoView({block:"nearest"})}
      else if(e.key==="ArrowUp"){e.preventDefault();sel=Math.max(sel-1,0);pintar();var b=L.querySelector('[aria-selected="true"]');if(b)b.scrollIntoView({block:"nearest"})}
      else if(e.key==="Enter"){e.preventDefault();ir(sel)}
    }
    document.addEventListener("keydown",kd,true);
    q.addEventListener("input",function(){sel=0;pintar()});
    L.addEventListener("click",function(e){var b=e.target.closest("button[data-i]");if(b)ir(+b.dataset.i)});
    w.addEventListener("mousedown",function(e){if(e.target===w)cerrar()});
    pintar();q.focus();
  }
  window.VCPaleta=paleta;
  var chord=0;
  document.addEventListener("keydown",function(e){
    if(!document.body.classList.contains("vc-shell")||e.ctrlKey||e.metaKey||e.altKey||$("#vc-pal-w"))return;
    var tag=(e.target.tagName||"").toLowerCase();if(/input|textarea|select/.test(tag)||e.target.isContentEditable)return;
    var k=e.key.toLowerCase();
    if(k==="g"){chord=Date.now();return}
    if(chord&&Date.now()-chord<1200){chord=0;
      var mapa={e:"entrada",f:"factura",c:"caja"},m=mapa[k];
      if(m){var g=document.querySelector('#gd-bar [data-gd="'+m+'"]');if(g){e.preventDefault();g.click()}return}
      var sec={t:"ordenes",d:"dash",a:"agenda",i:"alm",j:"jornada",l:"leads",o:"coches",n:"fin",y:"ayuda"}[k];
      if(sec&&visible(sec)){e.preventDefault();abrir(sec)}
    }
  });

  document.addEventListener("keydown",function(e){
    if(!document.body.classList.contains("vc-shell")) return;
    var tag=(e.target.tagName||"").toLowerCase(),escribiendo=/input|textarea|select/.test(tag)||e.target.isContentEditable;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();paleta();return}
    if(!escribiendo&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      if(e.key==="/"){e.preventDefault();paleta()}
      else if(e.key==="n"||e.key==="N"){var b=$("#vs-new");if(b){e.preventDefault();menuNuevo(b)}}
    }
  });
  window.addEventListener("resize",sync);
  function marcar(){
    document.querySelectorAll(".t-pipe.mini[title]:not([data-k])").forEach(function(e){
      var t=norm(e.getAttribute("title"));e.dataset.k=/entreg/.test(t)?"fin":/calidad/.test(t)?"cal":/trabajo|repar/.test(t)?"rep":/inspec|diagn/.test(t)?"ins":"rec";
    });
  }
  /* al pulsar una sección, el menú se marca al instante (antes esperaba al repaso de 700 ms) */
  document.addEventListener("click",function(e){ if(e.target.closest&&e.target.closest("#vc-side [data-vs],#app-bar button")){ setTimeout(sync,0); setTimeout(sync,150); } });
  setInterval(function(){ if(document.hidden) return; sync();marcar()},700);
  document.addEventListener("DOMContentLoaded",sync);sync();
})();

/* VIDA 54 · interactividad: foco de luz que sigue al cursor y onda al pulsar (solo transform/opacity, sin librerías) */
(function(){
  if(!document.body||window.__vcVida) return; window.__vcVida=1;
  var raf=0,px=0,py=0,el=null;
  if(window.matchMedia&&matchMedia("(hover:hover)").matches){
    document.addEventListener("pointermove",function(e){ var t=e.target&&e.target.closest&&e.target.closest(".card,.gd-big,.d2-card"); if(!t){ return; } el=t; px=e.clientX; py=e.clientY;
      if(!raf) raf=requestAnimationFrame(function(){ raf=0; if(!el) return; var r=el.getBoundingClientRect(); el.style.setProperty("--mx",(px-r.left)+"px"); el.style.setProperty("--my",(py-r.top)+"px"); }); },{passive:true});
  }
  document.addEventListener("pointerdown",function(e){ var b=e.target&&e.target.closest&&e.target.closest(".btn,.gd-big,.gd-opt"); if(!b||b.disabled||document.documentElement.classList.contains("lite")) return;
    var r=b.getBoundingClientRect(), d=Math.max(r.width,r.height)*1.6, s=document.createElement("span"); s.className="vc-rip";
    s.style.cssText="width:"+d+"px;height:"+d+"px;left:"+(e.clientX-r.left-d/2)+"px;top:"+(e.clientY-r.top-d/2)+"px"; if(getComputedStyle(b).position==="static") b.style.position="relative";
    b.appendChild(s); setTimeout(function(){ s.remove(); },600); },{passive:true});
})();

/* ACTUALIZACIÓN 55 · secciones PLEGABLES: cada cabecera del panel se puede plegar/desplegar y el panel se acuerda (por sección) de lo que dejaste.
   Plegado = el texto y los botones de la cabecera no se pintan (menos trabajo para el navegador). Se guarda en este dispositivo (localStorage). */
(function(){
  var KEY="vc_plegado55", est={};
  try{ est=JSON.parse(localStorage.getItem(KEY)||"{}")||{}; }catch(_){ est={}; }
  function guardar(){ try{ localStorage.setItem(KEY,JSON.stringify(est)); }catch(_){} }
  var CHEV='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  function boton(id,plegado,extra){ return '<button type="button" class="vc-fold'+(extra||"")+'" data-vcfold="'+id+'" aria-expanded="'+(!plegado)+'" aria-label="'+(plegado?"Desplegar":"Plegar")+' esta sección" title="'+(plegado?"Desplegar":"Plegar")+' (se recuerda)">'+CHEV+'</button>'; }
  window.vcPleg={ es:function(id){ return !!est[id]; }, has:function(id){ return Object.prototype.hasOwnProperty.call(est,id); }, set:function(id,v){ est[id]=v?1:0; guardar(); } };
  window.vcPlegBtn=function(id){ var pl=!!est[id]; var tf=document.getElementById("tf"); if(tf&&id==="ficha") tf.classList.toggle("vc-ficha-plegada",pl); return boton(id,pl); };
  function armar(){
    document.querySelectorAll('main section[id^="s-"] > .head').forEach(function(h){
      if(h.dataset.fold) return; var t=h.querySelector("h1"); if(!t) return;
      var id="s:"+h.parentElement.id; h.dataset.fold=id; var pl=!!est[id];
      t.insertAdjacentHTML("afterend",boton(id,pl)); h.classList.toggle("vc-plegado",pl);
    });
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("[data-vcfold]"); if(!b) return; e.preventDefault(); e.stopPropagation();
    var id=b.dataset.vcfold, pl=!est[id]; window.vcPleg.set(id,pl);
    document.querySelectorAll('[data-vcfold="'+id+'"]').forEach(function(x){ x.setAttribute("aria-expanded",String(!pl)); x.setAttribute("aria-label",(pl?"Desplegar":"Plegar")+" esta sección"); x.title=(pl?"Desplegar":"Plegar")+" (se recuerda)"; });
    if(id==="ficha"){ var tf=document.getElementById("tf"); if(tf) tf.classList.toggle("vc-ficha-plegada",pl); }
    else { var h=document.querySelector('[data-fold="'+id+'"]'); if(h) h.classList.toggle("vc-plegado",pl); }
  },true);
  /* <details data-fold="…"> (guía de Ayuda): se acuerda si lo dejaste abierto o cerrado */
  document.addEventListener("toggle",function(e){ var d=e.target; if(d&&d.matches&&d.matches("details[data-fold]")) window.vcPleg.set(d.dataset.fold,!d.open); },true);
  document.addEventListener("DOMContentLoaded",armar); armar(); setTimeout(armar,600);
})();
