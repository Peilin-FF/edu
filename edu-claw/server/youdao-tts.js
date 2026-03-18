import crypto from 'crypto';

/**
 * Youdao TTS Vite server middleware plugin.
 * Handles POST /api/tts → calls Youdao TTS API with server-side signing.
 */
export default function youdaoTtsPlugin(env) {
  const APP_KEY = env.YOUDAO_APP_KEY;
  const APP_SECRET = env.YOUDAO_APP_SECRET;

  if (!APP_KEY || !APP_SECRET) {
    console.warn('[youdao-tts] Missing YOUDAO_APP_KEY or YOUDAO_APP_SECRET in .env');
  }

  function truncate(q) {
    if (q.length <= 20) return q;
    return q.substring(0, 10) + q.length + q.substring(q.length - 10);
  }

  function sign(appKey, input, salt, curtime, appSecret) {
    const str = appKey + input + salt + curtime + appSecret;
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  return {
    name: 'youdao-tts',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        // Read request body
        let body = '';
        for await (const chunk of req) body += chunk;

        let text, voiceName, speed;
        try {
          const parsed = JSON.parse(body);
          text = parsed.text;
          voiceName = parsed.voiceName || 'youxiaoke';
          speed = parsed.speed || '1';
        } catch {
          res.statusCode = 400;
          res.end('Invalid JSON body');
          return;
        }

        if (!text) {
          res.statusCode = 400;
          res.end('Missing "text" field');
          return;
        }

        const salt = crypto.randomUUID();
        const curtime = String(Math.floor(Date.now() / 1000));
        const input = truncate(text);
        const signStr = sign(APP_KEY, input, salt, curtime, APP_SECRET);

        const params = new URLSearchParams({
          q: text,
          appKey: APP_KEY,
          salt,
          sign: signStr,
          signType: 'v3',
          curtime,
          format: 'mp3',
          speed,
          volume: '1.00',
          voiceName,
        });

        try {
          const resp = await fetch('https://openapi.youdao.com/ttsapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });

          const contentType = resp.headers.get('content-type') || '';

          if (contentType.includes('audio')) {
            // Success - stream audio back
            res.setHeader('Content-Type', 'audio/mpeg');
            const buffer = Buffer.from(await resp.arrayBuffer());
            res.end(buffer);
          } else {
            // Error response from Youdao
            const errText = await resp.text();
            console.error('[youdao-tts] API error:', errText);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Youdao TTS failed', detail: errText }));
          }
        } catch (e) {
          console.error('[youdao-tts] Fetch error:', e.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}
