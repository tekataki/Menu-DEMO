# La Casona · Guía de instalación del backend (Supabase)

Tiempo aproximado: **15 minutos**. Solo vas a copiar y pegar.
El orden importa: haz los pasos de arriba hacia abajo.

> Pegar la clave **no** crea las tablas. Primero corres los SQL (pasos 3 a 6) y al final conectas la página (paso 7).

---

## Paso 1 · Crear el proyecto
1. Entra a <https://supabase.com> e inicia sesión.
2. Haz clic en **New project**.
3. Nombre: `la-casona`. Región: la más cercana a México (por ejemplo *East US* o *West US*).
4. Escribe una **Database Password** y guárdala en un lugar seguro. **Nunca** va en la página web.
5. Haz clic en **Create new project** y espera de 1 a 2 minutos.

## Paso 2 · Copiar la URL y la clave pública
1. En tu proyecto, haz clic en el botón **Connect** (arriba). También puedes ir a **Project Settings → API Keys / Data API**.
2. Copia estos dos datos en un bloc de notas:
   - **Project URL**, por ejemplo `https://abcdxyz.supabase.co`
   - **Publishable key** (empieza con `sb_publishable_`). Si solo ves claves "legacy", usa la **anon public**.
3. ⚠️ **No copies** la *secret key* ni la *service_role*. Esas dan control total. Si las pegas, la página las rechaza.

## Paso 3 · Instalar la base de datos
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre `supabase/01_instalar.sql`, copia **todo** y pégalo.
3. Haz clic en **Run**. Al final debe salir: `OK · La Casona instalada`.
   - Si Supabase avisa que la consulta tiene operaciones "destructivas", acepta. Solo se refiere a los `drop policy if exists` que permiten repetir el archivo; **no se borran datos**.

## Paso 4 · Cargar la carta
1. **New query** → pega todo `supabase/02_menu_inicial.sql` → **Run**.
2. Debe salir `14 · 101 · 2` (categorías · productos · extras).

## Paso 5 · Crear tu cuenta de administrador
1. Menú izquierdo → **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña, y marca **Auto Confirm User**. Haz clic en **Create user**.
3. **SQL Editor → New query** → pega `supabase/03_primer_admin.sql`.
4. Cambia `correo@ejemplo.com` por tu correo y `Nombre de la persona` por tu nombre → **Run**.
5. Debe aparecer tu fila con rol `admin`.
   - Para cocina: repite el paso con otro correo y cambia `'admin'` por `'cocina'`.

## Paso 6 · Probar la seguridad
1. **New query** → pega `supabase/04_pruebas_seguridad.sql` → **Run**.
2. Revisa la tabla de resultados: **todo debe decir OK**.
3. Usa una mesa temporal (la 999) y dos pedidos de prueba, y los borra al terminar. Si Supabase avisa de operaciones "destructivas", acepta: solo borra esos datos de prueba.

## Paso 7 · Conectar la página (único lugar)
1. Abre `js/cloud.js`.
2. Pega tus datos entre las comillas:
   ```js
   const SUPABASE_URL = 'https://abcdxyz.supabase.co';
   const SUPABASE_PUBLIC_KEY = 'sb_publishable_xxxxxxxx';
   ```
3. Guarda. No hay que editar ningún otro archivo ni compilar nada.

## Paso 8 · Configurar las direcciones de inicio de sesión
Supabase → **Authentication → URL Configuration**:
- **Site URL:** la dirección pública de tu menú, por ejemplo `https://tu-dominio.com`.
- **Redirect URLs:** agrega `https://tu-dominio.com/**`. Sirve para el correo de "Olvidé mi contraseña".

Recomendado en **Authentication → Sign In / Providers → Email**: desactiva **Allow new users to sign up**. Así solo el administrador crea cuentas.

## Paso 9 · Verificar que todo funciona
1. Abre `carta.html` → entra con tu correo → captura el **teléfono** y el **WhatsApp** → **Guardar datos**.
2. Abre `mesas.html` → **Crear mesas 1 a 15**.
3. En **Dirección del menú en los QR**, escribe la dirección pública definitiva de `menuV2.html` → **Guardar**.
4. En una mesa, toca **Probar**: el menú debe abrir como **Mesa N**.
5. Agrega un platillo → **Enviar a cocina**.
6. Abre `cocina.html` en otra pestaña o pantalla: el pedido aparece **solo, sin recargar**.
7. Recarga todo: el pedido sigue ahí, porque ya está guardado en Supabase.
8. Imprime los QR con **Imprimir todas**.

---

## ¿Qué archivo se corre cuántas veces?
| Archivo | Cuándo | ¿Se puede repetir? |
|---|---|---|
| `01_instalar.sql` | Una vez al inicio y cada vez que haya una versión nueva | Sí. No borra datos |
| `02_menu_inicial.sql` | Una vez | Sí. Solo agrega lo que falte y **no** pisa tus cambios de precios |
| `03_primer_admin.sql` | Una vez por persona del equipo | Sí |
| `04_pruebas_seguridad.sql` | Cuando quieras comprobar permisos | Sí. Borra sus datos de prueba al terminar |

## Seguridad: cómo está protegido
- La **clave pública** puede estar en el navegador. Por sí sola **no da permisos**: los decide la base de datos con **RLS** (qué filas) y **GRANT** (qué columnas y operaciones).
- **Visitantes:** pueden ver la carta y los datos públicos del restaurante. **No** pueden leer mesas, códigos QR, pedidos ni clientes.
- **Pedidos:** nadie los inserta directo. Pasan por funciones del servidor que:
  - validan que cada platillo exista y esté disponible;
  - toman el **precio de la base de datos**, no el del navegador;
  - calculan envío y total;
  - evitan duplicados (`client_key`);
  - limitan el spam (máximo 5 pedidos por teléfono cada 15 minutos).
- **QR de mesa:** el código solo lo ve un admin. Al escanearlo se abre una **sesión temporal** guardada en un esquema privado. Esa sesión caduca:
  - por inactividad o por la duración máxima;
  - si desactivas la mesa;
  - si generas un **QR nuevo**.
- **Equipo:** los roles (`admin` / `cocina`) se asignan **solo por SQL**. Nadie puede darse permisos a sí mismo desde la web.
- La pantalla de acceso de los paneles solo ordena la interfaz. Aunque alguien la salte, el servidor no le entrega datos sin un rol válido.

## Si algo falla
| Ves esto | Solución |
|---|---|
| "Conecta la base de datos" | Falta el paso 7 o la URL o la clave están mal escritas |
| "Correo o contraseña incorrectos" | Revisa la cuenta en Authentication → Users |
| "Tu cuenta no tiene permiso" | Corre `03_primer_admin.sql` con ese correo |
| El QR dice "no es válido" | Se generó un QR nuevo para esa mesa: imprime el nuevo |
| Cocina no se actualiza sola | Supabase → Database → Publications → `supabase_realtime` debe incluir `pedidos`. Mientras tanto la pantalla se actualiza cada 30 s |
| "Pegaste una clave SECRETA" | Bórrala de `cloud.js` ya y, por seguridad, rótala en Supabase → API Keys |
