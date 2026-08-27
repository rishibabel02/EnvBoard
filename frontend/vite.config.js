import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            // ECONNRESET is normal when an SSE client disconnects — suppress it
            if (err.code !== 'ECONNRESET') {
              console.error('[proxy]', err.message)
            }
          })
        }
      }
    }
  }
})
