import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { startBackendServer } from '../backend/server.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const REDESIGN_DIR = path.join(ROOT_DIR, 'redesign');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4'
};

function proxyToBackend(req, res, apiPort) {
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: apiPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${apiPort}` }
  }, upRes => {
    const isStream = String(upRes.headers['content-type'] || '').includes('text/event-stream');
    if (isStream) {
      req.setTimeout(0);
      res.setTimeout?.(0);
    }
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    if (isStream) res.flushHeaders?.();
    upRes.pipe(res);
  });
  res.on('close', () => {
    if (!res.writableEnded && !upstream.destroyed) upstream.destroy();
  });
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: `Backend API on port ${apiPort} is not reachable.` }));
    }
  });
  req.pipe(upstream);
}

export async function startServer({
  port = Number(process.env.PORT || 4174),
  apiPort = Number(process.env.API_PORT || 0),
  startBackend = true,
  ...backendOptions
} = {}) {
  let backend = null;
  let targetApiPort = apiPort || 3001;
  if (startBackend) {
    backend = await startBackendServer({ port: apiPort, ...backendOptions });
    targetApiPort = backend.port;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);

      if (pathname.startsWith('/api/') || pathname === '/health') {
        proxyToBackend(req, res, targetApiPort);
        return;
      }

      if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
      }

      if (pathname === '/redesign') {
        res.writeHead(302, { Location: '/redesign/' });
        res.end();
        return;
      }

      let relative = pathname;
      let baseDir = FRONTEND_DIR;
      if (relative.startsWith('/redesign/')) {
        const sub = relative.slice('/redesign/'.length) || 'index.html';
        if (sub.startsWith('shared/')) {
          baseDir = path.join(FRONTEND_DIR, 'js');
          relative = '/' + sub.slice('shared/'.length);
        } else if (sub.startsWith('assets/')) {
          baseDir = path.join(FRONTEND_DIR, 'assets');
          relative = '/' + sub.slice('assets/'.length);
        } else {
          baseDir = REDESIGN_DIR;
          relative = '/' + sub;
        }
      } else {
        if (relative === '/') relative = '/index.html';
        else if (relative.toLowerCase() === '/admin') relative = '/admin.html';
      }

      const segments = relative.toLowerCase().split('/');
      if (
        /[\\:]/.test(relative) ||
        segments.some(part => part.startsWith('.') || /[. ]$/.test(part))
      ) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

        const filename = path.resolve(baseDir, '.' + relative);
        if (!filename.startsWith(baseDir + path.sep)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        const ext = path.extname(filename).toLowerCase();
        if (!MIME_TYPES[ext]) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        const info = await stat(filename);
        if (!info.isFile()) throw new Error('Not a file');

        const etag = `"${info.size}-${Math.round(info.mtimeMs)}"`;
        const isAsset = relative.toLowerCase().startsWith('/assets/');
        const headers = {
          'Content-Type': MIME_TYPES[ext],
          'Cache-Control': isAsset ? 'public, max-age=3600' : 'no-cache',
          ETag: etag,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          Vary: 'Accept-Encoding'
        };

        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, headers);
          res.end();
          return;
        }

        let data = await readFile(filename);
        if (
          /gzip/.test(String(req.headers['accept-encoding'] || '')) &&
          ['.html', '.js', '.mjs', '.css', '.svg', '.json'].includes(ext)
        ) {
          data = gzipSync(data);
          headers['Content-Encoding'] = 'gzip';
        }

        if (req.method === 'HEAD') {
          res.writeHead(200, headers);
          res.end();
          return;
        }

        res.writeHead(200, headers);
        res.end(data);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      }
    });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, resolve);
  });

  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;

  const closeAll = () => Promise.all([
    new Promise(r => server.close(r)),
    backend ? new Promise(r => backend.server.close(r)) : Promise.resolve()
  ]);

  return { server, backend, port: actualPort, apiPort: targetApiPort, closeAll };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const fixedApiPort = Number(process.env.API_PORT || 3001);
  startServer({ apiPort: fixedApiPort }).then(({ port, apiPort }) => {
    console.log(`Frontend running at http://localhost:${port}/ (proxying /api -> http://127.0.0.1:${apiPort})`);
    console.log(`Admin Studio: http://localhost:${port}/#admin`);
  });
}
