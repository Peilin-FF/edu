import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import youdaoTtsPlugin from './server/youdao-tts.js'
import mineruPlugin from './server/mineru-proxy.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      youdaoTtsPlugin(env),
      mineruPlugin(env),
    ],
    server: {
      allowedHosts: true,
      host: true,
      proxy: {
        '/api/chat': {
          target: 'https://api-gateway.glm.ai',
          changeOrigin: true,
          rewrite: (path) => '/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.LLM_API_KEY}`)
            })
          },
        },
      },
    },
  }
})
