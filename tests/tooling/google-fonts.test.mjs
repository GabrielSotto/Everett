import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { googleFontsEndpoint } from '../../scripts/google-fonts.mjs';

test('FONT-01: catálogo oficial, clave privada, concurrencia y fallos diferenciados', async () => {
  let key = '',
    calls = 0,
    mode = 'ok';
  const endpoint = googleFontsEndpoint({
    getKey: () => key,
    request: async (url) => {
      calls++;
      assert.equal(url.origin, 'https://www.googleapis.com');
      assert.equal(url.searchParams.get('key'), key);
      if (mode === 'network') throw new Error('No devolver este error ni la clave ' + key);
      if (mode === 'invalid') return Response.json({ items: 'wrong' });
      if (mode !== 'ok') return new Response('', { status: Number(mode) });
      await new Promise((r) => setTimeout(r, 15));
      return Response.json({
        items: [
          { family: 'Molle', category: 'handwriting', variants: ['italic'] },
          {
            family: 'Lora',
            category: 'serif',
            variants: ['regular', '700', '300', '700', 'italic', '700italic', '0', '1001', 'bad'],
            files: { regular: 'https://fonts.gstatic.com/private.ttf' },
          },
        ],
      });
    },
  });
  const server = createServer((req, res) => void endpoint.handle(req, res, server.address().port));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const send = (headers = {}) =>
    fetch(origin, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', ...headers },
      body: '{}',
    });
  try {
    assert.equal((await send({ origin: 'https://otro.example' })).status, 403);
    assert.equal((await fetch(origin)).status, 403);
    const wrongHost = await new Promise((resolve, reject) => {
      const req = httpRequest(
        origin,
        {
          method: 'POST',
          headers: { origin, host: 'otro.example', 'content-type': 'application/json' },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end('{}');
    });
    assert.equal(wrongHost, 403);
    assert.equal(calls, 0);
    assert.deepEqual(await (await send()).json(), { error: 'not-configured' });
    key = 'test-only-key';
    for (const [failure, code] of [
      ['400', 'invalid-request'],
      ['401', 'credentials'],
      ['403', 'access-denied'],
      ['429', 'quota'],
      ['500', 'unavailable'],
      ['network', 'network'],
      ['invalid', 'invalid-response'],
    ]) {
      mode = failure;
      const response = await send();
      assert.ok(!response.ok);
      assert.deepEqual(await response.json(), {
        error: code,
        ...(Number(failure) ? { providerStatus: Number(failure) } : {}),
      });
    }
    mode = 'ok';
    const before = calls;
    const results = await Promise.all([send(), send(), send()]);
    for (const result of results) {
      assert.equal(result.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await result.json(), {
        families: [
          { family: 'Molle', category: 'handwriting', weights: [400], italic: true },
          { family: 'Lora', category: 'serif', weights: [300, 400, 700], italic: false },
        ],
      });
    }
    assert.equal(calls, before + 1);
    assert.equal((await send()).status, 200);
    assert.equal(calls, before + 1);
  } finally {
    endpoint.close();
    await new Promise((r) => server.close(r));
  }
});

test('FONT-02: motivos reales de Google, JSON inválido, timeout y diagnóstico sin secretos', async () => {
  let reply = () => Response.json({ items: [] });
  let configurationBroken = false;
  const secret = 'private-test-key';
  const endpoint = googleFontsEndpoint({
    getKey: () => {
      if (configurationBroken) throw new Error(secret);
      return secret;
    },
    timeoutMs: 40,
    request: async (_url, { signal }) => {
      if (!reply)
        return new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      return reply();
    },
  });
  const server = createServer((req, res) => void endpoint.handle(req, res, server.address().port));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function check(expected, status = 502) {
    const response = await fetch(origin, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: '{}',
    });
    const text = await response.text();
    assert.equal(response.status, status);
    assert.ok(!text.includes(secret));
    assert.deepEqual(JSON.parse(text), expected);
  }
  try {
    for (const [reason, code] of [
      ['dailyLimitExceeded', 'quota'],
      ['quotaExceeded', 'quota'],
      ['rateLimitExceeded', 'quota'],
      ['userRateLimitExceeded', 'quota'],
      ['SERVICE_DISABLED', 'api-disabled'],
      ['API_KEY_INVALID', 'credentials'],
      ['API_KEY_EXPIRED', 'credentials'],
      ['API_KEY_HTTP_REFERRER_BLOCKED', 'access-denied'],
      ['API_KEY_SERVICE_BLOCKED', 'access-denied'],
      ['API_KEY_IP_ADDRESS_BLOCKED', 'access-denied'],
      ['accessNotConfigured', 'access-denied'],
    ]) {
      for (const format of ['legacy', 'rpc']) {
        reply = () =>
          Response.json(
            {
              error: {
                message: secret,
                ...(format === 'legacy'
                  ? { errors: [{ reason, message: secret }] }
                  : {
                      details: [
                        {
                          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                          domain: 'googleapis.com',
                          reason,
                          metadata: { key: secret },
                        },
                      ],
                    }),
              },
            },
            { status: 403 },
          );
        await check(
          { error: code, providerStatus: 403, providerReason: reason },
          code === 'quota' ? 429 : 502,
        );
      }
    }
    reply = () => Response.json({ error: { errors: [{ reason: secret }] } }, { status: 403 });
    await check({ error: 'access-denied', providerStatus: 403 });
    reply = () => Response.json({ error: { status: 'RESOURCE_EXHAUSTED' } }, { status: 403 });
    await check({ error: 'quota', providerStatus: 403 }, 429);
    reply = () => new Response('<html>Bad Gateway</html>', { status: 502 });
    await check({ error: 'unavailable', providerStatus: 502 });
    reply = () => new Response('not JSON');
    await check({ error: 'invalid-response' });
    for (const items of [
      [],
      [null],
      [{ family: 'Lora', category: 'serif', variants: ['regular'] }, null],
      [{ family: 'Lora', category: 'serif', variants: ['unknown'] }],
    ]) {
      reply = () => Response.json({ items });
      await check({ error: 'invalid-response' });
    }
    reply = () => {
      throw new Error(secret);
    };
    await check({ error: 'network' });
    reply = undefined;
    await check({ error: 'timeout' });
    configurationBroken = true;
    await check({ error: 'configuration' }, 503);
    configurationBroken = false;
    reply = () =>
      Response.json({ items: [{ family: 'Lora', category: 'serif', variants: ['regular'] }] });
    await check(
      { families: [{ family: 'Lora', category: 'serif', weights: [400], italic: false }] },
      200,
    );
  } finally {
    endpoint.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
