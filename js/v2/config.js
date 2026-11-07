/* ==========================================================================
   LA CASONA · MENÚ V2 · VALORES DE RESPALDO
   Cuando Supabase está conectado (js/cloud.js), estos datos se REEMPLAZAN
   por los de la tabla "config" (se editan en carta.html → Datos del restaurante).
   Solo se usan si la base de datos aún no está conectada o no responde.
   ========================================================================== */
window.CASONA_CONFIG = {
  restaurante: 'La Casona',
  telefono: '',                 // ⚠ PENDIENTE: se captura en carta.html
  whatsapp: '',                 // ⚠ PENDIENTE: solo dígitos, ej. 5213312345678
  envioDomicilio: 35,
  recogerEnSucursal: true,
  pagos: ['Efectivo', 'Tarjeta', 'Transferencia'],
  sesionInactividadMin: 90,
  sesionMaxHoras: 4,
  /* 'cocina' → pedidos de mesa a la pantalla de cocina (Supabase)
     'whatsapp' → pedidos de mesa por WhatsApp */
  pedidosMesaVan: 'cocina'
};
