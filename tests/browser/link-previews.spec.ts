import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { start, world, snapshot, capture, moveMaterial } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { assignMaterial } from './interaction-helpers';

const url = 'https://example.org/article';
const ready = {
  status: 'ready',
  checkedAt: 123,
  resolvedUrl: url,
  title: 'Título publicado real',
  description: 'Descripción publicada por el sitio',
  siteName: 'Ejemplo',
};
async function add(page: import('@playwright/test').Page, value = url): Promise<string> {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill(value);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  return (await world(page)).nodes.at(-1)!.id;
}
async function paste(page: import('@playwright/test').Page, text: string): Promise<void> {
  // Evento DOM de pegado: no altera el portapapeles del usuario ni se presenta como Ctrl+V nativo.
  await page.evaluate((text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
  }, text);
}

test('C08-B87: formulario, pegado, portada local, recarga y editor conservan contenido real', async ({
  page,
}, info) => {
  await start(page);
  let requests = 0;
  const png = await readFile('tests/fixtures/link-cover.png');
  await page.route('**/api/link-preview', async (route) => {
    requests++;
    await route.fulfill({
      json: { ...ready, image: { mime: 'image/png', data: png.toString('base64') } },
    });
  });
  const id = await add(page);
  const card = page.locator(`[data-node="${id}"] .link-card`);
  await expect(card).toHaveAttribute('data-preview-status', 'ready');
  await expect(card.locator('strong')).toHaveText(ready.title);
  await expect
    .poll(() =>
      card
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth),
    )
    .toBe(160);
  expect(await card.locator('img').getAttribute('src')).toMatch(/^blob:/);
  const before = (await world(page)).nodes[0]!;
  await page.reload();
  await expect(card).toHaveAttribute('data-preview-status', 'ready');
  await expect
    .poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(160);
  expect(requests).toBe(1);
  expect((await world(page)).nodes[0]).toEqual(before);
  await page.locator(`[data-node="${id}"]`).focus();
  await paste(page, url);
  await expect.poll(async () => (await world(page)).nodes.length).toBe(2);
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  const input = page.getByLabel('Dirección del enlace');
  await input.focus();
  await paste(page, 'https://example.org/inside-editor');
  expect((await world(page)).nodes.length).toBe(2);
  await page.getByRole('button', { name: 'Cerrar formulario de enlace', exact: true }).click();
  await capture(page, info, 'link-cover-persisted');
});

test('C08-B88: respuesta tardía durante nombre, movimiento, borrado y Undo conserva identidad', async ({
  page,
}) => {
  await start(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/link-preview', async (route) => {
    await gate;
    await route.fulfill({ json: ready });
  });
  const id = await add(page);
  const material = page.locator(`[data-node="${id}"]`);
  await expect(material.locator('.link-card')).toHaveAttribute('data-preview-status', 'loading');
  await moveMaterial(page, id, 470, 350);
  await material.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Renombrar', exact: false }).click();
  const input = page.getByLabel('Nombre del material');
  await input.fill('Mi nombre manual');
  release();
  await expect(material.locator('.link-card')).toHaveAttribute('data-preview-status', 'ready');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Mi nombre manual');
  await input.press('Enter');
  const saved = (await world(page)).nodes[0]!;
  expect(saved.data).toMatchObject({ title: 'Mi nombre manual', metadata: { title: ready.title } });
  await material.focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('dialog.removal-dialog')).toHaveCount(0);
  await expect(material).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(material).toHaveCount(1);
  expect((await world(page)).nodes[0]).toEqual(saved);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route('**/api/link-preview', async (route) => {
    await pending;
    await route.fulfill({ json: { ...ready, resolvedUrl: url + '/removed' } });
  });
  const deleted = await add(page, url + '/removed');
  await page.locator(`[data-node="${deleted}"]`).focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('dialog.removal-dialog')).toHaveCount(0);
  finish();
  await page.waitForResponse('**/api/link-preview');
  await expect.poll(async () => (await world(page)).nodes.map((n) => n.id)).toEqual([id]);
});

test('C08-B89: fallos, retry, HTML no confiable y portada corrupta conservan el enlace', async ({
  page,
}, info) => {
  await start(page);
  let count = 0;
  await page.route('**/api/link-preview', async (route) => {
    count++;
    await route.fulfill({
      json:
        count === 1
          ? { status: 'error', checkedAt: 123, resolvedUrl: url, problem: 'fetch-failed' }
          : {
              ...ready,
              title: '<script>alert(1)</script>',
              image: {
                mime: 'image/png',
                data: Buffer.from('no es una imagen').toString('base64'),
              },
            },
    });
  });
  const id = await add(page),
    card = page.locator(`[data-node="${id}"] .link-card`);
  await expect(card).toHaveAttribute('data-preview-status', 'error');
  await expect(card.getByRole('status')).toContainText('No se pudo');
  await card.getByRole('button', { name: 'Reintentar vista previa' }).click();
  await expect(card).toHaveAttribute('data-preview-status', 'ready');
  await expect(card.locator('strong')).toHaveText('<script>alert(1)</script>');
  await expect(card.locator('script,img')).toHaveCount(0);
  await expect(card.getByRole('status')).toContainText('Portada');
  expect((await world(page)).nodes[0]!.data).toMatchObject({ url });
  await capture(page, info, 'link-partial-error');
});

