/* Carga el HTML y código reales del menú. Única sustitución: nube y storage
   simulados por mesa-fixture.js. No añade una puerta de demo a producción. */
(async()=>{
  const frame=document.getElementById('app');
  const html=await fetch('../menuV2.html').then(r=>r.text());
  const d=new DOMParser().parseFromString(html,'text/html');
  d.querySelectorAll('script[src="js/cloud.js"],script[src="js/vendor/supabase-js-2.57.4.js"]').forEach(e=>e.remove());
  const base=d.createElement('base');base.href=new URL('../',location.href).href;d.head.prepend(base);
  const fixture=d.createElement('script');fixture.src='tests/mesa-fixture.js';d.head.insertBefore(fixture,base.nextSibling);
  // Encuadrar la tarjeta real para QA sin modificar su contenido ni estilos.
  const framing=d.createElement('style');framing.textContent='.hero-title,.hero-stage{display:none!important}html{scroll-behavior:auto!important;overflow-anchor:none}';d.head.append(framing);
  const loaded=new Promise(r=>frame.addEventListener('load',r,{once:true}));
  frame.srcdoc='<!doctype html>'+d.documentElement.outerHTML;await loaded;
  const w=frame.contentWindow,doc=frame.contentDocument;
  await doc.fonts.ready;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  await wait(350);
  const card=doc.getElementById('modeCard');card.scrollIntoView({behavior:'instant',block:'start'});
  await wait(2400);
  const assert=(ok,name)=>{console[ok?'log':'error']((ok?'PASS ':'FAIL ')+name)};
  assert(w.CASONA_DEBUG.state.mode==='mesa','menú real en modo mesa con sesión simulada');
  assert(doc.getElementById('tableText')?.textContent==='MESA 12','número de sesión en el sello');
  assert(!doc.querySelector('#stampSvg > rect,.mesa-stamp .paper,#paperPlace,#paperTable,#paperTime,.mesa-stamp .shadow,.stamp-impact > rect,.stamp-impact > line'),'sin fondo negro, papel, ticket, metadatos ni sombra del soporte');
  const stampStyle=w.getComputedStyle(doc.querySelector('.mesa-stamp'));
  assert(stampStyle.backgroundColor==='rgba(0, 0, 0, 0)'&&stampStyle.borderTopWidth==='0px'&&stampStyle.boxShadow==='none','contenedor transparente sin borde ni recuadro');
  assert(doc.querySelector('[data-mesa-stamp]')?.classList.contains('play'),'animación iniciada al entrar en pantalla');
  assert(parseFloat(w.getComputedStyle(doc.querySelector('.mesa-stamp .imprint')).opacity)===1,'impresión visible al finalizar');
  assert(!doc.querySelector('.seal-svg'),'sello anterior sustituido');
  assert(!doc.querySelector('#openCfg,#welcome,#sheet,#replayBtn'),'no se importó el resto del standalone');
  assert(!!doc.querySelector('[data-act="leave-table"]'),'se conserva Salir de la mesa');
  assert(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,'sin desbordamiento horizontal');
  const src=await fetch('../docs/referencias/Bienvenida Mesa QR.html').then(r=>r.text());
  const orig=new DOMParser().parseFromString(src,'text/html').querySelector('#stampSvg');
  orig.querySelector(':scope > rect').remove();
  orig.querySelector('.shadow').remove();
  const paper=orig.querySelector('.paper');
  [...paper.children].filter(el=>['rect','text','line'].includes(el.tagName)).forEach(el=>el.remove());
  paper.setAttribute('class','stamp-impact');
  const normalized=svg=>[...svg.querySelectorAll('*')].map(el=>el.tagName+' '+[...el.attributes].filter(a=>!['textLength','lengthAdjust'].includes(a.name)).map(a=>a.name+'='+a.value).sort().join(';')).join('\n');
  assert(normalized(orig)===normalized(doc.querySelector('#stampSvg')),'sello original intacto tras excluir exclusivamente fondo y ticket');
  const sourceDoc=new DOMParser().parseFromString(src,'text/html');
  const originalCSS=new CSSStyleSheet();originalCSS.replaceSync(sourceDoc.querySelector('style').textContent);
  const installedCSS=new CSSStyleSheet();installedCSS.replaceSync(await fetch('../css/mesa-stamp.css').then(r=>r.text()));
  const frames=sheet=>new Map([...sheet.cssRules].filter(r=>r.type===CSSRule.KEYFRAMES_RULE).map(r=>[r.name.replace(/^mesa-/,''),[...r.cssRules].map(k=>k.keyText+':'+k.style.cssText.replace(/\s/g,'')).join('|')]));
  const oldFrames=frames(originalCSS),newFrames=frames(installedCSS);
  assert(['tool','imprint','burst','shake'].every(k=>oldFrames.get(k)===newFrames.get(k)),'keyframes del sello conservan transformaciones y curvas originales');
  // Mantener la sesión de prueba y la tarjeta reales sin reconstruir su DOM
  // para que la captura no herede el desplazamiento del botón de salida.
  doc.documentElement.style.setProperty('scroll-behavior','auto','important');
  w.scrollTo({top:card.getBoundingClientRect().top+w.scrollY-16,behavior:'instant'});
  await wait(250);
  document.body.dataset.ready='true';
})().catch(e=>console.error('QA ERROR',e.stack));
