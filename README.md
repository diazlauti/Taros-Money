# Taros Money

App mobile-friendly, instalable como PWA, para ver y cargar gastos/ingresos/
cuentas/metas, conectada a la misma planilla de Google Sheets que usa el
Apps Script de gastos de Cuscatlán. No tiene base de datos propia: lee y
escribe directamente en esa planilla a través de un endpoint que corre en el
mismo proyecto de Apps Script.

## 1. Publicar el Apps Script como API

En el editor de Apps Script de la planilla (Extensiones > Apps Script):

1. Abrí `CONFIG` al principio del archivo y definí un PIN en `APP_PIN` (lo
   que vas a escribir en la app la primera vez que entres desde cada
   dispositivo — después queda guardado ahí y no hay que repetirlo). A
   diferencia de un token fijo, el PIN nunca queda escrito en el código de la
   app web, así que no lo puede ver alguien que abra las herramientas de
   desarrollador del navegador.
2. Guardá, y andá a **Implementar > Nueva implementación** (o, si ya existe
   una implementación, **Administrar implementaciones > ✏️ > Nueva versión**
   para no cambiar la URL).
3. Tipo: **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso:
   **Cualquier usuario**.
4. Implementar, autorizá los permisos que pida, y copiá la URL que termina en
   `/exec`. Esa es tu `VITE_API_URL`.

## 2. Configurar variables de entorno

Copiá `.env.example` a `.env` y completá:

```
VITE_API_URL=https://script.google.com/macros/s/.../exec
```

(No hace falta ninguna otra variable — el PIN se escribe en la app, no en el
build.)

## 3. Desarrollo local

```
npm install
npm run dev
```

## 4. Deploy en Netlify

1. Conectá este repo en Netlify (New site from Git).
2. Build command: `npm run build` — Publish directory: `dist` (ya está en
   `netlify.toml`, no hace falta tocar nada).
3. En Site settings > Environment variables, cargá `VITE_API_URL`.
4. Deploy. Para instalarla en el celu: abrí el sitio en Chrome/Safari — al
   tener manifest + service worker (vite-plugin-pwa), el navegador ofrece
   instalarla sola, o usá "Agregar a pantalla de inicio" a mano.

## Cómo está armada

- `src/api.js` — toda la comunicación con el Apps Script (GET para leer,
  POST con `Content-Type: text/plain` para escribir, así se evita el
  preflight CORS que Apps Script no responde), más el login por PIN y el
  manejo de la sesión guardada en `localStorage`.
- `src/App.jsx` — gate de login + pantalla principal con las pestañas
  Resumen, Movimientos, Cuentas, Metas, Recurrentes y Reportes.
- `src/components/` — cada pantalla/diálogo por separado (incluye editar y
  borrar un gasto ya cargado, tocando su fila en Movimientos).

El diseño es intencionalmente mínimo (sin librería de estilos) para que se
pueda rediseñar después sin pelearse con nada. Los íconos de la PWA
(`public/icon-*.png`, `apple-touch-icon.png`) son un placeholder — reemplazalos
cuando tengas el diseño definitivo.

## Endpoints del Apps Script

Salvo `login`, todos requieren `?token=...` (GET) o `{ "token": "..." }` en
el body (POST) — es el `sessionToken` que devuelve el login, no el PIN.

- `POST { accion: "login", pin }` → `{ sessionToken }`
- `GET ?accion=gastos&dias=30` → `{ gastos: [...] }`
- `GET ?accion=resumen&dias=30` → `{ porCategoria: {...}, totalGeneral }`
- `GET ?accion=categorias` → `{ categorias: [...] }`
- `GET ?accion=saldo` → `{ saldo: number|null }`
- `GET ?accion=ingresos&dias=30` → `{ ingresos: [...] }`
- `GET ?accion=cuentas` → `{ cuentas: [...] }`
- `GET ?accion=metas` → `{ metas: [...] }`
- `GET ?accion=suscripciones` → `{ suscripciones: [...] }`
- `GET ?accion=tendencia&meses=6` → `{ tendencia: [...] }`
- `GET ?accion=cotizacion` → `{ cotizacionUsdArs: number }`
- `POST { accion: "agregarGasto", gasto: { fecha, hora, categoria, descripcion, monto } }` → `{ ok: true }`
- `POST { accion: "editarGasto", criterio: { fecha, hora, monto }, cambios: { categoria?, descripcion?, monto? } }` → `{ ok: true }`
- `POST { accion: "borrarGasto", criterio: { fecha, hora, monto } }` → `{ ok: true }`
- `POST { accion: "agregarIngreso", ingreso: { fecha, descripcion, categoria, monto } }` → `{ ok: true }`
- `POST { accion: "crearCuenta", cuenta: { nombre, saldo, moneda } }` → `{ ok: true }`
- `POST { accion: "ajustarCuenta", nombre, delta }` → `{ ok: true }`
- `POST { accion: "crearMeta", meta: { nombre, objetivo, actual } }` → `{ ok: true }`
- `POST { accion: "aportarMeta", nombre, monto }` → `{ ok: true }`

Los errores siempre vienen con HTTP 200 y `{ "error": "..." }` en el body
(limitación de Apps Script, no puede devolver otros status codes). Cuando la
sesión venció, además viene `{ "requiereLogin": true }` y la app vuelve sola
a la pantalla de login.
