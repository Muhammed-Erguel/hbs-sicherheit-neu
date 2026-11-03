// Minimaler statischer Server fuer den Production-Output (dist/).
// Ohne Zusatzabhaengigkeiten, damit der Build ueberall pruefbar ist.
// Aufruf: node tools/serve.mjs [port] [ordner]
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.argv[2] || 8125);
const ROOT = path.resolve(process.argv[3] || 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(ROOT, url);
    // Kein Ausbruch aus dem Ausgabeordner
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

    let info = await stat(file).catch(() => null);
    if (info && info.isDirectory()) {
      file = path.join(file, 'index.html');
      info = await stat(file).catch(() => null);
    }
    if (!info) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h1>404</h1>'); return; }

    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range && /^bytes=/.test(range)) {           // Range-Requests fuer Video
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = Number(s || 0);
      const end = e ? Number(e) : info.size - 1;
      res.writeHead(206, {
        'Content-Type': type, 'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Content-Length': end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size, 'Accept-Ranges': 'bytes' });
    createReadStream(file).pipe(res);
  } catch (err) {
    res.writeHead(500).end('Server error');
  }
}).listen(PORT, () => console.log(`Serve ${ROOT} -> http://localhost:${PORT}`));
