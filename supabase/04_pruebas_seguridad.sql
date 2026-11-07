-- =============================================================================
--  LA CASONA · 04_pruebas_seguridad.sql   (v3)
--  Comprueba los permisos REALES de la base de datos, haciéndose pasar por:
--    · visitante sin sesión (anon)
--    · usuario con cuenta pero SIN permiso de equipo
--    · admin (usa el primer admin de la tabla staff; corre 03 antes)
--
--  Cómo funciona: crea una función TEMPORAL (desaparece al cerrar el editor)
--  que hace todas las pruebas y devuelve la tabla de resultados.
--  No crea tablas auxiliares. Usa una mesa temporal (la 999) y 2 pedidos de
--  prueba y los BORRA al final. Si algo falla, Supabase deshace todo solo.
--
--  Pegar COMPLETO → Run. Si avisa de operaciones "destructivas", acepta:
--  solo borra los datos de prueba. Todo debe decir OK.
-- =============================================================================

-- Restos de versiones anteriores de esta prueba (si existen).
drop table if exists casona_private._r, casona_private._v;

create or replace function pg_temp.casona_pruebas()
returns table (n bigint, quien text, prueba text, resultado text)
language plpgsql as $fn$
declare
  res        jsonb := '[]'::jsonb;   -- [[quien, prueba, resultado], ...]
  v_mesa     uuid;
  v_token    text;
  v_prod     text;
  v_precio   numeric;
  v_envio    numeric;
  v_admin    uuid;
  v_sesion   uuid;
  v_secreto  text;
  v_clave    uuid := gen_random_uuid();
  v_ped_mesa uuid;
  v_ped_lin  uuid;
  r          jsonb;
  r2         jsonb;
  c          int;
