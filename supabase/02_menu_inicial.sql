-- =============================================================================
--  LA CASONA · 02_menu_inicial.sql
--  Carga la carta ACTUAL (14 categorías · 101 productos), idéntica al menú
--  original: mismos nombres, precios y orden. Ejecutar UNA vez, después de
--  01_instalar.sql.
--
--  Es seguro repetirlo: "on conflict do nothing" NO pisa los cambios que hayas
--  hecho después desde el panel (carta.html). Solo agrega lo que falte.
--  Los IDs (ej. 'cortes-3') son los mismos que usa el menú web, así las fotos
--  de cada categoría se siguen enlazando solas.
-- =============================================================================

begin;

insert into public.categorias (id, titulo, orden, opcion_titulo, opcion_valores) values
  ('entradas',     'Entradas',      1, null, '{}'),
  ('ensaladas',    'Ensaladas',     2, null, '{}'),
  ('pastas',       'Pastas',        3, null, '{}'),
  ('mariscos',     'Mariscos',      4, null, '{}'),
  ('aves',         'Aves',          5, null, '{}'),
  ('cortes',       'Cortes',        6, 'Término de la carne', array['Rojo','Medio','Tres cuartos','Bien cocido']),
  ('hamburguesas', 'Hamburguesas',  7, null, '{}'),
  ('pizzas',       'Pizzas',        8, null, '{}'),
  ('tostadas',     'Tostadas',      9, null, '{}'),
  ('bebidas',      'Bebidas',      10, null, '{}'),
  ('cerveza',      'Cerveza',      11, null, '{}'),
  ('cocteleria',   'Coctelería',   12, null, '{}'),
  ('postres',      'Postres',      13, null, '{}'),
  ('cafe',         'Café',         14, null, '{}')
on conflict (id) do nothing;

