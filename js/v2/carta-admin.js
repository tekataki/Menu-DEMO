/* LA CASONA · Panel de carta y datos (Supabase, solo rol admin) */
(() => {
  'use strict';
  const CLOUD = window.CasonaCloud;
  const { toast, esc } = window.CasonaStaff;
  const $ = (s, el = document) => el.querySelector(s);
  const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);
  let cats = [], prods = [];

  /* ---------- Datos del restaurante ---------- */
  async function loadConfig() {
    const c = await CLOUD.config.get();
    if (!c) return;
    const f = $('#cfgForm');
    f.telefono.value = c.telefono || '';
    f.whatsapp.value = c.whatsapp || '';
    f.envio_domicilio.value = Number(c.envio_domicilio);
    f.pagos.value = (c.pagos || []).join(', ');
    f.sesion_inactividad_min.value = c.sesion_inactividad_min;
    f.sesion_max_horas.value = c.sesion_max_horas;
    f.recoger_en_sucursal.checked = !!c.recoger_en_sucursal;
    f.pedidos_linea_activos.checked = c.pedidos_linea_activos !== false;
  }
  $('#cfgForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const wa = f.whatsapp.value.replace(/\s/g, '');
    const pagos = f.pagos.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
    f.whatsapp.setAttribute('aria-invalid', String(!/^\d{0,15}$/.test(wa)));
    f.pagos.setAttribute('aria-invalid', String(!pagos.length));
    if (!/^\d{0,15}$/.test(wa) || !pagos.length) return;
    const btn = $('#cfgBtn'); btn.disabled = true;
    try {
      await CLOUD.config.actualizar({
        telefono: f.telefono.value.trim(), whatsapp: wa,
        envio_domicilio: Math.max(0, Number(f.envio_domicilio.value) || 0), pagos,
        sesion_inactividad_min: Math.min(600, Math.max(10, parseInt(f.sesion_inactividad_min.value, 10) || 90)),
        sesion_max_horas: Math.min(24, Math.max(1, parseInt(f.sesion_max_horas.value, 10) || 4)),
        recoger_en_sucursal: f.recoger_en_sucursal.checked, pedidos_linea_activos: f.pedidos_linea_activos.checked
      });
      await loadConfig();
      toast('Datos <b>guardados</b>');
    } catch (err) { toast(`No se pudo guardar: ${esc(CLOUD.errorText(err))}`, 4000); }
    finally { btn.disabled = false; }
  });

  /* ---------- Carta ---------- */
  async function loadCarta() {
    try { ({ cats, prods } = await CLOUD.carta.listAll()); render(); }
    catch (e) { $('#carta').innerHTML = `<p class="adm-empty">No se pudo cargar la carta.<br><small>${esc(CLOUD.errorText(e))}</small></p>`; }
  }
  function render() {
    const q = $('#search').value.trim().toLowerCase();
    const show = $('#show').value;
    const ok = p => (!q || p.nombre.toLowerCase().includes(q)) &&
      (show === 'all' || (show === 'out' ? !p.disponible : !p.activo));
    const html = cats.map(c => {
      const list = prods.filter(p => p.categoria_id === c.id && ok(p));
      if (!list.length) return '';
      return `<section class="carta-cat"><h3>${esc(c.titulo)}${c.activa ? '' : ' <small>oculta</small>'}</h3>
        <ul class="carta-list">${list.map(p => `<li class="carta-item${p.activo ? '' : ' is-hidden'}${p.disponible ? '' : ' is-out'}" data-id="${esc(p.id)}">
          <span class="carta-name">${esc(p.nombre)}</span>
          <label class="carta-price"><span class="vh">Precio de ${esc(p.nombre)}</span>$<input class="input" type="number" min="0" step="1" value="${Number(p.precio)}" data-f="precio"></label>
          <label class="carta-tg"><input type="checkbox" data-f="disponible" ${p.disponible ? 'checked' : ''}> Disponible</label>
          <label class="carta-tg"><input type="checkbox" data-f="activo" ${p.activo ? 'checked' : ''}> Visible</label>
        </li>`).join('')}</ul></section>`;
    }).join('');
    $('#carta').innerHTML = html || '<p class="adm-empty">Nada coincide con la búsqueda.</p>';
  }
  $('#search').addEventListener('input', render);
  $('#show').addEventListener('change', render);

  $('#carta').addEventListener('change', async e => {
    const el = e.target.closest('[data-f]'); if (!el) return;
    const row = el.closest('.carta-item');
    const p = prods.find(x => x.id === row.dataset.id);
    const f = el.dataset.f;
    let v;
    if (f === 'precio') {
      v = Number(el.value);
      if (!(v >= 0 && v < 100000)) { el.value = Number(p.precio); toast('Precio no válido'); return; }
      if (v === Number(p.precio)) return;
      if (!confirm(`¿Cambiar el precio de "${p.nombre}" de ${money(p.precio)} a ${money(v)}?`)) { el.value = Number(p.precio); return; }
    } else v = el.checked;
    el.disabled = true;
    try {
      Object.assign(p, await CLOUD.carta.actualizarProducto(p.id, { [f]: v }));
      toast(f === 'precio' ? `<b>${esc(p.nombre)}</b> · ${money(p.precio)}` : `<b>${esc(p.nombre)}</b> ${f === 'disponible' ? (v ? 'disponible' : 'agotado') : (v ? 'visible' : 'oculto')}`);
    } catch (err) {
      if (f === 'precio') el.value = Number(p.precio); else el.checked = !v;
      toast(`No se pudo guardar: ${esc(CLOUD.errorText(err))}`, 4000);
    }
    el.disabled = false;
    row.classList.toggle('is-out', !p.disponible);
    row.classList.toggle('is-hidden', !p.activo);
  });

  window.CasonaStaff.require(['admin'], async () => {
    try { await loadConfig(); } catch (e) { toast(`Datos: ${esc(CLOUD.errorText(e))}`, 4000); }
    loadCarta();
  });
})();
