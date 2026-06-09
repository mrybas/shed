import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  // Served from the custom domain root (shed.beardlabs.cc), so the base is '/'.
  base: '/',
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
