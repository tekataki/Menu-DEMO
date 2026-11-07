/* ==========================================================================
   LA CASONA · cloud.js
   ÚNICA conexión con Supabase. Menú, QR de mesa, pedidos, cocina y paneles
   usan solo estas funciones (window.CasonaCloud).
   Requiere cargar antes: js/vendor/supabase-js-2.57.4.js (copia local fija).
   ========================================================================== */
(() => {
  'use strict';

  /* ╔════════════════════════════════════════════════════════════════════╗
     ║  PEGA AQUÍ TUS DATOS DE SUPABASE (único lugar)                      ║
     ║  Supabase → tu proyecto → botón "Connect" / Project Settings → API  ║
     ║  · URL   = "Project URL"                                             ║
     ║  · Clave = "Publishable key" (sb_publishable_…) o "anon public"     ║
     ║  NUNCA la "secret" ni la "service_role" (se rechaza automáticamente)║
     ╚════════════════════════════════════════════════════════════════════╝ */
  const SUPABASE_URL = 'https://fzqhtkkfbfyqsdrojoiw.supabase.co';          // ej. 'https://abcdefghijklmnop.supabase.co'
  const SUPABASE_PUBLIC_KEY = 'sb_publishable_dfZ9KU7o2YgM_yCgn_B_1A_eAnY205h';   // ej. 'sb_publishable_xxxxxxxx'
  /* ──────────────────────────────────────────────────────────────────── */

  function jwtRole(k) {
    try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role || ''; }
    catch { return ''; }
  }
  let problem = '';
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) problem = 'Falta pegar SUPABASE_URL y SUPABASE_PUBLIC_KEY en js/cloud.js';
  else if (!/^https:\/\/[^/\s]+\/?$/i.test(SUPABASE_URL)) problem = 'SUPABASE_URL no es válida (debe ser https://xxxx.supabase.co)';
  else if (/^sb_secret_/i.test(SUPABASE_PUBLIC_KEY) || jwtRole(SUPABASE_PUBLIC_KEY) === 'service_role') problem = 'Pegaste una clave SECRETA. Bórrala de js/cloud.js y usa la publishable/anon key.';
  else if (!window.supabase || typeof window.supabase.createClient !== 'function') problem = 'No se cargó js/vendor/supabase-js-2.57.4.js';
  if (problem) console.warn('[La Casona] ' + problem);

  const sb = problem ? null : window.supabase.createClient(SUPABASE_URL.replace(/\/$/, ''), SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'casona.auth' }
  });

  /* ---------- Errores: kind = config | red | sesion | permiso | credenciales | duplicado | datos */
  class CloudError extends Error {
    constructor(kind, message, code) { super(message); this.name = 'CloudError'; this.kind = kind; this.code = code || ''; }
  }
  function toError(e) {
    if (e instanceof CloudError) return e;
    const msg = String((e && (e.message || e.error_description)) || e || 'Error');
    const code = String((e && (e.code || e.status)) || '');
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return new CloudError('red', 'Sin conexión con el servidor', code);
    if (/invalid login credentials/i.test(msg)) return new CloudError('credenciales', 'Correo o contraseña incorrectos', code);
    if (/email not confirmed/i.test(msg)) return new CloudError('credenciales', 'La cuenta no está confirmada', code);
    if (/jwt expired|auth session missing/i.test(msg) || code === 'PGRST301') return new CloudError('sesion', 'Tu sesión terminó. Vuelve a entrar.', code);
    if (code === '42501' || code === '401' || code === '403' || /permission denied|row-level security|sin_permiso/i.test(msg)) return new CloudError('permiso', 'No tienes permiso para esto', code);
    if (code === '23505') return new CloudError('duplicado', 'Ese registro ya existe', code);
    if (code === 'PGRST116') return new CloudError('permiso', 'No se encontró o no tienes permiso', code);
    return new CloudError('datos', msg, code);
  }
  const need = () => { if (!sb) throw new CloudError('config', problem || 'Supabase no configurado'); };
  async function run(q) {
    let res;
    try { res = await q; } catch (e) { throw toError(e); }
    if (res.error) throw toError(res.error);
    return res.data;
  }
  async function rpc(fn, args) { need(); return run(sb.rpc(fn, args)); }
  async function pageAll(build) {            // PostgREST entrega máx. 1000 filas por llamada
    const out = [];
    for (let from = 0; from < 50000; from += 1000) {
      const rows = await run(build().range(from, from + 999));
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    return out;
  }
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function newKey() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  const num = v => Number(v) || 0;
  const pick = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));

  /* ======================= CARTA PÚBLICA + CONFIG =========================
     Caché local de 7 días por si Supabase no responde (stale:true). */
  const MENU_CACHE = 'casona.menuCache.v1';
  const MENU_TTL = 7 * 864e5;
  const CONFIG_COLS = 'restaurante,telefono,whatsapp,envio_domicilio,recoger_en_sucursal,pedidos_linea_activos,pagos,sesion_inactividad_min,sesion_max_horas';
  const normConfig = c => !c ? {} : {
    restaurante: c.restaurante, telefono: c.telefono || '', whatsapp: c.whatsapp || '',
    envioDomicilio: num(c.envio_domicilio), recogerEnSucursal: !!c.recoger_en_sucursal,
    pedidosLineaActivos: c.pedidos_linea_activos !== false,
    pagos: Array.isArray(c.pagos) && c.pagos.length ? c.pagos : ['Efectivo'],
    sesionInactividadMin: c.sesion_inactividad_min, sesionMaxHoras: c.sesion_max_horas
  };

  async function getMenu() {
    need();
    try {
      const [cfg, cats, prods, extras] = await Promise.all([
        run(sb.from('config').select(CONFIG_COLS).eq('id', 1).maybeSingle()),
        pageAll(() => sb.from('categorias').select('id,titulo,orden,opcion_titulo,opcion_valores').eq('activa', true).order('orden').order('id')),
        pageAll(() => sb.from('productos').select('id,categoria_id,nombre,descripcion,precio,orden,disponible').eq('activo', true).order('orden').order('id')),
        pageAll(() => sb.from('producto_extras').select('id,producto_id,nombre,precio,orden').eq('activo', true).order('orden').order('id'))
      ]);
      const exBy = new Map();
      extras.forEach(e => { if (!exBy.has(e.producto_id)) exBy.set(e.producto_id, []); exBy.get(e.producto_id).push({ id: e.id, name: e.nombre, price: num(e.precio) }); });
      const data = {
        config: normConfig(cfg),
        categorias: cats.map(c => ({
          id: c.id, title: c.titulo,
          options: c.opcion_titulo && (c.opcion_valores || []).length ? { label: c.opcion_titulo, choices: c.opcion_valores } : null,
          items: prods.filter(p => p.categoria_id === c.id).map(p => ({
            id: p.id, name: p.nombre, desc: p.descripcion || '', price: num(p.precio),
            disponible: p.disponible !== false, extras: exBy.get(p.id)
          }))
        })).filter(c => c.items.length)
      };
      try { localStorage.setItem(MENU_CACHE, JSON.stringify({ v: 1, at: Date.now(), url: SUPABASE_URL, data })); } catch { /* */ }
      return { ...data, stale: false };
    } catch (e) {
      try {
        const c = JSON.parse(localStorage.getItem(MENU_CACHE) || 'null');
        if (c && c.v === 1 && c.url === SUPABASE_URL && Date.now() - c.at < MENU_TTL) return { ...c.data, stale: true, cachedAt: c.at };
      } catch { /* */ }
      throw e;
    }
  }

  /* ======================= MESA (cliente) ================================ */
  const mesa = {
    abrir(mesaId, token) {
      if (!UUID.test(mesaId || '') || !token || token.length > 64) return Promise.resolve({ ok: false, motivo: 'invalido' });
      return rpc('mesa_abrir_sesion', { p_mesa: mesaId, p_token: token });
    },
    estado: s => rpc('mesa_estado_sesion', { p_sesion: s.sesion, p_secreto: s.secreto }),
    cerrar: s => rpc('mesa_cerrar_sesion', { p_sesion: s.sesion, p_secreto: s.secreto })
  };

  /* ======================= PEDIDOS (cliente) =============================
     El servidor calcula precios y totales. clientKey evita duplicados.
     items: [{producto_id, cantidad, opcion, extras:[idExtra], nota}] */
  const pedidos = {
    mesa: ({ sesion, clientKey, items, nombre, comentario }) => rpc('crear_pedido_mesa', {
      p_sesion: sesion.sesion, p_secreto: sesion.secreto, p_client_key: clientKey,
      p_items: items, p_nombre: nombre || '', p_comentario: comentario || ''
    }),
    linea: ({ clientKey, folio, datos }) => rpc('crear_pedido_linea', { p_client_key: clientKey, p_folio: folio || null, p: datos })
  };

  /* ======================= EQUIPO (Auth + staff) ========================= */
  const auth = {
    async staff() {
      need();
      const { data } = await sb.auth.getSession();
      const s = data && data.session;
      if (!s) return null;
      const row = await run(sb.from('staff').select('nombre,rol,activo').eq('user_id', s.user.id).maybeSingle());
      return { email: s.user.email, nombre: (row && row.nombre) || '', rol: row && row.activo ? row.rol : null };
    },
    async signIn(email, password) { need(); await run(sb.auth.signInWithPassword({ email: String(email).trim(), password })); return auth.staff(); },
    async signOut() { if (sb) await sb.auth.signOut().catch(() => {}); },
    async resetPassword(email) { need(); await run(sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: location.href.split(/[?#]/)[0] })); },
    async updatePassword(password) { need(); await run(sb.auth.updateUser({ password })); },
    onChange(cb) { if (!sb) return () => {}; const { data } = sb.auth.onAuthStateChange((ev, s) => cb(ev, s)); return () => data.subscription.unsubscribe(); }
  };

  /* ======================= ADMIN · MESAS Y QR ============================ */
  const MESA_COLS = 'id,numero,zona,nota,activa,token,qr_version';
  const mesas = {
    list: () => { need(); return pageAll(() => sb.from('mesas').select(MESA_COLS).order('numero').order('id')); },
    crear: (desde, hasta, zona) => rpc('mesas_crear', { p_desde: desde, p_hasta: hasta, p_zona: zona || '' }),
    actualizar(id, cambios) { need(); return run(sb.from('mesas').update(pick(cambios, ['numero', 'zona', 'nota', 'activa'])).eq('id', id).select(MESA_COLS).single()); },
    nuevoQR: id => rpc('mesa_nuevo_qr', { p_mesa: id }),
    async borrar(id) {
      need();
      const rows = await run(sb.from('mesas').delete().eq('id', id).select('id'));
      if (!rows.length) throw new CloudError('permiso', 'No se pudo borrar (permiso o ya no existe)');
    },
    url(base, m) {
      const u = new URL(base, location.href);
      u.search = ''; u.hash = '';
      u.searchParams.set('mesa', m.id);
      u.searchParams.set('k', m.token);
      return u.toString();
    }
  };

  /* ======================= COCINA (staff) ================================ */
  const PEDIDO_COLS = 'id,folio,modo,estado,mesa_numero,mesa_etiqueta,entrega,cliente_nombre,cliente_telefono,direccion,referencias,pago,paga_con,comentario,num_productos,subtotal,envio,total,created_at,estado_at,pedido_items(id,nombre,categoria,cantidad,opcion,extras,nota,importe)';
  const ESTADOS = ['por_confirmar', 'nuevo', 'preparando', 'listo', 'entregado', 'cancelado'];
  const cocina = {
    list(horas = 24) {
      need();
      const desde = new Date(Date.now() - horas * 3600e3).toISOString();
      return pageAll(() => sb.from('pedidos').select(PEDIDO_COLS).gte('created_at', desde).order('created_at', { ascending: true }).order('id'));
    },
    setEstado(id, estado) {
      if (!ESTADOS.includes(estado)) return Promise.reject(new CloudError('datos', 'Estado no válido'));
      need();
      return run(sb.from('pedidos').update({ estado }).eq('id', id).select('id,estado').single());
    },
    subscribe(onChange, onStatus) {
      need();
      const ch = sb.channel('cocina-pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, p => onChange(p))
        .subscribe(st => onStatus && onStatus(st));
      return () => sb.removeChannel(ch);
    }
  };

  /* ======================= ADMIN · CARTA Y DATOS ========================= */
  const PROD_COLS = 'id,categoria_id,nombre,descripcion,precio,orden,activo,disponible';
  const carta = {
    async listAll() {
      need();
      const [cats, prods, extras] = await Promise.all([
        pageAll(() => sb.from('categorias').select('id,titulo,orden,activa,opcion_titulo,opcion_valores').order('orden').order('id')),
        pageAll(() => sb.from('productos').select(PROD_COLS).order('orden').order('id')),
        pageAll(() => sb.from('producto_extras').select('id,producto_id,nombre,precio,orden,activo').order('orden').order('id'))
      ]);
      return { cats, prods, extras };
    },
    actualizarProducto(id, cambios) {
      const data = pick(cambios, ['nombre', 'descripcion', 'precio', 'activo', 'disponible', 'orden', 'categoria_id']);
      if ('precio' in data && !(num(data.precio) >= 0 && num(data.precio) < 100000)) return Promise.reject(new CloudError('datos', 'Precio no válido'));
      need();
      return run(sb.from('productos').update(data).eq('id', id).select(PROD_COLS).single());
    },
    crearProducto({ categoria_id, nombre, precio, orden }) {
      need();
      return run(sb.from('productos').insert({ categoria_id, nombre: String(nombre).trim(), precio: num(precio), orden: orden || 0 }).select(PROD_COLS).single());
    },
    actualizarCategoria(id, cambios) { need(); return run(sb.from('categorias').update(pick(cambios, ['titulo', 'activa', 'orden'])).eq('id', id).select('id,titulo,orden,activa').single()); }
  };
  const config = {
    get: () => { need(); return run(sb.from('config').select(CONFIG_COLS).eq('id', 1).maybeSingle()); },
    actualizar(cambios) {
      need();
      const data = pick(cambios, ['restaurante', 'telefono', 'whatsapp', 'envio_domicilio', 'recoger_en_sucursal', 'pedidos_linea_activos', 'pagos', 'sesion_inactividad_min', 'sesion_max_horas']);
      return run(sb.from('config').update(data).eq('id', 1).select(CONFIG_COLS).single());
    }
  };

  function errorText(e) {
    const k = e && e.kind;
    if (k === 'config') return 'El sistema aún no está conectado a la base de datos.';
    if (k === 'red') return 'Sin conexión. Revisa el internet e inténtalo de nuevo.';
    if (k === 'sesion') return 'Tu sesión terminó. Vuelve a entrar.';
    if (k === 'permiso') return 'Tu cuenta no tiene permiso para esto.';
    if (k === 'credenciales' || k === 'duplicado') return e.message;
    return 'Algo salió mal (' + ((e && e.message) || 'error') + ').';
  }

  window.CasonaCloud = Object.freeze({
    configured: !!sb, problem, CloudError, errorText, newKey,
    getMenu, mesa, pedidos, auth, mesas, cocina, carta, config
  });
})();
