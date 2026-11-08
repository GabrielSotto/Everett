/** Catálogo remoto: no descarga ni conserva archivos de tipografías. */
export function googleFontsEndpoint({ getKey, request = fetch }) {
  let cached, pending;
  const lifetime = new AbortController();
  const json = (response, status, value) =>
    response
      .writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .end(JSON.stringify(value));
  async function catalogue(key) {
    const timeout = AbortSignal.timeout(10_000);
    try {
      const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
      url.search = new URLSearchParams({
        key,
        sort: 'popularity',
        fields: 'items(family,category,variants)',
      });
      const response = await request(url, {
        signal: AbortSignal.any([timeout, lifetime.signal]),
        redirect: 'error',
      });
      if (!response.ok)
        return {
          status: response.status === 429 ? 429 : 502,
          error: [400, 401, 403].includes(response.status)
            ? 'credentials'
            : response.status === 429
              ? 'quota'
              : 'unavailable',
        };
      const data = await response.json();
      if (!Array.isArray(data?.items) || !data.items.length || data.items.length > 20_000)
        return { status: 502, error: 'invalid-response' };
      const families = data.items.filter(
        (item) =>
          typeof item.family === 'string' &&
          /^[A-Za-z0-9][A-Za-z0-9 -]{0,99}$/.test(item.family) &&
          typeof item.category === 'string' &&
          Array.isArray(item.variants),
      );
      if (!families.length) return { status: 502, error: 'invalid-response' };
      const value = { families: families.map(({ family, category }) => ({ family, category })) };
      cached = { value, until: Date.now() + 3600_000 };
      return { status: 200, ...value };
    } catch {
      return { status: 502, error: timeout.aborted ? 'timeout' : 'network' };
    }
  }
  return {
    close() {
      lifetime.abort();
      cached = undefined;
    },
    async handle(req, res, port) {
      if (
        req.method !== 'POST' ||
        req.headers.origin !== `http://127.0.0.1:${port}` ||
        req.headers.host !== `127.0.0.1:${port}` ||
        req.headers['content-type']?.split(';')[0] !== 'application/json'
      ) {
        json(res, 403, { error: 'forbidden' });
        return;
      }
      try {
        const key = (await getKey())?.trim();
        if (!key) {
          json(res, 503, { error: 'not-configured' });
          return;
        }
        if (cached && cached.until > Date.now()) {
          json(res, 200, cached.value);
          return;
        }
        pending ??= catalogue(key).finally(() => {
          pending = undefined;
        });
        const { status, ...result } = await pending;
        json(res, status, result);
      } catch {
        json(res, 503, { error: 'configuration' });
      }
    },
  };
}
