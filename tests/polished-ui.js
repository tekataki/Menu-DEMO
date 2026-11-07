/* QA del HTML y JS reales; nube y storage solo simulados en memoria. */
(async()=>{
  const assert=(ok,label)=>console[ok?'log':'error']((ok?'PASS ':'FAIL ')+label);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const frame=document.getElementById('app');
  const html=await fetch('../menuV2.html').then(r=>r.text());
  const d=new DOMParser().parseFromString(html,'text/html');
  d.querySelectorAll('script[src="js/cloud.js"],script[src="js/vendor/supabase-js-2.57.4.js"],link[href*="fonts.googleapis.com"]').forEach(e=>e.remove());
  const base=d.createElement('base');base.href=new URL('../',location.href).href;d.head.prepend(base);
  const fixture=d.createElement('script');fixture.src='tests/mesa-fixture.js';d.head.insertBefore(fixture,base.nextSibling);
  const framing=d.createElement('style');framing.textContent='.hero-title,.hero-stage,.index,.catbar,.menu,.signoff{display:none!important}html{scroll-behavior:auto!important;overflow-anchor:none}';d.head.append(framing);
  const loaded=new Promise(r=>frame.addEventListener('load',r,{once:true}));frame.srcdoc='<!doctype html>'+d.documentElement.outerHTML;await loaded;
  const w=frame.contentWindow,doc=frame.contentDocument;
  const until=async selector=>{for(let i=0;i<120&&!doc.querySelector(selector);i++)await wait(100);if(!doc.querySelector(selector))throw new Error('No apareció '+selector);return doc.querySelector(selector);};
  await doc.fonts.ready;
  const mesa=await until('.casona-steps-v4[data-ready="true"]');await wait(1600);
  const stepsSource=new DOMParser().parseFromString(await fetch('../assets/ui/pasos-mesa-v4.html').then(r=>r.text()),'text/html');
  const deliverySource=new DOMParser().parseFromString(await fetch('../assets/ui/entrega-v2.html').then(r=>r.text()),'text/html');
  const paths=node=>[...node.querySelectorAll('path')].map(p=>p.getAttribute('d')).join('|');
  assert(w.CASONA_DEBUG.state.mode==='mesa','modo mesa intacto');
  assert(paths(mesa.querySelector('.steps'))===paths(stepsSource.querySelector('.steps')),'SVG Pasos v4 exactos del archivo recibido');
  assert(mesa.querySelectorAll('.wire').length===2&&!!mesa.querySelector('.token'),'ficha viajera y dos conectores');
  assert(mesa.querySelector('.steps').classList.contains('is-motion'),'controlador v4 activo');
  assert(w.getComputedStyle(mesa.querySelector('.step-art')).animationName==='none','no se mezcla animación antigua stepOn');
  assert(w.getComputedStyle(mesa.querySelector('.s2 .stamp')).position==='static','stamp del paso aislado del sticker de producto');
  assert(!!doc.querySelector('.mesa-stamp')&&!doc.querySelector('#paperTable'),'sello existente conservado sin ticket');
  const session=w.localStorage.getItem('casonaV2.sesionMesa');
  const add=doc.querySelector('.item [data-act="add"]');if(add)add.click();
  const cartBefore=JSON.stringify(w.CASONA_DEBUG.state.cart);
  w.confirm=()=>true;doc.querySelector('[data-act="leave-table"]').click();
  const delivery=await until('.casona-delivery-v2[data-ready="true"]');await wait(700);
  assert(w.CASONA_DEBUG.state.mode==='online','Salir de la mesa sigue funcionando');
  assert(paths(delivery.querySelector('.doors'))===paths(deliverySource.querySelector('.doors')),'SVG Entrega v2 exactos del archivo recibido');
  assert(delivery.querySelectorAll('[data-r="puffs"] circle').length===10,'motor original de partículas activo');
  assert(!doc.querySelector('.casona-steps-v4'),'Pasos v4 solo se sustituyen en modo mesa');
  const home=delivery.querySelector('[data-fulfil="domicilio"]'),pick=delivery.querySelector('[data-fulfil="recoger"]');
  home.click();assert(w.CASONA_DEBUG.state.fulfil==='domicilio'&&home.getAttribute('aria-checked')==='true','selección domicilio conectada al pedido');
  assert(doc.getElementById('doorSum').textContent.includes('A domicilio'),'resumen de envío se actualiza');
  const expected=String(w.CASONA_CONFIG.envioDomicilio||0);
  assert(home.querySelector('.amt').textContent==='+$'+expected,'importe real desde configuración, no fijo del standalone');
  home.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert(w.CASONA_DEBUG.state.fulfil==='recoger'&&doc.activeElement===pick,'teclado conectado a selección real');
  assert(JSON.parse(w.localStorage.getItem('casonaV2.fulfil'))==='recoger','selección persiste con la clave existente');
  assert(JSON.stringify(w.CASONA_DEBUG.state.cart)===cartBefore,'carrito conservado al cambiar de modo');
  assert(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,'entrega sin desbordamiento horizontal');
  assert(doc.querySelectorAll('[data-polished-style]').length===2&&doc.querySelectorAll('[data-polished-controller]').length===2,'recursos compartidos sin duplicarse');
  const previousList=mesa.querySelector('.steps');
  assert(previousList.getAnimations({subtree:true}).length===0,'animaciones retiradas al desmontar modo mesa');
  const finalMode=document.body.dataset.finalMode||'mesa';
  if(finalMode==='mesa'){
    w.localStorage.setItem('casonaV2.sesionMesa',session);
    w.dispatchEvent(new w.StorageEvent('storage',{key:'casonaV2.sesionMesa'}));
    await until('.casona-steps-v4[data-ready="true"]');await wait(1700);
    assert(w.CASONA_DEBUG.state.mode==='mesa','remontaje de mesa sin errores');
    assert(JSON.stringify(w.CASONA_DEBUG.state.cart)===cartBefore,'carrito conservado al remontar');
    assert(doc.querySelectorAll('[data-polished-style]').length===2,'remontaje no duplica estilos');
  }
  assert(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,'vista final sin desbordamiento horizontal');
  doc.documentElement.style.setProperty('scroll-behavior','auto','important');w.scrollTo(0,0);
  if(finalMode==='mesa'){
    doc.querySelector('.casona-steps-v4').scrollIntoView({behavior:'instant',block:'center'});
    for(let i=0;i<30&&doc.querySelector('.casona-steps-v4 .is-armed');i++)await wait(100);
    await wait(1000);
    assert([...doc.querySelectorAll('.casona-steps-v4 .step-art')].every(el=>parseFloat(w.getComputedStyle(el).opacity)===1),'los tres dibujos v4 quedan visibles tras la entrada');
  }
  document.body.dataset.ready='true';
})().catch(e=>console.error('QA ERROR',e.stack));
