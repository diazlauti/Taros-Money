# Taros Money

App mobile-friendly para ver y cargar gastos, conectada a la misma planilla
de Google Sheets que ya usa el [Apps Script de gastos de Cuscatlán]. No tiene
base de datos propia: lee y escribe directamente en esa planilla a través de
un endpoint que corre en el mismo proyecto de Apps Script.

## 1. Publicar el Apps Script como API

En el editor de Apps Script de la planilla (Extensiones > Apps Script):

1. Abrí `CONFIG` al principio del archivo y pegá un token largo y random en
   `API_TOKEN` (por ejemplo, generalo en una terminal con `openssl rand -hex 24`).
   Sin esto la API rechaza todos los pedidos.
2. Guardá, y andá a **Implementar > Nueva implementación**.
3. Tipo: **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso:
   **Cualquier usuario**.
4. Implementar, autorizá los permisos que pida, y copiá la URL que termina en
   `/exec`. Esa es tu `VITE_API_URL`.

## 2. Configurar variables de entorno

Copiá `.env.example` a `.env` y completá:

```
VITE_API_URL=https://script.google.com/macros/s/.../exec
VITE_API_TOKEN=el-mismo-token-que-pusiste-en-CONFIG.API_TOKEN
```

## 3. Desarrollo local

```
npm install
npm run dev
```

## 4. Deploy en Netlify

1. Conectá este repo en Netlify (New site from Git).
2. Build command: `npm run build` — Publish directory: `dist` (ya está en
   `netlify.toml`, no hace falta tocar nada).
3. En Site settings > Environment variables, cargá `VITE_API_URL` y
   `VITE_API_TOKEN` con los mismos valores del `.env`.
4. Deploy. Para instalarla en el celu: abrí el sitio en Chrome/Safari y usá
   "Agregar a pantalla de inicio" (tiene manifest.json, así que queda como
   ícono propio).

## Cómo está armada

- `src/api.js` — toda la comunicación con el Apps Script (GET para leer,
  POST con `Content-Type: text/plain` para escribir, así se evita el
  preflight CORS que Apps Script no responde).
- `src/App.jsx` — pantalla principal: saldo, resumen por categoría, lista de
  gastos recientes, y el formulario para cargar un gasto a mano.
- `src/components/` — cada pedazo de UI por separado.

El diseño es intencionalmente mínimo (sin librería de estilos) para que se
pueda rediseñar después sin pelearse con nada.

## Endpoints del Apps Script

Todos requieren `?token=...` (GET) o `{ "token": "..." }` en el body (POST).

- `GET ?accion=gastos&dias=30` → `{ gastos: [...] }`
- `GET ?accion=resumen&dias=30` → `{ porCategoria: {...}, totalGeneral }`
- `GET ?accion=categorias` → `{ categorias: [...] }`
- `GET ?accion=saldo` → `{ saldo: number|null }`
- `POST { accion: "agregarGasto", gasto: { fecha, hora, categoria, descripcion, monto } }` → `{ ok: true }`

Los errores siempre vienen con HTTP 200 y `{ "error": "..." }` en el body
(limitación de Apps Script, no puede devolver otros status codes).
