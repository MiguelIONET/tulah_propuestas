import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pages = ['index.html', 'nosotros.html', 'productos.html', 'sinergia.html', 'identidad.html', 'contacto.html'];
const variants = ['propuesta-neumorfismo', 'propuesta-glassmorfismo'];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '');
    const requested = resolve(root, pathname || 'propuesta-neumorfismo/index.html');
    if (!(requested === root || requested.startsWith(`${root}${sep}`)) || !existsSync(requested) || statSync(requested).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': mime[extname(requested)] || 'application/octet-stream' });
    response.end(readFileSync(requested));
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const { port } = server.address();

try {
  let checked = 0;
  for (const variant of variants) {
    for (const page of pages) {
      const pageUrl = `http://127.0.0.1:${port}/${variant}/${page}`;
      const response = await fetch(pageUrl);
      assert.equal(response.status, 200, `${pageUrl} returned ${response.status}`);
      const html = await response.text();
      checked += 1;

      const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/gi)]
        .map((match) => match[1].split('#')[0].split('?')[0])
        .filter((target) => target && !/^(?:https?:|tel:|mailto:|#)/i.test(target));
      for (const resource of resources) {
        const assetUrl = new URL(resource, pageUrl).href;
        const assetResponse = await fetch(assetUrl);
        assert.equal(assetResponse.status, 200, `${assetUrl} returned ${assetResponse.status}`);
        checked += 1;
      }
    }
  }
  console.log(`Browser smoke: ${checked} page and asset requests returned 200.`);
} finally {
  await new Promise((closed) => server.close(closed));
}
