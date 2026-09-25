import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
      },
    }),
  ],
})
