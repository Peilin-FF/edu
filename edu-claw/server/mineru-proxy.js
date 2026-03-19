/**
 * Vite middleware: proxy MinerU PDF parsing API.
 * Handles: upload PDF → poll status → return content.md
 */
export default function mineruPlugin(env) {
  const MINERU_TOKEN = env.MINERU_TOKEN;
  const MINERU_API = 'https://mineru.net/api/v4';

  if (!MINERU_TOKEN) {
    console.warn('[mineru] Missing MINERU_TOKEN in .env');
  }

  const mineruHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${MINERU_TOKEN}`,
  };

  return {
    name: 'mineru-proxy',
    configureServer(server) {
      // POST /api/mineru/parse — accepts PDF as multipart, returns parsed content.md
      server.middlewares.use('/api/mineru/parse', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }

        try {
          // Read multipart body (PDF file)
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks);

          // Parse multipart to get filename and file data
          const boundary = req.headers['content-type']?.split('boundary=')[1];
          if (!boundary) { res.statusCode = 400; res.end('Missing boundary'); return; }

          const { fileName, fileData } = parseMultipart(body, boundary);
          if (!fileData) { res.statusCode = 400; res.end('No file found'); return; }

          const dataId = `student_${Date.now()}`;

          // Step 1: Request upload URL
          const urlRes = await fetch(`${MINERU_API}/file-urls/batch`, {
            method: 'POST',
            headers: mineruHeaders,
            body: JSON.stringify({
              files: [{ name: fileName, data_id: dataId }],
              model_version: 'vlm',
            }),
          });
          const urlData = await urlRes.json();
          if (urlData.code !== 0) throw new Error(`MinerU upload URL failed: ${JSON.stringify(urlData)}`);

          const batchId = urlData.data.batch_id;
          const uploadUrl = urlData.data.file_urls[0];

          // Step 2: Upload PDF
          const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: fileData });
          if (!uploadRes.ok) throw new Error(`PDF upload failed: ${uploadRes.status}`);

          // Step 3: Poll for results (max 5 minutes)
          const resultUrl = `${MINERU_API}/extract-results/batch/${batchId}`;
          let contentMd = null;

          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 10000)); // wait 10s

            const pollRes = await fetch(resultUrl, { headers: mineruHeaders });
            const pollData = await pollRes.json();
            if (pollData.code !== 0) continue;

            const results = pollData.data?.extract_result || [];
            const item = results.find((r) => r.data_id === dataId);
            if (item?.state === 'done' && item.full_zip_url) {
              // Download ZIP and extract content.md
              const zipRes = await fetch(item.full_zip_url);
              const zipBuf = Buffer.from(await zipRes.arrayBuffer());

              // Simple ZIP extraction for full.md
              const AdmZip = (await import('adm-zip')).default;
              const zip = new AdmZip(zipBuf);
              const entries = zip.getEntries();
              for (const entry of entries) {
                if (entry.entryName.endsWith('full.md') || entry.entryName === 'full.md') {
                  contentMd = entry.getData().toString('utf-8');
                  break;
                }
              }
              break;
            }
          }

          if (!contentMd) {
            res.statusCode = 504;
            res.end(JSON.stringify({ error: '解析超时，请重试' }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, contentMd }));
        } catch (e) {
          console.error('[mineru]', e.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

/** Simple multipart parser to extract file */
function parseMultipart(body, boundary) {
  const sep = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const idx = body.indexOf(sep, start);
    if (idx === -1) break;
    if (start > 0) parts.push(body.slice(start, idx));
    start = idx + sep.length + 2; // skip \r\n
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd).toString();
    if (headers.includes('filename=')) {
      const nameMatch = headers.match(/filename="([^"]+)"/);
      const fileName = nameMatch ? nameMatch[1] : 'upload.pdf';
      const fileData = part.slice(headerEnd + 4, part.length - 2); // remove trailing \r\n
      return { fileName, fileData };
    }
  }
  return { fileName: null, fileData: null };
}
