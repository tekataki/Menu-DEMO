(async()=>{
  const source=document.getElementById('source');
  if(!source.contentWindow.CasonaPortadaExport)await new Promise(r=>source.addEventListener('load',r,{once:true}));
  await source.contentDocument.fonts.ready;
  const assert=(ok,name)=>console[ok?'log':'error']((ok?'PASS ':'FAIL ')+name);
  const html=await source.contentWindow.CasonaPortadaExport.build();
  const d=new DOMParser().parseFromString(html,'text/html');
  assert(!d.querySelector('link,script[src],img[src],iframe'),'exportación sin archivos externos');
  assert(!d.querySelector('.portada-tools,#modeCard,#menu'),'solo portada, sin herramientas ni pedidos');
  assert((html.match(/data:[^;]+;base64,/g)||[]).length===7,'siete fuentes incrustadas en el HTML');
  assert(html.includes('data:image/svg+xml;charset=utf-8,'),'textura SVG incrustada');
  const dest=document.getElementById('exported');
  // Simula una apertura sin acceso a recursos externos. CSP permite únicamente
  // sus scripts/estilos inline y recursos data; ninguna conexión de red.
  const csp=d.createElement('meta');csp.httpEquiv='Content-Security-Policy';
  csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'";
  d.head.prepend(csp);
  const loaded=new Promise(r=>dest.addEventListener('load',r,{once:true}));
  dest.srcdoc='<!doctype html>'+d.documentElement.outerHTML;await loaded;
  await dest.contentDocument.fonts.ready;
  await new Promise(r=>setTimeout(r,700));
  const doc=dest.contentDocument,w=dest.contentWindow;
  assert(doc.querySelector('.hero-casona')?.firstChild.textContent==='Casona','título renderizado desde el HTML exportado');
  assert(doc.querySelectorAll('.corner use,.garland use').length>0,'patio SVG generado con scripts inline');
  assert(doc.fonts.check('16px "Casona Meetu"')&&doc.fonts.check('16px "Casona ManEater"'),'fuentes de portada cargadas sin internet');
  assert(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,'portada exportada sin desbordamiento horizontal');
  const picker=source.contentDocument.getElementById('portadaCielo');
  for(const sky of ['dia','tarde','noche']){picker.value=sky;picker.dispatchEvent(new source.contentWindow.Event('change'));assert(source.contentDocument.documentElement.dataset.sky===sky,'selector de cielo '+sky);}
  assert(doc.querySelectorAll('.sky-art').length===3,'se conservan los tres cielos');
  let downloaded='';
  const realClick=source.contentWindow.HTMLAnchorElement.prototype.click;
  source.contentWindow.HTMLAnchorElement.prototype.click=function(){downloaded=this.download;};
  const button=source.contentDocument.getElementById('portadaDownload');button.click();
  for(let i=0;i<100&&button.disabled;i++)await new Promise(r=>setTimeout(r,100));
  assert(downloaded==='Inicio La Casona.html','botón de descarga prepara el HTML con el nombre esperado');
  assert(source.contentDocument.getElementById('portadaStatus').textContent.startsWith('HTML preparado'),'la descarga informa éxito solo tras incluir los recursos');
  source.contentWindow.HTMLAnchorElement.prototype.click=realClick;
  source.remove();document.body.dataset.ready='true';
  console.log('EXPORT_BYTES',new Blob([html]).size);
})().catch(e=>console.error('QA ERROR',e.stack));
