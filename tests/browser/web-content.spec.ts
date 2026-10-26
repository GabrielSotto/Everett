import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, world, snapshot, capture, moveMaterial } from './canvas-utility-helpers';
import { storedFixture, videoFixture } from './canvas-fixtures';

const url = 'https://example.org/reference';
const readerHtml =
  '<h2 id="section">Contenido consultable</h2><p>' +
  'Decisión técnica conservada con su contexto. '.repeat(100) +
  '</p><pre><code>const value = 42;</code></pre><table><tr><th>Origen</th><td>Web</td></tr></table><a href="https://example.org/second">Seguir leyendo</a><script>window.injected=true</script><img src="https://evil.example/tracking.png" onerror="window.injected=true">';
const ready = (html = readerHtml, title = 'Referencia técnica') => ({
  status: 'ready',
  checkedAt: 123,
  resolvedUrl: url,
  title,
  reader: { html, title, byline: 'Autor', text: 'Decisión técnica', capturedAt: 123 },
});
async function add(page: Page, value = url): Promise<string> {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill(value);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  return (await world(page)).nodes.at(-1)!.id;
}
async function bytes(page: Page, asset: string): Promise<number[]> {
  return page.evaluate(async (asset) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('everett-canvas');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      const file = await new Promise<Blob>((resolve, reject) => {
        const r = db.transaction('assets').objectStore('assets').get(asset);
        r.onsuccess = () => resolve(r.result as Blob);
        r.onerror = () => reject(r.error);
      });
      return [...new Uint8Array(await file.arrayBuffer())];
    } finally {
      db.close();
    }
  }, asset);
}

test('C08-B94: lectura persistida, scroll, navegación con una flecha y sanitización', async ({
  page,
}, info) => {
  await start(page);
  let count = 0;
  let finishSecond!: () => void;
  const loading = new Promise<void>((resolve) => {
    finishSecond = resolve;
  });
  await page.route('**/api/link-preview', async (route) => {
    count++;
    const request = route.request().postDataJSON() as { url: string };
    if (request.url.endsWith('second')) await loading;
    await route.fulfill({
      json: request.url.endsWith('second')
        ? ready('<p>' + 'Segunda página de la referencia. '.repeat(50) + '</p>', 'Segunda página')
        : ready(),
    });
  });
  const id = await add(page);
  await page.locator(`[data-node="${id}"] .link-open`).click();
  await expect(page.locator('.reader-content')).toContainText('const value = 42;');
  await expect(page.locator('.reader-content table')).toHaveCount(1);
  await expect(page.locator('.reader-content script,.reader-content img')).toHaveCount(0);
  expect(await page.evaluate(() => 'injected' in window)).toBe(false);
  await expect(page.getByRole('button', { name: 'Actualizar contenido' })).toHaveCount(0);
  const scroll = page.locator('.reader-scroll');
  await scroll.hover();
  await page.mouse.wheel(0, 420);
  await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(200);
  await page.locator('.reader-content a').click();
  await expect(page.locator('.reader-update-status')).toContainText('Recuperando lectura');
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  finishSecond();
  await expect(page.locator('.reader-content')).toContainText('const value = 42;');
  await page.locator('.reader-content a').click();
  await expect(page.locator('.reader-content > h2')).toHaveText('Segunda página');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.locator('.reader-content')).toContainText('const value = 42;');
  const data = (await world(page)).nodes[0]!.data as { metadata: { readerAsset: string } };
  const saved = await bytes(page, data.metadata.readerAsset);
  const requests = count;
  await page.reload();
  await expect(page.locator('.reader-content')).toContainText('const value = 42;');
  expect(await bytes(page, data.metadata.readerAsset)).toEqual(saved);
  expect(count).toBe(requests);
  await page.setViewportSize({ width: 390, height: 760 });
  await expect.poll(() => scroll.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await capture(page, info, 'lectura-local-estrecha');
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
});

