/* ==========================================================================
   LA CASONA · MENÚ V2 · LÓGICA
   - Carta: primero la local (menu-data.js, con fotos e íconos) y, si Supabase
     está conectado (js/cloud.js), se reemplaza por la carta real de la BD.
   - Modo LOCAL: el QR de la mesa abre una sesión temporal validada en Supabase
   - Modo EN LÍNEA: domicilio / recoger, ticket por WhatsApp
   - Pedidos: los guarda Supabase y calcula los precios en el servidor
   ========================================================================== */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const CFG = Object.assign({}, window.CASONA_CONFIG || {});
  const LOCAL_MENU = window.CASONA_MENU || [];
  let MENU = LOCAL_MENU;
  const CLOUD = window.CasonaCloud || { configured: false };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  const fmt = n => money.format(n);
  const priceHTML = n => `$${Math.floor(n).toLocaleString('es-MX')}<sup>.${String(Math.round((n % 1) * 100)).padStart(2, '0')}</sup>`;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Almacenamiento local ---------------------------------------- */
  const KEY = { cart: 'casonaV2.cart', sesion: 'casonaV2.sesionMesa', cliente: 'casonaV2.cliente', fulfil: 'casonaV2.fulfil' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* */ } }
  };

  /* ---------- Límites de transparencia de cada imagen original ------------- */
  const BOUNDS = {
    'aves-pollo.webp': [0, 0, 1050, 1450], 'bebidas-frescas.webp': [0, 0, 1538, 1023], 'cafe-foto.webp': [0, 0, 1244, 1254],
    'cerveza-foto.webp': [0, 0, 1728, 910], 'cocteleria-foto.webp': [0, 0, 1330, 1160], 'cortes-parrilla.webp': [0, 0, 1845, 806],
    'ensalada-bowl.webp': [105, 101, 1203, 1140], 'entradas-plato.webp': [107, 346, 1434, 1244], 'hamburguesa-foto.webp': [0, 0, 1589, 989],
    'mariscos-grill.webp': [71, 101, 1465, 738], 'pastas-franja.webp': [38, 182, 1456, 700], 'pizza-foto.webp': [0, 8, 1008, 1558],
    'postres-foto.webp': [0, 0, 1429, 1101], 'tostadas-foto.webp': [0, 5, 1628, 966],
    'icon-aves.webp': [33, 19, 1358, 1066], 'icon-bebidas.webp': [114, 59, 1093, 1200], 'icon-cafe.webp': [37, 178, 1233, 1029],
    'icon-cerveza.webp': [98, 26, 1336, 1097], 'icon-cocteleria.webp': [97, 54, 1378, 987], 'icon-cortes.webp': [49, 177, 1386, 1054],
    'icon-ensaladas.webp': [55, 56, 1360, 1044], 'icon-hamburguesas.webp': [165, 142, 1380, 1013], 'icon-mariscos.webp': [0, 101, 1385, 996],
    'icon-pastas.webp': [276, 272, 1285, 962], 'icon-pizzas.webp': [65, 55, 1506, 998], 'icon-postres.webp': [101, 157, 1422, 1003],
    'icon-tostadas.webp': [67, 181, 1389, 1062]
  };
  function pic(ph, cls = '', lazy = true) {
    const file = ph.src.split('/').pop();
    const b = BOUNDS[file] || [0, 0, ph.w, ph.h];
    const bw = b[2] - b[0], bh = b[3] - b[1];
    const st = `width:${(ph.w / bw * 100).toFixed(3)}%;left:${(-b[0] / bw * 100).toFixed(3)}%;top:${(-b[1] / bh * 100).toFixed(3)}%`;
    return `<span class="pic ${cls}" style="--r:${(bw / bh).toFixed(4)}"><img src="${ph.src}" width="${ph.w}" height="${ph.h}" alt="${esc(ph.alt)}" ${lazy ? 'loading="lazy"' : ''} decoding="async" style="${st}"></span>`;
  }

  const ICON = {
    plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8V6M10 6h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>'
  };
  const use = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- Índice de productos ------------------------------------------ */
  const ITEMS = new Map();
  function indexMenu() {
    ITEMS.clear();
    MENU.forEach(cat => cat.items.forEach((it, ii) => {
      it.id = it.id || `${cat.id}-${ii + 1}`;   // mismos IDs que en Supabase (ej. cortes-3)
      it.cat = cat;
      it.configurable = !!(cat.options || (it.extras && it.extras.length));
      ITEMS.set(it.id, it);
    }));
  }
  indexMenu();
  /* La carta de Supabase conserva fotos, íconos y promos locales de cada categoría. */
  function mergeMenu(cats) {
    return cats.map(c => {
      const l = LOCAL_MENU.find(x => x.id === c.id) || {};
      return { id: c.id, title: c.title, options: c.options || null, items: c.items.map(i => ({ ...i })),
        photos: l.photos || [], icon: l.icon || null, promo: l.promo || null, feature: !!l.feature };
    });
  }
  const DRINKS = new Set(['bebidas', 'cerveza', 'cocteleria', 'cafe']);
  const noun = cat => DRINKS.has(cat.id) ? 'bebidas' : cat.id === 'postres' ? 'postres' : 'platillos';
  const TINTS = ['#e7b591', '#cfd8b8', '#efd39b', '#e9c3b0', '#d9cfe0', '#bfd6cf'];

  /* ---------- Estado ------------------------------------------------------- */
  const state = {
    mode: 'online',          // 'mesa' | 'online'
    sesion: null,            // {mesaId, numero, etiqueta, hash, startedAt, lastActive}
    checking: false,         // verificando un QR recién escaneado
    notice: null,            // {reason, numero}
    fulfil: store.get(KEY.fulfil, null),
    cart: store.get(KEY.cart, []),
    cliente: store.get(KEY.cliente, {}),
    step: 1,
    order: null,
    sending: false,
    menuSource: 'local'      // 'local' (menu-data.js) | 'cloud' | 'cache'
  };
  if (!Array.isArray(state.cart)) state.cart = [];
  state.cart = state.cart.filter(l => l && l.id && l.qty > 0);   // se valida contra la carta en syncCart()
  if (CFG.recogerEnSucursal === false) state.fulfil = 'domicilio';
  if (!state.cliente || typeof state.cliente !== 'object') state.cliente = {};

  /* ==========================================================================
     SESIÓN DE MESA
     QR → menuV2.html?mesa=<id>&k=<código>
     1) Se busca la mesa en la tabla y se compara el SHA-256 del código.
     2) Si coincide y está activa: sesión local con inicio y última actividad.
     3) Expira por inactividad o por duración máxima; también si la mesa se
        desactiva, se borra o se regenera su QR. Otro QR = cambio de mesa.
     ========================================================================== */
  const vigente = s => !!(s && s.sesion && s.secreto && s.mesaId) &&
    (Date.now() - s.lastActive) < (s.inactMin || CFG.sesionInactividadMin || 90) * 60e3 &&
    (Date.now() - s.startedAt) < (s.maxH || CFG.sesionMaxHoras || 4) * 3600e3;
  const saveSesion = () => store.set(KEY.sesion, state.sesion);
  /* Respuesta del servidor → aviso que ve el cliente */
  const SESSION_END = { invalida: 'invalid', cerrada: 'closed', expirada: 'expired', inactiva: 'inactive', qr_cambiado: 'revoked' };

  function enterTable(r) {
    const now = Date.now();
    state.sesion = { sesion: r.sesion, secreto: r.secreto, mesaId: r.mesa_id, numero: r.numero, etiqueta: r.etiqueta || '',
      inactMin: r.inactividad_min, maxH: r.max_horas, startedAt: now, lastActive: now, lastPing: now };
    state.mode = 'mesa';
    state.notice = null;
    saveSesion();
  }

  function endSession(reason) {
    const s = state.sesion;
    const numero = s && s.numero;
    if (reason === 'left' && s && CLOUD.configured) CLOUD.mesa.cerrar(s).catch(() => {});
    store.del(KEY.sesion);
    state.sesion = null;
    state.mode = 'online';
    state.notice = reason === 'left' ? null : { reason, numero };
    renderModeCard();
    updateOrderbar();
    if ($('#cartSheet').open) renderCart();
    if (reason === 'left') toast('Saliste de la mesa · <b>pedido en línea</b>');
    else if (reason === 'expired') toast('Tu sesión en la mesa <b>terminó</b>');
  }

  async function scanQR(id, k) {
    const prev = store.get(KEY.sesion, null);
    const prevOk = vigente(prev);
    const keepPrev = () => { if (prevOk) { state.sesion = prev; state.mode = 'mesa'; } };
    if (!CLOUD.configured) {
      keepPrev();
      if (!prevOk) state.notice = { reason: 'noserver' };
      renderModeCard(); updateOrderbar();
      return;
    }
    state.checking = true;
    renderModeCard();
    let r;
    try { r = await CLOUD.mesa.abrir(id, k); } catch (e) { r = { error: e }; }
    state.checking = false;

    if (r.error) {
      keepPrev();
      if (prevOk) toast('No pudimos verificar el QR'); else state.notice = { reason: 'offline' };
    } else if (r.ok) {
      const changed = prevOk && prev.mesaId !== r.mesa_id;
      if (prevOk && prev.sesion !== r.sesion) CLOUD.mesa.cerrar(prev).catch(() => {});
      enterTable(r);
      setTimeout(() => toast(changed ? `Cambiaste a la mesa <b>${r.numero}</b>` : `Mesa <b>${r.numero}</b> · lista para pedir`), 300);
    } else if (r.motivo === 'inactiva') {
      if (prevOk && prev.numero !== r.numero) { keepPrev(); toast(`La mesa <b>${r.numero}</b> no recibe pedidos · sigues en la <b>${prev.numero}</b>`); }
      else store.del(KEY.sesion);
      state.notice = { reason: 'inactive', numero: r.numero };
    } else {
      keepPrev();
      if (prevOk) toast(`Ese QR no es válido · sigues en la mesa <b>${prev.numero}</b>`);
      else state.notice = { reason: 'invalid' };
    }
    renderModeCard();
    updateOrderbar();
  }

  /* Comprueba que la mesa siga activa y con el mismo QR. Sin conexión: se conserva. */
  async function revalidate() {
    if (!state.sesion) return false;
    if (!CLOUD.configured) { endSession('noserver'); return false; }
    let r;
    try { r = await CLOUD.mesa.estado(state.sesion); } catch { return true; }   // sin red: se conserva
    if (!state.sesion) return false;
    if (!r || !r.ok) { endSession(SESSION_END[r && r.motivo] || 'invalid'); return false; }
    state.sesion.lastPing = Date.now();
    const et = r.etiqueta || '';
    const changed = state.sesion.numero !== r.numero || state.sesion.etiqueta !== et;
    state.sesion.numero = r.numero; state.sesion.etiqueta = et;
    saveSesion();
    if (changed) { renderModeCard(); updateOrderbar(); }
    return true;
  }

  function initMode() {
    const p = new URLSearchParams(location.search);
    const id = (p.get('mesa') || '').trim(), k = (p.get('k') || '').trim();
    if ((p.has('mesa') || p.has('k') || p.has('modo')) && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.hash); // no dejar el código en la barra
    }
    if (p.get('modo') === 'linea') { store.del(KEY.sesion); return; }
    if (id && k) { scanQR(id, k); return; }
    if (id || k) state.notice = { reason: 'invalid' };
    const s = store.get(KEY.sesion, null);
    if (vigente(s)) { state.sesion = s; state.mode = 'mesa'; revalidate(); }
    else if (s && s.mesaId) {
      store.del(KEY.sesion);
      if (s.sesion && CLOUD.configured) CLOUD.mesa.cerrar(s).catch(() => {});
      state.notice = { reason: 'expired', numero: s.numero };
    }
  }

  /* Actividad: cada interacción renueva la sesión (si no ha expirado ya). */
  let lastTouch = 0;
  function touch() {
    if (!state.sesion) return;
    const now = Date.now();
    if (now - lastTouch < 15000) return;
    lastTouch = now;
    if (!vigente(state.sesion)) { endSession('expired'); return; }
    state.sesion.lastActive = now;
    saveSesion();
    // mantener viva la sesión también en el servidor (cada 10 min de uso)
    if (now - (state.sesion.lastPing || 0) > 10 * 60e3) revalidate();
  }
  ['pointerdown', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, touch, { passive: true }));
  setInterval(() => { if (state.sesion && !vigente(state.sesion)) endSession('expired'); }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.sesion) return;
    if (!vigente(state.sesion)) endSession('expired'); else revalidate();
  });
  /* Otra pestaña cambió de mesa o salió */
  addEventListener('storage', e => {
    if (e.key !== KEY.sesion) return;
    const s = store.get(KEY.sesion, null);
    if (vigente(s)) { state.sesion = s; state.mode = 'mesa'; state.notice = null; }
    else { state.sesion = null; state.mode = 'online'; }
    renderModeCard(); updateOrderbar();
  });

  /* ---------- Ilustraciones de la tarjeta de modo -------------------------- */
  /* Pasos animados: cada ícono tiene su pequeña animación y se encienden en secuencia. */
  const STEP_ART = {
    elige: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="28" cy="40" rx="20" ry="8" class="fill-soft"/><path d="M10 38c2 8 34 8 36 0" class="ln"/><path d="M16 36c0-10 24-10 24 0" class="ln"/><path d="M26 22c-2-3 2-5 0-8M32 22c-2-3 2-5 0-8" class="ln steam"/><g class="pop"><circle cx="50" cy="18" r="9" class="fill-accent ln"/><path d="M50 13.5v9M45.5 18h9" class="ln ln-paper"/></g></svg>`,
    revisa: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 6h32v50l-5-4-5 4-6-4-6 4-5-4-5 4z" class="fill-paper ln"/><path d="M22 18h14M22 26h20M22 34h10" class="ln ln-thin"/><path d="M33 42l5 5 10-12" class="ln ln-accent tick"/></svg>`,
    cocina: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 50h44" class="ln"/><path d="M14 48a18 18 0 0 1 36 0z" class="fill-accent ln"/><path d="M32 30v-5M28 25h8" class="ln"/><path d="M22 36a10 10 0 0 1 6-5" class="ln ln-paper"/><g class="ding"><path d="M8 24l5 4M56 24l-5 4M14 14l4 6M50 14l-4 6" class="ln ln-accent"/></g></svg>`,
    datos: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="10" width="34" height="44" rx="5" class="fill-paper ln"/><circle cx="27" cy="23" r="5" class="ln ln-thin"/><path d="M18 36h18M18 44h12" class="ln ln-thin write"/><g class="pencil"><path d="M40 50l16-16 4 4-16 16-6 2z" class="fill-accent ln"/><path d="M52 38l4 4" class="ln"/></g></svg>`,
    whats: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30 8a20 20 0 0 0-17 30l-3 12 12-3A20 20 0 1 0 30 8z" class="fill-paper ln"/><path d="M22 28h16M22 35h10" class="ln ln-thin"/><g class="plane"><path d="M40 30l20-10-7 22-5-8z" class="fill-accent ln"/><path d="M48 34l12-14" class="ln"/></g></svg>`
  };
  const stepsHTML = list => `<ol class="steps">${list.map(([art, label, sub], i) =>
    `<li class="step" style="--i:${i}"><span class="step-art">${STEP_ART[art]}</span><span class="step-n">${i + 1}</span><b>${label}</b><small>${sub}</small></li>`).join('')}</ol>`;

  /* Escenas de domicilio / recoger */
  const SCENE = {
    domicilio: `<svg class="scene" viewBox="0 0 180 96" aria-hidden="true">
      <path d="M2 80h176" class="ln"/><path d="M6 89h170" class="ln ln-thin road"/>
      <g class="house"><path d="M132 80V54l19-16 19 16v26z" class="fill-soft ln"/><path d="M126 58l25-22 25 22" class="ln"/><path d="M145 80V66h12v14" class="ln"/><circle cx="151" cy="52" r="3.4" class="ln ln-thin"/></g>
      <g class="ride"><g class="bob"><path d="M18 52h12M10 60h14M16 68h8" class="ln ln-thin speed"/><use href="#d-moto" x="30" y="40" width="66" height="41"/><rect x="62" y="30" width="18" height="14" rx="2" class="fill-accent ln"/></g></g>
    </svg>`,
    recoger: `<svg class="scene" viewBox="0 0 180 96" aria-hidden="true">
      <path d="M2 80h176" class="ln"/>
      <path d="M54 80V40a36 36 0 0 1 72 0v40" class="fill-soft ln"/><path d="M66 80V44a24 24 0 0 1 48 0v36" class="ln ln-thin"/>
      <path d="M90 8v4M84 10l2 3M96 10l-2 3" class="ln ln-thin"/>
      <g class="bag"><use href="#d-bag" x="76" y="46" width="28" height="30"/></g>
      <g class="spark"><path d="M118 40c.6 4 1.6 5 5 5.6-3.4.6-4.4 1.6-5 5.4-.6-3.8-1.6-4.8-5-5.4 3.4-.6 4.4-1.6 5-5.6zM60 30c.4 3 1.2 3.6 3.6 4-2.4.4-3.2 1-3.6 3.6-.4-2.6-1.2-3.2-3.6-3.6 2.4-.4 3.2-1 3.6-4z" class="fill-accent"/></g>
      <g transform="translate(14 34) scale(.36)"><use href="#d-agave" width="120" height="150"/></g>
      <g transform="translate(140 34) scale(.36)"><use href="#d-bush" width="120" height="150"/></g>
    </svg>`
  };

  /* Sello aportado por el usuario: se conserva su SVG y animación originales. */
  function sealHTML(s) {
    return window.CasonaMesaStamp.html(s);
  }

  /* ---------- Tarjeta de modo ---------------------------------------------- */
  const NOTICES = {
    invalid: () => ['Este QR no es válido', 'Puede que se haya reemplazado. Pide ayuda a tu mesero o escanea el QR de tu mesa.'],
    inactive: n => [`La mesa ${n || ''} no recibe pedidos ahora`, 'Pide ayuda a tu mesero. Mientras tanto puedes ver el menú.'],
    expired: n => [`Tu sesión${n ? ` en la mesa ${n}` : ''} terminó`, 'Por seguridad se cierra sola. Vuelve a escanear el QR de tu mesa para pedir en local.'],
    revoked: n => [`El QR de la mesa ${n || ''} cambió`, 'Escanea el QR nuevo que está en tu mesa.'],
    offline: () => ['No pudimos verificar tu mesa', 'Revisa tu conexión y vuelve a escanear el QR.'],
    closed: n => [`Tu sesión${n ? ` en la mesa ${n}` : ''} se cerró`, 'Vuelve a escanear el QR de tu mesa para seguir pidiendo en local.'],
    noserver: () => ['El pedido en mesa aún no está disponible', 'Pídele a tu mesero. Mientras tanto puedes ver el menú o pedir en línea.']
  };
  const minsTxt = m => m >= 60 && m % 60 === 0 ? `${m / 60} ${m === 60 ? 'hora' : 'horas'}` : `${m} minutos`;

  function renderModeCard() {
    const el = $('#modeCard');
    window.CasonaPolishedUI.unmount(el);
    if (state.checking) {
      el.innerHTML = `<div class="mode-inner mode--checking">
        ${use('d-star', 'doodle check-spin')}
        <div><p class="mode-eyebrow"><span class="dot"></span>Pedido en local</p>
        <h2 class="mode-title mode-title--sm">Verificando tu mesa…</h2></div></div>`;
      return;
    }
    if (state.mode === 'mesa') {
      const s = state.sesion;
      el.innerHTML = `<div class="mode-inner mode--mesa">
        ${sealHTML(s)}
        <div class="mode-head">
          <h2 class="mode-title">Bienvenido a la mesa ${esc(s.numero)}<span class="mode-hand">pide lo que se te antoje</span></h2>
          <p class="mode-lead">Toca <b class="plus-chip">+</b> en tus platillos y envía el pedido. Llega directo a la cocina y te lo llevamos a tu mesa.</p>
        </div>
        ${stepsHTML([['elige', 'Elige', 'toca + en lo que se te antoje'], ['revisa', 'Revisa', 'abre tu pedido abajo'], ['cocina', 'Envía', 'llega directo a la cocina']])}
        <div class="mesa-foot">
          <p class="mesa-note">${use('d-sprig')}<span><b>No te pedimos ningún dato.</b> Si dejas de usar el menú ${minsTxt(CFG.sesionInactividadMin || 90)}, la mesa se libera sola.</span></p>
          <button class="leave-btn" type="button" data-act="leave-table"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Salir de la mesa</button>
        </div>
      </div>`;
      window.CasonaMesaStamp.mount(el);
      window.CasonaPolishedUI.mount(el);
      return;
    }
    const n = state.notice && NOTICES[state.notice.reason] ? NOTICES[state.notice.reason](state.notice.numero) : null;
    const pick = CFG.recogerEnSucursal !== false;
    const envio = CFG.envioDomicilio || 0;
    const door = (v, name, desc, tagSmall, tag) => `<button class="door door--${v}" type="button" role="radio" data-fulfil="${v}" aria-checked="${state.fulfil === v}">
        <span class="door-arch">${SCENE[v]}</span>
        <span class="door-text"><span class="door-name">${name}</span><span class="door-desc">${desc}</span></span>
        <span class="door-foot"><span class="door-tag"><small>${tagSmall}</small>${tag}</span>
          <span class="door-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>
      </button>`;
    el.innerHTML = `${n ? `<div class="notice" role="alert">${use('d-star', 'doodle')}<p><b>${esc(n[0])}</b>${esc(n[1])}</p></div>` : ''}
      <div class="mode-inner mode--online">
        <div class="mode-head">
          <p class="mode-eyebrow"><span class="dot"></span>Pedido en línea</p>
          <h2 class="mode-title">Pide desde casa<span class="mode-hand">¿cómo lo quieres?</span></h2>
          <p class="mode-lead">Elige una opción, arma tu pedido y nos lo mandas por WhatsApp. Sin cuentas ni contraseñas.</p>
        </div>
        <div class="mode-side">
          <div class="doors${pick ? '' : ' doors--one'}" role="radiogroup" aria-label="¿Cómo quieres tu pedido?">
            ${door('domicilio', 'A domicilio', 'Te lo llevamos a tu casa', 'Envío', `+$${envio}`)}
            ${pick ? door('recoger', 'Paso por él', 'Lo recoges en La Casona', 'Sin costo', '$0') : ''}
          </div>
          <p class="door-sum" id="doorSum" aria-live="polite">${fulfilSum()}</p>
        </div>
        ${stepsHTML([['elige', 'Elige', 'toca + en tus platillos'], ['datos', 'Tus datos', 'nombre, teléfono y dirección'], ['whats', 'WhatsApp', 'nos llega tu pedido y lo confirmamos']])}
        <p class="mode-foot mode-foot--wide">${use('d-qr')}<span><b>¿Estás en La Casona?</b> Escanea el QR de tu mesa y pide desde ahí, sin dar tus datos.</span></p>
      </div>`;
    window.CasonaPolishedUI.mount(el, {envio, onFulfil:setFulfil});
  }

  function setFulfil(v) {
    state.fulfil = v;
    store.set(KEY.fulfil, v);
    $$('[data-fulfil]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.fulfil === v)));
    const sum = $('#doorSum');
    if (sum) sum.innerHTML = fulfilSum();
    updateOrderbar();
  }
  function fulfilSum() {
    const envio = fmt(CFG.envioDomicilio || 0);
    if (state.fulfil === 'domicilio') return `<b>A domicilio.</b> Al total de tu pedido se suman <b>${envio}</b> de envío.`;
    if (state.fulfil === 'recoger') return `<b>Pasas por él.</b> Te avisamos por WhatsApp cuando esté listo. Sin costo extra.`;
    return `Toca una opción para empezar. Puedes cambiarla antes de enviar.`;
  }

  /* ---------- Portada ------------------------------------------------------ */
  function renderHero() {
    const total = MENU.reduce((s, c) => s + c.items.length, 0);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('statCats', MENU.length);
    set('statItems', total);
    const tel = (CFG.telefono || '').trim();
    const digits = tel.replace(/\D/g, '');
    $$('[data-phone]').forEach(el => {
      if (!tel) { el.hidden = true; return; }
      el.hidden = false;
      el.innerHTML = `<a href="tel:+52${digits.slice(-10)}">${esc(tel)}</a>`;
    });
  }

  /* Cielo de la portada según la hora local: día (sol), atardecer (sol que se esconde)
     o noche (luna). Cambia también el color del logo. Prueba: ?cielo=dia|tarde|noche */
  function skyNow() {
    const forced = new URLSearchParams(location.search).get('cielo');
    if (['dia', 'tarde', 'noche'].includes(forced)) return forced;
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h >= 6.5 && h < 17.5 ? 'dia' : h >= 17.5 && h < 20 ? 'tarde' : 'noche';
  }
  function renderSky() {
    const sky = skyNow();
    const h = new Date().getHours();
    document.documentElement.dataset.sky = sky;
    const hi = $('#skyHi');
    if (hi) hi.textContent = sky === 'noche' ? 'buenas noches' : sky === 'tarde' || (h >= 12 && h < 20) ? 'buenas tardes' : 'buenos días';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = sky === 'noche' ? '#e9e4ea' : sky === 'tarde' ? '#f5e3d3' : '#f3ede1';
  }
  renderSky();
  setInterval(renderSky, 5 * 60e3);

  /* "Casona" ocupa exactamente el ancho de la columna */
  function fitTitles() {
    $$('[data-fit]').forEach(el => {
      const box = el.parentElement.clientWidth;
      el.style.fontSize = '100px';
      const w = el.getBoundingClientRect().width;
      if (w && box) el.style.fontSize = `${(100 * box / w) * 0.995}px`;
    });
  }

  /* ---------- Render del menú --------------------------------------------- */
  function shapeOf(ph) {
    const b = BOUNDS[ph.src.split('/').pop()] || [0, 0, ph.w, ph.h];
    const r = (b[2] - b[0]) / (b[3] - b[1]);
    return r < .86 ? 'portrait' : r < 1.3 ? 'square' : 'landscape';
  }

  function itemRow(it) {
    const hint = it.cat.options ? `<span class="item-hint">elige ${esc(it.cat.options.label.toLowerCase())}</span>`
      : it.extras ? `<span class="item-hint">puedes agregar extras</span>` : '';
    return `<li class="item${it.disponible === false ? ' is-out' : ''}" data-id="${it.id}">
      <div class="item-main" data-act="open-item" role="button" tabindex="0" aria-label="Ver ${esc(it.name)}">
        <span class="item-line"><span class="item-name">${esc(it.name)}</span></span>${hint}
      </div>
      <span class="item-price">${priceHTML(it.price)}</span>
      <div class="item-ctrl" data-ctrl="${it.id}">${ctrlHTML(it)}</div>
    </li>`;
  }

  function ctrlHTML(it) {
    const q = qtyOf(it.id);
    if (it.disponible === false) return `<span class="sold">Agotado</span>`;
    if (!q) return `<button class="add" type="button" data-act="add" aria-label="Agregar ${esc(it.name)}, ${fmt(it.price)}">${ICON.plus}</button>`;
    return `<div class="stepper" role="group" aria-label="Cantidad de ${esc(it.name)}">
      <button type="button" data-act="dec" aria-label="Quitar uno">${ICON.minus}</button>
      <output aria-live="polite">${q}</output>
      <button type="button" data-act="add" aria-label="Agregar otro">${ICON.plus}</button></div>`;
  }

  /* Relleno ilustrado para categorías cortas (solo visible en doble columna). */
  const PAIR = { ensaladas: 'bebidas', aves: 'postres', tostadas: 'cerveza', bebidas: 'postres', cerveza: 'tostadas', postres: 'cafe', cafe: 'postres', pizzas: 'cerveza', cocteleria: 'entradas' };
  function filler(cat) {
    if (cat.items.length > 7 || !PAIR[cat.id]) return '';
    const to = MENU.find(c => c.id === PAIR[cat.id]);
    if (!to) return '';
    const art = to.icon ? pic(to.icon, 'boil') : use('d-star', 'doodle boil');
    return `<a class="cat-filler" href="#menu-${to.id}" aria-label="Ir a ${esc(to.title)}">
      ${use('d-arrow', 'doodle boil')}<p>¿Y para acompañar? ${esc(to.title.toLowerCase())}</p>${art}</a>`;
  }

  function renderMenu() {
    let col = 0;
    $('#menu').innerHTML = MENU.map((cat, ci) => {
      const num = String(ci + 1).padStart(2, '0');
      const ph = cat.photos && cat.photos[0];
      const shape = ph ? shapeOf(ph) : 'square';
      const kind = cat.feature ? 'feature' : cat.id === 'cortes' ? 'wide' : shape;
      let right = '';
      if (kind === 'feature' || kind === 'wide') col = 0; else { if (col === 1) right = ' is-right'; col ^= 1; }
      const icon = cat.icon ? pic(cat.icon, 'cat-icon boil') : use('d-star', 'doodle cat-icon cat-icon--doodle boil');
      const promo = cat.promo ? `<aside class="promo" aria-label="${esc(cat.promo.title)}">
          <img src="${cat.promo.photo.src}" width="${cat.promo.photo.w}" height="${cat.promo.photo.h}" alt="${esc(cat.promo.photo.alt)}" loading="lazy" decoding="async">
          <p>${esc(cat.promo.title)}<span>${cat.promo.lines.map(esc).join('<br>')}</span></p>
          ${use('d-sprig', 'doodle boil')}</aside>` : '';
      return `<section class="cat cat--${kind}${right} reveal" id="menu-${cat.id}" aria-labelledby="t-${cat.id}" style="--tint:${TINTS[ci % TINTS.length]}">
        <header class="cat-head">
          <span class="cat-num" aria-hidden="true">${num}</span>
          <div class="cat-titles"><h2 class="cat-title" id="t-${cat.id}"><span class="vh">${num} · </span>${esc(cat.title)}</h2>
          <span class="cat-meta">${cat.items.length} ${noun(cat)}</span></div>
          ${icon}
        </header>
        <div class="cat-rule"></div>
        <div class="cat-body">
          ${ph ? `<figure class="cat-photo cat-photo--${shape}">
            ${pic(ph, '', ci > 1)}
            ${use('d-star', 'doodle doodle-star boil')}
          </figure>` : ''}
          <ul class="items">${cat.items.map(itemRow).join('')}</ul>
          ${promo}
        </div>
        ${filler(cat)}
      </section>`;
    }).join('');
  }

  function renderIndex() {
    $('#indexGrid').innerHTML = MENU.map((cat, ci) => {
      const num = String(ci + 1).padStart(2, '0');
      const icon = cat.icon ? pic(cat.icon, 'idx-icon boil') : use('d-star', 'doodle idx-icon idx-icon--doodle boil');
      return `<li><a href="#menu-${cat.id}"><span class="idx-num">${num}</span><span class="idx-name">${esc(cat.title)}</span><span class="idx-count">${cat.items.length} ${noun(cat)}</span>${icon}</a></li>`;
    }).join('');
    $('#catbarTrack').innerHTML = MENU.map((cat, ci) =>
      `<a href="#menu-${cat.id}" data-cat="${cat.id}"><b>${String(ci + 1).padStart(2, '0')}</b>${esc(cat.title)}</a>`).join('');
  }

  /* ---------- Carrito ------------------------------------------------------ */
  const lineKey = (id, opt, extras, note) => [id, opt || '', (extras || []).map(e => e.name).sort().join('+'), (note || '').trim().toLowerCase()].join('|');
  const unitOf = l => l.price + (l.extras || []).reduce((s, e) => s + e.price, 0);
  const qtyOf = id => state.cart.reduce((s, l) => s + (l.id === id ? l.qty : 0), 0);
  const count = () => state.cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = () => state.cart.reduce((s, l) => s + unitOf(l) * l.qty, 0);
  const shipping = () => (state.mode === 'online' && state.fulfil === 'domicilio') ? (CFG.envioDomicilio || 0) : 0;

  function addLine(id, { qty = 1, option = '', extras = [], note = '' } = {}) {
    const it = ITEMS.get(id);
    const key = lineKey(id, option, extras, note);
    const found = state.cart.find(l => l.key === key);
    if (found) found.qty += qty;
    else state.cart.push({ key, id, name: it.name, cat: it.cat.title, price: it.price, qty, option, extras, note: note.trim() });
    saveCart();
    refreshItem(id, true);
    toast(`<b>+${qty}</b> ${esc(it.name)}`);
  }
  function decItem(id) {
    for (let i = state.cart.length - 1; i >= 0; i--) {
      if (state.cart[i].id === id) {
        state.cart[i].qty--;
        if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
        break;
      }
    }
    saveCart();
    refreshItem(id);
  }
  function saveCart() { store.set(KEY.cart, state.cart); updateOrderbar(); }

  function refreshItem(id, stamped) {
    const ctrl = document.querySelector(`[data-ctrl="${id}"]`);
    if (!ctrl) return;
    ctrl.innerHTML = ctrlHTML(ITEMS.get(id));
    ctrl.closest('.item').classList.toggle('is-in', qtyOf(id) > 0);
    if (stamped && !reduced()) {
      const s = document.createElement('span');
      s.className = 'stamp'; s.textContent = '+1'; s.setAttribute('aria-hidden', 'true');
      ctrl.append(s);
      setTimeout(() => s.remove(), 1000);
    }
  }
  function refreshAllItems() { ITEMS.forEach((_, id) => refreshItem(id)); }

  function updateOrderbar() {
    const c = count();
    $('#orderbar').hidden = c === 0;
    $('#orderbarCount').textContent = c;
    $('#orderbarItems').textContent = `${c} ${c === 1 ? 'producto' : 'productos'}`;
    $('#orderbarMode').textContent = state.mode === 'mesa' ? `Mesa ${state.sesion.numero} · Tu pedido` : 'Tu pedido';
    $('#orderbarTotal').textContent = fmt(subtotal() + (c ? shipping() : 0));
    const cnt = $('#orderbarCount');
    cnt.classList.remove('bump'); void cnt.offsetWidth; cnt.classList.add('bump');
  }

  /* ---------- Ficha de producto ------------------------------------------- */
  let sheetQty = 1;
  function openItem(id) {
    const it = ITEMS.get(id);
    const opt = it.cat.options;
    sheetQty = 1;
    const form = $('#itemForm');
    form.dataset.id = id;
    form.innerHTML = `
      <div class="sheet-head">
        <p class="sheet-eyebrow">${esc(it.cat.title)}</p>
        <h2 class="sheet-title" id="itemSheetTitle">${esc(it.name)}</h2>
        <p class="sheet-sub">${fmt(it.price)}</p>
        <button class="sheet-close" type="button" data-act="close" aria-label="Cerrar">${ICON.close}</button>
      </div>
      <div class="sheet-body">
        ${opt ? `<fieldset class="field fs"><legend class="label">${esc(opt.label)}</legend>
          <div class="chips">${opt.choices.map(c => `<label class="chip"><input type="radio" name="opt" value="${esc(c)}">${esc(c)}</label>`).join('')}</div>
          <p class="err" id="optErr">Elige una opción para continuar.</p></fieldset>` : ''}
        ${it.extras ? `<div class="field"><span class="label">Extras <em>opcional</em></span>
          ${it.extras.map((e, i) => `<label class="extra"><input type="checkbox" name="extra" value="${i}"><span>${esc(e.name)}</span><b>+ ${fmt(e.price)}</b></label>`).join('')}</div>` : ''}
        <label class="field"><span class="label">Indicaciones <em>opcional</em></span>
          <textarea class="input" name="note" maxlength="140" rows="2" placeholder="Ej. sin cebolla, salsa aparte…"></textarea></label>
        <div class="field qty-row"><span class="label" style="margin:0">Cantidad</span>
          <div class="stepper" role="group" aria-label="Cantidad">
            <button type="button" data-act="sq-dec" aria-label="Menos">${ICON.minus}</button>
            <output id="sheetQty">1</output>
            <button type="button" data-act="sq-inc" aria-label="Más">${ICON.plus}</button></div></div>
      </div>
      <div class="sheet-foot"><button class="btn" type="submit" value="add">Agregar <b id="sheetTotal">${fmt(it.price)}</b></button></div>`;
    openDialog($('#itemSheet'));
  }
  function sheetTotal() {
    const form = $('#itemForm');
    const it = ITEMS.get(form.dataset.id);
    const ex = $$('input[name="extra"]:checked', form).reduce((s, i) => s + it.extras[+i.value].price, 0);
    $('#sheetQty').textContent = sheetQty;
    $('#sheetTotal').textContent = fmt((it.price + ex) * sheetQty);
  }
  function submitItem(e) {
    e.preventDefault();
    const form = $('#itemForm');
    const it = ITEMS.get(form.dataset.id);
    let option = '';
    if (it.cat.options) {
      const r = $('input[name="opt"]:checked', form);
      if (!r) { const er = $('#optErr'); er.style.display = 'block'; er.scrollIntoView({ block: 'center' }); return; }
      option = r.value;
    }
    const extras = it.extras ? $$('input[name="extra"]:checked', form).map(i => it.extras[+i.value]) : [];
    addLine(it.id, { qty: sheetQty, option, extras, note: form.note.value });
    closeDialog($('#itemSheet'));
  }

  /* ---------- Pedido: revisar y datos -------------------------------------- */
  function openCart(step = 1) { state.step = step; renderCart(); openDialog($('#cartSheet')); }

  function renderCart() {
    const box = $('#cartInner');
    const c = count();
    const mesa = state.mode === 'mesa';
    const steps = mesa ? '' : `<div class="cart-steps" aria-hidden="true"><span class="on"></span><span class="${state.step >= 2 ? 'on' : ''}"></span><span></span></div>`;
    const head = (eyebrow, title) => `<div class="sheet-head"><p class="sheet-eyebrow">${eyebrow}</p><h2 class="sheet-title" id="cartTitle">${title}</h2>${steps}
      <button class="sheet-close" type="button" data-act="close" aria-label="Cerrar">${ICON.close}</button></div>`;

    if (!c) {
      box.innerHTML = head(mesa ? `Mesa ${state.sesion.numero}` : 'Pedido en línea', 'Tu pedido') +
        `<div class="sheet-body"><div class="empty">${use('d-steam')}<p>Aún no hay nada aquí</p><small>Toca el + de cualquier platillo</small></div></div>
         <div class="sheet-foot"><button class="btn btn--ghost" type="button" data-act="close">Ver el menú</button></div>`;
      return;
    }

    if (state.step === 1 || mesa) {
      const lines = state.cart.map((l, i) => `
        <div class="line">
          <span class="line-name">${esc(l.name)}</span>
          <span class="line-price">${fmt(unitOf(l) * l.qty)}</span>
          <span class="line-meta">${fmt(unitOf(l))} c/u${l.option ? ` · ${esc(l.option)}` : ''}${l.extras.length ? ` · ${l.extras.map(e => '+ ' + esc(e.name)).join(', ')}` : ''}${l.note ? `<br><i>“${esc(l.note)}”</i>` : ''}</span>
          <div class="line-ctrl">
            <div class="stepper" role="group" aria-label="Cantidad de ${esc(l.name)}">
              <button type="button" data-act="l-dec" data-i="${i}" aria-label="Quitar uno">${ICON.minus}</button>
              <output>${l.qty}</output>
              <button type="button" data-act="l-inc" data-i="${i}" aria-label="Agregar otro">${ICON.plus}</button></div>
            <button class="link-btn" type="button" data-act="l-del" data-i="${i}">Quitar</button>
          </div>
        </div>`).join('');
      const ship = shipping();
      box.innerHTML = head(mesa ? `Pedido en local · Mesa ${state.sesion.numero}` : 'Paso 1 de 3 · Revisa', 'Tu pedido') + `
        <div class="sheet-body">
          ${lines}
          <div class="totals">
            <div><span>Productos (${c})</span><span>${fmt(subtotal())}</span></div>
            ${!mesa ? `<div><span>${state.fulfil === 'domicilio' ? 'Envío a domicilio' : state.fulfil === 'recoger' ? 'Recoger en sucursal' : 'Envío'}</span><span>${state.fulfil ? fmt(ship) : 'por elegir'}</span></div>` : ''}
            <div class="grand"><span>Total</span><span>${fmt(subtotal() + ship)}</span></div>
          </div>
          ${mesa ? `<label class="field"><span class="label">¿A nombre de quién? <em>opcional</em></span>
            <input class="input" name="mesaNombre" autocomplete="given-name" maxlength="40" value="${esc(state.cliente.nombre || '')}" placeholder="Tu nombre"></label>
            <label class="field"><span class="label">Comentario para cocina <em>opcional</em></span>
            <input class="input" name="mesaNota" maxlength="140" value="${esc(state.nota || '')}" placeholder="Ej. traer todo al mismo tiempo"></label>` : ''}
          <p style="margin-top:14px;text-align:center"><button class="link-btn" type="button" data-act="clear">Vaciar pedido</button></p>
        </div>
        <div class="sheet-foot">${mesa
          ? `<button class="btn" type="button" data-act="review">Revisar y enviar <b>${fmt(subtotal())}</b></button>`
          : `<button class="btn" type="button" data-act="step2">Continuar <b>${fmt(subtotal() + ship)}</b></button>`}</div>`;
      return;
    }

    const cl = state.cliente;
    const pagos = CFG.pagos || ['Efectivo'];
    const pago = pagos.includes(cl.pago) ? cl.pago : pagos[0];
    box.innerHTML = head('Paso 2 de 3 · Tus datos', 'Casi listo') + `
      <form class="sheet-body" id="dataForm" novalidate>
        <fieldset class="field fs"><legend class="label">¿Cómo lo quieres?</legend>
          <div class="mode-choices">
            <label class="choice">${use('d-moto')}<input type="radio" name="fulfil" value="domicilio" ${state.fulfil === 'domicilio' ? 'checked' : ''}><b>A domicilio</b><span>+ ${fmt(CFG.envioDomicilio || 0)}</span></label>
            ${CFG.recogerEnSucursal !== false ? `<label class="choice">${use('d-bag')}<input type="radio" name="fulfil" value="recoger" ${state.fulfil === 'recoger' ? 'checked' : ''}><b>Para recoger</b><span>Sin costo</span></label>` : ''}
          </div>
          <p class="err" id="fulfilErr">Elige domicilio o recoger.</p></fieldset>
        <label class="field"><span class="label">Nombre</span>
          <input class="input" name="nombre" autocomplete="name" maxlength="50" required value="${esc(cl.nombre || '')}" placeholder="¿A nombre de quién?">
          <span class="err">Escribe tu nombre.</span></label>
        <label class="field"><span class="label">WhatsApp / teléfono</span>
          <input class="input" name="telefono" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" required value="${esc(cl.telefono || '')}" placeholder="10 dígitos">
          <span class="err">Escribe un teléfono de 10 dígitos.</span></label>
        <div id="addrFields" ${state.fulfil === 'domicilio' ? '' : 'hidden'}>
          <label class="field"><span class="label">Dirección de entrega</span>
            <textarea class="input" name="direccion" rows="2" autocomplete="street-address" maxlength="200" placeholder="Calle, número y colonia">${esc(cl.direccion || '')}</textarea>
            <span class="err">Escribe la dirección de entrega.</span></label>
          <label class="field"><span class="label">Referencias <em>opcional</em></span>
            <input class="input" name="referencias" maxlength="120" value="${esc(cl.referencias || '')}" placeholder="Ej. portón verde, entre calles…"></label>
        </div>
        <fieldset class="field fs"><legend class="label">¿Cómo pagas?</legend>
          <div class="chips">${pagos.map(p => `<label class="chip"><input type="radio" name="pago" value="${esc(p)}" ${pago === p ? 'checked' : ''}>${esc(p)}</label>`).join('')}</div></fieldset>
        <label class="field" id="cambioField" ${pago === 'Efectivo' ? '' : 'hidden'}><span class="label">¿Con cuánto pagas? <em>para llevar cambio</em></span>
          <input class="input" name="cambio" inputmode="numeric" maxlength="7" value="${esc(cl.cambio || '')}" placeholder="Ej. 500">
          <span class="err" id="cambioErr">Debe ser igual o mayor al total.</span></label>
        <label class="field"><span class="label">Comentario <em>opcional</em></span>
          <input class="input" name="nota" maxlength="140" value="${esc(state.nota || '')}" placeholder="Algo que debamos saber"></label>
      </form>
      <div class="sheet-foot">
        <button class="btn" type="button" data-act="review">Ver mi ticket <b id="step2Total">${fmt(subtotal() + shipping())}</b></button>
        <p style="text-align:center;margin-top:6px"><button class="link-btn" type="button" data-act="step1">← Volver al pedido</button></p>
      </div>`;
  }

  function readDataForm() {
    const f = $('#dataForm');
    if (!f) return;
    const v = n => (f.elements[n] ? f.elements[n].value : '').trim();
    const fulfil = f.querySelector('input[name="fulfil"]:checked');
    Object.assign(state.cliente, {
      nombre: v('nombre'), telefono: v('telefono'), direccion: v('direccion'), referencias: v('referencias'),
      pago: (f.querySelector('input[name="pago"]:checked') || {}).value || '', cambio: v('cambio')
    });
    state.nota = v('nota');
    store.set(KEY.cliente, state.cliente);
    if (fulfil) setFulfil(fulfil.value);
  }

  function validateData() {
    const f = $('#dataForm');
    readDataForm();
    const cl = state.cliente;
    const digits = cl.telefono.replace(/\D/g, '').replace(/^52(1)?(?=\d{10}$)/, '');
    const total = subtotal() + shipping();
    const checks = [
      ['nombre', cl.nombre.length >= 2],
      ['telefono', digits.length === 10],
      ['direccion', state.fulfil !== 'domicilio' || cl.direccion.length >= 6],
      ['cambio', cl.pago !== 'Efectivo' || !cl.cambio || parseFloat(cl.cambio.replace(/[^\d.]/g, '')) >= total]
    ];
    $('#cambioErr').textContent = `Debe ser igual o mayor al total (${fmt(total)}).`;
    let first = null;
    checks.forEach(([n, ok]) => { const el = f.elements[n]; el.setAttribute('aria-invalid', String(!ok)); if (!ok && !first) first = el; });
    $('#fulfilErr').style.display = state.fulfil ? 'none' : 'block';
    if (!state.fulfil && !first) first = f.querySelector('input[name="fulfil"]');
    if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false; }
    cl.telefonoLimpio = digits;
    return true;
  }

  /* ---------- Ticket ------------------------------------------------------- */
  function buildOrder() {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    const mesa = state.mode === 'mesa';
    if (mesa) {
      const box = $('#cartInner');
      const nm = box.querySelector('[name="mesaNombre"]');
      const nt = box.querySelector('[name="mesaNota"]');
      if (nm) { state.cliente.nombre = nm.value.trim(); store.set(KEY.cliente, state.cliente); }
      state.nota = nt ? nt.value.trim() : '';
    }
    const ship = shipping();
    state.order = {
      id: mesa ? `M${state.sesion.numero}-${hhmm}-${rnd.slice(0, 2)}` : `LC-${hhmm}-${rnd}`,
      date: now, mode: state.mode, mesa: mesa ? { ...state.sesion } : null, fulfil: state.fulfil,
      cliente: { ...state.cliente }, nota: state.nota || '',
      lines: state.cart.map(l => ({ ...l, extras: [...l.extras] })),
      count: count(), subtotal: subtotal(), envio: ship, total: subtotal() + ship, saved: false,
      clientKey: CLOUD.newKey ? CLOUD.newKey() : ''   // mismo pedido = misma clave: reintentar no duplica
    };
    return state.order;
  }

  const dateStr = d => d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  const phoneStr = p => p && p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 6)} ${p.slice(6)}` : (p || '');
  const pagaCon = o => o.cliente.pago === 'Efectivo' && o.cliente.cambio ? parseFloat(o.cliente.cambio.replace(/[^\d.]/g, '')) || 0 : 0;

  /* Texto del ticket (WhatsApp y registro de cocina). */
  function ticketText(o) {
    const L = [];
    const R = (CFG.restaurante || 'La Casona').toUpperCase();
    if (o.mode === 'mesa') {
      L.push(`*${R} · PEDIDO EN MESA*`);
      L.push(`🍽️ *MESA ${o.mesa.numero}*${o.mesa.etiqueta ? ` (${o.mesa.etiqueta})` : ''}`);
      L.push(`Folio: ${o.id}`);
      L.push(`Hora: ${timeStr(o.date)} · ${dateStr(o.date)}`);
      if (o.cliente.nombre) L.push(`A nombre de: ${o.cliente.nombre}`);
    } else {
      L.push(`*${R} · PEDIDO EN LÍNEA*`);
      L.push(`Folio: ${o.id}`);
      L.push(`Fecha: ${dateStr(o.date)} · ${timeStr(o.date)}`);
      L.push(`Entrega: ${o.fulfil === 'domicilio' ? '🛵 A domicilio' : '🛍️ Recoger en sucursal'}`);
      L.push('');
      L.push('*CLIENTE*');
      L.push(`Nombre: ${o.cliente.nombre}`);
      L.push(`Teléfono: ${phoneStr(o.cliente.telefonoLimpio || o.cliente.telefono)}`);
      if (o.fulfil === 'domicilio') {
        L.push(`Dirección: ${o.cliente.direccion}`);
        if (o.cliente.referencias) L.push(`Referencias: ${o.cliente.referencias}`);
      }
      const pc = pagaCon(o);
      L.push(`Pago: ${o.cliente.pago}${pc ? ` (paga con ${fmt(pc)} · cambio ${fmt(pc - o.total)})` : ''}`);
    }
    L.push('');
    L.push(`*PEDIDO* (${o.count} ${o.count === 1 ? 'producto' : 'productos'})`);
    o.lines.forEach(l => {
      L.push(`${l.qty} × ${l.name} — ${fmt(unitOf(l) * l.qty)}`);
      L.push(`    ${l.cat}${l.qty > 1 ? ` · ${fmt(unitOf(l))} c/u` : ''}`);
      if (l.option) L.push(`    • Término: ${l.option}`);
      l.extras.forEach(e => L.push(`    • Extra: ${e.name} (+${fmt(e.price)})`));
      if (l.note) L.push(`    • Nota: ${l.note}`);
    });
    L.push('------------------------------');
    L.push(`Subtotal: ${fmt(o.subtotal)}`);
    if (o.mode !== 'mesa') L.push(o.fulfil === 'domicilio' ? `Envío a domicilio: ${fmt(o.envio)}` : 'Envío: $0.00 (recoge en sucursal)');
    L.push(`*TOTAL: ${fmt(o.total)}*`);
    if (o.nota) { L.push(''); L.push(`Comentario: ${o.nota}`); }
    if (o.mode !== 'mesa') { L.push(''); L.push('Quedo atento(a) a la confirmación de mi pedido. ¡Gracias!'); }
    return L.join('\n');
  }

  function waLink(o) {
    const num = String(CFG.whatsapp || '').replace(/\D/g, '');
    if (!num) console.warn('[La Casona] Falta el WhatsApp del restaurante (carta.html → Datos del restaurante). WhatsApp pedirá elegir el contacto.');
    return `https://wa.me/${num}?text=${encodeURIComponent(ticketText(o))}`;
  }

  /* Líneas para Supabase: solo IDs y cantidades. Precios y totales los calcula el servidor. */
  const cloudItems = o => o.lines.map(l => ({
    producto_id: l.id, cantidad: l.qty, opcion: l.option || '',
    extras: (l.extras || []).map(e => e.id).filter(x => x != null), nota: l.note || ''
  }));
  const canSave = () => CLOUD.configured && state.menuSource !== 'local';
  /* Motivos del servidor → texto claro para el cliente */
  const ORDER_ERR = {
    producto_agotado: d => `Se agotó: ${d}. Quítalo de tu pedido para continuar.`,
    producto_no_existe: () => 'Uno de tus platillos ya no está en la carta. Actualiza la página.',
    falta_opcion: d => `Elige el término de: ${d}.`,
    extra_invalido: d => `Un extra de ${d} ya no está disponible.`,
    demasiados_pedidos: () => 'Ya enviaste varios pedidos seguidos. Espera unos minutos.',
    saturado: () => 'Estamos recibiendo muchos pedidos. Inténtalo en unos minutos.'
  };

  function openTicket() {
    const o = buildOrder();
    const mesa = o.mode === 'mesa';
    const kitchen = mesa && CFG.pedidosMesaVan !== 'whatsapp' && CLOUD.configured;
    const pc = pagaCon(o);
    const info = mesa
      ? `<dt>Mesa</dt><dd><b class="tk-mesa">${o.mesa.numero}</b>${o.mesa.etiqueta ? `<br><small>${esc(o.mesa.etiqueta)}</small>` : ''}</dd>${o.cliente.nombre ? `<dt>Nombre</dt><dd>${esc(o.cliente.nombre)}</dd>` : ''}`
      : `<dt>Entrega</dt><dd>${o.fulfil === 'domicilio' ? 'A domicilio' : 'Recoger en sucursal'}</dd>
         <dt>Nombre</dt><dd>${esc(o.cliente.nombre)}</dd>
         <dt>Teléfono</dt><dd>${esc(phoneStr(o.cliente.telefonoLimpio))}</dd>
         ${o.fulfil === 'domicilio' ? `<dt>Dirección</dt><dd>${esc(o.cliente.direccion)}${o.cliente.referencias ? `<br><small>${esc(o.cliente.referencias)}</small>` : ''}</dd>` : ''}
         <dt>Pago</dt><dd>${esc(o.cliente.pago)}${pc ? `<br><small>Paga con ${fmt(pc)} · cambio ${fmt(pc - o.total)}</small>` : ''}</dd>`;
    $('#ticketInner').innerHTML = `
      <div class="sheet-head"><p class="sheet-eyebrow">${mesa ? `Mesa ${o.mesa.numero} · Último paso` : 'Paso 3 de 3 · Envía'}</p>
        <h2 class="sheet-title" id="ticketTitle">Tu ticket</h2>
        <button class="sheet-close" type="button" data-act="close" aria-label="Cerrar">${ICON.close}</button></div>
      <div class="sheet-body sheet-body--paper">
        <div id="sendState"></div>
        <article class="ticket">
          <p class="ticket-brand">La Casona</p>
          <p class="ticket-kind">${mesa ? 'Pedido en mesa' : 'Pedido en línea'} · ${esc(o.id)}</p>
          <hr>
          <dl><dt>Fecha</dt><dd>${dateStr(o.date)} · ${timeStr(o.date)}</dd>${info}</dl>
          <hr>
          <ul class="ticket-lines">${o.lines.map(l => `<li><span class="q">${l.qty}×</span><span class="n">${esc(l.name)}</span><span>${fmt(unitOf(l) * l.qty)}</span>
            ${(l.option || l.extras.length || l.note) ? `<span class="s">${[l.option && 'Término: ' + esc(l.option), ...l.extras.map(e => '+ ' + esc(e.name)), l.note && '“' + esc(l.note) + '”'].filter(Boolean).join(' · ')}</span>` : ''}</li>`).join('')}</ul>
          <hr>
          <dl><dt>Subtotal</dt><dd>${fmt(o.subtotal)}</dd>${!mesa ? `<dt>Envío</dt><dd>${fmt(o.envio)}</dd>` : ''}</dl>
          <hr>
          <p class="ticket-total"><span>Total</span><span>${fmt(o.total)}</span></p>
          ${o.nota ? `<p class="ticket-note">“${esc(o.nota)}”</p>` : ''}
          <p class="ticket-sign">¡Gracias!</p>
        </article>
        <div class="sent" id="sentBox" hidden>
          <p>¿Ya enviaste el mensaje en WhatsApp?</p>
          <button class="btn btn--ghost" type="button" data-act="done">Sí, empezar un pedido nuevo</button>
        </div>
      </div>
      <div class="sheet-foot" id="ticketFoot">
        ${kitchen
          ? `<button class="btn btn--kitchen" type="button" data-act="send-kitchen">${ICON.bell} Enviar a cocina <b>${fmt(o.total)}</b></button>`
          : `<a class="btn btn--wa" href="${waLink(o)}" target="_blank" rel="noopener" data-act="sent">${ICON.wa} Enviar por WhatsApp</a>`}
        <p class="foot-links"><button class="link-btn" type="button" data-act="edit">← Editar</button>
          ${kitchen ? '' : '<button class="link-btn" type="button" data-act="copy">Copiar ticket</button>'}</p>
      </div>`;
    closeDialog($('#cartSheet'));
    openDialog($('#ticketSheet'));
  }

  async function sendKitchen(btn) {
    const o = state.order;
    if (!o || state.sending || o.saved) return;
    state.sending = true;
    btn.disabled = true;
    btn.innerHTML = `${ICON.bell} Enviando…`;
    const box = $('#sendState');
    box.innerHTML = '';
    try {
      if (!canSave()) throw new Error('sin-servidor');
      const r = await CLOUD.pedidos.mesa({ sesion: state.sesion, clientKey: o.clientKey, items: cloudItems(o), nombre: o.cliente.nombre, comentario: o.nota });
      if (!r || !r.ok) {
        if (r && SESSION_END[r.motivo]) { closeDialog($('#ticketSheet')); endSession(SESSION_END[r.motivo]); return; }
        const f = r && ORDER_ERR[r.motivo];
        box.innerHTML = `<div class="send-err" role="alert"><b>No pudimos enviar tu pedido</b>${esc(f ? f(r.detalle || '') : 'Revisa tu pedido e inténtalo de nuevo.')}</div>`;
        btn.disabled = false;
        btn.innerHTML = `${ICON.bell} Intentar de nuevo <b>${fmt(o.total)}</b>`;
        return;
      }
      o.saved = true;
      if (r.folio) o.id = r.folio;
      if (state.sesion) { state.sesion.lastPing = Date.now(); saveSesion(); }
      state.cart = []; state.nota = ''; saveCart(); refreshAllItems();
      box.innerHTML = `<div class="sent-ok" role="status"><span class="sent-stamp jitter">¡En cocina!</span>
        <p>Recibimos tu pedido <b>${esc(o.id)}</b>. Te lo llevamos a tu mesa (mesa ${esc(o.mesa.numero)}).</p></div>`;
      $('#ticketFoot').innerHTML = `<button class="btn" type="button" data-act="close">Seguir viendo el menú</button>`;
      $('#ticketInner .sheet-body').scrollTop = 0;
    } catch (e) {
      const wa = String(CFG.whatsapp || '').replace(/\D/g, '');
      box.innerHTML = `<div class="send-err" role="alert"><b>No pudimos enviar tu pedido</b>
        Revisa tu conexión e inténtalo de nuevo${wa ? ', envíalo por WhatsApp' : ''} o pide ayuda a tu mesero.
        ${wa ? `<a class="btn btn--wa" href="${waLink(o)}" target="_blank" rel="noopener">${ICON.wa} Enviar por WhatsApp</a>` : ''}</div>`;
      btn.disabled = false;
      btn.innerHTML = `${ICON.bell} Intentar de nuevo <b>${fmt(o.total)}</b>`;
    } finally {
      state.sending = false;
    }
  }

  /* Pedido en línea: WhatsApp se abre al instante (el clic no puede esperar a la red)
     y en paralelo se registra en Supabase como "por confirmar" para cocina / CRM.
     La misma clientKey evita duplicados si el cliente toca el botón dos veces. */
  function logOnlineOrder() {
    const o = state.order;
    if (!o || o.saved || o.mode !== 'online' || !canSave()) return;
    o.saved = true;
    const c = o.cliente;
    CLOUD.pedidos.linea({ clientKey: o.clientKey, folio: o.id, datos: {
      entrega: o.fulfil, nombre: c.nombre, telefono: c.telefonoLimpio || c.telefono, direccion: c.direccion || '',
      referencias: c.referencias || '', pago: c.pago, paga_con: pagaCon(o) || '', comentario: o.nota || '', items: cloudItems(o)
    } }).then(r => { if (!r || !r.ok) { o.saved = false; console.warn('[La Casona] Pedido en línea no registrado:', r && r.motivo); } })
      .catch(e => { o.saved = false; console.warn('[La Casona] Pedido en línea no registrado:', e.message); });
  }

  /* ---------- Diálogos ----------------------------------------------------- */
  function openDialog(d) {
    if (!d.open) { typeof d.showModal === 'function' ? d.showModal() : d.setAttribute('open', ''); }
    document.documentElement.style.overflow = 'hidden';
  }
  function closeDialog(d) {
    if (d.open) { typeof d.close === 'function' ? d.close() : d.removeAttribute('open'); }
    if (!$$('dialog').some(x => x.open)) document.documentElement.style.overflow = '';
  }
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) closeDialog(d); });
    d.addEventListener('close', () => { if (!$$('dialog').some(x => x.open)) document.documentElement.style.overflow = ''; });
  });

  /* ---------- Toast -------------------------------------------------------- */
  let toastT;
  function toast(html) {
    const t = $('#toast');
    t.innerHTML = html;
    t.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  /* ---------- Eventos ------------------------------------------------------ */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act],[data-fulfil]');
    if (!el) return;
    if (el.dataset.fulfil) { if (!el.closest('.casona-delivery-v2')) setFulfil(el.dataset.fulfil); return; }
    const act = el.dataset.act;
    const row = el.closest('.item');
    const id = row && row.dataset.id;
    switch (act) {
      case 'add': { const it = ITEMS.get(id); if (it.configurable) openItem(id); else addLine(id); break; }
      case 'dec': decItem(id); break;
      case 'open-item': openItem(id); break;
      case 'close': closeDialog(el.closest('dialog')); break;
      case 'sq-inc': sheetQty = Math.min(sheetQty + 1, 50); sheetTotal(); break;
      case 'sq-dec': sheetQty = Math.max(sheetQty - 1, 1); sheetTotal(); break;
      case 'leave-table': if (confirm('¿Salir de la mesa? Tendrás que escanear el QR otra vez para pedir en local.')) endSession('left'); break;
      case 'l-inc': case 'l-dec': case 'l-del': {
        const l = state.cart[+el.dataset.i];
        if (!l) break;
        if (act === 'l-inc') l.qty++;
        else if (act === 'l-dec') l.qty--;
        if (act === 'l-del' || l.qty <= 0) state.cart.splice(+el.dataset.i, 1);
        saveCart(); refreshItem(l.id); renderCart();
        break;
      }
      case 'clear':
        if (confirm('¿Vaciar todo el pedido?')) { state.cart = []; saveCart(); refreshAllItems(); renderCart(); }
        break;
      case 'step1': readDataForm(); state.step = 1; renderCart(); break;
      case 'step2': state.step = 2; renderCart(); $('#cartInner .sheet-body').scrollTop = 0; break;
      case 'review':
        if (state.mode === 'online' && !validateData()) break;
        openTicket();
        break;
      case 'edit': closeDialog($('#ticketSheet')); openCart(state.mode === 'online' ? 2 : 1); break;
      case 'send-kitchen': sendKitchen(el); break;
      case 'sent':
        logOnlineOrder();
        setTimeout(() => { const s = $('#sentBox'); if (s) { s.hidden = false; s.scrollIntoView({ block: 'nearest' }); } }, 600);
        break;
      case 'copy': {
        const txt = ticketText(state.order);
        const ok = () => toast('Ticket <b>copiado</b>');
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => fallbackCopy(txt, ok)); else fallbackCopy(txt, ok);
        break;
      }
      case 'done':
        state.cart = []; state.nota = ''; saveCart(); refreshAllItems();
        closeDialog($('#ticketSheet'));
        toast('¡Gracias! <b>Pedido enviado</b>');
        break;
    }
  });
  function fallbackCopy(txt, ok) {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch { /* */ }
    ta.remove();
  }
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.item-main')) { e.preventDefault(); openItem(e.target.closest('.item').dataset.id); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.closest('#itemForm')) { if (t.name === 'opt') $('#optErr').style.display = 'none'; sheetTotal(); }
    if (t.closest('#dataForm')) {
      if (t.name === 'fulfil') {
        setFulfil(t.value);
        $('#addrFields').hidden = t.value !== 'domicilio';
        $('#fulfilErr').style.display = 'none';
        $('#step2Total').textContent = fmt(subtotal() + shipping());
      }
      if (t.name === 'pago') $('#cambioField').hidden = t.value !== 'Efectivo';
      readDataForm();
    }
  });
  document.addEventListener('input', e => { if (e.target.closest('#dataForm') && e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });
  $('#itemForm').addEventListener('submit', submitItem);
  $('#orderbarBtn').addEventListener('click', () => openCart(1));

  /* ---------- Scroll: barra de categorías, sección activa, aparición ------- */
  function setupScroll() {
    const catbar = $('#catbar');
    const track = $('#catbarTrack');
    const indice = $('#indice');
    let ticking = false;
    const syncBar = () => { ticking = false; catbar.classList.toggle('is-on', indice.getBoundingClientRect().bottom < 0); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(syncBar); } }, { passive: true });
    addEventListener('resize', () => { syncBar(); fitTitles(); }, { passive: true });
    syncBar();
    if (!('IntersectionObserver' in window)) { observeMenu(); return; }

    let current = '';
    OBS.spy = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id.replace('menu-', '');
      if (id === current) return;
      current = id;
      const links = $$('a', track);   // se vuelve a leer: la carta puede llegar después desde Supabase
      links.forEach(a => a.setAttribute('aria-current', String(a.dataset.cat === id)));
      const a = links.find(x => x.dataset.cat === id);
      if (a) track.scrollTo({ left: a.offsetLeft - track.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    }), { rootMargin: '-40% 0px -55% 0px' });
    OBS.rev = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); OBS.rev.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    OBS.boil = new IntersectionObserver(entries => entries.forEach(en => en.target.classList.toggle('off', !en.isIntersecting)));
    observeMenu();
  }
  /* (Re)conecta secciones, apariciones y "boil" tras dibujar la carta. */
  const OBS = {};
  function observeMenu() {
    if (!OBS.spy) { $$('.reveal').forEach(el => el.classList.add('is-in')); return; }
    [OBS.spy, OBS.rev, OBS.boil].forEach(o => o.disconnect());
    $$('.cat').forEach(s => OBS.spy.observe(s));
    $$('.reveal:not(.is-in)').forEach(el => OBS.rev.observe(el));
    $$('.boil').forEach(el => OBS.boil.observe(el));
  }

  /* ---------- Carta desde Supabase ---------------------------------------- */
  /* Quita del carrito lo que ya no existe y actualiza precios a los de la carta. */
  function syncCart() {
    const before = state.cart.length;
    state.cart = state.cart.filter(l => {
      const it = ITEMS.get(l.id);
      if (!it || it.disponible === false) return false;
      l.name = it.name; l.cat = it.cat.title; l.price = it.price;
      l.extras = (l.extras || []).map(e => (it.extras || []).find(x => x.name === e.name)).filter(Boolean);
      return true;
    });
    store.set(KEY.cart, state.cart);
    return before - state.cart.length;
  }

  async function loadCloudMenu() {
    if (!CLOUD.configured) return;
    try {
      const r = await CLOUD.getMenu();
      if (!r.categorias || !r.categorias.length) return;
      MENU = mergeMenu(r.categorias);
      Object.entries(r.config || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') CFG[k] = v; });
      state.menuSource = r.stale ? 'cache' : 'cloud';
      indexMenu();
      const removed = syncCart();
      renderHero(); renderModeCard(); renderIndex(); renderMenu(); refreshAllItems(); updateOrderbar();
      observeMenu();
      fitTitles();
      if (removed) toast(`Actualizamos la carta · <b>${removed}</b> ${removed === 1 ? 'producto ya no está' : 'productos ya no están'} disponible${removed === 1 ? '' : 's'}`);
      if (r.stale) console.warn('[La Casona] Carta desde caché local (Supabase no respondió).');
    } catch (e) {
      console.warn('[La Casona] No se pudo cargar la carta de Supabase:', e.message);
    }
  }

  /* ---------- Inicio ------------------------------------------------------- */
  initMode();
  renderHero();
  renderModeCard();
  renderIndex();
  renderMenu();
  syncCart();
  refreshAllItems();
  updateOrderbar();
  setupScroll();
  loadCloudMenu();
  fitTitles();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitles);
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }

  window.CASONA_DEBUG = { state, cloud: CLOUD.configured, ticketText: () => state.order && ticketText(state.order) };
})();
