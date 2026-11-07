(async()=>{
  const assert=(ok,label)=>console[ok?'log':'error']((ok?'PASS ':'FAIL ')+label);
  const load=(frame,url,srcdoc=false)=>new Promise(resolve=>{frame.onload=resolve;if(srcdoc)frame.srcdoc=url;else frame.src=url;});
  const text=el=>el.textContent.replace(/\s+/g,' ').trim();
  const original=await fetch('../js/v2/menu-v2.js').then(r=>r.text());
  const sourceHTML=new DOMParser().parseFromString(await fetch('../menuV2.html').then(r=>r.text()),'text/html');
  const norm=svg=>[svg,...svg.querySelectorAll('*')].map(e=>e.tagName+' '+[...e.attributes].map(a=>a.name+'='+a.value).sort().join(';')).join('|');
  for(const [id,file,name] of [['entrega','entrega-standalone.html','Entrega La Casona.html'],['pasos','pasos-mesa-standalone.html','Pasos Mesa La Casona.html']]){
    const frame=document.getElementById(id);
    await load(frame,'../'+file);
    let w=frame.contentWindow,d=frame.contentDocument;await d.fonts.ready;
    assert(!d.querySelector('#modeCard,.hero,.mesa-stamp,.menu'),'copia aislada '+id);
    if(id==='entrega'){
      assert(d.querySelectorAll('.door').length===2,'dos opciones de entrega');
      assert(text(d.querySelector('.door--domicilio .door-tag'))==='Envío+$35','envío +$35');
      assert(text(d.querySelector('.door--recoger .door-tag'))==='Sin costo$0','recoger $0');
      for(const scene of ['domicilio','recoger']){
        const src=original.match(new RegExp(scene+': `([\\s\\S]*?)`'))[1];
        const svg=new DOMParser().parseFromString(src,'text/html').querySelector('svg');
        assert(norm(svg)===norm(d.querySelector('.door--'+scene+' .scene')),'escena original intacta '+scene);
      }
      assert([...d.querySelectorAll('symbol')].every(s=>norm(s)===norm(sourceHTML.getElementById(s.id))),'símbolos SVG originales intactos');
      const a=d.querySelector('.door--domicilio'),b=d.querySelector('.door--recoger');
      assert(w.getComputedStyle(a.querySelector('.ride')).animationPlayState==='running','ambas escenas animadas sin selección');
      a.click();assert(a.getAttribute('aria-checked')==='true'&&b.getAttribute('aria-checked')==='false','selección domicilio');
      assert(w.getComputedStyle(b.querySelector('.bag')).animationPlayState==='paused','escena no elegida pausada');
      a.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
      assert(b.getAttribute('aria-checked')==='true'&&d.activeElement===b,'selección por teclado');
    }else{
      assert([...d.querySelectorAll('.step b')].map(text).join('|')==='Elige|Revisa|Envía','títulos de pasos exactos');
      assert([...d.querySelectorAll('.step small')].map(text).join('|')==='toca + en lo que se te antoje|abre tu pedido abajo|llega directo a la cocina','descripciones exactas');
      ['elige','revisa','cocina'].forEach((key,i)=>{
        const src=original.match(new RegExp(key+': `([\\s\\S]*?)`'))[1];
        const svg=new DOMParser().parseFromString(src,'text/html').querySelector('svg');
        assert(norm(svg)===norm(d.querySelectorAll('.step-art svg')[i]),'SVG original intacto '+key);
      });
      assert(w.getComputedStyle(d.querySelector('.step-art')).animationName==='stepOn','secuencia de pasos animada');
    }
    const html=await w.CasonaUIExport.build();
    const output=new DOMParser().parseFromString(html,'text/html');
    assert(!output.querySelector('link,script[src],.export-tools'),'exportación sin herramientas ni archivos externos '+id);
    assert((html.match(/data:[^;]+;base64,/g)||[]).length===4,'cuatro fuentes incrustadas '+id);
    let filename='';const click=w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
    const button=d.getElementById('downloadStandalone');button.click();
    for(let i=0;i<150&&button.disabled;i++)await new Promise(r=>setTimeout(r,100));
    assert(filename===name,'botón descarga '+name);
    w.HTMLAnchorElement.prototype.click=click;
    const csp=output.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'";output.head.prepend(csp);
    await load(frame,'<!doctype html>'+output.documentElement.outerHTML,true);
    d=frame.contentDocument;w=frame.contentWindow;await d.fonts.ready;
    assert(d.fonts.check('20px "Casona ManEater"')&&d.fonts.check('20px "Nunito C"'),'tipografías sin internet '+id);
    assert(d.documentElement.scrollWidth<=d.documentElement.clientWidth,'sin desbordamiento '+id);
    if(id==='entrega'){
      const a=d.querySelector('.door--domicilio');a.click();
      assert(a.getAttribute('aria-checked')==='true','selección funciona offline');
      // Restablecer solo el estado visual de QA para ver las dos tarjetas neutrales.
      d.querySelectorAll('.door').forEach(b=>{b.setAttribute('aria-checked','false');b.tabIndex=0;b.blur();});
    }
    console.log('EXPORT_BYTES',id,new Blob([html]).size);
  }
  document.body.dataset.ready='true';
})().catch(e=>console.error('QA ERROR',e.stack));
