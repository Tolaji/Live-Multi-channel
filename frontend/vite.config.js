import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load .env variables into process.env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  }
})
