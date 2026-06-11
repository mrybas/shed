import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => ({
  // Served from the custom domain root (shed.beardlabs.cc), so the base is '/'.
  base: '/',
  plugins: [
    react(),
    // Installable PWA + offline: precaches the build, auto-updates on deploy.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      // Guide screenshots are .webp — include them so the manual works offline.
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'] },
      manifest: {
        name: 'shed.',
        short_name: 'shed.',
        description: 'Drum practice: metronome, exercises, real notation',
        display: 'standalone',
        background_color: '#15171c',
        theme_color: '#15171c',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    // Disable browser caching in dev so Safari (which caches ES modules
    // aggressively and may ignore HMR) always loads the latest code.
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
}))
