# La Casona · Menú digital + QR de mesa + cocina (Supabase)

## Frontend · Sello QR y portada aislada

### Animaciones pulidas instaladas: Entrega v2 y Pasos Mesa v4
- Fuentes del usuario, conservadas sin modificar en `docs/referencias/Entrega La Casona v2.html` y `docs/referencias/Pasos Mesa La Casona v4.html`. Sus snapshots locales de ejecución están en `assets/ui/entrega-v2.html` y `assets/ui/pasos-mesa-v4.html`.
- **`menuV2.html`** ahora usa las escenas detalladas de Entrega v2 (moto, paquete/casa, bolsa con cara, campana y plantas) y, solo en modo mesa, los tres pasos v4 con la ficha que viaja entre plato, ticket y campana. Los pasos de pedido en línea «Elige / Tus datos / WhatsApp» se conservan.
- Integración: `js/v2/polished-ui.js` carga una vez cada snapshot local y extrae únicamente el componente, CSS y controlador de animación; no incorpora el body, márgenes de preview, enlaces de Google Fonts ni otros elementos del standalone. El CSS se limita a `.casona-delivery-v2` y `.casona-steps-v4`; se aíslan los nombres genéricos que colisionaban con animaciones existentes y se usan las fuentes locales originales.
- `css/polished-ui.css` adapta exclusivamente el encaje en la tarjeta actual y desactiva las animaciones antiguas dentro de los componentes nuevos. No cambia portada, sello transparente, carta, precios de productos ni bienvenida.
- Se conserva la selección de entrega, se conecta el evento `fulfilchange` a la función de pedidos existente y se mantiene navegación por teclado. El precio de envío procede de la configuración real, no del $35 de demostración. Se respeta la configuración que permite ocultar recogida.
- Los controladores mantienen pausas fuera de pantalla/pestaña y movimiento reducido del original. Al cambiar o volver a dibujar el modo se cancelan reloj, animaciones, observadores y listeners anteriores. No se acumulan hojas de estilo ni controladores. Si falla la descarga local, queda la interfaz anterior sin alterar registros.
- Pruebas: `tests/polished-ui.html` y `tests/polished-delivery.html` ejecutan el menú real con backend y almacenamiento solo en memoria, encuadrando la tarjeta para QA. Verifican coincidencia de los trazos SVG con los archivos aportados, selección por clic/teclado, importe configurado, resumen, conservación del carrito y sesión, salida/remontaje, limpieza de animaciones y ausencia de estilos duplicados. Los dibujos de pasos se comprueban tras desplazarse hasta ellos, porque su entrada se activa al entrar en pantalla. Ambos modos se revisaron visualmente en escritorio y móvil.
- No se cambió Supabase, autenticación, validación QR ni claves de almacenamiento; no hubo operaciones sobre datos ni despliegue. Las pruebas frontend no equivalen a validar pedidos reales contra Supabase. Los standalone de trabajo anteriores se conservan como referencias; no se sobrescribieron.

### Sello aportado por el usuario
- Original sin modificar: `docs/referencias/Bienvenida Mesa QR.html`.
- Se extrajo **solo el sello animado, con fondo transparente**, a `js/v2/mesa-stamp.js` y `css/mesa-stamp.css`. Se excluyeron el fondo negro, el ticket/papel, sus líneas y metadatos, y la sombra del soporte. No hay marco, borde, fondo ni recuadro alrededor del SVG. No se importaron bienvenida, configurador, botones, enlaces ni lógica del standalone al menú.
- Sustituye el sello circular anterior en la tarjeta de mesa de `menuV2.html`, una vez que la aplicación entra en modo mesa. Se conserva el resto de la tarjeta, los pasos y «Salir de la mesa».
- Se mantienen dibujos, filtros, colores, curvas y tiempos del sello (1,8 s + 0,2 s). Se ajustó el viewBox para encuadrar solo la animación y se recuperaron el tamaño cuadrado y la ubicación del sello anterior. El número viene de la sesión existente; la fecha dentro de la impresión usa `startedAt`. El ajuste de textos largos procede del original. Se conserva intacto el standalone aportado como referencia.
- Anton usa la fuente local del proyecto; Space Mono se carga de Google Fonts como en el original aportado. La animación se inicia al entrar en pantalla, una vez cargadas las fuentes, y respeta movimiento reducido.
- No se cambió la validación QR, Supabase, autenticación, expiración, almacenamiento ni pedidos. No se hicieron operaciones sobre datos ni despliegues.

