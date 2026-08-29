import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// Temporary config for checking changes against the LIVE backend (dtms.devbry.online).
// Start with: npx vite --config vite.config.check.ts
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      includeAssets: ['favicon-*.png', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3002,
    strictPort: true,
    host: true,
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: 'https://dtms.devbry.online',
        changeOrigin: true,
      },
      '/storage': {
        target: 'https://dtms.devbry.online',
        changeOrigin: true,
      },
      '/broadcasting': {
        target: 'https://dtms.devbry.online',
        changeOrigin: true,
      },
      '/app': {
        target: 'https://dtms.devbry.online',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
