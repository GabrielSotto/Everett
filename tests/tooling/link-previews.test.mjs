import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';

// Importar el módulo original conserva la resolución de dependencias Node/CJS.
const moduleAt = (path) => import(pathToFileURL(resolve(path)).href);
const publicApi = await moduleAt('scripts/link-preview/public-fetch.mjs');
const { extractPreview } = await moduleAt('scripts/link-preview/extract.mjs');
const { createLocalServer } = await moduleAt('scripts/local-server.mjs');
const { extractReader } = await moduleAt('scripts/link-preview/reader.mjs');
const { providerVideo } = await moduleAt('scripts/link-preview/providers.mjs');

test('C08-U30: lectura real conserva estructura y bytes de ilustraciones sin navegación ni código ejecutable', async () => {
  const prose = 'Contenido técnico para estudiar una decisión y organizar sus referencias. '.repeat(
    30,
  );
  const source = `<html><head><title>Guía técnica</title></head><body><nav>${'navegacion '.repeat(120000)}</nav><main><article><h1>Guía técnica</h1><p>${prose}</p><pre><code>const answer = 42;</code></pre><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><p>${prose}</p><a href="../next#part">Continuar</a><img src="/figure.png" alt="Figura"><script>bad()</script><iframe src="https://evil.example/"></iframe></article></main></body></html>`;
  const png = await readFile('tests/fixtures/link-cover.png');
  const reader = await extractReader(source, 'https://example.org/docs/guide', {
    resource: async (url) => ({ url, bytes: png }),
  });
  assert.ok(reader.html.includes('const answer = 42;'));
  assert.ok(reader.html.includes('<table>'));
  assert.ok(reader.html.includes('data:image/png;base64,'));
  assert.ok(reader.html.includes('https://example.org/next#part'));
  assert.ok(!reader.html.includes('navegacion'));
  assert.ok(!reader.html.includes('<script'));
  assert.ok(!reader.html.includes('<iframe'));
  const heading = await extractReader(
    `<article><h1>Título<a class="headerlink" href="#heading">\uf0c1</a></h1><p>${prose}</p><span aria-hidden="true">icono oculto</span></article>`,
    'https://example.org/guide',
  );
  assert.ok(!heading.html.includes('\uf0c1'));
  assert.ok(!heading.html.includes('icono oculto'));
  assert.ok(
    (
      await extractReader(
        '<title>App</title><div id="app"></div><script>render()</script>',
        'https://example.org/',
      )
    ).problem,
  );
  const requested = [];
  const result = await extractPreview('https://example.org/docs', {
    resource: async (url, maximum) => {
      requested.push(typeof maximum === 'function' ? maximum('text/html') : maximum);
      return { url, contentType: 'text/html', bytes: Buffer.from(source) };
    },
  });
  assert.equal(requested[0], 8 * 1024 * 1024);
  assert.equal(result.title, 'Guía técnica');
  assert.ok(result.reader.html.includes('answer = 42'));
});

test('C08-U31: formatos reales y proveedores se reconocen sin confiar en extensiones ni hosts parecidos', async () => {
  const png = await readFile('tests/fixtures/link-cover.png');
  const result = await extractPreview('https://example.org/no-extension', {
    resource: async (url) => ({ url, contentType: 'application/octet-stream', bytes: png }),
  });
  assert.equal(result.file.kind, 'image');
  assert.equal(result.file.mime, 'image/png');
  assert.deepEqual(Buffer.from(result.file.data, 'base64'), png);
  assert.deepEqual(providerVideo('https://youtu.be/abc123def45'), {
    provider: 'youtube',
    id: 'abc123def45',
  });
  assert.deepEqual(providerVideo('https://www.youtube.com/shorts/abc123def45'), {
    provider: 'youtube',
    id: 'abc123def45',
  });
  assert.deepEqual(providerVideo('https://vimeo.com/123456'), { provider: 'vimeo', id: '123456' });
  for (const url of [
    'https://youtube.com.evil.example/watch?v=abc123def45',
    'https://evil.example/?url=https://youtu.be/abc123def45',
    'https://youtube.com/',
  ])
    assert.equal(providerVideo(url), null);
  const embed = await extractPreview('https://youtu.be/abc123def45', {
    resource: async (url) => ({
      url,
      contentType: 'application/json',
      bytes: Buffer.from(JSON.stringify({ title: 'Video publicado' })),
    }),
  });
  assert.equal(embed.title, 'Video publicado');
  assert.equal(embed.embed.id, 'abc123def45');
});