insert into public.productos (id, categoria_id, nombre, precio, orden) values
  -- Entradas
  ('entradas-1',  'entradas', 'Aguachile de Arrachera', 265, 1),
  ('entradas-2',  'entradas', 'Aguachile tatemado de camarón', 249, 2),
  ('entradas-3',  'entradas', 'Tostada de Aguachile de camarón', 65, 3),
  ('entradas-4',  'entradas', 'Chicharrón de Arrachera', 255, 4),
  ('entradas-5',  'entradas', 'Costillas de cerdo a la BBQ', 195, 5),
  ('entradas-6',  'entradas', 'Panela Asada', 175, 6),
  ('entradas-7',  'entradas', 'Champiñones al ajillo', 155, 7),
  ('entradas-8',  'entradas', 'Orden de chorizo argentino', 155, 8),
  ('entradas-9',  'entradas', 'Orden de Chistorra', 155, 9),
  ('entradas-10', 'entradas', 'Orden de Alitas', 160, 10),
  ('entradas-11', 'entradas', 'Orden de papas a la francesa', 100, 11),
  ('entradas-12', 'entradas', 'Orden de Aros de Cebolla', 100, 12),
  ('entradas-13', 'entradas', 'Orden de papas Gajo', 125, 13),
  ('entradas-14', 'entradas', 'Orden de papas camote', 125, 14),
  ('entradas-15', 'entradas', 'Panela al ajonjolí', 210, 15),
  ('entradas-16', 'entradas', 'Panela al mole', 210, 16),
  ('entradas-17', 'entradas', 'Tostadas de atún', 175, 17),
  ('entradas-18', 'entradas', 'Buñuelos de camarón', 165, 18),
  ('entradas-19', 'entradas', 'Tostadas italiana', 166, 19),
  ('entradas-20', 'entradas', 'Orden de guacamole', 95, 20),
  ('entradas-21', 'entradas', 'Tacos de aguachile', 255, 21),
  -- Ensaladas
  ('ensaladas-1', 'ensaladas', 'Ensalada Mediana', 135, 1),
  ('ensaladas-2', 'ensaladas', 'Ensalada Grande', 150, 2),
  -- Pastas
  ('pastas-1', 'pastas', 'Lasagna', 200, 1),
  ('pastas-2', 'pastas', 'Pasta Arrabiata', 195, 2),
  ('pastas-3', 'pastas', 'Pasta a la carbonara', 165, 3),
  ('pastas-4', 'pastas', 'Pasta al pesto', 165, 4),
  ('pastas-5', 'pastas', 'Pasta Alfredo', 155, 5),
  ('pastas-6', 'pastas', 'Pasta con salsa pomodoro', 155, 6),
  ('pastas-7', 'pastas', 'Pasta al aguacate', 155, 7),
  ('pastas-8', 'pastas', 'Affumicata', 225, 8),
  ('pastas-9', 'pastas', 'Pasta queso azul', 165, 9),
  -- Mariscos
  ('mariscos-1', 'mariscos', 'Pulpo adobado al grill', 389, 1),
  ('mariscos-2', 'mariscos', 'Pulpo zarandeado', 399, 2),
  ('mariscos-3', 'mariscos', 'Camarones en adobo negro', 285, 3),
  ('mariscos-4', 'mariscos', 'Camarones al ajillo', 275, 4),
  ('mariscos-5', 'mariscos', 'Camarones zarandeados', 285, 5),
  ('mariscos-6', 'mariscos', 'Salmón a la antigua', 389, 6),
  ('mariscos-7', 'mariscos', 'Salmón en salsa de champiñones', 375, 7),
  ('mariscos-8', 'mariscos', 'Pulpo enmolado', 399, 8),
  -- Aves
  ('aves-1', 'aves', 'Pechuga de pollo al grill', 275, 1),
  ('aves-2', 'aves', 'Pechuga de pollo al mole', 289, 2),
  ('aves-3', 'aves', 'Pechuga en salsa de champiñones', 289, 3),
  ('aves-4', 'aves', 'Pechuga de pollo en salsa alfredo', 289, 4),
  ('aves-5', 'aves', 'Pechuga al limón', 289, 5),
  -- Cortes
  ('cortes-1', 'cortes', 'Corte T-Bone', 495, 1),
  ('cortes-2', 'cortes', 'Corte Cowboy', 510, 2),
  ('cortes-3', 'cortes', 'Corte Rib Eye', 395, 3),
  ('cortes-4', 'cortes', 'Corte New York', 389, 4),
  ('cortes-5', 'cortes', 'Corte de Arrachera', 355, 5),
  ('cortes-6', 'cortes', 'Parrillada para 2 personas', 545, 6),
  ('cortes-7', 'cortes', 'Arrachera palacio', 335, 7),
  -- Hamburguesas
  ('hamburguesas-1',  'hamburguesas', 'Hamburguesa de Res', 155, 1),
  ('hamburguesas-2',  'hamburguesas', 'Hamburguesa de Pollo', 155, 2),
  ('hamburguesas-3',  'hamburguesas', 'Hamburguesa de Cerdo', 155, 3),
  ('hamburguesas-4',  'hamburguesas', 'Hamburguesa de Camarón', 175, 4),
  ('hamburguesas-5',  'hamburguesas', 'Hamburguesa de Arrachera', 180, 5),
  ('hamburguesas-6',  'hamburguesas', 'Hamburguesa Argentina', 185, 6),
  ('hamburguesas-7',  'hamburguesas', 'Hamburguesa Española', 180, 7),
  ('hamburguesas-8',  'hamburguesas', 'Hamburguesa Azteca', 190, 8),
  ('hamburguesas-9',  'hamburguesas', 'Hamburguesa Especial', 200, 9),
  ('hamburguesas-10', 'hamburguesas', 'Hot Dog Argentino', 100, 10),
  ('hamburguesas-11', 'hamburguesas', 'Hot Dog', 80, 11),
  ('hamburguesas-12', 'hamburguesas', 'Hamburguesa enmolada', 195, 12),
  -- Pizzas
  ('pizzas-1', 'pizzas', 'Pizza de la casa', 275, 1),
  ('pizzas-2', 'pizzas', 'Pizza Piacenza', 275, 2),
  ('pizzas-3', 'pizzas', 'Pizza Ancona', 295, 3),
  ('pizzas-4', 'pizzas', 'Pizza de peperoni', 195, 4),
  ('pizzas-5', 'pizzas', 'Pizza de champiñones', 195, 5),
  ('pizzas-6', 'pizzas', 'Pizza Hawaiana', 195, 6),
  ('pizzas-7', 'pizzas', 'Pizza Margarita', 195, 7),
  -- Tostadas
  ('tostadas-1', 'tostadas', 'TOSTADAS', 85, 1),
  ('tostadas-2', 'tostadas', 'TACOS DORADOS', 95, 2),
  ('tostadas-3', 'tostadas', 'Ingrediente extra', 65, 3),
  -- Bebidas
  ('bebidas-1', 'bebidas', 'AGUA FRESCA', 45, 1),
  ('bebidas-2', 'bebidas', 'LIMONADA', 45, 2),
  ('bebidas-3', 'bebidas', 'NARANJADA', 45, 3),
  ('bebidas-4', 'bebidas', 'Piñada', 78, 4),
  ('bebidas-5', 'bebidas', 'GRANIZADO', 78, 5),
  -- Cerveza
  ('cerveza-1', 'cerveza', 'Miller', 48, 1),
  ('cerveza-2', 'cerveza', 'ARTESANAL COLOMBO', 80, 2),
  ('cerveza-3', 'cerveza', 'ARTESANAL COLIMITA', 85, 3),
  ('cerveza-4', 'cerveza', 'BOHEMIA', 55, 4),
  -- Coctelería
  ('cocteleria-1', 'cocteleria', 'Mezcal de frutos rojos', 135, 1),
  ('cocteleria-2', 'cocteleria', 'CLERICOT', 125, 2),
  ('cocteleria-3', 'cocteleria', 'Amanecer en Oaxaca', 135, 3),
  ('cocteleria-4', 'cocteleria', 'Tequila piña asada', 135, 4),
  ('cocteleria-5', 'cocteleria', 'Piña colada', 135, 5),
  ('cocteleria-6', 'cocteleria', 'Mojito', 135, 6),
  ('cocteleria-7', 'cocteleria', 'Gin & Tonic', 145, 7),
  -- Postres
  ('postres-1', 'postres', 'Volcán de chocolate', 95, 1),
  ('postres-2', 'postres', 'Pay de frutos rojos', 95, 2),
  ('postres-3', 'postres', 'Tarta de elote', 105, 3),
  ('postres-4', 'postres', 'Flan napolitano', 80, 4),
  -- Café
  ('cafe-1', 'cafe', 'Café americano', 50, 1),
  ('cafe-2', 'cafe', 'Café cappuccino', 60, 2),
  ('cafe-3', 'cafe', 'Chocolate', 60, 3),
  ('cafe-4', 'cafe', 'Chai', 65, 4),
  ('cafe-5', 'cafe', 'Matcha', 65, 5),
  ('cafe-6', 'cafe', 'Dirty chai', 80, 6),
  ('cafe-7', 'cafe', 'Dirty matcha', 80, 7)
on conflict (id) do nothing;

-- Extra con costo de Tostadas y Tacos dorados (igual que el menú actual).
insert into public.producto_extras (producto_id, nombre, precio, orden) values
  ('tostadas-1', 'Ingrediente extra', 65, 1),
  ('tostadas-2', 'Ingrediente extra', 65, 1)
on conflict (producto_id, nombre) do nothing;

commit;

select (select count(*) from public.categorias) as categorias,
       (select count(*) from public.productos)  as productos,
       (select count(*) from public.producto_extras) as extras;
-- Esperado: 14 · 101 · 2
