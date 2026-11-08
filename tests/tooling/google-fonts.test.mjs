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
      ['400', 'credentials'],
      ['403', 'credentials'],
      ['429', 'quota'],
      ['500', 'unavailable'],
      ['network', 'network'],
      ['invalid', 'invalid-response'],
    ]) {
      mode = failure;
      const response = await send();
      assert.ok(!response.ok);
      assert.deepEqual(await response.json(), { error: code });
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