test('C08-U27: parser MIT extrae OG, HTML, charset y portadas sin ejecutar contenido externo', async () => {
  const png = await readFile('tests/fixtures/link-cover.png');
  const requested = [];
  const resource = async (url, maximum) => {
    requested.push({ url, maximum });
    return url.endsWith('.png')
      ? { url, contentType: 'image/png', bytes: png }
      : {
          url: 'https://example.org/final/article',
          contentType: 'text/html; charset=utf-8',
          bytes: Buffer.from(
            '<meta property="og:title" content="Título &amp; real"><meta property="og:description" content="Descripción"><meta property="og:image" content="../cover.png"><script>throw 1</script>',
          ),
        };
  };
  const preview = await extractPreview('https://example.org/article', { resource });
  assert.equal(preview.status, 'ready');
  assert.equal(preview.title, 'Título & real');
  assert.equal(preview.description, 'Descripción');
  assert.equal(preview.resolvedUrl, 'https://example.org/final/article');
  assert.deepEqual(Buffer.from(preview.image.data, 'base64'), png);
  assert.equal(requested[1].url, 'https://example.org/cover.png');
  const html = async (body) =>
    extractPreview('https://example.org/', {
      resource: async (url) => ({ url, contentType: 'text/html', bytes: body }),
    });
  assert.equal(
    (
      await html(
        Buffer.from('<title>Fallback</title><meta name="description" content="Texto HTML">'),
      )
    ).title,
    'Fallback',
  );
  assert.equal(
    (await html(Buffer.from('<meta charset="iso-8859-1"><title>Caf\xe9</title>', 'latin1'))).title,
    'Café',
  );
  assert.equal((await html(Buffer.from('<html></html>'))).status, 'unavailable');
  const broken = await extractPreview('https://example.org/', {
    resource: async (url) => {
      if (url.endsWith('.png')) throw new Error('Archivo ausente');
      return {
        url,
        contentType: 'text/html',
        bytes: Buffer.from(
          '<title>Conservar título</title><meta property="og:image" content="/broken.png">',
        ),
      };
    },
  });
  assert.equal(broken.title, 'Conservar título');
  assert.equal(broken.problem, 'image-unavailable');
  assert.equal(
    (
      await extractPreview('https://example.org/', {
        resource: async (url) => ({
          url,
          contentType: 'application/pdf',
          bytes: Buffer.from('PDF'),
        }),
      })
    ).problem,
    'not-html',
  );
});

