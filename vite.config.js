import base44 from '@base44/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: process.env.NODE_ENV === 'production',
      visualEditAgent: true,
    }),
    react(),
  ],
})