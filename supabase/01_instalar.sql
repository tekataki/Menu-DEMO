-- =============================================================================
--  LA CASONA · BACKEND SUPABASE · 01_instalar.sql
--  Pegar COMPLETO en Supabase → SQL Editor → New query → Run.
--
--  Crea: tablas, restricciones, índices, seguridad (RLS + GRANT), funciones
--  del menú / QR de mesa / pedidos y la pantalla de cocina en tiempo real.
--
--  Se puede volver a ejecutar sin borrar datos (create if not exists /
--  create or replace / drop policy if exists). No contiene datos de ejemplo:
--  la carta va en 02_menu_inicial.sql.
-- =============================================================================

begin;

-- Esquema privado: NO se expone por la API. Aquí viven las sesiones de mesa.
create schema if not exists casona_private;
revoke all on schema casona_private from public;
grant usage on schema casona_private to anon, authenticated;  -- solo para usar las funciones de RLS

-- =============================================================================
-- 1. TABLAS
-- =============================================================================

-- Configuración pública del restaurante (una sola fila, id = 1).
create table if not exists public.config (
  id                      smallint primary key default 1 check (id = 1),
  restaurante             text not null default 'La Casona' check (char_length(restaurante) between 1 and 60),
  telefono                text not null default '' check (char_length(telefono) <= 30),
  whatsapp                text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
  envio_domicilio         numeric(10,2) not null default 35 check (envio_domicilio >= 0 and envio_domicilio < 10000),
  recoger_en_sucursal     boolean not null default true,
  pedidos_linea_activos   boolean not null default true,
  pagos                   text[] not null default array['Efectivo','Tarjeta','Transferencia'] check (cardinality(pagos) between 1 and 6),
  sesion_inactividad_min  int not null default 90 check (sesion_inactividad_min between 10 and 600),
  sesion_max_horas        int not null default 4  check (sesion_max_horas between 1 and 24),
  zona_horaria            text not null default 'America/Mexico_City',
  updated_at              timestamptz not null default now()
);

