import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.LLM_API_KEY;

if (!API_KEY) {
  console.error('Missing LLM_API_KEY environment variable');
  process.exit(1);
}

app.use('/api/chat', createProxyMiddleware({
  target: 'https://api-gateway.glm.ai',
  changeOrigin: true,
  pathRewrite: { '^/api/chat': '/v1/chat/completions' },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('Authorization', `Bearer ${API_KEY}`);
  },
}));

app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
