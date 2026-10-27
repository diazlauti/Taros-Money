import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Número de versión: 1.DÍA.MES.HORA.MINUTOS, con la hora de Argentina del
// momento en que se publica (ej. 1.27.10.3.16 = 27/10 a las 3:16). Sale solo
// en cada publicación; para pasar a 2 se cambia VERSION_PRINCIPAL.
const VERSION_PRINCIPAL = 1
function numeroDeVersion(fecha = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: 'numeric',
      month: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  )
  return `${VERSION_PRINCIPAL}.${partes.day}.${partes.month}.${Number(partes.hour)}.${partes.minute}`
}

// https://vite.dev/config/
export default defineConfig({
  // Número de versión, para mostrarlo en Configuración › Ayuda.
  define: {
    __NUMERO_VERSION__: JSON.stringify(numeroDeVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      // "prompt": la versión nueva queda esperando y la app muestra «Hay una
      // versión nueva · Actualizar» (src/actualizacion.js). Así no cambia de
      // golpe mientras cargás algo, y en el iPhone instalado se entera.
      registerType: 'prompt',
      injectRegister: false,
      // No cachea llamadas a la API (los datos de la planilla siempre tienen
      // que venir frescos): sólo el shell de la app (HTML/JS/CSS/íconos),
      // así abre instantáneo y queda instalable, sin mostrar datos viejos.
      workbox: {
        navigateFallbackDenylist: [/\/api\//],
      },
      manifest: {
        name: 'Taros Money',
        short_name: 'Taros Money',
        description: 'Gastos e ingresos conectados a la planilla de Google Sheets.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#1a1f45',
        theme_color: '#1a1f45',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Mantener apretado el ícono de la app (Android, y escritorio en
        // Chrome/Edge) muestra estos atajos: abren el formulario directo.
        shortcuts: [
          { name: 'Nuevo gasto', short_name: 'Gasto', url: '/?nuevo=gasto', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Nuevo ingreso', short_name: 'Ingreso', url: '/?nuevo=ingreso', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
})
