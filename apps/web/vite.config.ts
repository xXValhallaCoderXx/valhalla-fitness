import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const securityHeaders = {
  'content-security-policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ].join('; '),
  'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
}

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
    nitro({
      routeRules: {
        '/**': {
          headers: {
            ...securityHeaders,
            'cache-control': 'private, no-store',
          },
        },
        '/assets/**': {
          headers: {
            'cache-control': 'public, max-age=31536000, immutable',
          },
        },
        '/manifest.json': {
          headers: {
            'cache-control': 'public, max-age=3600, must-revalidate',
          },
        },
        '/pwa/**': {
          headers: {
            'cache-control': 'public, max-age=86400, must-revalidate',
          },
        },
        '/sw.js': {
          headers: {
            'cache-control': 'no-cache, no-store, must-revalidate',
          },
        },
      },
    }),
    react(),
    VitePWA({
      outDir: '.output/public',
      manifestFilename: 'manifest.json',
      injectRegister: null,
      registerType: 'prompt',
      includeAssets: [
        'pwa/apple-touch-icon.png',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/icon-maskable-512.png',
      ],
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
        // Keep the bootstrap in the revisioned precache so every application
        // deployment produces a new service worker and preserves the update
        // prompt. Route chunks are cached only after an online request.
        globPatterns: ['assets/app-*.css', 'assets/index-*.js'],
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/_server/, /^\/api/, /^\/auth\/callback/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === 'script' && url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sheetless-script-assets-v1',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30,
                maxEntries: 60,
              },
            },
          },
        ],
      },
    }),
  ],
})