test('C08-B95: imagen y video desde URL conservan bytes, proporción, reproducción y alias tardío', async ({
  page,
  context,
}, info) => {
  await start(page);
  const png = await readFile('tests/fixtures/link-cover.png');
  const video = await videoFixture(context, 1500);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/link-preview', async (route) => {
    const target = (route.request().postDataJSON() as { url: string }).url;
    if (target.endsWith('image')) await gate;
    await route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: target,
        file: target.endsWith('image')
          ? { kind: 'image', mime: 'image/png', data: png.toString('base64') }
          : { kind: 'video', mime: 'video/webm', data: video.toString('base64') },
      },
    });
  });
  const image = await add(page, url + '/image');
  await moveMaterial(page, image, 450, 310);
  await page.locator(`[data-node="${image}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Renombrar', exact: false }).click();
  const input = page.getByLabel('Nombre del material');
  await input.fill('Referencia propia');
  release();
  await expect.poll(async () => (await world(page)).nodes[0]?.data.kind).toBe('image');
  await expect(input).toBeFocused();
  await input.press('Enter');
  const imageData = (await world(page)).nodes[0]!.data as {
    asset: string;
    ratio: number;
    title: string;
    source: string;
  };
  expect(imageData.title).toBe('Referencia propia');
  expect(imageData.source).toBe(url + '/image');
  expect(await bytes(page, imageData.asset)).toEqual([...png]);
  await expect
    .poll(() =>
      page
        .locator(`[data-node="${image}"] img`)
        .first()
        .evaluate((e: HTMLImageElement) => e.naturalWidth),
    )
    .toBe(160);
  const movie = await add(page, url + '/video');
  await expect
    .poll(async () => (await world(page)).nodes.find((n) => n.id === movie)?.data.kind)
    .toBe('video');
  await moveMaterial(page, movie, 800, 420);
  const movieData = (await world(page)).nodes.find((n) => n.id === movie)!.data as {
    asset: string;
    ratio: number;
  };
  expect(await bytes(page, movieData.asset)).toEqual([...video]);
  const native = page.locator(`[data-node="${movie}"] video`);
  await page
    .locator(`[data-node="${movie}"]`)
    .getByRole('button', { name: 'Reproducir video', exact: true })
    .click();
  await expect
    .poll(() => native.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0))
    .toBe(true);
  await page.reload();
  await expect
    .poll(() =>
      page.locator(`[data-node="${movie}"] video`).evaluate((v: HTMLVideoElement) => v.videoWidth),
    )
    .toBe(160);
  expect(await bytes(page, movieData.asset)).toEqual([...video]);
  expect(await bytes(page, imageData.asset)).toEqual([...png]);
  const material = (await world(page)).nodes.find((n) => n.id === movie)!;
  expect(material.width / material.height).toBeCloseTo(movieData.ratio, 5);
  await capture(page, info, 'medios-remotos-con-bytes-locales');
});

test('C08-B96: portapapeles nativo y menú Pegar incorporan URLs e imágenes y respetan editores', async ({
  page,
  context,
}, info) => {
  await start(page);
  // Chromium headless de la prueba; no se opera el portapapeles de la pestaña del usuario.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/api/link-preview', async (route) => route.fulfill({ json: ready() }));
  await page.evaluate(() => navigator.clipboard.writeText('https://example.org/native'));
  await page.locator('.canvas-stage').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(1);
  await page.evaluate(() => navigator.clipboard.writeText('https://example.org/menu'));
  await page.locator('.canvas-stage').click({ button: 'right', position: { x: 30, y: 30 } });
  await page.getByRole('menuitem', { name: 'Pegar', exact: false }).click();
  await expect.poll(async () => (await world(page)).nodes.length).toBe(2);
  const png = [...(await readFile('tests/fixtures/link-cover.png'))];
  await page.evaluate(
    async (png) =>
      navigator.clipboard.write([
        new ClipboardItem({
          'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }),
          'text/html': new Blob(['<img src="https://example.org/original.png">'], {
            type: 'text/html',
          }),
        }),
      ]),
    png,
  );
  await page.locator('.canvas-stage').click({ position: { x: 40, y: 40 } });
  await page.keyboard.press('Control+v');
  await expect
    .poll(async () => (await world(page)).nodes.filter((n) => n.data.kind === 'image').length)
    .toBe(1);
  expect((await world(page)).nodes.find((n) => n.data.kind === 'image')!.data).toMatchObject({
    source: 'https://example.org/original.png',
  });
  await page.evaluate(() => navigator.clipboard.writeText('www.example.org/editor'));
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  const input = page.getByLabel('Dirección del enlace');
  await input.focus();
  await page.keyboard.press('Control+v');
  await expect(input).toHaveValue('www.example.org/editor');
  expect((await world(page)).nodes.length).toBe(3);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  await expect.poll(async () => (await world(page)).nodes.length).toBe(4);
  expect((await world(page)).nodes.at(-1)!.data).toMatchObject({
    url: 'https://www.example.org/editor',
  });
  await page.evaluate(() => {
    navigator.clipboard.read = () => Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await page.locator('.canvas-stage').click({ button: 'right', position: { x: 30, y: 30 } });
  await page.getByRole('menuitem', { name: 'Pegar', exact: false }).click();
  await expect(
    page.getByText('El navegador no permitió leer el portapapeles. Pegá acá con Ctrl+V.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Pegá una imagen o enlace').focus();
  await page.keyboard.press('Control+v');
  await expect.poll(async () => (await world(page)).nodes.length).toBe(5);
  await expect(page.getByRole('dialog', { name: 'Pegar en Canvas', exact: true })).toHaveCount(0);
  await capture(page, info, 'pegado-y-permiso-rechazado');
});

test('C08-B97: proveedor usa iframe oficial, reproduce contenido y explica rechazo sin perder origen', async ({
  page,
  context,
}, info) => {
  await start(page);
  const movie = await videoFixture(context, 1500);
  await page.route('**/api/link-preview', async (route) =>
    route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: 'https://youtu.be/abc123def45',
        title: 'Video de referencia',
        embed: { provider: 'youtube', id: 'abc123def45' },
      },
    }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', async (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<video id="video" controls src="data:video/webm;base64,${movie.toString('base64')}"></video><button onclick="document.getElementById('video').play()">Reproducir prueba</button>`,
    }),
  );
  const id = await add(page, 'https://youtu.be/abc123def45');
  await page.locator(`[data-node="${id}"] .link-open`).click();
  await expect(page.locator('.provider-play')).toHaveCount(0);
  const iframe = page.locator('.provider-video iframe');
  await expect(iframe).toHaveAttribute(
    'src',
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/abc123def45\?/,
  );
  await page
    .frameLocator('.provider-video iframe')
    .getByRole('button', { name: 'Reproducir prueba' })
    .click();
  await expect
    .poll(() =>
      page
        .frameLocator('.provider-video iframe')
        .locator('video')
        .evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0),
    )
    .toBe(true);
  await page
    .frameLocator('.provider-video iframe')
    .locator('body')
    .evaluate(() => parent.postMessage(JSON.stringify({ event: 'onError', info: 150 }), '*'));
  await expect(page.locator('.provider-status')).toContainText('El proveedor no permite');
  await expect(page.getByRole('link', { name: /Abrir original/ })).toHaveAttribute(
    'href',
    'https://youtu.be/abc123def45',
  );
  await capture(page, info, 'video-en-consulta-y-alternativa');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(iframe).toHaveCount(0);
  await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
});