-- Equipo (cuentas de Supabase Auth con permiso). Solo se da de alta por SQL.
create table if not exists public.staff (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '' check (char_length(nombre) <= 60),
  rol         text not null check (rol in ('admin','cocina')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Carta
create table if not exists public.categorias (
  id              text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  titulo          text not null check (char_length(titulo) between 1 and 60),
  orden           int not null default 0,
  activa          boolean not null default true,
  opcion_titulo   text check (opcion_titulo is null or char_length(opcion_titulo) <= 40),
  opcion_valores  text[] not null default '{}',           -- ej. término de la carne (elección sin costo)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.productos (
  id            text primary key default ('p-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
                check (id ~ '^[a-z0-9-]{2,60}$'),
  categoria_id  text not null references public.categorias(id) on update cascade on delete restrict,
  nombre        text not null check (char_length(nombre) between 1 and 80),
  descripcion   text not null default '' check (char_length(descripcion) <= 300),
  precio        numeric(10,2) not null check (precio >= 0 and precio < 100000),
  orden         int not null default 0,
  activo        boolean not null default true,   -- false = oculto de la carta
  disponible    boolean not null default true,   -- false = "Agotado" (se ve, no se pide)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists productos_categoria_idx on public.productos (categoria_id, orden, id);

create table if not exists public.producto_extras (
  id           bigint generated always as identity primary key,
  producto_id  text not null references public.productos(id) on update cascade on delete cascade,
  nombre       text not null check (char_length(nombre) between 1 and 60),
  precio       numeric(10,2) not null check (precio >= 0 and precio < 100000),
  orden        int not null default 0,
  activo       boolean not null default true,
  unique (producto_id, nombre)
);

-- Mesas. "token" es el código secreto impreso en el QR: SOLO lo lee un admin.
create table if not exists public.mesas (
  id          uuid primary key default gen_random_uuid(),
  numero      int not null unique check (numero between 1 and 999),
  zona        text not null default '' check (char_length(zona) <= 30),
  nota        text not null default '' check (char_length(nota) <= 30),
  activa      boolean not null default true,
  token       text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  qr_version  int not null default 1 check (qr_version >= 1),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sesiones temporales abiertas al escanear un QR (privadas).
create table if not exists casona_private.sesiones_mesa (
  id                uuid primary key default gen_random_uuid(),
  mesa_id           uuid not null references public.mesas(id) on delete cascade,
  secreto_hash      text not null,
  qr_version        int not null,
  iniciada_at       timestamptz not null default now(),
  ultima_actividad  timestamptz not null default now(),
  cerrada_at        timestamptz
);
create index if not exists sesiones_mesa_mesa_idx on casona_private.sesiones_mesa (mesa_id);
create index if not exists sesiones_mesa_inicio_idx on casona_private.sesiones_mesa (iniciada_at);

-- Pedidos (base de la pantalla de cocina y del futuro CRM).
create table if not exists public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  folio             text not null check (char_length(folio) <= 24),
  client_key        uuid not null unique,              -- evita duplicados si el cliente reintenta
  modo              text not null check (modo in ('mesa','linea')),
  estado            text not null default 'nuevo'
                    check (estado in ('por_confirmar','nuevo','preparando','listo','entregado','cancelado')),
  mesa_id           uuid references public.mesas(id) on delete set null,
  mesa_numero       int,
  mesa_etiqueta     text not null default '',
  sesion_id         uuid,
  entrega           text not null check (entrega in ('mesa','domicilio','recoger')),
  cliente_nombre    text not null default '' check (char_length(cliente_nombre) <= 50),
  cliente_telefono  text not null default '' check (cliente_telefono ~ '^[0-9]{0,10}$'),
  direccion         text not null default '' check (char_length(direccion) <= 200),
  referencias       text not null default '' check (char_length(referencias) <= 120),
  pago              text not null default '' check (char_length(pago) <= 30),
  paga_con          numeric(10,2) not null default 0 check (paga_con >= 0),
  comentario        text not null default '' check (char_length(comentario) <= 140),
  num_productos     int not null default 0 check (num_productos >= 0),
  subtotal          numeric(10,2) not null default 0 check (subtotal >= 0),
  envio             numeric(10,2) not null default 0 check (envio >= 0),
  total             numeric(10,2) not null default 0 check (total >= 0),
  estado_at         timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check ((modo = 'mesa') = (entrega = 'mesa'))
);
create index if not exists pedidos_creado_idx   on public.pedidos (created_at desc);
create index if not exists pedidos_estado_idx   on public.pedidos (estado, created_at);
create index if not exists pedidos_telefono_idx on public.pedidos (cliente_telefono, created_at);

create table if not exists public.pedido_items (
  id           bigint generated always as identity primary key,
  pedido_id    uuid not null references public.pedidos(id) on delete cascade,
  producto_id  text references public.productos(id) on update cascade on delete set null,
  nombre       text not null,          -- copia del nombre y precio al momento del pedido
  categoria    text not null default '',
  cantidad     int not null check (cantidad between 1 and 50),
  precio_unit  numeric(10,2) not null check (precio_unit >= 0),
  opcion       text not null default '',
  extras       jsonb not null default '[]'::jsonb,
  nota         text not null default '' check (char_length(nota) <= 140),
  importe      numeric(10,2) not null check (importe >= 0)
);
create index if not exists pedido_items_pedido_idx on public.pedido_items (pedido_id);

-- =============================================================================
-- 2. TRIGGERS (fechas automáticas)
-- =============================================================================
create or replace function casona_private.tocar_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function casona_private.tocar_estado_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado is distinct from old.estado then new.estado_at := now(); end if;
  return new;
end $$;

drop trigger if exists t_config_upd on public.config;
create trigger t_config_upd before update on public.config for each row execute function casona_private.tocar_updated_at();
drop trigger if exists t_categorias_upd on public.categorias;
create trigger t_categorias_upd before update on public.categorias for each row execute function casona_private.tocar_updated_at();
drop trigger if exists t_productos_upd on public.productos;
create trigger t_productos_upd before update on public.productos for each row execute function casona_private.tocar_updated_at();
drop trigger if exists t_mesas_upd on public.mesas;
create trigger t_mesas_upd before update on public.mesas for each row execute function casona_private.tocar_updated_at();
drop trigger if exists t_pedidos_upd on public.pedidos;
create trigger t_pedidos_upd before update on public.pedidos for each row execute function casona_private.tocar_updated_at();
drop trigger if exists t_pedidos_estado on public.pedidos;
create trigger t_pedidos_estado before update on public.pedidos for each row execute function casona_private.tocar_estado_at();

-- =============================================================================
-- 3. FUNCIONES DE PERMISOS (usadas por las políticas RLS)
--    SECURITY DEFINER para poder leer "staff" sin abrir esa tabla a nadie.
-- =============================================================================
create or replace function casona_private.es_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.activo);
$$;

create or replace function casona_private.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.activo and s.rol = 'admin');
$$;

revoke all on function casona_private.es_staff() from public;
revoke all on function casona_private.es_admin() from public;
grant execute on function casona_private.es_staff() to anon, authenticated;
grant execute on function casona_private.es_admin() to anon, authenticated;
revoke all on function casona_private.tocar_updated_at() from public;
revoke all on function casona_private.tocar_estado_at() from public;

-- =============================================================================
-- 4. RLS + GRANT (dos capas distintas: GRANT = qué columnas/operaciones,
--    RLS = qué filas). Se quitan primero todos los permisos por defecto.
-- =============================================================================
alter table public.config           enable row level security;
alter table public.staff            enable row level security;
alter table public.categorias       enable row level security;
alter table public.productos        enable row level security;
alter table public.producto_extras  enable row level security;
alter table public.mesas            enable row level security;
alter table public.pedidos          enable row level security;
alter table public.pedido_items     enable row level security;
alter table casona_private.sesiones_mesa enable row level security;   -- sin políticas = nadie por API

revoke all on public.config, public.staff, public.categorias, public.productos, public.producto_extras,
              public.mesas, public.pedidos, public.pedido_items from anon, authenticated;
revoke all on casona_private.sesiones_mesa from anon, authenticated, public;

-- config: lectura pública; solo admin edita (nunca el id).
grant select on public.config to anon, authenticated;
grant update (restaurante, telefono, whatsapp, envio_domicilio, recoger_en_sucursal, pedidos_linea_activos,
              pagos, sesion_inactividad_min, sesion_max_horas, zona_horaria) on public.config to authenticated;
drop policy if exists config_leer on public.config;
create policy config_leer on public.config for select to anon, authenticated using (true);
drop policy if exists config_editar on public.config;
create policy config_editar on public.config for update to authenticated
  using (casona_private.es_admin()) with check (casona_private.es_admin());

-- staff: cada quien ve su propia fila; admin ve a todos. Altas/cambios SOLO por SQL.
grant select on public.staff to authenticated;
drop policy if exists staff_leer on public.staff;
create policy staff_leer on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or casona_private.es_admin());

-- categorias / productos / extras: el público ve lo activo; admin lo administra.
grant select on public.categorias, public.productos, public.producto_extras to anon, authenticated;
grant insert, update, delete on public.categorias, public.productos, public.producto_extras to authenticated;
grant usage, select on sequence public.producto_extras_id_seq to authenticated;

drop policy if exists categorias_leer on public.categorias;
create policy categorias_leer on public.categorias for select to anon, authenticated
  using (activa or casona_private.es_staff());
drop policy if exists categorias_admin_ins on public.categorias;
create policy categorias_admin_ins on public.categorias for insert to authenticated with check (casona_private.es_admin());
drop policy if exists categorias_admin_upd on public.categorias;
create policy categorias_admin_upd on public.categorias for update to authenticated using (casona_private.es_admin()) with check (casona_private.es_admin());
drop policy if exists categorias_admin_del on public.categorias;
create policy categorias_admin_del on public.categorias for delete to authenticated using (casona_private.es_admin());

drop policy if exists productos_leer on public.productos;
create policy productos_leer on public.productos for select to anon, authenticated
  using (activo or casona_private.es_staff());
drop policy if exists productos_admin_ins on public.productos;
create policy productos_admin_ins on public.productos for insert to authenticated with check (casona_private.es_admin());
drop policy if exists productos_admin_upd on public.productos;
create policy productos_admin_upd on public.productos for update to authenticated using (casona_private.es_admin()) with check (casona_private.es_admin());
drop policy if exists productos_admin_del on public.productos;
create policy productos_admin_del on public.productos for delete to authenticated using (casona_private.es_admin());

drop policy if exists extras_leer on public.producto_extras;
create policy extras_leer on public.producto_extras for select to anon, authenticated
  using (activo or casona_private.es_staff());
drop policy if exists extras_admin_ins on public.producto_extras;
create policy extras_admin_ins on public.producto_extras for insert to authenticated with check (casona_private.es_admin());
drop policy if exists extras_admin_upd on public.producto_extras;
create policy extras_admin_upd on public.producto_extras for update to authenticated using (casona_private.es_admin()) with check (casona_private.es_admin());
drop policy if exists extras_admin_del on public.producto_extras;
create policy extras_admin_del on public.producto_extras for delete to authenticated using (casona_private.es_admin());

-- mesas: SOLO admin (contiene el código del QR). El público nunca las lee:
-- valida su QR con la función mesa_abrir_sesion().
grant select, delete on public.mesas to authenticated;
grant insert (numero, zona, nota, activa), update (numero, zona, nota, activa) on public.mesas to authenticated;
drop policy if exists mesas_admin_sel on public.mesas;
create policy mesas_admin_sel on public.mesas for select to authenticated using (casona_private.es_admin());
drop policy if exists mesas_admin_ins on public.mesas;
create policy mesas_admin_ins on public.mesas for insert to authenticated with check (casona_private.es_admin());
drop policy if exists mesas_admin_upd on public.mesas;
create policy mesas_admin_upd on public.mesas for update to authenticated using (casona_private.es_admin()) with check (casona_private.es_admin());
drop policy if exists mesas_admin_del on public.mesas;
create policy mesas_admin_del on public.mesas for delete to authenticated using (casona_private.es_admin());

-- pedidos: el equipo los ve y SOLO puede cambiar el estado.
-- Nadie inserta directo: se crean con crear_pedido_mesa() / crear_pedido_linea(),
-- que calculan precios y totales en el servidor.
grant select on public.pedidos, public.pedido_items to authenticated;
grant update (estado) on public.pedidos to authenticated;
drop policy if exists pedidos_staff_sel on public.pedidos;
create policy pedidos_staff_sel on public.pedidos for select to authenticated using (casona_private.es_staff());
drop policy if exists pedidos_staff_upd on public.pedidos;
create policy pedidos_staff_upd on public.pedidos for update to authenticated
  using (casona_private.es_staff()) with check (casona_private.es_staff());
drop policy if exists items_staff_sel on public.pedido_items;
create policy items_staff_sel on public.pedido_items for select to authenticated using (casona_private.es_staff());

-- =============================================================================
-- 5. FUNCIONES INTERNAS (no ejecutables desde la API)
-- =============================================================================

-- Comprueba una sesión de mesa. Devuelve {motivo, mesa_id, numero, etiqueta}.
-- motivo: ok | invalida | cerrada | expirada | inactiva | qr_cambiado
create or replace function casona_private.verificar_sesion(p_sesion uuid, p_secreto text, p_tocar boolean default true)
returns jsonb language plpgsql set search_path = '' as $$
declare
  s   record;
  cfg record;
begin
  if p_sesion is null or p_secreto is null or char_length(p_secreto) > 128 then
    return jsonb_build_object('motivo', 'invalida');
  end if;

  select ses.secreto_hash, ses.qr_version as ses_qr, ses.iniciada_at, ses.ultima_actividad, ses.cerrada_at,
         m.id as m_id, m.numero as m_numero, m.zona as m_zona, m.nota as m_nota, m.activa as m_activa, m.qr_version as m_qr
    into s
    from casona_private.sesiones_mesa ses
    left join public.mesas m on m.id = ses.mesa_id
   where ses.id = p_sesion;

  if not found or s.m_id is null
     or s.secreto_hash <> encode(sha256(convert_to(p_secreto, 'UTF8')), 'hex') then
    return jsonb_build_object('motivo', 'invalida');
  end if;

  if s.cerrada_at is not null then
    return jsonb_build_object('motivo', 'cerrada', 'numero', s.m_numero);
  end if;

  select c.sesion_inactividad_min, c.sesion_max_horas into cfg from public.config c where c.id = 1;
  if now() - s.ultima_actividad > make_interval(mins => coalesce(cfg.sesion_inactividad_min, 90))
     or now() - s.iniciada_at > make_interval(hours => coalesce(cfg.sesion_max_horas, 4)) then
    return jsonb_build_object('motivo', 'expirada', 'numero', s.m_numero);
  end if;

  if not s.m_activa then
    return jsonb_build_object('motivo', 'inactiva', 'numero', s.m_numero);
  end if;

  if s.m_qr <> s.ses_qr then
    return jsonb_build_object('motivo', 'qr_cambiado', 'numero', s.m_numero);
  end if;

  if p_tocar then
    update casona_private.sesiones_mesa set ultima_actividad = now() where id = p_sesion;
  end if;

  return jsonb_build_object(
    'motivo', 'ok', 'mesa_id', s.m_id, 'numero', s.m_numero,
    'etiqueta', concat_ws(' · ', nullif(s.m_zona, ''), nullif(s.m_nota, ''))
  );
end $$;

-- Valida productos, opciones y extras y CALCULA los importes con precios de la BD.
-- p_items: [{producto_id, cantidad, opcion, extras:[id extra], nota}]
create or replace function casona_private.preparar_items(p_items jsonb, out lineas jsonb, out subtotal numeric, out piezas int)
language plpgsql set search_path = '' as $$
declare
  it        jsonb;
  p         record;
  v_cant    int;
  v_opcion  text;
  v_nota    text;
  v_pedidos int;
  v_extras  jsonb;
  v_ext_tot numeric;
  v_unit    numeric;
begin
  lineas := '[]'::jsonb; subtotal := 0; piezas := 0;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'pedido_vacio';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'demasiadas_lineas';
  end if;

  for it in select value from jsonb_array_elements(p_items) loop
    v_cant := (it->>'cantidad')::int;
    if v_cant is null or v_cant < 1 or v_cant > 50 then raise exception 'cantidad_invalida'; end if;

    select pr.id, pr.nombre, pr.precio, pr.activo, pr.disponible,
           c.titulo as cat_titulo, c.activa as cat_activa, c.opcion_valores
      into p
      from public.productos pr
      join public.categorias c on c.id = pr.categoria_id
     where pr.id = it->>'producto_id';

    if not found or not p.activo or not p.cat_activa then
      raise exception 'producto_no_existe:%', coalesce(it->>'producto_id', '');
    end if;
    if not p.disponible then
      raise exception 'producto_agotado:%', p.nombre;
    end if;

    v_opcion := coalesce(btrim(it->>'opcion'), '');
    if cardinality(p.opcion_valores) > 0 then
      if not (v_opcion = any (p.opcion_valores)) then raise exception 'falta_opcion:%', p.nombre; end if;
    else
      v_opcion := '';
    end if;

    v_nota := left(coalesce(btrim(it->>'nota'), ''), 140);

    if it ? 'extras' and jsonb_typeof(it->'extras') = 'array' and jsonb_array_length(it->'extras') > 0 then
      select count(distinct x.val) into v_pedidos from jsonb_array_elements_text(it->'extras') as x(val);
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nombre', e.nombre, 'precio', e.precio) order by e.orden, e.id), '[]'::jsonb),
             coalesce(sum(e.precio), 0)
        into v_extras, v_ext_tot
        from public.producto_extras e
       where e.producto_id = p.id and e.activo
         and e.id in (select x.val::bigint from jsonb_array_elements_text(it->'extras') as x(val));
      if jsonb_array_length(v_extras) <> v_pedidos then raise exception 'extra_invalido:%', p.nombre; end if;
    else
      v_extras := '[]'::jsonb; v_ext_tot := 0;
    end if;

    v_unit := p.precio + v_ext_tot;
    lineas := lineas || jsonb_build_array(jsonb_build_object(
      'producto_id', p.id, 'nombre', p.nombre, 'categoria', p.cat_titulo, 'cantidad', v_cant,
      'precio_unit', v_unit, 'opcion', v_opcion, 'extras', v_extras, 'nota', v_nota, 'importe', v_unit * v_cant));
    subtotal := subtotal + v_unit * v_cant;
    piezas := piezas + v_cant;
  end loop;
end $$;

-- Guarda las líneas calculadas de un pedido.
create or replace function casona_private.guardar_items(p_pedido uuid, p_lineas jsonb)
returns void language sql set search_path = '' as $$
  insert into public.pedido_items (pedido_id, producto_id, nombre, categoria, cantidad, precio_unit, opcion, extras, nota, importe)
  select p_pedido, l->>'producto_id', l->>'nombre', l->>'categoria', (l->>'cantidad')::int,
         (l->>'precio_unit')::numeric, l->>'opcion', l->'extras', l->>'nota', (l->>'importe')::numeric
    from jsonb_array_elements(p_lineas) l;
$$;

-- Convierte un error "codigo:detalle" en respuesta JSON.
create or replace function casona_private.error_json(p_msg text)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false,
    'motivo', split_part(p_msg, ':', 1),
    'detalle', case when position(':' in p_msg) > 0 then substr(p_msg, position(':' in p_msg) + 1) else '' end);
$$;

revoke all on function casona_private.verificar_sesion(uuid, text, boolean) from public;
revoke all on function casona_private.preparar_items(jsonb) from public;
revoke all on function casona_private.guardar_items(uuid, jsonb) from public;
revoke all on function casona_private.error_json(text) from public;

-- =============================================================================
-- 6. FUNCIONES PÚBLICAS (RPC) · cliente del menú
--    SECURITY DEFINER: hacen una sola cosa concreta y validan todo dentro.
-- =============================================================================

-- Escanear QR → abre una sesión temporal ligada a la mesa.
create or replace function public.mesa_abrir_sesion(p_mesa uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  m          public.mesas;
  cfg        public.config;
  v_secreto  text;
  v_id       uuid;
begin
  if p_mesa is null or p_token is null or char_length(p_token) > 64 then
    return jsonb_build_object('ok', false, 'motivo', 'invalido');
  end if;

  select * into m from public.mesas where id = p_mesa;
  if not found or m.token <> p_token then
    return jsonb_build_object('ok', false, 'motivo', 'invalido');
  end if;
  if not m.activa then
    return jsonb_build_object('ok', false, 'motivo', 'inactiva', 'numero', m.numero);
  end if;

  -- limpieza de sesiones viejas
  delete from casona_private.sesiones_mesa where iniciada_at < now() - interval '2 days';

  v_secreto := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into casona_private.sesiones_mesa (mesa_id, secreto_hash, qr_version)
  values (m.id, encode(sha256(convert_to(v_secreto, 'UTF8')), 'hex'), m.qr_version)
  returning id into v_id;

  select * into cfg from public.config where id = 1;

  return jsonb_build_object(
    'ok', true, 'sesion', v_id, 'secreto', v_secreto,
    'mesa_id', m.id, 'numero', m.numero,
    'etiqueta', concat_ws(' · ', nullif(m.zona, ''), nullif(m.nota, '')),
    'inactividad_min', coalesce(cfg.sesion_inactividad_min, 90),
    'max_horas', coalesce(cfg.sesion_max_horas, 4));
end $$;

-- Revalidar / mantener viva la sesión.
create or replace function public.mesa_estado_sesion(p_sesion uuid, p_secreto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  r := casona_private.verificar_sesion(p_sesion, p_secreto, true);
  return r || jsonb_build_object('ok', r->>'motivo' = 'ok');
end $$;

-- "Salir de la mesa".
create or replace function public.mesa_cerrar_sesion(p_sesion uuid, p_secreto text)
returns void language sql security definer set search_path = '' as $$
  update casona_private.sesiones_mesa
     set cerrada_at = now()
   where id = p_sesion and cerrada_at is null
     and secreto_hash = encode(sha256(convert_to(coalesce(p_secreto, ''), 'UTF8')), 'hex');
$$;

-- Pedido desde la mesa → estado "nuevo" (pantalla de cocina).
create or replace function public.crear_pedido_mesa(
  p_sesion uuid, p_secreto text, p_client_key uuid, p_items jsonb,
  p_nombre text default '', p_comentario text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v      jsonb;
  prep   record;
  ya     record;
  cfg    public.config;
  v_id   uuid;
  v_folio text;
begin
  if p_client_key is null then return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos'); end if;

  select id, folio, total into ya from public.pedidos where client_key = p_client_key;
  if found then
    return jsonb_build_object('ok', true, 'repetido', true, 'id', ya.id, 'folio', ya.folio, 'total', ya.total);
  end if;

  v := casona_private.verificar_sesion(p_sesion, p_secreto, true);
  if v->>'motivo' <> 'ok' then
    return jsonb_build_object('ok', false, 'motivo', v->>'motivo', 'numero', v->'numero');
  end if;

  select * into prep from casona_private.preparar_items(p_items);
  select * into cfg from public.config where id = 1;

  v_folio := 'M' || (v->>'numero') || '-'
          || to_char(now() at time zone coalesce(cfg.zona_horaria, 'America/Mexico_City'), 'HH24MI') || '-'
          || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 2));

  insert into public.pedidos (folio, client_key, modo, estado, mesa_id, mesa_numero, mesa_etiqueta, sesion_id,
                              entrega, cliente_nombre, comentario, num_productos, subtotal, envio, total)
  values (v_folio, p_client_key, 'mesa', 'nuevo', (v->>'mesa_id')::uuid, (v->>'numero')::int, coalesce(v->>'etiqueta', ''),
          p_sesion, 'mesa', left(coalesce(btrim(p_nombre), ''), 50), left(coalesce(btrim(p_comentario), ''), 140),
          prep.piezas, prep.subtotal, 0, prep.subtotal)
  returning id into v_id;

  perform casona_private.guardar_items(v_id, prep.lineas);

  return jsonb_build_object('ok', true, 'id', v_id, 'folio', v_folio, 'total', prep.subtotal,
                            'num_productos', prep.piezas, 'lineas', prep.lineas);
exception
  when raise_exception then
    return casona_private.error_json(sqlerrm);
  when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  when unique_violation then
    select id, folio, total into ya from public.pedidos where client_key = p_client_key;
    return jsonb_build_object('ok', true, 'repetido', true, 'id', ya.id, 'folio', ya.folio, 'total', ya.total);
end $$;

-- Pedido en línea (domicilio / recoger) → estado "por_confirmar".
-- p: {entrega, nombre, telefono, direccion, referencias, pago, paga_con, comentario, items}
create or replace function public.crear_pedido_linea(p_client_key uuid, p_folio text, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cfg      public.config;
  prep     record;
  ya       record;
  v_ent    text := coalesce(p->>'entrega', '');
  v_nom    text := left(coalesce(btrim(p->>'nombre'), ''), 50);
  v_tel    text := regexp_replace(coalesce(p->>'telefono', ''), '\D', '', 'g');
  v_dir    text := left(coalesce(btrim(p->>'direccion'), ''), 200);
  v_ref    text := left(coalesce(btrim(p->>'referencias'), ''), 120);
  v_pago   text := coalesce(p->>'pago', '');
  v_con    numeric := 0;
  v_envio  numeric;
  v_total  numeric;
  v_folio  text;
  v_id     uuid;
begin
  if p_client_key is null or p is null then return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos'); end if;

  select id, folio, total into ya from public.pedidos where client_key = p_client_key;
  if found then
    return jsonb_build_object('ok', true, 'repetido', true, 'id', ya.id, 'folio', ya.folio, 'total', ya.total);
  end if;

  v_con := coalesce(nullif(regexp_replace(coalesce(p->>'paga_con', ''), '[^0-9.]', '', 'g'), '')::numeric, 0);

  select * into cfg from public.config where id = 1;
  if not found or not cfg.pedidos_linea_activos then return jsonb_build_object('ok', false, 'motivo', 'linea_cerrada'); end if;

  if length(v_tel) = 12 and v_tel like '52%' then v_tel := substr(v_tel, 3); end if;
  if length(v_tel) = 13 and v_tel like '521%' then v_tel := substr(v_tel, 4); end if;

  if v_ent not in ('domicilio', 'recoger') or (v_ent = 'recoger' and not cfg.recoger_en_sucursal) then
    return jsonb_build_object('ok', false, 'motivo', 'entrega_invalida');
  end if;
  if char_length(v_nom) < 2 then return jsonb_build_object('ok', false, 'motivo', 'falta_nombre'); end if;
  if v_tel !~ '^[0-9]{10}$' then return jsonb_build_object('ok', false, 'motivo', 'telefono_invalido'); end if;
  if v_ent = 'domicilio' and char_length(v_dir) < 6 then return jsonb_build_object('ok', false, 'motivo', 'falta_direccion'); end if;
  if not (v_pago = any (cfg.pagos)) then return jsonb_build_object('ok', false, 'motivo', 'pago_invalido'); end if;

  -- freno anti-spam
  if (select count(*) from public.pedidos where cliente_telefono = v_tel and created_at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_pedidos');
  end if;
  if (select count(*) from public.pedidos where modo = 'linea' and created_at > now() - interval '10 minutes') >= 60 then
    return jsonb_build_object('ok', false, 'motivo', 'saturado');
  end if;

  select * into prep from casona_private.preparar_items(p->'items');
  v_envio := case when v_ent = 'domicilio' then cfg.envio_domicilio else 0 end;
  v_total := prep.subtotal + v_envio;
  if v_pago <> 'Efectivo' or v_con < v_total then v_con := 0; end if;

  v_folio := case when p_folio ~ '^LC-[0-9]{4}-[A-Z0-9]{3}$' then p_folio
             else 'LC-' || to_char(now() at time zone coalesce(cfg.zona_horaria, 'America/Mexico_City'), 'HH24MI') || '-'
                  || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 3)) end;

  insert into public.pedidos (folio, client_key, modo, estado, entrega, cliente_nombre, cliente_telefono, direccion,
                              referencias, pago, paga_con, comentario, num_productos, subtotal, envio, total)
  values (v_folio, p_client_key, 'linea', 'por_confirmar', v_ent, v_nom, v_tel,
          case when v_ent = 'domicilio' then v_dir else '' end,
          case when v_ent = 'domicilio' then v_ref else '' end,
          v_pago, v_con, left(coalesce(btrim(p->>'comentario'), ''), 140),
          prep.piezas, prep.subtotal, v_envio, v_total)
  returning id into v_id;

  perform casona_private.guardar_items(v_id, prep.lineas);

  return jsonb_build_object('ok', true, 'id', v_id, 'folio', v_folio, 'subtotal', prep.subtotal,
                            'envio', v_envio, 'total', v_total);
exception
  when raise_exception then
    return casona_private.error_json(sqlerrm);
  when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  when unique_violation then
    select id, folio, total into ya from public.pedidos where client_key = p_client_key;
    return jsonb_build_object('ok', true, 'repetido', true, 'id', ya.id, 'folio', ya.folio, 'total', ya.total);
end $$;

-- =============================================================================
-- 7. FUNCIONES PÚBLICAS (RPC) · administración de mesas (solo admin)
-- =============================================================================
create or replace function public.mesas_crear(p_desde int, p_hasta int, p_zona text default '')
returns int language plpgsql security definer set search_path = '' as $$
declare v_lo int; v_hi int; v_n int;
begin
  if not casona_private.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  v_lo := least(p_desde, coalesce(p_hasta, p_desde));
  v_hi := greatest(p_desde, coalesce(p_hasta, p_desde));
  if v_lo is null or v_lo < 1 or v_hi > 999 then raise exception 'rango_invalido' using errcode = '22023'; end if;
  if v_hi - v_lo > 99 then raise exception 'maximo_100_mesas' using errcode = '22023'; end if;

  insert into public.mesas (numero, zona)
  select g, left(coalesce(btrim(p_zona), ''), 30) from generate_series(v_lo, v_hi) g
  on conflict (numero) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Genera un código nuevo: el QR impreso anterior deja de funcionar y las sesiones abiertas se cierran.
create or replace function public.mesa_nuevo_qr(p_mesa uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.mesas;
begin
  if not casona_private.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  update public.mesas
     set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
         qr_version = qr_version + 1
   where id = p_mesa
  returning * into m;
  if not found then raise exception 'mesa_no_existe' using errcode = 'P0002'; end if;
  update casona_private.sesiones_mesa set cerrada_at = now() where mesa_id = p_mesa and cerrada_at is null;
  return jsonb_build_object('id', m.id, 'token', m.token, 'qr_version', m.qr_version);
end $$;

-- Permisos de ejecución (Supabase da EXECUTE a todos por defecto: se quita y se concede lo justo).
revoke all on function public.mesa_abrir_sesion(uuid, text)                        from public, anon, authenticated;
revoke all on function public.mesa_estado_sesion(uuid, text)                       from public, anon, authenticated;
revoke all on function public.mesa_cerrar_sesion(uuid, text)                       from public, anon, authenticated;
revoke all on function public.crear_pedido_mesa(uuid, text, uuid, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.crear_pedido_linea(uuid, text, jsonb)                from public, anon, authenticated;
revoke all on function public.mesas_crear(int, int, text)                          from public, anon, authenticated;
revoke all on function public.mesa_nuevo_qr(uuid)                                  from public, anon, authenticated;

grant execute on function public.mesa_abrir_sesion(uuid, text)                        to anon, authenticated;
grant execute on function public.mesa_estado_sesion(uuid, text)                       to anon, authenticated;
grant execute on function public.mesa_cerrar_sesion(uuid, text)                       to anon, authenticated;
grant execute on function public.crear_pedido_mesa(uuid, text, uuid, jsonb, text, text) to anon, authenticated;
grant execute on function public.crear_pedido_linea(uuid, text, jsonb)                to anon, authenticated;
grant execute on function public.mesas_crear(int, int, text)                          to authenticated;
grant execute on function public.mesa_nuevo_qr(uuid)                                  to authenticated;

-- =============================================================================
-- 8. TIEMPO REAL para la pantalla de cocina (respeta RLS: solo staff recibe cambios)
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedidos') then
    execute 'alter publication supabase_realtime add table public.pedidos';
  end if;
end $$;

-- Fila de configuración (sin datos comerciales inventados: teléfono y WhatsApp vacíos).
insert into public.config (id) values (1) on conflict (id) do nothing;

commit;

-- Listo. Siguiente: 02_menu_inicial.sql
select 'OK · La Casona instalada' as resultado;
