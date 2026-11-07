-- =============================================================================
--  LA CASONA · 03_primer_admin.sql
--  Da permisos de ADMIN (o COCINA) a una cuenta que YA creaste en
--  Supabase → Authentication → Users → Add user → Create new user
--  (marca "Auto Confirm User").
--
--  1) Cambia el correo y el nombre de abajo.
--  2) Run.  Puedes repetirlo para cada persona del equipo.
--
--  Roles:
--    'admin'  → mesas y QR, carta (precios / agotados), datos del restaurante y cocina
--    'cocina' → solo la pantalla de cocina (ver pedidos y cambiar su estado)
--
--  Nadie puede darse permisos a sí mismo desde la web: solo se asignan aquí.
-- =============================================================================

insert into public.staff (user_id, nombre, rol, activo)
select u.id, 'Nombre de la persona', 'admin', true          -- ← nombre y rol
  from auth.users u
 where lower(u.email) = lower('correo@ejemplo.com')          -- ← correo de la cuenta
on conflict (user_id) do update
  set nombre = excluded.nombre, rol = excluded.rol, activo = true;

-- Comprueba: debe aparecer la persona. Si sale vacío, el correo no existe en Auth.
select s.nombre, s.rol, s.activo, u.email
  from public.staff s join auth.users u on u.id = s.user_id
 order by s.created_at;


-- ----------------------------------------------------------------------------
--  Quitarle el acceso a alguien (descomenta, cambia el correo y ejecuta):
-- ----------------------------------------------------------------------------
-- update public.staff set activo = false
--  where user_id = (select id from auth.users where lower(email) = lower('correo@ejemplo.com'));
