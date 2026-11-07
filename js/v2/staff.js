/* LA CASONA · Acceso del equipo (cocina y paneles)
   Inicia sesión con Supabase Auth y lee el rol desde la tabla "staff".
   OJO: esta pantalla solo ordena la interfaz. La protección REAL de los datos
   la hacen las políticas RLS de Supabase: sin rol válido el servidor no
   entrega mesas, códigos QR ni pedidos aunque alguien salte esta pantalla. */
window.CasonaStaff = (() => {
  'use strict';
  const CLOUD = window.CasonaCloud;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROL = { admin: 'Administración', cocina: 'Cocina' };

  function card(html) {
    const g = document.getElementById('gate');
    g.hidden = false;
    g.innerHTML = `<div class="gate-card"><p class="gate-brand"><span>La</span> Casona</p>${html}</div>`;
    return g;
  }
  const hideApp = () => { const m = document.getElementById('app'); if (m) m.hidden = true; };

  function showSetup() {
    card(`<p class="adm-eyebrow">Falta un paso</p>
      <h1 class="gate-title">Conecta la base de datos</h1>
      <p class="gate-text">Abre <code>js/cloud.js</code> y pega tu <b>Project URL</b> y tu <b>publishable / anon key</b> de Supabase. La guía está en <code>supabase/GUIA-INSTALACION.md</code>.</p>
      ${CLOUD.problem ? `<p class="gate-err">${esc(CLOUD.problem)}</p>` : ''}`);
  }

  function showLogin(msg) {
    const g = card(`<p class="adm-eyebrow">Equipo La Casona</p>
      <h1 class="gate-title">Entrar</h1>
      <form class="gate-form" id="loginForm" novalidate>
        <label class="field"><span class="label">Correo</span><input class="input" name="email" type="email" autocomplete="username" required></label>
        <label class="field"><span class="label">Contraseña</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
        <p class="gate-err" id="loginErr" ${msg ? '' : 'hidden'}>${esc(msg || '')}</p>
        <button class="btn" type="submit">Entrar</button>
        <p class="gate-links"><button class="link-btn" type="button" id="forgot">Olvidé mi contraseña</button></p>
      </form>`);
    const f = g.querySelector('#loginForm');
    const err = t => { const e = g.querySelector('#loginErr'); e.hidden = !t; e.textContent = t || ''; };
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (!f.email.value.trim() || !f.password.value) { err('Escribe tu correo y contraseña.'); return; }
      const b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Entrando…';
      try { await CLOUD.auth.signIn(f.email.value, f.password.value); location.reload(); }
      catch (x) { err(CLOUD.errorText(x)); b.disabled = false; b.textContent = 'Entrar'; }
    });
    g.querySelector('#forgot').addEventListener('click', async () => {
      const email = f.email.value.trim();
      if (!email) { err('Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".'); f.email.focus(); return; }
      try { await CLOUD.auth.resetPassword(email); err(''); card(`<h1 class="gate-title">Revisa tu correo</h1><p class="gate-text">Si <b>${esc(email)}</b> tiene cuenta, te llegó un enlace para crear una contraseña nueva.</p>`); }
      catch (x) { err(CLOUD.errorText(x)); }
    });
  }

  function showNewPassword() {
    const g = card(`<h1 class="gate-title">Contraseña nueva</h1>
      <form class="gate-form" id="pwForm" novalidate>
        <label class="field"><span class="label">Nueva contraseña <em>mínimo 8</em></span><input class="input" name="pw" type="password" autocomplete="new-password" minlength="8" required></label>
        <p class="gate-err" id="pwErr" hidden></p>
        <button class="btn" type="submit">Guardar</button>
      </form>`);
    const f = g.querySelector('#pwForm');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const er = g.querySelector('#pwErr');
      if (f.pw.value.length < 8) { er.hidden = false; er.textContent = 'Usa al menos 8 caracteres.'; return; }
      try { await CLOUD.auth.updatePassword(f.pw.value); history.replaceState(null, '', location.pathname); location.reload(); }
      catch (x) { er.hidden = false; er.textContent = CLOUD.errorText(x); }
    });
  }

  function showDenied(staff, roles) {
    const g = card(`<p class="adm-eyebrow">${esc(staff.email)}</p>
      <h1 class="gate-title">Sin acceso</h1>
      <p class="gate-text">${staff.rol
        ? `Tu cuenta es de <b>${esc(ROL[staff.rol] || staff.rol)}</b>. Esta sección es solo para ${roles.map(r => esc(ROL[r] || r)).join(' o ')}.`
        : 'Tu cuenta existe pero aún no tiene permiso. Pide al administrador que te dé de alta (supabase/03_primer_admin.sql).'}</p>
      ${staff.rol === 'cocina' ? '<a class="btn" href="cocina.html">Ir a cocina</a>' : ''}
      <p class="gate-links"><button class="link-btn" type="button" id="out">Salir</button></p>`);
    g.querySelector('#out').addEventListener('click', async () => { await CLOUD.auth.signOut(); location.reload(); });
  }

  function mountUser(staff) {
    const top = document.querySelector('.adm-top');
    if (!top || top.querySelector('.adm-user')) return;
    const el = document.createElement('div');
    el.className = 'adm-user';
    el.innerHTML = `<span>${esc(staff.nombre || staff.email)}<small>${esc(ROL[staff.rol] || '')}</small></span><button type="button">Salir</button>`;
    el.querySelector('button').addEventListener('click', async () => { await CLOUD.auth.signOut(); location.reload(); });
    top.append(el);
    if (staff.rol !== 'admin') top.querySelectorAll('[data-admin]').forEach(a => a.remove());
  }

  /* roles: ['admin'] o ['admin','cocina'] · onReady(staff) solo si tiene permiso */
  async function require(roles, onReady) {
    hideApp();
    if (!CLOUD || !CLOUD.configured) { showSetup(); return; }
    if (/type=recovery/.test(location.hash)) {
      CLOUD.auth.onChange(ev => { if (ev === 'PASSWORD_RECOVERY') showNewPassword(); });
    }
    card('<p class="gate-text">Cargando…</p>');
    let staff;
    try { staff = await CLOUD.auth.staff(); }
    catch (e) { showLogin(CLOUD.errorText(e)); return; }
    if (/type=recovery/.test(location.hash) && staff) { showNewPassword(); return; }
    if (!staff) { showLogin(); return; }
    if (!staff.rol || !roles.includes(staff.rol)) { showDenied(staff, roles); return; }
    document.getElementById('gate').hidden = true;
    document.getElementById('app').hidden = false;
    mountUser(staff);
    CLOUD.auth.onChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
    onReady(staff);
  }

  function toast(html, ms = 2600) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = html; t.classList.add('is-on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), ms);
  }

  return { require, toast, esc };
})();
