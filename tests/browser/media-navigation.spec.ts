import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { start, world, snapshot, capture } from './canvas-utility-helpers';
import { videoFixture, storedFixture } from './canvas-fixtures';
import { assignMaterial } from './interaction-helpers';
import type { Page } from '@playwright/test';

async function add(page: Page, url: string): Promise<string> {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill(url);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  return (await world(page)).nodes.at(-1)!.id;
}
async function spatial(page: Page, direction: number): Promise<void> {
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.waitForTimeout(450);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, direction * 240);
  await page.keyboard.up('Alt');
}
const article = (title: string, link: string) => ({
  status: 'ready',
  checkedAt: 123,
  title,
  resolvedUrl: 'https://example.org/' + title,
  reader: {
    title,
    html: `<p>${'Texto de la lectura guardada. '.repeat(50)}</p><a href="https://example.org/${link}">Continuar lectura</a>`,
    text: 'Texto',
    byline: '',
    capturedAt: 123,
  },
});

test('C08-B100: zoom entra al lector, vuelve a la página anterior y después al mismo Canvas', async ({
  page,
}, info) => {
  await start(page);
  await page.route('**/api/link-preview', (route) =>
    route.fulfill({
      json: route.request().postDataJSON().url.endsWith('second')
        ? article('Segunda', 'root')
        : article('Primera', 'second'),
    }),
  );
  const id = await add(page, 'https://example.org/root');
  await expect(page.locator(`[data-node="${id}"] .link-open`)).toBeVisible();
  const camera = (await snapshot(page)).camera;
  await page.locator(`[data-node="${id}"]`).hover();
  await spatial(page, -1);
  await expect(page.locator('.reader-content > h2')).toHaveText('Primera');
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: /Volver al Canvas|Volver a la lectura|Actualizar contenido/ }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Continuar lectura' }).click();
  await expect(page.locator('.reader-content > h2')).toHaveText('Segunda');
  await page.locator('.reader-content').hover();
  await spatial(page, 1);
  await expect(page.locator('.reader-content > h2')).toHaveText('Primera');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', `scout/material/${id}`);
  await capture(page, info, 'lectura-regreso-espacial');
  await spatial(page, 1);
  await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
  expect((await snapshot(page)).camera).toEqual(camera);
});

test('C08-B101: imagen con controles reales de zoom, paneo, rotación y salida Alt sin alterar archivo', async ({
  page,
}, info) => {
  await start(page);
  const png = await readFile('tests/fixtures/link-cover.png');
  await page.route('**/api/link-preview', (route) =>
    route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: 'https://example.org/image.png',
        file: { kind: 'image', mime: 'image/png', data: png.toString('base64') },
      },
    }),
  );
  const id = await add(page, 'https://example.org/image.png');
  const card = page.locator(`[data-node="${id}"]`);
  await expect(card.locator('img')).toHaveAttribute('src', /^blob:/);
  expect(
    await card.locator('img').evaluate((e) => parseFloat(getComputedStyle(e).borderRadius)),
  ).toBeGreaterThan(0);
  const data = (await world(page)).nodes[0]!.data;
  await card.hover();
  await spatial(page, -1);
  const image = page.locator('.image-inspector img');
  await expect(image).toBeVisible();
  const initial = (await image.boundingBox())!;
  for (let i = 0; i < 10; i++)
    await page.getByRole('button', { name: 'Acercar imagen', exact: true }).click();
  await expect
    .poll(async () => (await image.boundingBox())!.width)
    .toBeGreaterThan(initial.width * 1.5);
  const before = (await image.boundingBox())!;
  const stage = (await page.locator('.image-stage').boundingBox())!;
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
  await page.mouse.down();
  await page.mouse.move(stage.x + stage.width / 2 + 80, stage.y + stage.height / 2 + 40, {
    steps: 8,
  });
  await page.mouse.up();
  await expect.poll(async () => (await image.boundingBox())!.x).not.toBeCloseTo(before.x, 0);
  await page.getByRole('button', { name: 'Rotar imagen', exact: true }).click();
  await expect(image).toHaveAttribute('style', /rotate\(90deg\)/);
  await page.getByRole('button', { name: 'Ajustar a la vista', exact: true }).click();
  await page.getByRole('button', { name: '100 %', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Zoom de imagen', exact: true })).toHaveText(
    '100 %',
  );
  await page.getByRole('button', { name: 'Ajustar a la vista', exact: true }).click();
  await capture(page, info, 'imagen-inspeccionable');
  expect((await world(page)).nodes[0]!.data).toEqual(data);
  await page.locator('.image-stage').hover();
  await spatial(page, 1);
  await expect(card).toBeVisible();
});

