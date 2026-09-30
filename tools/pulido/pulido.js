/* PULIDO DE INTERFAZ · la sección activa del menú siempre a la vista (móvil) */
(function(){
  // Jornada, Respuestas y Ayuda no tenían icono como el resto: se les pone uno del mismo estilo
  const IC={jornada:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',resp:'<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',ayuda:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01"/>'};
  for(const k in IC){ const b=document.querySelector('#tabs [data-tab="'+k+'"]'); if(b&&!b.querySelector("svg")) b.insertAdjacentHTML("afterbegin",'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[k]+'</svg>'); }
  const centrar=()=>{ const n=document.getElementById("tabs"); if(!n||n.scrollWidth<=n.clientWidth+2) return; const b=n.querySelector('[aria-selected="true"]'); if(!b) return;
    try{ n.scrollTo({left:Math.max(0,b.offsetLeft-(n.clientWidth-b.offsetWidth)/2),behavior:"smooth"}); }catch(_){ n.scrollLeft=b.offsetLeft-20; } };
  const n=document.getElementById("tabs"); if(!n) return;
  new MutationObserver(centrar).observe(n,{subtree:true,attributes:true,attributeFilter:["aria-selected"]});
  window.addEventListener("resize",centrar); setTimeout(centrar,300);
})();
