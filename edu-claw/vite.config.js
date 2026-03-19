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
          target: env.LLM_BASE_URL?.replace(/\/v1$/, '') || 'https://api-gateway.glm.ai',
          changeOrigin: true,
          rewrite: () => '/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.LLM_API_KEY}`)
            })
          },
        },
      },
    },
    define: {
      __LLM_MODEL__: JSON.stringify(env.LLM_MODEL || 'gpt-4o-mini'),
    },
  }
})
