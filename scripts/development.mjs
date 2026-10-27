import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import { previewEndpoint } from './link-preview/http.mjs';
import { developmentIdentity } from './development-evidence.mjs';
import { transform } from 'esbuild';

/** Adaptación de la plantilla autónoma y del servicio local al servidor de Vite. */
export function developmentPlugin(root, options = {}) {
  const broken = new Set();
  return {
    name: 'everett-development',
    async handleHotUpdate(context) {
      if (
        !relative(root, context.file).replaceAll('\\', '/').startsWith('src/') ||
        !/\.[jt]s$/.test(context.file)
      )
        return;
      try {
        // Comprobar sintaxis antes del full-reload de una aplicación DOM nativa.
        // Así un módulo roto no sustituye el trabajo visible por una página vacía.
        await transform(await context.read(), {
          loader: context.file.endsWith('.ts') ? 'ts' : 'js',
          sourcefile: context.file,
          logLevel: 'silent',
        });
        if (broken.delete(context.file)) {
          context.server.ws.send({ type: 'full-reload' });
          return [];
        }
      } catch (error) {
        broken.add(context.file);
        context.server.ws.send({
          type: 'error',
          err: {
            message: error.message,
            stack: error.stack ?? '',
            id: context.file,
            plugin: 'everett-development',
          },
        });
        return [];
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace('{{BUILD_ID}}', 'development')
          .replace('<!-- EVERETT_STYLES -->', '')
          .replace(
            '<!-- EVERETT_SCRIPT -->',
            '<script type="module" src="/src/development.ts"></script>',
          );
      },
    },
    configureServer(server) {
      const previews = previewEndpoint(options);
      server.httpServer.once('close', () => previews.close());
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
        if (pathname === '/__everett/development') {
          if (request.method !== 'GET') return response.writeHead(405).end();
          void developmentIdentity(root).then(
            (identity) =>
              response
                .writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
                .end(JSON.stringify(identity)),
            (error) => {
              server.config.logger.error(String(error));
              response.writeHead(500).end();
            },
          );
          return;
        }
        if (pathname === '/favicon.ico') {
          response.writeHead(204).end();
          return;
        }
        if (pathname !== '/api/link-preview') return next();
        const address = server.httpServer.address();
        if (!address || typeof address === 'string') response.writeHead(503).end();
        else void previews.handle(request, response, address.port);
      });
    },
    config() {
      const require = createRequire(resolve(root, 'package.json'));
      return {
        resolve: {
          alias: [
            {
              find: /^pdfjs-dist\/build\/pdf\.worker\.mjs$/,
              replacement: require.resolve('pdfjs-dist/build/pdf.worker.mjs') + '?raw',
            },
          ],
        },
      };
    },
  };
}

export async function developmentConfig(root) {
  const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  return {
    root,
    publicDir: false,
    optimizeDeps: { exclude: ['pdfjs-dist/build/pdf.worker.mjs'] },
    define: { __EVERETT_VERSION__: JSON.stringify(version) },
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      open: false,
      watch: {
        ignored: ['**/output/**', '**/dist/**', '**/entregas/**'],
        awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 },
      },
    },
    plugins: [developmentPlugin(root)],
  };
}
