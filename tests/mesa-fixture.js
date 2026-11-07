/* SOLO QA: sustituye almacenamiento por un Map en memoria en este iframe.
   No lee ni modifica registros del navegador, ni llama al servidor. */
(() => {
  const now = Date.now();
  const data = new Map([['casonaV2.sesionMesa', JSON.stringify({sesion:'qa',secreto:'qa',mesaId:'qa',numero:12,etiqueta:'Patio',startedAt:now,lastActive:now,lastPing:now,inactMin:90,maxH:4})]]);
  Object.defineProperty(window,'localStorage',{value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}});
  window.CasonaCloud={configured:true,getMenu:async()=>({}),mesa:{estado:async()=>({ok:true,numero:12,etiqueta:'Patio'}),cerrar:async()=>({ok:true})}};
})();
