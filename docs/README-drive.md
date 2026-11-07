# La Casona · Menú digital + QR de mesa + cocina (Supabase)

Menú editorial de La Casona con dos formas de pedir y su backend en **Supabase**. La arquitectura es la misma que la de Intensity: una sola capa `js/cloud.js` conectada con la URL y la clave pública.

## Páginas
| Archivo | Para quién | Qué hace |
|---|---|---|
| `menuV2.html` | Clientes | Carta, carrito, pedido en mesa (QR) y pedido en línea (WhatsApp) |
| `menuV2.html?mesa=<id>&k=<código>` | Cliente en mesa | Lo abre el QR: inicia una sesión temporal ligada a esa mesa |
| `cocina.html` | Equipo (admin / cocina) | Comandas en tiempo real: confirmar → preparar → listo → entregado |
| `mesas.html` | Admin | Crear mesas o rangos, activar o desactivar, nuevo QR, imprimir tarjetas QR |
| `carta.html` | Admin | Precios, agotados u ocultos, teléfono, WhatsApp, envío, pagos y duración de la sesión |
| `menudelacasona.html` | — | Menú original (referencia, sin cambios) |

## Portada y tarjeta de pedido (menuV2)
- **Cielo según la hora local:** de 6:30 a 17:30 es de día (sol con rayos y golondrinas), de 17:30 a 20:00 es atardecer (sol que se esconde, tonos durazno) y el resto es de noche (luna, estrellas y luciérnagas). El color del logo, el papel y el saludo cambian con el cielo. Para probar cada uno: `menuV2.html?cielo=dia|tarde|noche`.
- **Patio botánico en SVG (`js/v2/patio.js`):** las ilustraciones van en estilo risografía: color desfasado bajo una línea de tinta. Se dibujan a la medida de cada pantalla y con semilla fija, así que salen igual en cada visita.
  - **Alero:** jazmín que cuelga arriba a la izquierda.
  - **Tallo de "La":** el filete después de "La" es un tallo de hojas del que cuelga bugambilia sobre "ona".
  - **Flores en las letras:** un ramo dentro de la "C", un brote en la última "a" y una ramita después de "pedir hoy?".
  - **Jardinera:** flores silvestres que crecen detrás de la base de "Casona", sobre una línea de suelo.
  - **Profundidad y movimiento:** sombras de palmas en la pared, pétalos que caen, y pasto con flores al pie de la fachada, junto a las macetas.
  - Los colores de flores, hojas y sombras cambian con el cielo (variables `--bloom`, `--leaf`, `--shade`… en `css/menu-v2.css`).
  - Las ramas colgantes se mecen y los pétalos caen. Todo se pausa cuando la portada sale de la pantalla, y queda quieto con "reducir movimiento".
  - Símbolos que usa, en `menuV2.html`: `d-bloom`, `d-bloom2`, `d-leaf`, `d-leaf2`, `d-daisy`, `d-bud`, `d-berry`, `d-pot`, `d-agave`, `d-bush`, `d-bird`.
  - El volumen de "Casona" se hace con dos copias desfasadas (`::before` / `::after`), no con `text-shadow`: a ese tamaño de letra, `text-shadow` atoraba el dibujado en celulares.
- **Pedido en línea:** dos tarjetas en arco con escena animada (moto a domicilio / bolsa para recoger), precio claro y un resumen debajo que cambia según la opción elegida.
- **Pedido en mesa:** sello festoneado con el número de mesa y texto que gira, pasos con íconos animados, un aviso simple de privacidad y el botón "Salir de la mesa".
- Se quitaron la cinta superior, la cejilla "Menú N.º 02" y los datos de la portada (14 categorías…).

## Instalación
Sigue **`supabase/GUIA-INSTALACION.md`** (paso a paso, solo copiar y pegar). Resumen:
1. `supabase/01_instalar.sql` crea tablas, seguridad y funciones.
2. `supabase/02_menu_inicial.sql` carga la carta actual: 14 categorías, 101 productos.
3. `supabase/03_primer_admin.sql` da permisos al primer administrador.
4. `supabase/04_pruebas_seguridad.sql` comprueba los permisos (todo debe salir OK).
5. Pega la **Project URL** y la **publishable / anon key** en `js/cloud.js`. Es el único lugar.

