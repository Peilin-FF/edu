import express from 'express';
import crypto from 'crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.LLM_API_KEY;
const YOUDAO_APP_KEY = process.env.YOUDAO_APP_KEY;
const YOUDAO_APP_SECRET = process.env.YOUDAO_APP_SECRET;

if (!API_KEY) {
  console.error('Missing LLM_API_KEY environment variable');
  process.exit(1);
}

// LLM chat proxy
app.use('/api/chat', createProxyMiddleware({
  target: 'https://api-gateway.glm.ai',
  changeOrigin: true,
  pathRewrite: { '^/api/chat': '/v1/chat/completions' },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('Authorization', `Bearer ${API_KEY}`);
  },
}));

// Youdao TTS endpoint
app.use('/api/tts', express.json(), async (req, res) => {
  const { text, voiceName = 'youxiaoke', speed = '1' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  function truncate(q) {
    if (q.length <= 20) return q;
    return q.substring(0, 10) + q.length + q.substring(q.length - 10);
  }

  const salt = crypto.randomUUID();
  const curtime = String(Math.floor(Date.now() / 1000));
  const input = truncate(text);
  const sign = crypto.createHash('sha256')
    .update(YOUDAO_APP_KEY + input + salt + curtime + YOUDAO_APP_SECRET)
    .digest('hex');

  const params = new URLSearchParams({
    q: text, appKey: YOUDAO_APP_KEY, salt, sign, signType: 'v3',
    curtime, format: 'mp3', speed, volume: '1.00', voiceName,
  });

  try {
    const resp = await fetch('https://openapi.youdao.com/ttsapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('audio')) {
      res.setHeader('Content-Type', 'audio/mpeg');
      const buf = Buffer.from(await resp.arrayBuffer());
      res.end(buf);
    } else {
      const errText = await resp.text();
      res.status(502).json({ error: 'Youdao TTS failed', detail: errText });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
