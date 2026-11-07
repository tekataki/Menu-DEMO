/* LA CASONA · Pantalla de cocina (Supabase, rol admin o cocina)
   Tiempo real con Supabase Realtime + recarga de respaldo cada 30 s.
   Flujo: por_confirmar (en línea) → nuevo → preparando → listo → entregado. */
(() => {
  'use strict';
  const CLOUD = window.CasonaCloud;
  const { toast, esc } = window.CasonaStaff;
  const $ = s => document.querySelector(s);
  const fmt = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);
  const COLS = [
    { id: 'por_confirmar', title: 'En línea · confirmar', next: 'nuevo', btn: 'Confirmar' },
    { id: 'nuevo', title: 'Nuevos', next: 'preparando', btn: 'Preparar' },
    { id: 'preparando', title: 'Preparando', next: 'listo', btn: 'Listo' },
    { id: 'listo', title: 'Listos', next: 'entregado', btn: 'Entregado' }
  ];
  let orders = [];
  let seen = null;
  let sound = false;
  let ctx;
  let live = false;
  let loading = null;
  let again = false;

  const ts = o => new Date(o.created_at).getTime();
  const mins = o => Math.max(0, Math.floor((Date.now() - ts(o)) / 60000));
  const phone = p => p && p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 6)} ${p.slice(6)}` : (p || '');

  function beep() {
    if (!sound) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      [0, .18].forEach(d => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + .12); });
    } catch { /* */ }
  }

  function card(o, col) {
    const items = o.pedido_items || [];
    const where = o.modo === 'mesa'
      ? `Mesa ${o.mesa_numero ?? '—'}<small>${esc(o.mesa_etiqueta || 'En local')}${o.cliente_nombre ? ' · ' + esc(o.cliente_nombre) : ''}</small>`
      : `${o.entrega === 'domicilio' ? 'Domicilio' : 'Recoger'}<small>${esc(o.cliente_nombre)} · ${esc(phone(o.cliente_telefono))}</small>`;
    const m = mins(o);
    return `<article class="order${o.estado === 'nuevo' || o.estado === 'por_confirmar' ? ' is-new' : ''}" data-id="${o.id}">
      <div class="order-top"><p class="order-where">${where}</p>
        <p class="order-time${m >= 20 ? ' late' : ''}">${m} min<small>${new Date(o.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</small></p></div>
      <div class="order-body">
        <ul class="order-lines">${items.map(l => {
          const ex = Array.isArray(l.extras) ? l.extras.map(x => x && x.nombre).filter(Boolean) : [];
          const sub = [l.opcion && `<b>${esc(l.opcion)}</b>`, ...ex.map(x => '+ ' + esc(x)), l.nota && '“' + esc(l.nota) + '”'].filter(Boolean);
          return `<li><span class="q">${l.cantidad}×</span><span class="n">${esc(l.nombre)}</span>${sub.length ? `<span class="s">${sub.join(' · ')}</span>` : ''}</li>`;
        }).join('')}</ul>
        ${o.comentario ? `<p class="order-note">“${esc(o.comentario)}”</p>` : ''}
        ${o.modo !== 'mesa'
          ? `<p class="order-info">${o.entrega === 'domicilio' ? esc(o.direccion) + (o.referencias ? ' · ' + esc(o.referencias) : '') + '<br>' : ''}${esc(o.pago)}${Number(o.paga_con) ? ' · paga con ' + fmt(o.paga_con) : ''} · Total ${fmt(o.total)}</p>`
          : `<p class="order-info">${o.num_productos} productos · ${fmt(o.total)}</p>`}
      </div>
      <p class="order-folio">${esc(o.folio)}</p>
      <div class="order-foot">
        <button class="btn" type="button" data-next="${col.next}">${col.btn}</button>
        <button class="btn btn--ghost" type="button" data-next="cancelado" aria-label="Cancelar pedido ${esc(o.folio)}">✕</button>
      </div>
    </article>`;
  }

  function render() {
    $('#board').innerHTML = COLS.map(c => {
      const list = orders.filter(o => o.estado === c.id).sort((a, b) => ts(a) - ts(b));
      return `<section class="kds-col" aria-label="${c.title}"><div class="kds-colhead"><h2>${c.title}</h2><span>${list.length}</span></div>
        <div class="kds-list">${list.length ? list.map(o => card(o, c)).join('') : '<p class="kds-empty">Sin pedidos</p>'}</div></section>`;
    }).join('');
  }

  const clock = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  /* Una sola carga a la vez; si llega otro aviso mientras carga, se repite al terminar. */
  async function load() {
    if (loading) { again = true; return loading; }
    loading = (async () => {
      try {
        const rows = await CLOUD.cocina.list(24);
        orders = rows.filter(o => COLS.some(c => c.id === o.estado));
        const ids = new Set(orders.filter(o => o.estado === 'nuevo' || o.estado === 'por_confirmar').map(o => o.id));
        if (seen && [...ids].some(id => !seen.has(id))) beep();
        seen = ids;
        $('#liveTxt').textContent = `${live ? 'En vivo' : 'Actualizado'} · ${clock()}`;
        render();
      } catch (e) {
        $('#liveTxt').textContent = `${CLOUD.errorText(e)} · reintentando`;
        if (e.kind === 'sesion') setTimeout(() => location.reload(), 1500);
      } finally {
        loading = null;
        if (again) { again = false; load(); }
      }
    })();
    return loading;
  }

  $('#board').addEventListener('click', async e => {
    const b = e.target.closest('[data-next]'); if (!b) return;
    const id = b.closest('.order').dataset.id;
    const next = b.dataset.next;
    if (next === 'cancelado' && !confirm('¿Cancelar este pedido?')) return;
    b.disabled = true;
    try {
      await CLOUD.cocina.setEstado(id, next);
      const o = orders.find(x => x.id === id);
      if (o) { o.estado = next; if (!COLS.some(c => c.id === next)) orders = orders.filter(x => x.id !== id); }
      render();
    } catch (err) { b.disabled = false; toast(`No se pudo actualizar: ${esc(CLOUD.errorText(err))}`); }
  });
  $('#soundBtn').addEventListener('click', e => {
    sound = !sound; e.currentTarget.setAttribute('aria-pressed', String(sound));
    e.currentTarget.textContent = sound ? '🔔 Sonido activado' : '🔔 Activar sonido';
    if (sound) beep();
  });

  function start() {
    load();
    try {
      CLOUD.cocina.subscribe(() => load(), st => {
        live = st === 'SUBSCRIBED';
        if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') $('#liveTxt').textContent = 'Tiempo real no disponible · actualizando cada 30 s';
      });
    } catch { /* sin realtime: queda el respaldo */ }
    setInterval(load, 30000);
    setInterval(render, 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  }

  window.CasonaStaff.require(['admin', 'cocina'], start);
})();