## Arquitectura
```
navegador ── js/vendor/supabase-js-2.57.4.js (copia local fija)
          └─ js/cloud.js  ← ÚNICA conexión (URL + clave pública)
               ├─ menuV2   → getMenu · mesa.abrir/estado/cerrar · pedidos.mesa/linea
               ├─ cocina   → cocina.list/setEstado/subscribe (Realtime)
               ├─ mesas    → mesas.list/crear/actualizar/nuevoQR/borrar
               └─ carta    → carta.* · config.*
Supabase: PostgreSQL + RLS + funciones RPC + Auth (equipo) + Realtime (cocina)
```
- Sin build y sin archivos con hash: editar `js/cloud.js` afecta directamente a lo que se sirve.
- Si `cloud.js` no está configurado, el menú funciona con la carta local (`js/v2/menu-data.js`) y con los pedidos por WhatsApp. El pedido en mesa muestra el aviso "aún no disponible".
- La carta de Supabase se combina con las fotos e íconos locales por **id de categoría**. Los ids de los productos son los mismos (`cortes-3`, …).
- La carta queda en caché en el navegador 7 días, por si Supabase no responde.

## Modelo de datos (Supabase)
| Tabla | Contenido | Quién lee / escribe |
|---|---|---|
| `config` (1 fila) | teléfono, WhatsApp, envío, pagos, tiempos de sesión | todos leen · admin edita |
| `categorias`, `productos`, `producto_extras` | la carta (precio `numeric`, `disponible`, `activo`) | todos leen lo activo · admin edita |
| `mesas` | número, zona, nota, activa, **token del QR**, versión | **solo admin** |
| `casona_private.sesiones_mesa` | sesiones temporales (secreto en hash) | nadie por API, solo funciones |
| `pedidos` + `pedido_items` | pedidos con copia de nombre y precio al momento | staff lee y **solo cambia `estado`** |
| `staff` | cuentas del equipo y rol `admin` / `cocina` | se asigna solo por SQL |

Funciones RPC: `mesa_abrir_sesion`, `mesa_estado_sesion`, `mesa_cerrar_sesion`, `crear_pedido_mesa`, `crear_pedido_linea` (públicas, validan todo), `mesas_crear` y `mesa_nuevo_qr` (solo admin).

## Reglas de la sesión de mesa
- Escanear el QR valida el código en el servidor y abre una sesión temporal.
- La sesión caduca:
  - tras X minutos sin uso (90 por defecto);
  - al llegar a la duración máxima (4 h por defecto);
  - si la mesa se desactiva;
  - si se genera un QR nuevo;
  - si el cliente toca "Salir de la mesa".
- Escanear el QR de otra mesa cambia la sesión a esa mesa.
- Sin sesión de mesa, el menú abre en modo **pedido en línea**.

## Datos guardados en el navegador (localStorage)
- `casonaV2.cart`: carrito.
- `casonaV2.sesionMesa`: sesión de mesa.
- `casonaV2.cliente` / `casonaV2.fulfil`: datos de entrega.
- `casona.menuCache.v1`: caché de la carta.
- `casona.auth`: sesión del equipo.
- `casona.qrBase`: dirección de los QR.

## Pendientes
- **Teléfono y WhatsApp reales** de La Casona: se capturan en `carta.html`.
- **Decidir quién administra** (Soma o el restaurante): se crean las cuentas con `03_primer_admin.sql`.
- Llenar y revisar legalmente `docs/AVISO-PRIVACIDAD-BORRADOR.md`.
- Publicar la página e imprimir los QR con la dirección definitiva.
- Próximo: CRM (clientes y pedidos históricos) usando las mismas tablas `pedidos`.

## Nota sobre datos anteriores
Las tablas de la vista previa de Genspark (`mesas`, `mesas_qr`, `pedidos`) ya no se usan. Se conservaron sin borrar. Las mesas se crean de nuevo en Supabase desde `mesas.html`, con QR nuevos.