test('C08-B90: archivo autónomo conserva tarjetas guardadas y explica la falta del servicio @standalone', async ({
  page,
  context,
}) => {
  await start(page);
  await page.route('**/api/link-preview', async (route) => route.fulfill({ json: ready }));
  const id = await add(page);
  await expect(page.locator(`[data-node="${id}"] .link-card`)).toHaveAttribute(
    'data-preview-status',
    'ready',
  );
  const current = await snapshot(page);
  const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8')) as {
    artifact: string;
  };
  const file = await context.newPage();
  try {
    await file.goto(pathToFileURL(resolve('dist', manifest.artifact)).href);
    await expect.poll(() => file.evaluate(() => window.__everettReady)).toBe(true);
    await storedFixture(file, current.state, current.ui);
    await file.reload();
    await expect(file.locator(`[data-node="${id}"] .link-card strong`)).toHaveText(ready.title);
    const other = await add(file, url + '/offline');
    const card = file.locator(`[data-node="${other}"] .link-card`);
    await expect(card).toHaveAttribute('data-preview-status', 'error');
    await expect(card.getByRole('status')).toContainText('servicio local');
    expect((await world(file)).nodes.find((n) => n.id === other)?.data).toMatchObject({
      url: url + '/offline',
    });
  } finally {
    await file.close();
  }
});