### Standalone para mejorar visualmente la portada
- Abrir **`inicio-menu-standalone.html`** desde la vista previa HTTP. Incluye solo «¿Qué deseas pedir hoy? · La Casona», sus SVG botánicos, sombras y los tres cielos; sin fachada, carta, carrito, sesión ni backend.
- Esta copia está aislada del menú real: `css/portada-standalone.css`, `js/portada-standalone.js` y `js/portada-patio-standalone.js`. No se ha rediseñado la portada.
- El selector permite revisar día, atardecer y noche. También admite `?cielo=dia|tarde|noche`.
- Pulsar **«Descargar HTML con fuentes incluidas»** genera **`Inicio La Casona.html`**, un único archivo autocontenido (~1,13 MB), con CSS, JavaScript, SVG, textura y las siete fuentes locales incrustadas. La versión descargada no lleva los controles de trabajo ni depende de internet o archivos vecinos. Las fuentes se incluyen en el archivo, no en la base de datos.
- Para editar fuentes/estilos antes de descargar, trabajar en los archivos de la copia. Abrir directamente la copia fuente con `file://` no permite exportar por las restricciones de fetch del navegador: exportar primero desde la vista previa HTTP y luego abrir el archivo descargado sin conexión.

### Standalones de tarjetas de entrega y pasos de mesa
- **`entrega-standalone.html`**: únicamente las tarjetas originales «A domicilio / Te lo llevamos a tu casa / Envío / +$35» y «Paso por él / Lo recoges en La Casona / Sin costo / $0», con sus escenas SVG, animaciones y selección visual por clic o teclado. El importe $35 está fijado solo en esta copia, no cambia la configuración del menú.
- **`pasos-mesa-standalone.html`**: únicamente los pasos animados originales «1 Elige / toca + en lo que se te antoje», «2 Revisa / abre tu pedido abajo», «3 Envía / llega directo a la cocina».
- Sin rediseño ni modificaciones a `menuV2.html`, sus scripts, el sello o la portada. No incluyen bienvenida, pedidos, cuentas, backend ni almacenamiento.
- Recursos de estas copias: `css/ui-standalone.css` y `js/ui-standalone-export.js`. Los SVG están en los HTML. El CSS conserva las reglas y keyframes de los componentes originales; solo se añade espacio de trabajo sin tarjeta/marco alrededor.
- Desde la vista previa HTTP, pulsar **«Descargar HTML con fuentes incluidas»** en cada copia. Se obtienen **`Entrega La Casona.html`** (~441 KB) y **`Pasos Mesa La Casona.html`** (~436 KB): dos HTML autocontenidos, cada uno con sus cuatro fuentes, CSS, SVG e interacción necesaria. No incluyen la herramienta de descarga ni scripts de analítica del alojamiento. Los archivos descargados funcionan sin conexión y sin archivos vecinos; para generarlos, abrir las copias fuente por HTTP, no `file://`.
- Verificación visual en escritorio y móvil de ambas copias; prueba en `tests/ui-standalone.html` de textos, precios, coincidencia de los SVG con los originales, selección/teclado, animaciones y botones de descarga. Las dos exportaciones se probaron con CSP que bloquea conexiones externas, fuentes incrustadas y ausencia de desbordamiento. No se ha desplegado ni creado una URL pública nueva.

