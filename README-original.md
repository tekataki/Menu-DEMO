# Menú de La Casona · standalone para pulido visual

## Abrir y trabajar

Descomprime el ZIP completo y abre `menudelacasona.html` conservando las carpetas contiguas. Es un sitio estático sin instalación, compilación, CDN, backend, API ni base de datos. El menú no necesita fetch para funcionar; el JSON es solo una copia documental.

```text
menu/
├── menudelacasona.html
├── css/editorial-menu.css
├── js/menu-calibration.js
├── js/editorial-menu.js
├── fonts/                  # Anton, Barlow Condensed, Caveat y licencias OFL
├── assets/menu/            # 29 imágenes WebP originales
├── content.json            # Copia documental de nombres, precios y notas
└── README.md
```

Esta es una extracción del menú actual, **no un rediseño**. Mantiene las 14 categorías, 101 platos y bebidas, precios y tres anotaciones de origen, con ortografía y orden originales. Conserva el índice de categorías, el diseño editorial de escritorio, la composición móvil y la fachada completa en móvil. No se incluyen el hero, el marquee ni otras secciones del restaurante.

CSS y JavaScript se mantienen en archivos separados para facilitar el trabajo. Son copias del componente de la web, sin alteración. El HTML incorpora únicamente las reglas base heredadas que necesita el menú. Las fotos y fuentes son copias de los originales, no capturas del menú ni imágenes regeneradas.

## Guía para el rediseño

> Pule visualmente este menú de La Casona, conservando todos los nombres, precios, orden, 14 categorías, 101 platos/bebidas y las tres notas de origen. Mantén el contenido como HTML seleccionable y las imágenes originales independientes. No inventes información comercial ni fotografías. Trabaja la composición, tipografía, espaciado y legibilidad en escritorio, tablet y móvil; conserva navegación accesible y no recortes fotos ni fachada en móvil. No añadas CRM, pedidos, checkout, backend o servicios externos. Devuelve el HTML y todos los archivos modificados, con rutas relativas y sin dependencias fuera de esta carpeta. Conserva, cuando sea posible, `#menu-digital`, los IDs de categorías y las clases `dm-*` para facilitar su futura integración.

- El modelo de composición tipográfica está en `js/menu-calibration.js`.
- El controlador de imágenes y del índice está en `js/editorial-menu.js`.
- `content.json` permite comprobar el texto, pero editarlo por sí solo **no cambia** el HTML.
- No eliminar las notas «Referencia del menú digital público · precios por confirmar 2/3/4» sin una decisión del propietario.
- La propuesta se trabajará aparte. La web principal no se cambia hasta recibir y aprobar su reintegración.

## Descarga

En el proyecto, `descargar.html` prepara `menu-la-casona-standalone.zip` en el navegador. Incluye los 41 archivos de trabajo anteriores, no las herramientas de descarga ni material de referencia ajeno. El ZIP usa almacenamiento sin recomprimir (las imágenes ya son WebP) y verificación CRC32. No se suben archivos del visitante ni se usa almacenamiento persistente.

Para generar el ZIP abre la página de descarga desde la previsualización HTTP del proyecto. Una vez descomprimido, el menú no depende de esa página ni del servidor. Si el navegador bloquea la descarga dentro del editor, abre `descargar.html` en una pestaña independiente.

Sin despliegue ni URL pública nueva. La verificación se realiza en Chromium por HTTP; no equivale a una prueba en un teléfono físico ni certifica el comportamiento `file://` en todos los navegadores.
