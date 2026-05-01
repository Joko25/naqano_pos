import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Bestari POS',
        short_name: 'BestariPOS',
        description: 'Sistem Kasir Modern & Cepat',
        theme_color: '#28c8b4',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/pos',
        icons: [
          { src: 'bestari-logo.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
