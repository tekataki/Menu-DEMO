/* LA CASONA · Panel de mesas y QR (Supabase, solo rol admin)
   El código de cada QR vive en la tabla "mesas" y SOLO un admin puede leerlo
   (lo garantiza RLS en el servidor, no esta página). */
(() => {
  'use strict';
  const CLOUD = window.CasonaCloud;
  const { toast, esc } = window.CasonaStaff;
  const $ = (s, el = document) => el.querySelector(s);
  const BASE_KEY = 'casona.qrBase';

  let mesas = [];
  const selected = new Set();
  const fail = (what, e) => toast(`${what}: ${esc(CLOUD.errorText(e))}`, 4000);

  /* ---------- Dirección base del QR ---------- */
  const guess = location.href.split(/[?#]/)[0].replace(/[^/]*$/, '') + 'menuV2.html';
  const baseInput = $('#baseUrl');
  baseInput.value = (() => { try { return localStorage.getItem(BASE_KEY) || guess; } catch { return guess; } })();
  const base = () => { const v = baseInput.value.trim() || guess; try { new URL(v, location.href); return v; } catch { return guess; } };
  const checkPreview = () => {
    $('#previewWarn').hidden = !/genspark\.ai|localhost|127\.0\.0\.1|^file:|\/preview\//i.test(new URL(base(), location.href).href);
  };
  $('#applyBase').addEventListener('click', () => {
    try { localStorage.setItem(BASE_KEY, base()); } catch { /* */ }
    checkPreview(); render(); toast('Dirección <b>guardada</b>');
  });
  checkPreview();

  /* ---------- QR ---------- */
  const qrSvg = text => {
    if (typeof qrcode !== 'function') return '<p class="adm-hint">Sin generador de QR (revisa tu conexión)</p>';
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
  };
  const urlFor = m => CLOUD.mesas.url(base(), m);

  /* ---------- Carga ---------- */
  async function load() {
    try { mesas = await CLOUD.mesas.list(); render(); }
    catch (e) {
      $('#list').innerHTML = `<p class="adm-empty">No se pudieron cargar las mesas.<br><small>${esc(CLOUD.errorText(e))}</small><br><button class="btn btn--ghost" type="button" onclick="location.reload()">Reintentar</button></p>`;
    }
  }

  /* ---------- Render ---------- */
  function render() {
    const on = mesas.filter(m => m.activa).length;
    $('#stats').innerHTML = `<li><b>${mesas.length}</b><span>mesas</span></li><li><b>${on}</b><span>activas</span></li><li><b>${mesas.length - on}</b><span>desactivadas</span></li>`;
    $('#zonas').innerHTML = [...new Set(mesas.map(m => (m.zona || '').trim()).filter(Boolean))].map(z => `<option value="${esc(z)}">`).join('');
    const desde = $('#addForm').elements.desde;
    if (!desde.value) desde.value = mesas.length ? Math.max(...mesas.map(m => m.numero)) + 1 : 1;

    const f = $('#filter').value;
    const list = mesas.filter(m => f === 'all' || (f === 'on' ? m.activa : !m.activa));
    if (!mesas.length) {
      $('#list').innerHTML = `<div class="adm-empty">Aún no hay mesas.<br><button class="btn" type="button" data-quick="15">Crear mesas 1 a 15</button></div>`;
    } else if (!list.length) {
      $('#list').innerHTML = `<p class="adm-empty">No hay mesas con este filtro.</p>`;
    } else {
      $('#list').innerHTML = list.map(m => {
        const url = urlFor(m);
        const tag = [m.zona, m.nota].filter(Boolean).map(esc).join(' · ');
        return `<article class="mesa${m.activa ? '' : ' is-off'}" data-id="${m.id}">
          <input class="mesa-sel" type="checkbox" aria-label="Seleccionar mesa ${m.numero}" ${selected.has(m.id) ? 'checked' : ''}>
          <div class="mesa-qr" role="img" aria-label="QR de la mesa ${m.numero}">${qrSvg(url)}</div>
          <p class="mesa-num"><small>Mesa</small><b>${m.numero}</b></p>
          <p class="mesa-meta">${tag || '<i>sin zona</i>'}${m.qr_version > 1 ? ` · QR v${m.qr_version}` : ''}</p>
          <label class="mesa-switch"><input type="checkbox" data-act="toggle" ${m.activa ? 'checked' : ''}><span class="track" aria-hidden="true"></span>${m.activa ? 'Activa' : 'Desactivada'}</label>
          <div class="mesa-actions">
            <a href="${esc(url)}" target="_blank" rel="noopener">Probar</a>
            <button type="button" data-act="print">Imprimir</button>
            <button type="button" data-act="edit">Editar</button>
            <button type="button" data-act="regen">Nuevo QR</button>
            <button type="button" class="danger" data-act="delete">Borrar</button>
          </div>
        </article>`;
      }).join('');
    }
    $('#printSel').disabled = selected.size === 0;
    $('#printSel').textContent = selected.size ? `Imprimir seleccionadas (${selected.size})` : 'Imprimir seleccionadas';
  }

  /* ---------- Crear (una o rango, en el servidor) ---------- */
  async function createRange(a, b, zona) {
    if (Math.abs(b - a) > 99) { toast('Máximo <b>100</b> mesas por vez'); return; }
    const btn = $('#addBtn'); btn.disabled = true; btn.textContent = 'Creando…';
    try {
      const n = await CLOUD.mesas.crear(a, b, zona);
      await load();
      $('#addForm').reset(); render();
      toast(n ? `<b>${n}</b> ${n === 1 ? 'mesa creada' : 'mesas creadas'}` : 'Esas mesas <b>ya existen</b>');
    } catch (e) { fail('No se pudieron crear', e); }
    finally { btn.disabled = false; btn.textContent = 'Crear'; }
  }
  $('#addForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const a = parseInt(f.desde.value, 10), b = parseInt(f.hasta.value || f.desde.value, 10);
    if (!(a >= 1 && a <= 999) || !(b >= 1 && b <= 999)) { toast('Usa números del <b>1 al 999</b>'); return; }
    createRange(a, b, f.zona.value.trim());
  });

  /* ---------- Acciones por mesa ---------- */
  const byCard = el => mesas.find(x => x.id === el.closest('.mesa').dataset.id);
  $('#list').addEventListener('change', async e => {
    if (!e.target.closest('.mesa')) return;
    const m = byCard(e.target);
    if (e.target.matches('.mesa-sel')) { e.target.checked ? selected.add(m.id) : selected.delete(m.id); render(); return; }
    if (e.target.dataset.act === 'toggle') {
      const v = e.target.checked;
      e.target.disabled = true;
      try { Object.assign(m, await CLOUD.mesas.actualizar(m.id, { activa: v })); toast(`Mesa <b>${m.numero}</b> ${v ? 'activada' : 'desactivada'}`); }
      catch (err) { fail('No se pudo guardar', err); }
      render();
    }
  });
  $('#list').addEventListener('click', async e => {
    const q = e.target.closest('[data-quick]');
    if (q) { q.disabled = true; createRange(1, +q.dataset.quick, ''); return; }
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const m = byCard(b);
    const act = b.dataset.act;
    if (act === 'print') printCards([m]);
    if (act === 'edit') openEdit(m);
    if (act === 'regen') {
      if (!confirm(`¿Generar un QR nuevo para la mesa ${m.numero}?\n\nEl QR impreso actual dejará de funcionar y se cerrarán las sesiones abiertas en esa mesa. Tendrás que imprimir el nuevo.`)) return;
      b.disabled = true;
      try { const r = await CLOUD.mesas.nuevoQR(m.id); m.token = r.token; m.qr_version = r.qr_version; render(); toast(`QR nuevo para la mesa <b>${m.numero}</b> · imprímelo`); }
      catch (err) { b.disabled = false; fail('No se pudo regenerar', err); }
    }
    if (act === 'delete') {
      if (!confirm(`¿Borrar la mesa ${m.numero}? Su QR dejará de funcionar. Los pedidos ya hechos se conservan.`)) return;
      b.disabled = true;
      try { await CLOUD.mesas.borrar(m.id); mesas = mesas.filter(x => x.id !== m.id); selected.delete(m.id); render(); toast(`Mesa <b>${m.numero}</b> borrada`); }
      catch (err) { b.disabled = false; fail('No se pudo borrar', err); }
    }
  });
  $('#filter').addEventListener('change', render);

  /* ---------- Editar ---------- */
  let editing = null;
  function openEdit(m) {
    editing = m;
    const f = $('#editForm');
    $('#editTitle').textContent = `Mesa ${m.numero}`;
    f.numero.value = m.numero; f.zona.value = m.zona || ''; f.nota.value = m.nota || '';
    f.numero.setAttribute('aria-invalid', 'false');
    $('#editSheet').showModal();
  }
  $('#editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const n = parseInt(f.numero.value, 10);
    if (!(n >= 1 && n <= 999) || mesas.some(x => x.numero === n && x.id !== editing.id)) { f.numero.setAttribute('aria-invalid', 'true'); f.numero.focus(); return; }
    try {
      Object.assign(editing, await CLOUD.mesas.actualizar(editing.id, { numero: n, zona: f.zona.value.trim(), nota: f.nota.value.trim() }));
      mesas.sort((a, b) => a.numero - b.numero);
      $('#editSheet').close(); render(); toast('Cambios <b>guardados</b>');
    } catch (err) { fail('No se pudo guardar', err); }
  });
  $('#editSheet').addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === e.currentTarget) $('#editSheet').close(); });

  /* ---------- Imprimir ---------- */
  function printCards(list) {
    if (!list.length) { toast('No hay mesas para imprimir'); return; }
    if (list.some(m => !m.activa) && !confirm('Algunas mesas están desactivadas: su QR no aceptará pedidos hasta que las actives. ¿Imprimir de todos modos?')) return;
    $('#printSheet').innerHTML = list.map(m => `<article class="pcard">
      <svg class="star" aria-hidden="true"><use href="#d-star"/></svg>
      <p class="pcard-brand"><span>La</span> Casona</p>
      <div class="pcard-rule"></div>
      <p class="pcard-mesa"><small>Mesa</small><b>${m.numero}</b></p>
      <p class="pcard-zona">${esc(m.zona || '')}</p>
      <div class="pcard-qr">${qrSvg(urlFor(m))}</div>
      <p class="pcard-hand">¡Pide desde tu mesa!</p>
      <p class="pcard-steps">Escanea · Elige · Envía</p>
    </article>`).join('');
    setTimeout(() => window.print(), 150);
  }
  $('#printAll').addEventListener('click', () => printCards(mesas.filter(m => m.activa)));
  $('#printSel').addEventListener('click', () => printCards(mesas.filter(m => selected.has(m.id))));

  window.CasonaStaff.require(['admin'], load);
})();
