/* Solo herramienta de descarga para las dos extracciones de UI.
   El HTML descargado contiene estilos, SVG, fuentes e interacción; sin fetch,
   sin dependencias externas y sin incluir esta herramienta. No usa almacenamiento. */
(() => {
  'use strict';
  const button = document.getElementById('downloadStandalone');
  if (!button) return;
  async function read(url, binary = false) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`No se pudo incluir ${url}: HTTP ${r.status}`);
    return binary ? r.blob() : r.text();
  }
  const dataURL = blob => new Promise((resolve, reject) => {
    const r = new FileReader();r.onload = () => resolve(r.result);r.onerror = reject;r.readAsDataURL(blob);
  });
  async function build() {
    const link = document.querySelector('[data-standalone-style]');
    const cssURL = new URL(link.getAttribute('href'), location.href);
    let css = await read(cssURL);
    css = css.split('/* Herramientas excluidas del HTML descargado. */')[0];
    const refs = [...new Set([...css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)].map(m => m[1]))];
    for (const ref of refs) {
      const font = await read(new URL(ref, cssURL), true);
      if (font.size < 1000) throw new Error('Fuente incompleta: ' + ref);
      css = css.split(ref).join(await dataURL(font));
    }
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-export-remove],link').forEach(el => el.remove());
    // Excluir también scripts de analítica que pueda inyectar el alojamiento.
    // En la exportación solo permanece la interacción propia del componente.
    clone.querySelectorAll('script').forEach(el => {if (!el.hasAttribute('data-standalone-interaction')) el.remove();});
    const style = document.createElement('style');style.textContent = css;clone.querySelector('head').append(style);
    return '<!doctype html>\n' + clone.outerHTML;
  }
  window.CasonaUIExport = {build};
  button.addEventListener('click', async () => {
    const status = document.getElementById('exportStatus');
    button.disabled = true;status.textContent = 'Preparando HTML con las fuentes…';
    try {
      const html = await build();
      const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
      const a = document.createElement('a');a.href = url;a.download = document.body.dataset.downloadName;
      document.body.append(a);a.click();a.remove();setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'HTML preparado: incluye fuentes y animaciones. Puedes abrirlo y editarlo sin internet.';
    } catch(e) {
      status.textContent = 'No se pudo exportar. Abre esta copia desde la vista previa HTTP y reintenta. ' + e.message;
    } finally {button.disabled = false;}
  });
})();
