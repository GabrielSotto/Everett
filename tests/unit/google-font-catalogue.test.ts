import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchGoogleFontCatalogue,
  FontCatalogueError,
} from '../../src/platform/google-font-catalogue';

test('C08-U74: catálogo distingue red local, proveedor, timeout, formato y código desconocido', async (t) => {
  let response: () => Promise<Response> = async () => {
    throw new TypeError('Failed to fetch private-key');
  };
  t.mock.method(globalThis, 'fetch', () => response());
  const signal = new AbortController().signal;
  const check = async (code: string, status?: number) =>
    assert.rejects(fetchGoogleFontCatalogue(signal), (error: unknown) => {
      assert.ok(error instanceof FontCatalogueError);
      assert.equal(error.code, code);
      assert.equal(error.status, status);
      assert.ok(!error.message.includes('private-key'));
      assert.ok(!error.message.includes('Failed to fetch'));
      return true;
    });
  await check('service-unreachable');
  response = async () => {
    throw new DOMException('private-key', 'TimeoutError');
  };
  await check('service-timeout');
  const messages = new Set<string>();
  for (const code of [
    'not-configured',
    'configuration',
    'credentials',
    'api-disabled',
    'access-denied',
    'invalid-request',
    'forbidden',
    'quota',
    'timeout',
    'network',
    'unavailable',
    'invalid-response',
  ]) {
    response = async () => Response.json({ error: code, message: 'private-key' }, { status: 502 });
    await check(code, 502);
    try {
      await fetchGoogleFontCatalogue(signal);
    } catch (error) {
      messages.add((error as Error).message);
    }
  }
  assert.equal(messages.size, 12);
  response = async () =>
    Response.json({ error: 'new-provider-error', message: 'private-key' }, { status: 502 });
  await check('unexpected-response', 502);
  response = async () => new Response('<html>private-key</html>', { status: 503 });
  await check('service-unavailable', 503);
  response = async () => new Response('private-key');
  await check('invalid-response', 200);
});

test('C08-U75: catálogo válido completo, respuesta parcial rechazada, recuperación y cancelación', async (t) => {
  const family = { family: 'Lora', category: 'serif', weights: [400, 700], italic: false };
  let families: unknown = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.equal(_url, '/api/google-fonts');
    assert.equal(options.body, '{}');
    assert.equal(options.method, 'POST');
    options.signal!.throwIfAborted();
    return Response.json({ families });
  });
  const controller = new AbortController();
  for (families of [
    null,
    [],
    [null],
    [family, null],
    [{ ...family, weights: [] }],
    [{ ...family, weights: [1001] }],
    [{ ...family, family: '<bad>' }],
    [{ ...family, italic: 'yes' }],
  ])
    await assert.rejects(fetchGoogleFontCatalogue(controller.signal), { code: 'invalid-response' });
  families = [family];
  assert.deepEqual(await fetchGoogleFontCatalogue(controller.signal), [family]);
  controller.abort();
  await assert.rejects(
    fetchGoogleFontCatalogue(controller.signal),
    (error) => error === controller.signal.reason,
  );
});