### Comprobaciones
- `menuV2.html` e `inicio-menu-standalone.html`: sin errores JS; revisión visual de la portada y del sello en escritorio y móvil.
- `tests/mesa-render.html`: carga el HTML y scripts reales del menú con nube simulada y almacenamiento **solo en memoria**, sin tocar registros del navegador ni servidores. Comprueba mesa 12, sustitución del sello, fin de animación, transparencia, ausencia de ticket/fondo/marco y conservación del botón de salida. Compara el SVG del sello (excluyendo el soporte eliminado) y sus cuatro keyframes con el original aportado. Para encuadrar la tarjeta en las capturas, solo esta prueba oculta la portada previa; el menú de producción no cambia.
- `tests/portada-export.html`: comprueba el HTML exportado bajo CSP que bloquea toda conexión externa, carga de fuentes incrustadas, SVG botánicos, cielos, ausencia de desbordamiento y botón de descarga. Se revisó el resultado exportado en escritorio y móvil.
- Son pruebas frontend con sesión simulada; **no certifican un escaneo QR real contra Supabase ni publican estos cambios**. No hay URL pública nueva.

## Importación y acuerdo de trabajo · 2026-11-07

- Origen: https://drive.google.com/drive/folders/1cM73OGyaps9xX9-cDj7n9xDx-KAm_cyh (carpeta «Menú y Sistemas»).
- Se importaron los **69 archivos** del listado completo accesible: 5 HTML, 12 JavaScript, 3 CSS, 29 WebP, 7 fuentes, 3 licencias TXT, 4 SQL, 4 Markdown, 1 JSON y 1 SVG. El listado habitual de Drive solo mostraba los primeros 50; se contrastó con la vista incrustada completa.
- La descarga inicial devolvió HTTP 303. Se reintentó con descarga directa de `drive.usercontent.google.com` y se comprobó la lectura de los 69 archivos locales, incluidos formatos WebP y WOFF2.
- Drive contenía los archivos al mismo nivel. Se reconstruyeron las rutas indicadas por los HTML, CSS y documentación: `css/`, `js/`, `js/v2/`, `js/vendor/`, `fonts/`, `assets/menu/`, `assets/v2/`, `supabase/` y `docs/`. No se cambió el contenido del código ni de los recursos.
- El README descargado se conserva íntegro en `docs/README-drive.md`; `README-original.md` también se conserva tal como venía.
- **Forma de trabajo:** el asistente actuará principalmente como implementador del código que proporcione el usuario y creará HTMLs standalone cuando se le solicite. No rediseñar ni añadir funcionalidades por iniciativa propia.
- Entradas: `menuV2.html` (menú actual), `menudelacasona.html` (menú standalone de referencia), `cocina.html`, `mesas.html` y `carta.html`. No se añadió `index.html` ni una redirección.
- Verificación: los 69 archivos se pudieron leer por HTTP en la vista previa; `menuV2.html` no produjo errores en consola y se revisó visualmente en escritorio y móvil. También se revisó el renderizado de `menudelacasona.html` en escritorio. Sus notas de precios por confirmar ya pertenecen al original y se conservaron.
- Almacenamiento: se conserva el diseño existente de Supabase y las claves de localStorage descritas abajo. **No se ejecutó SQL, no se conectó ni migró una base de datos y no se modificaron registros.** La importación del código no importa datos de producción de Supabase ni datos de otro navegador.
- Publicación: no se realizó despliegue ni se generó una URL pública nueva. Las comprobaciones fueron en vista previa y no certifican autenticación, pedidos ni funcionamiento del backend.
- Próximo trabajo: esperar el código o las instrucciones del usuario; la configuración y prueba integral del backend quedan fuera de esta importación.

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
- **Pedido en mesa:** sello de madera e impresión roja aportados por el usuario (ver sección de frontend), número real de mesa, pasos con íconos animados, un aviso simple de privacidad y el botón "Salir de la mesa".
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
