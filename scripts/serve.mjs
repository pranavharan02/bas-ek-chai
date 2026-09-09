import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist/client'),
  port = Number(process.env.PORT ?? 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.rsc': 'text/x-component',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const rel = decodeURIComponent(url.pathname);
      let file = path.resolve(root, '.' + rel);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if ((await stat(file)).isDirectory())
        file = path.join(file, 'index.html');
      const content = await readFile(file);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`Bas Ek Chai: http://localhost:${port}/`),
  );