test('C08-B102: iframe externo inicia sin autoplay, rueda local conserva el visor y Alt permite regresar', async ({
  page,
  context,
}, info) => {
  await start(page);
  const movie = await videoFixture(context, 1500);
  const cover = await readFile('tests/fixtures/link-cover.png');
  await page.route('**/api/link-preview', (route) =>
    route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: 'https://youtu.be/abc123def45',
        title: 'Video específico',
        image: { mime: 'image/png', data: cover.toString('base64') },
        embed: { provider: 'youtube', id: 'abc123def45' },
      },
    }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<style>html,body{margin:0;height:100%;overflow:hidden}video{width:100%;height:100%}</style><video controls muted loop src="data:video/webm;base64,${movie.toString('base64')}"></video>`,
    }),
  );
  const id = await add(page, 'https://youtu.be/abc123def45');
  await expect(page.locator(`[data-node="${id}"] .provider-card`)).toBeVisible();
  await page.locator(`[data-node="${id}"] .link-open`).click();
  const iframe = page.locator('.provider-video iframe');
  await expect(iframe).not.toHaveAttribute('src', /autoplay=1/);
  await expect(page.frameLocator('.provider-video iframe').locator('video')).toHaveJSProperty(
    'paused',
    true,
  );
  await page
    .frameLocator('.provider-video iframe')
    .locator('video')
    .evaluate((video: HTMLVideoElement) => video.play());
  await expect(page.locator('.provider-play')).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .frameLocator('.provider-video iframe')
        .locator('video')
        .evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0),
    )
    .toBe(true);
  await capture(page, info, 'video-externo-sin-marco-de-lectura');
  await page.waitForTimeout(500);
  await iframe.hover();
  const position = await iframe.boundingBox();
  await page.mouse.wheel(0, 240);
  await expect(iframe).toBeVisible();
  await page.waitForTimeout(100);
  expect(await iframe.boundingBox()).toEqual(position);
  await page.keyboard.down('Alt');
  await page.mouse.wheel(0, 240);
  await page.keyboard.up('Alt');
  await expect(page.locator(`[data-node="${id}"]`)).toBeVisible();
  await expect(iframe).toHaveCount(0);
  const input = await snapshot(page);
  input.state.worlds.find((w) => w.id === 'scout')!.zones = [
    {
      id: 'video-zone',
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
  await assignMaterial(page, id);
  const preview = page.locator('.assigned-link > .provider-card').first();
  await expect(preview).toBeVisible();
  const tile = (await preview.boundingBox())!;
  const image = (await preview.locator('img').boundingBox())!;
  expect(image.height).toBeCloseTo(tile.height, 0);
  expect(tile.width / tile.height).toBeCloseTo(16 / 9, 1);
  await capture(page, info, 'video-externo-contexto-compacto');
});

test.describe('confirmación dentro de Everett', () => {
  test.use({ confirmationMode: 'manual' });
  test('C08-B103: diálogo compacto, teclado, foco restaurado y cierre de formulario sin alerta nativa', async ({
    page,
  }, info) => {
    await start(page);
    await page.route('**/api/link-preview', (route) =>
      route.fulfill({ json: article('Primera', 'second') }),
    );
    let native = 0;
    page.on('dialog', (d) => {
      native++;
      void d.dismiss();
    });
    const id = await add(page, 'https://example.org/root');
    const card = page.locator(`[data-node="${id}"]`);
    await card.focus();
    await page.keyboard.press('Delete');
    const dialog = page.getByRole('dialog', { name: '¿Eliminar del Canvas?' });
    const cancel = dialog.getByRole('button', { name: 'Cancelar', exact: true });
    await expect(cancel).toBeFocused();
    expect(await dialog.evaluate((e) => e.getAnimations().length)).toBe(0);
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Eliminar', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await page.setViewportSize({ width: 300, height: 500 });
    await expect
      .poll(async () => {
        const box = (await dialog.boundingBox())!;
        return box.x >= 0 && box.x + box.width <= 300;
      })
      .toBe(true);
    await capture(page, info, 'confirmacion-local-300px');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(card).toBeFocused();
    expect((await world(page)).nodes.length).toBe(1);
    expect(native).toBe(0);
  });
});

test('C08-B104: lectura no disponible explica el límite y reintenta sin duplicar el material', async ({
  page,
}, info) => {
  await start(page);
  let attempts = 0;
  await page.route('**/api/link-preview', (route) => {
    attempts++;
    return route.fulfill({
      json:
        attempts === 1
          ? {
              status: 'unavailable',
              problem: 'no-metadata',
              reader: { problem: 'not-article' },
              checkedAt: 123,
              resolvedUrl: 'https://example.org/index',
            }
          : article('Lectura recuperada', 'second'),
    });
  });
  const id = await add(page, 'https://example.org/index');
  await expect(page.locator(`[data-node="${id}"] .link-preview-status`)).toBeVisible();
  await page.locator(`[data-node="${id}"]`).hover();
  await spatial(page, -1);
  await expect(page.locator('.reader-message')).toContainText('necesita su aplicación interactiva');
  await page.getByRole('button', { name: 'Reintentar lectura', exact: true }).click();
  await expect(page.locator('.reader-content > h2')).toHaveText('Lectura recuperada');
  expect((await world(page)).nodes.map((node) => node.id)).toEqual([id]);
  expect(attempts).toBe(2);
  await capture(page, info, 'lectura-recuperada-sin-nueva-tarjeta');
});
