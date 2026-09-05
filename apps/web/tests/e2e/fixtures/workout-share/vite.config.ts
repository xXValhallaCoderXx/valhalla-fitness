import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: { '~': fileURLToPath(new URL('../../../../src', import.meta.url)) } },
  plugins: [tailwindcss(), react()],
  server: { host: '127.0.0.1', port: 3100, strictPort: true, fs: { allow: [fileURLToPath(new URL('../../../../../..', import.meta.url))] } },
})