test('C08-B98: rueda continua revierte sin cola y encuadra una selección pequeña por encima del 100%', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page),
    w = input.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [
    {
      id: 'small',
      x: -20,
      y: -10,
      width: 40,
      height: 20,
      owner: null,
      data: { kind: 'shape', shape: 'rectangle', title: 'Pequeña', color: '#fff' },
    },
  ];
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await page.evaluate(() => {
    const samples: unknown[] = [];
    (window as unknown as { wheelSamples: unknown[] }).wheelSamples = samples;
    window.addEventListener('wheel', () => {
      const before = window.EverettDebug!.snapshot().camera;
      requestAnimationFrame(() =>
        samples.push({ before, after: window.EverettDebug!.snapshot().camera }),
      );
    });
  });
  const origin = (await snapshot(page)).camera;
  await page.mouse.move(650, 300);
  for (const delta of [-120, -120, 120, 120]) await page.mouse.wheel(0, delta);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { wheelSamples: unknown[] }).wheelSamples.length),
    )
    .toBe(4);
  const after = (await snapshot(page)).camera;
  expect(after.z).toBeCloseTo(origin.z, 7);
  expect(after.x).toBeCloseTo(origin.x, 5);
  expect(after.y).toBeCloseTo(origin.y, 5);
  await page.waitForTimeout(150);
  expect((await snapshot(page)).camera).toEqual(after);
  await page.locator('[data-node=small]').focus();
  await page.keyboard.press(' ');
  await page.getByRole('button', { name: /Zoom de Canvas:/ }).click();
  await page.getByRole('button', { name: 'Ajustar a la selección', exact: true }).click();
  expect((await snapshot(page)).camera.z).toBeGreaterThan(1);
  expect((await snapshot(page)).camera.z).toBeLessThanOrEqual(6);
  const samples = await page.evaluate(
    () => (window as unknown as { wheelSamples: unknown[] }).wheelSamples,
  );
  await info.attach('zoom-sin-cola', {
    body: JSON.stringify({ origin, after, samples }),
    contentType: 'application/json',
  });
  await capture(page, info, 'seleccion-pequena-encuadrada');
});

test.describe('confirmaciones de edición', () => {
  test.use({ confirmationMode: 'manual' });
  test('C08-B99: formulario sin confirmación redundante y borrado reversible con diálogo local', async ({
    page,
  }) => {
    await start(page);
    await page.route('**/api/link-preview', async (route) => route.fulfill({ json: ready() }));
    await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
    await page.locator('[data-action=canvas-link]').click();
    const input = page.getByLabel('Dirección del enlace');
    await input.fill('no es una URL');
    await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
    await expect(page.locator('#canvas-new-link [role=status]')).toContainText('URL válida');
    await page.getByRole('button', { name: 'Cerrar formulario de enlace' }).click();
    await expect(page.locator('#canvas-new-link')).toHaveCount(0);
    await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
    await page.locator('[data-action=canvas-link]').click();
    await input.fill('example.org/reference');
    await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
    const id = (await world(page)).nodes[0]!.id;
    await page.locator(`[data-node="${id}"]`).focus();
    await page.keyboard.press('Delete');
    const dialog = page.getByRole('dialog', { name: '¿Eliminar del Canvas?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect((await world(page)).nodes.length).toBe(1);
    await page.keyboard.press('Delete');
    await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect.poll(async () => (await world(page)).nodes.length).toBe(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
  });
});
