/* Portada aislada: sin Supabase, sesión de mesa, carrito ni localStorage.
   El ajuste del título y el cielo se han extraído del menú, sin rediseñarlos.
   Desde HTTP, Descargar produce un único HTML offline con las fuentes locales. */
(() => {
  'use strict';
  let forced = new URLSearchParams(location.search).get('cielo');
  function renderSky() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const sky = ['dia','tarde','noche'].includes(forced) ? forced : h >= 6.5 && h < 17.5 ? 'dia' : h >= 17.5 && h < 20 ? 'tarde' : 'noche';
    document.documentElement.dataset.sky = sky;
    const hi = document.getElementById('skyHi');
    if (hi) hi.textContent = sky === 'noche' ? 'buenas noches' : sky === 'tarde' || (h >= 12 && h < 20) ? 'buenas tardes' : 'buenos días';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = sky === 'noche' ? '#e9e4ea' : sky === 'tarde' ? '#f5e3d3' : '#f3ede1';
  }
  function fitTitles() {
    document.querySelectorAll('[data-fit]').forEach(el => {
      const box = el.parentElement.clientWidth;
      el.style.fontSize = '100px';
      const w = el.getBoundingClientRect().width;
      if (w && box) el.style.fontSize = `${(100 * box / w) * .995}px`;
    });
  }
  renderSky(); fitTitles();
  setInterval(renderSky, 5 * 60e3);
  addEventListener('resize', fitTitles, {passive:true});
  if (document.fonts) document.fonts.ready.then(fitTitles);
  const picker = document.getElementById('portadaCielo');
  if (picker) {
    picker.value = ['dia','tarde','noche'].includes(forced) ? forced : 'auto';
    picker.addEventListener('change', () => {forced = picker.value; renderSky();});
  }

  async function read(url, binary = false) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`No se pudo incluir ${url}: HTTP ${r.status}`);
    return binary ? r.blob() : r.text();
  }
  const asDataURL = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  async function buildExport() {
    const link = document.querySelector('[data-portada-style]');
    const cssURL = new URL(link.getAttribute('href'), location.href);
    let css = await read(cssURL);
    // Solo bases + título/cielo/patio. Se excluyen carta, carrito y paneles.
    css = css.split('/* Tarjeta de modo (mesa / en línea) */')[0];
    const refs = [...new Set([...css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)].map(m => m[1]).filter(ref => !ref.startsWith('#')))];
    for (const ref of refs) {
      const url = new URL(ref, cssURL);
      let embedded;
      if (url.pathname.endsWith('.svg')) {
        embedded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await read(url));
      } else {
        // Fuentes incrustadas en el archivo descargado; nunca se guardan en BD.
        embedded = await asDataURL(await read(url, true));
      }
      css = css.split(ref).join(embedded);
    }
    css += '\n@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.boil,.jitter,.sky *,.bird,.flies i,.sway,.petals i{animation:none!important}.petals{display:none}}';
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-export-remove],script,link[rel="preload"],[data-portada-style]').forEach(el => el.remove());
    const style = document.createElement('style');
    style.textContent = css;
    clone.querySelector('head').append(style);
    for (const el of document.querySelectorAll('[data-portada-script]')) {
      const code = await read(new URL(el.getAttribute('src'), location.href));
      const script = document.createElement('script');
      // Evitar que una secuencia de cierre en el JS interrumpa el HTML exportado.
      script.textContent = code.replace(/<\/script/gi, '<\\/script');
      clone.querySelector('body').append(script);
    }
    return '<!doctype html>\n' + clone.outerHTML;
  }
  // También permite comprobar el archivo exportado con herramientas de QA.
  const button = document.getElementById('portadaDownload');
  if (!button) return;
  window.CasonaPortadaExport = {build:buildExport};
  button.addEventListener('click', async () => {
    const status = document.getElementById('portadaStatus');
    button.disabled = true;
    status.textContent = 'Preparando el HTML y sus fuentes…';
    try {
      const html = await buildExport();
      const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
      const a = document.createElement('a');
      a.href = url; a.download = 'Inicio La Casona.html';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'HTML preparado con todas las fuentes incluidas. Puedes editarlo y abrirlo sin internet.';
    } catch (e) {
      status.textContent = 'No se pudo preparar el archivo. Abre esta página desde la vista previa HTTP y vuelve a intentar. ' + e.message;
    } finally {button.disabled = false;}
  });
})();
