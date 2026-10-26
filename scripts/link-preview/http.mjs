import { extractPreview } from './extract.mjs';
import { publicUrl } from './public-fetch.mjs';

export function previewEndpoint({ extract = extractPreview } = {}) {
  const cache = new Map(),
    pending = new Map(),
    abort = new AbortController();
  let cacheBytes = 0;
  const json = (response, status, value) => {
    const bytes = JSON.stringify(value);
    response
      .writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .end(bytes);
  };
  return {
    close() {
      abort.abort();
      cache.clear();
    },
    async handle(request, response, port) {
      const origin = `http://127.0.0.1:${port}`;
      if (
        request.method !== 'POST' ||
        request.headers.origin !== origin ||
        request.headers.host !== `127.0.0.1:${port}` ||
        request.headers['content-type']?.split(';')[0] !== 'application/json'
      ) {
        json(response, 403, { error: 'Solicitud no permitida' });
        return;
      }
      try {
        const chunks = [];
        let count = 0;
        for await (const chunk of request) {
          count += chunk.length;
          if (count > 8192) {
            json(response, 413, { error: 'Solicitud demasiado grande' });
            return;
          }
          chunks.push(chunk);
        }
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (
          typeof data?.url !== 'string' ||
          (data.refresh !== undefined && typeof data.refresh !== 'boolean')
        )
          throw new Error('Solicitud inválida');
        const key = publicUrl(data.url).href;
        const cached = cache.get(key);
        if (!data.refresh && cached && Date.now() - cached.at < 6 * 3600000) {
          json(response, 200, cached.value);
          return;
        }
        let job = pending.get(key);
        if (!job) {
          if (pending.size >= 4) {
            json(response, 200, {
              status: 'error',
              problem: 'busy',
              checkedAt: Date.now(),
              resolvedUrl: key,
            });
            return;
          }
          job = extract(key, { signal: abort.signal }).catch((error) => ({
            status: 'error',
            problem: /demasiado grande/.test(error.message)
              ? 'too-large'
              : ['ENOTFOUND', 'EAI_NONAME'].includes(error.cause?.code ?? error.code)
                ? 'host-not-found'
                : 'fetch-failed',
            checkedAt: Date.now(),
            resolvedUrl: key,
          }));
          pending.set(key, job);
          job.finally(() => pending.delete(key));
        }
        const value = await job;
        if (value.status !== 'error') {
          const size = Buffer.byteLength(JSON.stringify(value));
          cacheBytes -= cache.get(key)?.size ?? 0;
          cache.delete(key);
          cache.set(key, { value, at: Date.now(), size });
          cacheBytes += size;
          while (cache.size > 64 || cacheBytes > 12 * 1024 * 1024) {
            const first = cache.keys().next().value;
            cacheBytes -= cache.get(first).size;
            cache.delete(first);
          }
        }
        json(response, 200, value);
      } catch {
        json(response, 200, {
          status: 'unavailable',
          problem: 'invalid-url',
          checkedAt: Date.now(),
          resolvedUrl: '',
        });
      }
    },
  };
}
