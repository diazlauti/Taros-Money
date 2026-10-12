# Taros Money

App mobile-friendly, instalable como PWA, para ver y cargar gastos/ingresos/
cuentas/metas. Multiusuario real: cada persona entra con su propia cuenta de
Google y la app le crea (o abre) su propia planilla de Google Sheets, sin
compartir datos con nadie más. No hay backend propio ni base de datos: la
app llama directo a la API de Apps Script (`scripts.run`), autenticada con
el token OAuth de quien está logueado.

Hay DOS proyectos de Apps Script, a propósito separados:

- **"Taros Money API"** — toda la lógica que usa esta app (gastos, ingresos,
  cuentas, metas, suscripciones). Sin nada de Gmail, para que el permiso que
  pide el login sea sólo Sheets/Drive, no la bandeja de entrada de nadie.
- El proyecto que lee los mails del banco (ej. "Gastos Lauti") — aparte,
  atado a la cuenta de quien lo usa, con su propio trigger automático. No lo
  toca esta app.

## 1. Google Cloud: proyecto OAuth

1. [console.cloud.google.com](https://console.cloud.google.com) → creá un
   proyecto (o reusá uno existente).
2. APIs y servicios → Biblioteca → habilitá **Google Apps Script API**.
3. APIs y servicios → Pantalla de consentimiento de OAuth → Externo → nombre
   de la app, tu mail como contacto → en **Usuarios de prueba** agregá el
   mail de cada persona que va a entrar (mientras la app esté en modo
   "Prueba", sin verificar por Google, sólo esos mails pueden loguearse).
4. Credenciales → Crear credenciales → ID de cliente de OAuth → tipo
   **Aplicación web** → en "Orígenes de JavaScript autorizados" agregá la
   URL de Netlify de producción y `http://localhost:5173` (para desarrollo
   local). Guardá el **Client ID**.

## 2. Apps Script: "Taros Money API"

1. [script.new](https://script.new) → pegá el contenido de
   `taros-money-api.gs` (el código del backend multiusuario — pedíselo a
   quien mantiene este repo si no lo tenés a mano).
2. Configuración del proyecto (engranaje) → sección GCP → vinculá el mismo
   número de proyecto del paso 1.
3. Implementar → Nueva implementación → ícono de engranaje → **Ejecutable
   de API** → acceso **"Cualquier persona que tenga una Cuenta de Google"**.
4. Copiá el **ID de secuencia de comandos** (Script ID), en Configuración
   del proyecto.

## 3. Variables de entorno

Copiá `.env.example` a `.env` y completá:

```
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
VITE_APPS_SCRIPT_ID=...
```

## 4. Desarrollo local

```
npm install
npm run dev
```

## 5. Deploy en Netlify

1. Conectá este repo en Netlify (New site from Git).
2. Build command: `npm run build` — Publish directory: `dist` (ya está en
   `netlify.toml`).
3. Site settings > Environment variables: cargá `VITE_GOOGLE_CLIENT_ID` y
   `VITE_APPS_SCRIPT_ID`.
4. Deploy. Para instalarla en el celu: abrí el sitio en Chrome/Safari — al
   tener manifest + service worker (vite-plugin-pwa), el navegador ofrece
   instalarla sola, o usá "Agregar a pantalla de inicio" a mano.

## Sumar gente nueva

Agregá su mail como "Usuario de prueba" en la pantalla de consentimiento de
OAuth (paso 1.3) — sin eso, Google le va a mostrar un error de acceso
aunque tenga el link. Después sólo tiene que entrar y tocar "Iniciar sesión
con Google"; la app le crea su planilla sola la primera vez.

## Cómo está armada

- `src/auth.js` — login con Google (Google Identity Services): pide un
  Access Token con los scopes de Sheets/Drive, lo guarda en `localStorage`
  con su vencimiento, y lo renueva solo sin mostrar nada cuando puede
  (`intentarSesionSilenciosa`).
- `src/api.js` — llama a cada función del backend por nombre a través de
  `scripts.run` (`https://script.googleapis.com/v1/scripts/{scriptId}:run`),
  mandando el Access Token como `Authorization: Bearer`.
- `src/App.jsx` — gate de login + pantalla principal con las pestañas
  Resumen, Movimientos, Cuentas, Metas, Suscripciones y Reportes.
- `src/components/` — cada pantalla/diálogo por separado (incluye editar y
  borrar un gasto ya cargado, tocando su fila en Movimientos).

El diseño es intencionalmente mínimo (sin librería de estilos) para que se
pueda rediseñar después sin pelearse con nada. Los íconos de la PWA
(`public/icon-*.png`, `apple-touch-icon.png`) son un placeholder — reemplazalos
cuando tengas el diseño definitivo.

## Funciones del backend (Apps Script API)

Se llaman por nombre con `scripts.run`, pasando `parameters` como array
posicional. Todas corren con el token de quien está logueado, así que no
hace falta mandar ningún identificador de usuario — cada quien siempre lee/
escribe su propia planilla.

- `obtenerGastosRecientes(dias)` → `[{ fecha, hora, categoria, descripcion, monto, cuenta }]`
- `generarResumen(dias)` → `{ porCategoria: {...}, totalGeneral }`
- `obtenerCategoriasDelEspacio()` → `[...]`
- `obtenerSaldo()` → `number | null`
- `obtenerIngresosRecientes(dias)` → `[...]`
- `obtenerCuentas()` → `[...]`
- `obtenerMetas()` → `[...]`
- `obtenerSuscripcionesView()` → `[...]`
- `obtenerTendencia(meses)` → `[...]`
- `obtenerCotizacion()` → `number`
- `agregarGastoManual(gasto)`, `editarGasto(criterio, cambios)`, `borrarGasto(criterio)`
- `agregarIngresoManual(ingreso)`, `editarIngreso(criterio, cambios)`, `borrarIngreso(criterio)`
- `crearCuenta(cuenta)`, `ajustarCuenta(nombre, delta)`
- `crearMeta(meta)`, `aportarMeta(nombre, monto)`
- `crearSuscripcion(sus)`, `editarSuscripcion(nombreOriginal, cambios)`, `borrarSuscripcion(nombre)`

Si una función tira un error (`throw new Error(...)` del lado del script),
la respuesta de `scripts.run` lo trae en
`error.details[0].errorMessage` — `src/api.js` ya lo desempaqueta solo.
Un 401/403 HTTP (token vencido o falta un permiso) hace que la app vuelva
sola a la pantalla de login.
