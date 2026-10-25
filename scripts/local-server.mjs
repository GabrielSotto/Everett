import { createServer } from 'node:http';
import { previewEndpoint } from './link-preview/http.mjs';

export function createLocalServer(html, manifest, options = {}) {
  const previews = previewEndpoint(options);
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (pathname === '/api/link-preview') {
      const address = server.address();
      if (address && typeof address !== 'string')
        void previews.handle(request, response, address.port);
      else response.writeHead(503).end();
      return;
    }
    if (pathname === '/favicon.ico') {
      response.writeHead(204).end();
      return;
    }
    if (
      !['GET', 'HEAD'].includes(request.method ?? '') ||
      !['/', `/${manifest.artifact}`].includes(pathname)
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.length,
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : html);
  });
  server.on('close', () => previews.close());
  server.stopPreviews = () => previews.close();
  return server;
}
