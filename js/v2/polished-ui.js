/* Integración de los standalone aportados, sin copiar su página completa.
   Se usan únicamente sus componentes, CSS aislado y controladores de animación.
   Las fuentes, el envío, la selección y los pedidos siguen siendo los del menú.
   Los HTML locales de assets/ui son snapshots íntegros del código del usuario. */
(() => {
  'use strict';
  const files = {
    steps: {url:'assets/ui/pasos-mesa-v4.html', scope:'casona-steps-v4', selector:'.steps'},
    delivery: {url:'assets/ui/entrega-v2.html', scope:'casona-delivery-v2', selector:'.doors'}
  };
  const cache = new Map(), active = new WeakMap();
  const factories = {};
  const api = window.CasonaPolishedUI = {factories, mount, unmount};

  // Prefixar también las reglas internas de @media; nunca se importan body,
  // html, fuentes de preview ni el espacio exterior del standalone.
  function scopedCSS(text, scope, kind) {
    const sheet = new CSSStyleSheet();sheet.replaceSync(text);
    const rename = s => kind === 'delivery' ? s.replace(/\bstamp\b/g,'casona-delivery-stamp').replace(/\bcheckPop\b/g,'casona-delivery-checkPop') : s;
    const walk = rules => [...rules].map(rule => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const selectors = rule.selectorText.split(',').map(s=>s.trim()).filter(s=>!['html','body','.standalone-stage','.defs'].includes(s));
        if (!selectors.length) return '';
        const scoped = selectors.map(s=>s === ':root' ? '.'+scope : '.'+scope+' '+s).join(',');
        return scoped+'{'+rename(rule.style.cssText)+'}';
      }
      if (rule.type === CSSRule.KEYFRAMES_RULE) return rename(rule.cssText);
      if (rule.type === CSSRule.MEDIA_RULE) return '@media '+rule.conditionText+'{'+walk(rule.cssRules)+'}';
      return '';
    }).join('\n');
    return walk(sheet.cssRules);
  }

  function controller(source, kind) {
    const matched = source.trim().match(/^\(\(\)\s*=>\s*\{([\s\S]*)\}\)\(\);?$/);
    if (!matched) throw new Error('Formato inesperado del controlador '+kind);
    let body = matched[1];
    if (kind === 'steps') {
      body = body.replace("const list=document.querySelector('.steps'); if(!list) return;",'if(!list) return;')
        .replace('getComputedStyle(document.documentElement)','getComputedStyle(list)')
        .replace("  if('IntersectionObserver' in window){","  let visibilityObserver=null;\n  if('IntersectionObserver' in window){")
        .replace('new IntersectionObserver(([e])=>','visibilityObserver=new IntersectionObserver(([e])=>')
        .replace('},{threshold:.35}).observe(list);','},{threshold:.35});visibilityObserver.observe(list);');
      body += '\nreturn ()=>{pause();queue=[];live.forEach(a=>a.cancel());live.clear();visibilityObserver?.disconnect();document.removeEventListener("visibilitychange",sync);};';
    } else {
      body = body.replace("const group = document.querySelector('.doors');",'if(!group) return;')
        .replace('new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(group);','const visibilityObserver = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); });visibilityObserver.observe(group);')
        .replace('setTimeout(() => scenes.get(doors[0]).once(), 500);','laterTimeout(() => scenes.get(doors[0])?.once(), 500);')
        .replace('setTimeout(() => scenes.get(doors[1]).once(), 1400);','laterTimeout(() => scenes.get(doors[1])?.once(), 1400);')
        .replace('  scenes.forEach(s => s.draw());\n  sync();','  scenes.forEach(s => s.draw());\n  refresh();\n  sync();');
      body = 'const timers=[];const laterTimeout=(fn,ms)=>{timers.push(setTimeout(fn,ms));};\n'+body;
      body += '\nreturn ()=>{cancelAnimationFrame(raf);timers.forEach(clearTimeout);visibilityObserver.disconnect();document.removeEventListener("visibilitychange",sync);if(reduce.removeEventListener)reduce.removeEventListener("change",sync);else reduce.removeListener(sync);doors.forEach(d=>d.getAnimations().forEach(a=>a.cancel()));};';
    }
    const parameter = kind === 'steps' ? 'list' : 'group';
    return 'window.CasonaPolishedUI.factories.'+kind+'=function('+parameter+'){'+body+'\n};';
  }

  async function load(kind) {
    if (!cache.has(kind)) cache.set(kind,(async()=>{
      const spec = files[kind];
      const r = await fetch(new URL(spec.url,document.baseURI));
      if (!r.ok) throw new Error('HTTP '+r.status+' al cargar '+spec.url);
      const doc = new DOMParser().parseFromString(await r.text(),'text/html');
      const template = doc.querySelector(spec.selector);
      const css = doc.querySelector('style');
      const js = doc.querySelector('script:not([src])');
      if (!template || !css || !js) throw new Error('Componente incompleto: '+kind);
      const style = document.createElement('style');style.dataset.polishedStyle=kind;
      style.textContent = scopedCSS(css.textContent,spec.scope,kind);
      document.head.append(style);
      // El script es código local aportado por el usuario, nunca una respuesta
      // de un servicio externo. Se aísla su arranque en una fábrica desmontable.
      const script = document.createElement('script');script.dataset.polishedController=kind;
      script.textContent = controller(js.textContent,kind);
      document.head.append(script);
      if (typeof factories[kind] !== 'function') throw new Error('No se pudo iniciar '+kind);
      return template;
    })());
    return cache.get(kind);
  }

  function unmount(root) {
    const previous = active.get(root);
    if (!previous) return;
    previous.disposed=true;previous.cleanups.forEach(fn=>fn());active.delete(root);
  }
  function mount(root, options = {}) {
    unmount(root);
    const instance = {disposed:false,cleanups:[]};active.set(root,instance);
    const delivery = root.querySelector('.doors');
    const steps = root.querySelector('.mode--mesa .steps');
    const tasks = [];
    const upgrade = async(kind,target) => {
      if (!target) return;
      try {
        const template = await load(kind);
        if (instance.disposed || !root.contains(target) || !root.isConnected) return;
        const component = template.cloneNode(true);
        const wrapper = document.createElement('div');wrapper.className=files[kind].scope;
        if (kind === 'delivery') {
          const previous = [...target.querySelectorAll('[data-fulfil]')];
          component.querySelectorAll('[data-fulfil]').forEach(button=>{
            const old = previous.find(b=>b.dataset.fulfil===button.dataset.fulfil);
            if (!old) {button.remove();return;}
            button.setAttribute('aria-checked',old.getAttribute('aria-checked') || 'false');
          });
          if (previous.length === 1) component.classList.add('doors--one');
          const amount = component.querySelector('.door--domicilio .amt');
          if (amount) {amount.replaceChildren();const symbol=document.createElement('i');symbol.textContent='+$';amount.append(symbol,document.createTextNode(String(options.envio ?? 0)));}
          component.addEventListener('fulfilchange',e=>options.onFulfil?.(e.detail.value));
        }
        wrapper.append(component);target.replaceWith(wrapper);
        const cleanup = factories[kind](component);
        if (typeof cleanup === 'function') instance.cleanups.push(cleanup);
        if (kind === 'delivery') {
          const buttons=[...component.querySelectorAll('[data-fulfil]')];
          const selected=buttons.find(b=>b.getAttribute('aria-checked')==='true') || buttons[0];
          buttons.forEach(b=>b.tabIndex=b===selected?0:-1);
        }
        wrapper.dataset.ready='true';
      } catch(error) {
        console.error('[La Casona] No se pudo integrar '+kind+':',error.message);
        // En un fallo de descarga permanece el UI anterior, sin perder datos.
      }
    };
    if(delivery) tasks.push(upgrade('delivery',delivery));
    if(steps) tasks.push(upgrade('steps',steps));
    return Promise.all(tasks);
  }
})();
