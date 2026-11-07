/* LA CASONA · MENÚ V2 · CONTENIDO
   14 categorías · 101 productos. Nombres, precios y orden idénticos al menú original.
   - options: elección obligatoria sin costo (ej. término de la carne).
   - extras:  complementos con costo que el cliente puede marcar. */
(() => {
  const A = 'assets/menu/';
  const p = (src, w, h, alt) => ({ src: A + src, w, h, alt });
  const I = (name, price, more) => Object.assign({ name, price }, more || {});
  const EXTRA_TOSTADA = { extras: [{ name: 'Ingrediente extra', price: 65 }] };
  const TERMINO = { label: 'Término de la carne', choices: ['Rojo', 'Medio', 'Tres cuartos', 'Bien cocido'] };

  window.CASONA_MENU = [
    { id: 'entradas', title: 'Entradas', feature: true,
      icon: null,
      photos: [p('entradas-plato.webp', 1536, 1499, 'Composición gastronómica de entradas sobre un plato negro')],
      promo: { photo: p('entradas-promo-foto.webp', 1036, 1518, 'Fotografía editorial de entradas con vegetales y hierbas'), title: 'Entradas', lines: ['Frescas, crujientes,', 'irresistibles.'] },
      items: [
        I('Aguachile de Arrachera', 265), I('Aguachile tatemado de camarón', 249), I('Tostada de Aguachile de camarón', 65),
        I('Chicharrón de Arrachera', 255), I('Costillas de cerdo a la BBQ', 195), I('Panela Asada', 175),
        I('Champiñones al ajillo', 155), I('Orden de chorizo argentino', 155), I('Orden de Chistorra', 155),
        I('Orden de Alitas', 160), I('Orden de papas a la francesa', 100), I('Orden de Aros de Cebolla', 100),
        I('Orden de papas Gajo', 125), I('Orden de papas camote', 125), I('Panela al ajonjolí', 210),
        I('Panela al mole', 210), I('Tostadas de atún', 175), I('Buñuelos de camarón', 165),
        I('Tostadas italiana', 166), I('Orden de guacamole', 95), I('Tacos de aguachile', 255)
      ] },
    { id: 'ensaladas', title: 'Ensaladas', icon: p('icon-ensaladas.webp', 1448, 1086, ''),
      photos: [p('ensalada-bowl.webp', 1348, 1167, 'Bowl de ensalada con hojas verdes y vegetales')],
      items: [I('Ensalada Mediana', 135), I('Ensalada Grande', 150)] },
    { id: 'pastas', title: 'Pastas', icon: p('icon-pastas.webp', 1448, 1086, ''),
      photos: [p('pastas-franja.webp', 1536, 810, 'Pasta dorada con hierbas, imagen editorial')],
      items: [
        I('Lasagna', 200), I('Pasta Arrabiata', 195), I('Pasta a la carbonara', 165), I('Pasta al pesto', 165),
        I('Pasta Alfredo', 155), I('Pasta con salsa pomodoro', 155), I('Pasta al aguacate', 155), I('Affumicata', 225), I('Pasta queso azul', 165)
      ] },
    { id: 'mariscos', title: 'Mariscos', icon: p('icon-mariscos.webp', 1536, 1024, ''),
      photos: [p('mariscos-grill.webp', 1536, 795, 'Mariscos al grill con limón')],
      items: [
        I('Pulpo adobado al grill', 389), I('Pulpo zarandeado', 399), I('Camarones en adobo negro', 285), I('Camarones al ajillo', 275),
        I('Camarones zarandeados', 285), I('Salmón a la antigua', 389), I('Salmón en salsa de champiñones', 375), I('Pulpo enmolado', 399)
      ] },
    { id: 'aves', title: 'Aves', icon: p('icon-aves.webp', 1448, 1086, ''),
      photos: [p('aves-pollo.webp', 1085, 1450, 'Pollo a la parrilla con limón y hierbas')],
      items: [
        I('Pechuga de pollo al grill', 275), I('Pechuga de pollo al mole', 289), I('Pechuga en salsa de champiñones', 289),
        I('Pechuga de pollo en salsa alfredo', 289), I('Pechuga al limón', 289)
      ] },
    { id: 'cortes', title: 'Cortes', icon: p('icon-cortes.webp', 1448, 1086, ''), options: TERMINO,
      photos: [p('cortes-parrilla.webp', 1863, 844, 'Cortes de carne asada con guarnición')],
      items: [
        I('Corte T-Bone', 495), I('Corte Cowboy', 510), I('Corte Rib Eye', 395), I('Corte New York', 389),
        I('Corte de Arrachera', 355), I('Parrillada para 2 personas', 545), I('Arrachera palacio', 335)
      ] },
    { id: 'hamburguesas', title: 'Hamburguesas', icon: p('icon-hamburguesas.webp', 1448, 1086, ''),
      photos: [p('hamburguesa-foto.webp', 1589, 989, 'Hamburguesa en una composición editorial')],
      items: [
        I('Hamburguesa de Res', 155), I('Hamburguesa de Pollo', 155), I('Hamburguesa de Cerdo', 155), I('Hamburguesa de Camarón', 175),
        I('Hamburguesa de Arrachera', 180), I('Hamburguesa Argentina', 185), I('Hamburguesa Española', 180), I('Hamburguesa Azteca', 190),
        I('Hamburguesa Especial', 200), I('Hot Dog Argentino', 100), I('Hot Dog', 80), I('Hamburguesa enmolada', 195)
      ] },
    { id: 'pizzas', title: 'Pizzas', icon: p('icon-pizzas.webp', 1536, 1024, ''),
      photos: [p('pizza-foto.webp', 1010, 1558, 'Pizza con ingredientes rojos y verdes')],
      items: [
        I('Pizza de la casa', 275), I('Pizza Piacenza', 275), I('Pizza Ancona', 295), I('Pizza de peperoni', 195),
        I('Pizza de champiñones', 195), I('Pizza Hawaiana', 195), I('Pizza Margarita', 195)
      ] },
    { id: 'tostadas', title: 'Tostadas', icon: p('icon-tostadas.webp', 1448, 1086, ''),
      photos: [p('tostadas-foto.webp', 1628, 966, 'Tostadas con vegetales y crema')],
      items: [I('TOSTADAS', 85, EXTRA_TOSTADA), I('TACOS DORADOS', 95, EXTRA_TOSTADA), I('Ingrediente extra', 65)] },
    { id: 'bebidas', title: 'Bebidas', icon: p('icon-bebidas.webp', 1272, 1236, ''),
      photos: [p('bebidas-frescas.webp', 1538, 1023, 'Bebidas frescas con hielo y hojas verdes')],
      items: [I('AGUA FRESCA', 45), I('LIMONADA', 45), I('NARANJADA', 45), I('Piñada', 78), I('GRANIZADO', 78)] },
    { id: 'cerveza', title: 'Cerveza', icon: p('icon-cerveza.webp', 1374, 1145, ''),
      photos: [p('cerveza-foto.webp', 1728, 910, 'Vasos y copas de cerveza ámbar')],
      items: [I('Miller', 48), I('ARTESANAL COLOMBO', 80), I('ARTESANAL COLIMITA', 85), I('BOHEMIA', 55)] },
    { id: 'cocteleria', title: 'Coctelería', icon: p('icon-cocteleria.webp', 1448, 1086, ''),
      photos: [p('cocteleria-foto.webp', 1333, 1180, 'Cóctel rojo en copa sobre fondo oscuro')],
      items: [
        I('Mezcal de frutos rojos', 135), I('CLERICOT', 125), I('Amanecer en Oaxaca', 135), I('Tequila piña asada', 135),
        I('Piña colada', 135), I('Mojito', 135), I('Gin & Tonic', 145)
      ] },
    { id: 'postres', title: 'Postres', icon: p('icon-postres.webp', 1448, 1086, ''),
      photos: [p('postres-foto.webp', 1429, 1101, 'Postre de chocolate acompañado de helado')],
      items: [I('Volcán de chocolate', 95), I('Pay de frutos rojos', 95), I('Tarta de elote', 105), I('Flan napolitano', 80)] },
    { id: 'cafe', title: 'Café', icon: p('icon-cafe.webp', 1448, 1086, ''),
      photos: [p('cafe-foto.webp', 1254, 1254, 'Taza de café sobre un platillo')],
      items: [
        I('Café americano', 50), I('Café cappuccino', 60), I('Chocolate', 60), I('Chai', 65),
        I('Matcha', 65), I('Dirty chai', 80), I('Dirty matcha', 80)
      ] }
  ];
})();
