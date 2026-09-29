import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyBuild } from './artifact-evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = await verifyBuild(root);
const html = await readFile(resolve(root, 'dist', manifest.artifact));
const port = Number(process.argv[2] ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Puerto inválido.');

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
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

server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Dirección de preview inválida.');
  console.log(`Everett ${manifest.version}: http://127.0.0.1:${address.port}/`);
  console.log(`SHA-256: ${manifest.sha256}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