test('C08-B91: servicio HTTP y parser reales integran portada, zoom, viewer y apertura del destino', async ({
  page,
}, info) => {
  // Servidor y parser de producción; solo el origen remoto usa bytes públicos controlados.
  const { createLocalServer } = await import(
    pathToFileURL(resolve('scripts/local-server.mjs')).href
  );
  const { extractPreview } = await import(
    pathToFileURL(resolve('scripts/link-preview/extract.mjs')).href
  );
  const png = await readFile('tests/fixtures/link-cover.png');
  const resource = async (target: string) => ({
    url: target,
    contentType: target.endsWith('.png') ? 'image/png' : 'text/html',
    bytes: target.endsWith('.png')
      ? png
      : Buffer.from(
          '<title>Publicado por el parser</title><meta name="description" content="' +
            'Contenido HTML del destino '.repeat(120) +
            '"><meta property="og:image" content="/cover.png"><main><article><h1>Publicado por el parser</h1><p>' +
            'Contenido legible del destino. '.repeat(120) +
            '</p><pre><code>' +
            'linea de codigo larga '.repeat(80) +
            '</code></pre></article></main>',
        ),
  });
  const extract = (target: string, options: object) =>
    extractPreview(target, { ...options, resource });
  let server: ReturnType<typeof createLocalServer>;
  let close: () => Promise<void>;
  if (info.config.metadata.targetKind === 'development') {
    const { createServer } = await import('vite');
    const { developmentConfig, developmentPlugin } = await import(
      pathToFileURL(resolve('scripts/development.mjs')).href
    );
    const config = await developmentConfig(process.cwd());
    const vite = await createServer({
      ...config,
      configFile: false,
      cacheDir: info.outputPath('vite-cache'),
      server: { ...config.server, port: 0 },
      plugins: [developmentPlugin(process.cwd(), { extract })],
    });
    await vite.listen();
    server = vite.httpServer;
    close = () => vite.close();
  } else {
    const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8')) as {
      artifact: string;
    };
    server = createLocalServer(await readFile(resolve('dist', manifest.artifact)), manifest, {
      extract,
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  }
  try {
    await page.unroute('**/api/link-preview');
    await page.goto(`http://127.0.0.1:${server.address().port}/?seed=42`);
    await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
    await start(page);
    const id = await add(page),
      material = page.locator(`[data-node="${id}"]`),
      card = material.locator('.link-card');
    await expect(card).toHaveAttribute('data-preview-status', 'ready');
    await expect(card.locator('strong')).toHaveText('Publicado por el parser');
    await expect
      .poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(160);
    const before = (await world(page)).nodes[0]!;
    await moveMaterial(page, id, 500, 350);
    const moved = (await world(page)).nodes[0]!;
    expect(moved.data).toEqual(before.data);
    const box = (await material.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200);
    await page.mouse.wheel(0, 200);
    expect((await world(page)).nodes[0]).toEqual(moved);
    await material.dblclick();
    await expect(page.locator('.reader-content > h2')).toHaveText('Publicado por el parser');
    await expect(page.locator('.reader-content')).toContainText('Contenido legible del destino');
    await page.setViewportSize({ width: 390, height: 760 });
    const contained = () =>
      page
        .locator('.reader-scroll')
        .evaluate((scroll) => scroll.scrollWidth <= scroll.clientWidth + 1);
    await expect.poll(contained).toBe(true);
    const content = page.locator('.reader-content');
    await content.evaluate((element) => (element.style.minWidth = '4000px'));
    expect(await contained()).toBe(false);
    await content.evaluate((element) => element.removeAttribute('style'));
    await expect.poll(contained).toBe(true);
    const destination = page.getByRole('link', { name: /Abrir original/ });
    await expect(destination).toHaveAttribute('href', url);
    await expect(destination).toHaveAttribute('rel', 'noopener noreferrer');
    await page
      .context()
      .route(url, (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>Destino real del enlace</title>' }),
      );
    const opened = page.waitForEvent('popup');
    await destination.click();
    const popup = await opened;
    await expect(popup).toHaveURL(url);
    await popup.close();
    await capture(page, info, 'real-http-link-viewer');
    await page.keyboard.press('Escape');
    await expect(page.locator(`[data-node="${id}"] .link-card img`)).toBeVisible();
  } finally {
    await close();
  }
});

test('C08-B92: llegada durante propuesta actualiza zona y resultado sin cambiar contenido ni propiedad', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.zones = [
    {
      id: 'preview-zone',
      name: 'Referencias',
      agent: 'eve',
      x: 220,
      y: -150,
      width: 300,
      height: 300,
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/link-preview', async (route) => {
    await gate;
    await route.fulfill({ json: ready });
  });
  const id = await add(page);
  await assignMaterial(page, id);
  await expect.poll(async () => (await world(page)).assignments[0]?.phase).toBe('ready');
  const before = await world(page);
  await page.locator('[data-zone=preview-zone]').press('Enter');
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  await expect(page.locator('.proposal-preview .link-card')).toHaveAttribute(
    'data-preview-status',
    'loading',
  );
  release();
  await expect(page.locator(`[data-assigned-id="${id}"] .link-card strong`)).toHaveText(
    ready.title,
  );
  const after = await world(page);
  expect(after.nodes[0]?.owner).toEqual(before.nodes[0]?.owner);
  expect(after.assignments[0]?.phase).toBe('ready');
  expect(after.assignments[0]?.output?.[0]?.material.data).toMatchObject({
    kind: 'link',
    url,
    metadata: { title: ready.title },
  });
  await expect(page.locator('.proposal-preview .link-card strong')).toHaveText(ready.title);
  await expect(page.locator('.proposal-preview .link-card button')).toHaveCount(0);
  await capture(page, info, 'link-in-zone-and-proposal');
  await page.getByRole('button', { name: 'Aceptar propuesta', exact: true }).click();
  const accepted = (await world(page)).nodes.find((n) => n.id.startsWith('proposal-'))!;
  expect(accepted.data).toMatchObject({ kind: 'link', url, metadata: { title: ready.title } });
  await expect(page.locator(`[data-node="${accepted.id}"] .link-card strong`)).toHaveText(
    ready.title,
  );
});

test('C08-B93: cuota de almacenamiento y refresh fallido conservan el enlace y la última portada válida', async ({
  page,
}) => {
  await start(page);
  const png = await readFile('tests/fixtures/link-cover.png');
  let count = 0;
  await page.route('**/api/link-preview', async (route) => {
    count++;
    await route.fulfill({
      json:
        count < 3
          ? { ...ready, image: { mime: 'image/png', data: png.toString('base64') } }
          : { status: 'error', problem: 'fetch-failed', checkedAt: 456, resolvedUrl: url },
    });
  });
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => {
      IDBObjectStore.prototype.put = put;
    };
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (this.name === 'assets')
        throw new DOMException('Cuota agotada para la prueba', 'QuotaExceededError');
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    };
  });
  const id = await add(page),
    card = page.locator(`[data-node="${id}"] .link-card`);
  await expect(card).toHaveAttribute('data-preview-status', 'error');
  await expect(card.getByRole('status')).toContainText('conservar la portada');
  await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut());
  await card.getByRole('button', { name: 'Reintentar vista previa' }).click();
  await expect(card).toHaveAttribute('data-preview-status', 'ready');
  await expect
    .poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(160);
  await card.getByRole('button', { name: 'Actualizar vista previa' }).click();
  await expect(card).toHaveAttribute('data-preview-status', 'error');
  await expect(card.locator('strong')).toHaveText(ready.title);
  await expect
    .poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(160);
  expect((await world(page)).nodes[0]?.data).toMatchObject({ url, title: 'example.org/article' });
});
