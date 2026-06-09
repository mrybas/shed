import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project site under /shed/. Apply that base only to
  // the production build; keep dev (and tests) at root.
  base: command === 'build' ? '/shed/' : '/',
  plugins: [react()],
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