test('C08-U28: descarga limita bytes y rechaza redes privadas, credenciales y resolución mixta', async () => {
  const { publicAddress, publicUrl, publicLookup, limitedBody } = publicApi;
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.1',
    '172.16.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '224.0.0.1',
    'bad',
  ])
    assert.equal(publicAddress(ip), false, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])
    assert.equal(publicAddress(ip), true, ip);
  for (const url of [
    'http://2130706433/',
    'http://0x7f000001/',
    'http://[::1]/',
    'http://localhost/',
    'http://a.localhost/',
    'file:///etc/passwd',
    'https://u:p@example.org/',
  ])
    assert.throws(() => publicUrl(url), undefined, url);
  assert.equal(publicUrl('https://example.org/a#fragment').href, 'https://example.org/a');
  await assert.rejects(
    publicLookup('example.org', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
  );
  await assert.rejects(publicLookup('example.org', async () => []));
  assert.equal(
    (await publicLookup('example.org', async () => [{ address: '8.8.8.8', family: 4 }])).address,
    '8.8.8.8',
  );
  await assert.rejects(
    limitedBody(new Response('large', { headers: { 'content-length': '100' } }), 4),
  );
  await assert.rejects(
    limitedBody(new Response('large', { headers: { 'content-length': '1' } }), 4),
  );
  assert.equal((await limitedBody(new Response('ok'), 4)).toString(), 'ok');
  let calls = 0;
  await assert.rejects(
    publicApi.fetchPublicResource('https://example.org/', 20, undefined, async () => {
      calls++;
      return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/secret' } });
    }),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    publicApi.fetchPublicResource(
      'https://example.org/',
      20,
      undefined,
      async () =>
        new Response('', { status: 302, headers: { location: 'http://example.org/insecure' } }),
    ),
  );
  calls = 0;
  await assert.rejects(
    publicApi.fetchPublicResource('https://example.org/', 20, undefined, async () => {
      calls++;
      return new Response('', { status: 302, headers: { location: '/loop' } });
    }),
  );
  assert.equal(calls, 6);
});

test('C08-U29: API HTTP valida origen, coalescencia, refresh, errores y cuerpos UTF8', async () => {
  let calls = 0;
  const server = createLocalServer(
    Buffer.from('fixture'),
    { artifact: 'fixture.html' },
    {
      extract: async (url) => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (url.includes('missing-host'))
          throw new Error('fetch failed', { cause: { code: 'ENOTFOUND' } });
        if (url.includes('failure')) throw new Error('Fallo controlado');
        return { status: 'ready', checkedAt: 123, resolvedUrl: url, title: 'Título real' };
      },
    },
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', Origin: origin };
  const post = (body, extra = {}) =>
    fetch(origin + '/api/link-preview', {
      method: 'POST',
      headers: { ...headers, ...extra },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await post({ url: 'https://example.org/' }, { Origin: 'https://evil.org' })).status,
      403,
    );
    assert.equal(
      (await post({ url: 'https://example.org/' }, { 'Content-Type': 'text/plain' })).status,
      403,
    );
    assert.equal(
      (await post({ url: 'https://example.org/', padding: 'x'.repeat(9000) })).status,
      413,
    );
    assert.equal((await (await post({ url: 'http://127.0.0.1/' })).json()).problem, 'invalid-url');
    assert.equal(calls, 0);
    const values = await Promise.all([
      post({ url: 'https://example.org/' }),
      post({ url: 'https://example.org/' }),
    ]);
    assert.equal(calls, 1);
    assert.equal((await values[0].json()).title, 'Título real');
    await post({ url: 'https://example.org/' });
    assert.equal(calls, 1);
    await post({ url: 'https://example.org/', refresh: true });
    assert.equal(calls, 2);
    assert.equal(
      (await (await post({ url: 'https://example.org/failure' })).json()).problem,
      'fetch-failed',
    );
    assert.equal(
      (await (await post({ url: 'https://example.org/missing-host' })).json()).problem,
      'host-not-found',
    );
    const unicode = JSON.stringify({ url: 'https://example.org/café' });
    const bytes = Buffer.from(unicode);
    const split = bytes.indexOf(0xc3) + 1;
    const result = await new Promise((resolve, reject) => {
      const req = request(origin + '/api/link-preview', { method: 'POST', headers }, (res) => {
        let body = '';
        res.on('data', (b) => (body += b));
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(bytes.subarray(0, split));
      req.end(bytes.subarray(split));
    });
    assert.equal(result.resolvedUrl, 'https://example.org/caf%C3%A9');
  } finally {
    server.stopPreviews();
    await new Promise((resolve) => server.close(resolve));
  }
});