begin
  -- ---------------------------------------------------------------- PREPARAR
  delete from public.pedidos where mesa_id in (select id from public.mesas where numero = 999 and zona = 'PRUEBA');
  delete from public.mesas where numero = 999 and zona = 'PRUEBA';
  if exists (select 1 from public.mesas where numero = 999) then
    raise exception 'Ya existe una mesa 999 real. Cámbiale el número temporalmente en mesas.html y vuelve a correr la prueba.';
  end if;

  insert into public.mesas (numero, zona) values (999, 'PRUEBA') returning id, token into v_mesa, v_token;

  select p.id, p.precio into v_prod, v_precio
    from public.productos p join public.categorias ca on ca.id = p.categoria_id
   where p.activo and p.disponible and ca.activa and cardinality(ca.opcion_valores) = 0
   order by p.id limit 1;
  if v_prod is null then raise exception 'La carta está vacía: corre primero 02_menu_inicial.sql'; end if;

  select envio_domicilio into v_envio from public.config where id = 1;
  select user_id into v_admin from public.staff where rol = 'admin' and activo order by created_at limit 1;

  -- ======================================================= VISITANTE (anon)
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);

  begin
    perform 1 from public.mesas limit 1;
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer mesas (códigos QR)', 'FALLA: pudo leer'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer mesas (códigos QR)', 'OK'));
  end;

  begin
    perform 1 from casona_private.sesiones_mesa limit 1;
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer sesiones de mesa', 'FALLA: pudo leer'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer sesiones de mesa', 'OK'));
  end;

  begin
    perform 1 from public.pedidos limit 1;
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer pedidos (datos de clientes)', 'FALLA: pudo leer'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer pedidos (datos de clientes)', 'OK'));
  end;

  begin
    perform 1 from public.staff limit 1;
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer el equipo', 'FALLA: pudo leer'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede leer el equipo', 'OK'));
  end;

  select count(*) into c from public.productos;
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Sí puede leer la carta',
    case when c > 0 then 'OK (' || c || ' productos)' else 'FALLA: no ve la carta' end));

  begin
    update public.productos set precio = 1 where id = v_prod;
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede cambiar precios', 'FALLA: pudo cambiar'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede cambiar precios', 'OK'));
  end;

  begin
    insert into public.pedidos (folio, client_key, modo, entrega, total) values ('X', gen_random_uuid(), 'linea', 'recoger', 0);
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede insertar pedidos directo (sin validar)', 'FALLA: pudo insertar'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede insertar pedidos directo (sin validar)', 'OK'));
  end;

  begin
    perform public.mesas_crear(500, 501, '');
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede crear mesas', 'FALLA: pudo crear'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('visitante', 'No puede crear mesas', 'OK'));
  end;

  r := public.mesa_abrir_sesion(v_mesa, 'codigo-falso');
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'QR con código falso es rechazado',
    case when r->>'motivo' = 'invalido' then 'OK' else 'FALLA: ' || r::text end));

  r := public.mesa_abrir_sesion(v_mesa, v_token);
  v_sesion := (r->>'sesion')::uuid;
  v_secreto := r->>'secreto';
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'QR correcto abre sesión de mesa',
    case when (r->>'ok')::boolean and (r->>'numero')::int = 999 then 'OK' else 'FALLA: ' || r::text end));

  r := public.crear_pedido_mesa(v_sesion, 'secreto-falso', gen_random_uuid(),
       jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 1)), '', '');
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Pedido de mesa con secreto falso es rechazado',
    case when r->>'motivo' = 'invalida' then 'OK' else 'FALLA: ' || r::text end));

  r := public.crear_pedido_mesa(v_sesion, v_secreto, v_clave,
       jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 2, 'precio', 1)), 'Prueba', '');
  v_ped_mesa := (r->>'id')::uuid;
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Pedido de mesa válido llega a cocina con precio del servidor',
    case when (r->>'ok')::boolean and (r->>'total')::numeric = 2 * v_precio
         then 'OK (total ' || (r->>'total') || ')' else 'FALLA: ' || r::text end));

  r2 := public.crear_pedido_mesa(v_sesion, v_secreto, v_clave,
        jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 2)), 'Prueba', '');
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Reintentar el mismo pedido no lo duplica',
    case when (r2->>'repetido')::boolean and r2->>'id' = r->>'id' then 'OK' else 'FALLA: ' || r2::text end));

  r := public.crear_pedido_mesa(v_sesion, v_secreto, gen_random_uuid(),
       jsonb_build_array(jsonb_build_object('producto_id', 'no-existe', 'cantidad', 1)), '', '');
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Producto inventado es rechazado',
    case when r->>'motivo' = 'producto_no_existe' then 'OK' else 'FALLA: ' || r::text end));

  r := public.crear_pedido_linea(gen_random_uuid(), 'LC-1200-ABC', jsonb_build_object(
       'entrega', 'domicilio', 'nombre', 'Prueba', 'telefono', '3312345678', 'direccion', 'Calle Prueba 123', 'pago', 'Tarjeta',
       'items', jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 1, 'precio', 0))));
  v_ped_lin := (r->>'id')::uuid;
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Pedido en línea: total = precio BD + envío (ignora precios del navegador)',
    case when (r->>'ok')::boolean and (r->>'total')::numeric = v_precio + v_envio
         then 'OK (total ' || (r->>'total') || ')' else 'FALLA: ' || r::text end));

  r := public.crear_pedido_linea(gen_random_uuid(), null, jsonb_build_object(
       'entrega', 'domicilio', 'nombre', 'Prueba', 'telefono', '123', 'direccion', 'Calle Prueba 123', 'pago', 'Tarjeta',
       'items', jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 1))));
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Pedido en línea con teléfono inválido es rechazado',
    case when r->>'motivo' = 'telefono_invalido' then 'OK' else 'FALLA: ' || r::text end));

  -- desactivar la mesa como dueño y volver a intentar como visitante
  execute 'reset role';
  update public.mesas set activa = false where id = v_mesa;
  perform set_config('role', 'anon', true);

  r := public.crear_pedido_mesa(v_sesion, v_secreto, gen_random_uuid(),
       jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'cantidad', 1)), '', '');
  res := res || jsonb_build_array(jsonb_build_array('visitante', 'Mesa desactivada ya no acepta pedidos',
    case when r->>'motivo' = 'inactiva' then 'OK' else 'FALLA: ' || r::text end));

  -- ============================================ CUENTA SIN PERMISO DE EQUIPO
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into c from public.pedidos;
  res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No ve pedidos',
    case when c = 0 then 'OK' else 'FALLA: ve ' || c end));

  select count(*) into c from public.mesas;
  res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No ve mesas ni códigos QR',
    case when c = 0 then 'OK' else 'FALLA: ve ' || c end));

  begin
    update public.config set whatsapp = '0000000000' where id = 1;
    get diagnostics c = row_count;
    res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No puede cambiar el WhatsApp del restaurante',
      case when c = 0 then 'OK' else 'FALLA: cambió' end));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No puede cambiar el WhatsApp del restaurante', 'OK'));
  end;

  begin
    insert into public.staff (user_id, rol) values (auth.uid(), 'admin');
    res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No puede hacerse admin a sí misma', 'FALLA: se hizo admin'));
  exception when insufficient_privilege or foreign_key_violation then
    res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No puede hacerse admin a sí misma', 'OK'));
  end;

  begin
    perform public.mesa_nuevo_qr(v_mesa);
    res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No puede regenerar QR', 'FALLA: pudo'));
  exception when insufficient_privilege then
    res := res || jsonb_build_array(jsonb_build_array('cuenta sin permiso', 'No puede regenerar QR', 'OK'));
  end;

  -- ================================================================== ADMIN
  execute 'reset role';
  if v_admin is null then
    res := res || jsonb_build_array(jsonb_build_array('admin', '(pruebas de admin)', 'PENDIENTE: no hay admin, corre 03_primer_admin.sql'));
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select count(*) into c from public.mesas where id = v_mesa;
    res := res || jsonb_build_array(jsonb_build_array('admin', 'Ve las mesas', case when c = 1 then 'OK' else 'FALLA' end));

    select count(*) into c from public.pedidos where id = v_ped_mesa;
    res := res || jsonb_build_array(jsonb_build_array('admin', 'Ve los pedidos', case when c = 1 then 'OK' else 'FALLA' end));

    update public.pedidos set estado = 'preparando' where id = v_ped_mesa;
    get diagnostics c = row_count;
    res := res || jsonb_build_array(jsonb_build_array('admin', 'Cambia el estado de un pedido', case when c = 1 then 'OK' else 'FALLA' end));

    begin
      update public.pedidos set total = 0 where id = v_ped_mesa;
      res := res || jsonb_build_array(jsonb_build_array('admin', 'No puede alterar el total de un pedido', 'FALLA: pudo'));
    exception when insufficient_privilege then
      res := res || jsonb_build_array(jsonb_build_array('admin', 'No puede alterar el total de un pedido', 'OK'));
    end;

    r := public.mesa_nuevo_qr(v_mesa);
    res := res || jsonb_build_array(jsonb_build_array('admin', 'Regenera el QR de una mesa',
      case when (r->>'qr_version')::int >= 2 then 'OK' else 'FALLA' end));

    execute 'reset role';
  end if;

  -- ================================================================ LIMPIEZA
  perform set_config('request.jwt.claims', '', true);
  delete from public.pedidos where id in (v_ped_mesa, v_ped_lin);
  delete from public.mesas where id = v_mesa;      -- borra también sus sesiones de prueba

  return query
    select e.ord, e.val->>0, e.val->>1, e.val->>2
      from jsonb_array_elements(res) with ordinality as e(val, ord)
     order by e.ord;
end
$fn$;

-- RESULTADOS (todo debe decir OK)
select * from pg_temp.casona_pruebas();
