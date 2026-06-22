import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro(),
    react(),
    VitePWA({
      outDir: '.output/public',
      injectRegister: null,
      registerType: 'prompt',
      includeAssets: ['pwa/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Sheetless',
        short_name: 'Sheetless',
        description: 'Structured strength training tracker for planned progression.',
        start_url: '/today',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        theme_color: '#197f9a',
        background_color: '#fbfdfc',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          {
            src: '/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        navigateFallbackDenylist: [/^\/_server/, /^\/api/, /^\/auth\/callback/],
      },
    }),
  ],
})
