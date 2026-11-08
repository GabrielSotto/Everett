import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

async function setup(page: Page) {
  // El navegador decodifica un archivo real del sistema; el fixture solo vive en memoria.
  const path =
    process.platform === 'win32'
      ? 'C:/Windows/Fonts/arial.ttf'
      : process.platform === 'darwin'
        ? '/System/Library/Fonts/Supplemental/Arial.ttf'
        : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const bytes = await readFile(path);
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({
      contentType: 'font/ttf',
      body: bytes,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.route('https://fonts.googleapis.com/css2?*', (route) => {
    const family = new URL(route.request().url()).searchParams.get('family');
    return route.fulfill({
      contentType: 'text/css',
      headers: { 'access-control-allow-origin': '*' },
      body: `@font-face { font-family: '${family}'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/fixture.ttf) format('truetype'); }`,
    });
  });
  await page.route('**/api/google-fonts', (route) =>
    route.fulfill({
      json: {
        families: ['Lora', 'Roboto Mono', 'Bodoni Moda SC', 'Noto Sans Egyptian Hieroglyphs'].map(
          (family) => ({ family, category: 'sans-serif' }),
        ),
      },
    }),
  );
  await start(page);
  const fixture = await snapshot(page),
    w = fixture.state.worlds.find((item) => item.id === 'scout')!;
  w.nodes = [
    {
      id: 'font-note',
      x: -100,
      y: -100,
      width: 250,
      height: 200,
      owner: null,
      data: {
        kind: 'note',
        title: 'Una idea para mañana',
        text: 'Conservar el contexto y las decisiones.',
        color: '#f3ebcf',
      },
    },
  ];
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  await page.locator('[data-node=font-note]').dblclick({ position: { x: 10, y: 10 } });
}
const picker = (page: Page) => page.getByRole('dialog', { name: 'Google Fonts', exact: true });
async function open(page: Page) {
  await page.getByLabel('Tipografía de la nota', { exact: true }).selectOption('google-fonts');
  await expect(picker(page)).toBeVisible();
}

test('C08-B166: catálogo, muestra real, nota, tarjeta, copia y persistencia sin archivos locales', async ({
  page,
}, info) => {
  await setup(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) requests.push(request.url());
  });
  await open(page);
  await expect(picker(page).locator('.font-catalog-status')).toHaveText(
    '4 familias · filtrá por nombre',
  );
  expect(requests).toHaveLength(0);
  await page.getByLabel('Nombre de la fuente', { exact: true }).fill('Lora');
  await expect(picker(page).locator('.font-results button')).toHaveCount(1);
  await picker(page).getByRole('button', { name: 'Lora', exact: true }).click();
  await expect(picker(page).getByRole('button', { name: 'Usar fuente' })).toBeEnabled();
  expect(
    await page.evaluate(() =>
      [...document.fonts].some((font) => font.family === 'Lora' && font.status === 'loaded'),
    ),
  ).toBe(true);
  expect((await world(page)).nodes[0]!.data).not.toHaveProperty('font');
  await capture(page, info, 'fuentes-muestra');
  const anchor = (await page.getByLabel('Tipografía de la nota', { exact: true }).boundingBox())!;
  const popup = (await picker(page).boundingBox())!;
  expect(Math.abs(popup.x - anchor.x)).toBeLessThan(1);
  expect(Math.abs(popup.y - (anchor.y + anchor.height + 6))).toBeLessThan(1);
  await picker(page).getByRole('button', { name: 'Usar fuente' }).click();
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Lora/);
  await page
    .getByLabel('Contenido de la nota', { exact: true })
    .fill('Un texto privado que nunca se envía a Google.');
  expect(requests.every((url) => !url.includes('text=') && !url.includes('key='))).toBe(true);
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await expect(page.locator('[data-node=font-note]')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('[data-node=font-note] p')).toHaveCSS('font-family', /Lora/);
  await page.locator('[data-node=font-note]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click();
  const notes = (await world(page)).nodes;
  expect(notes).toHaveLength(2);
  expect(notes[1]!.data).toMatchObject({ font: 'google:Lora' });
  await page.reload();
  await expect(page.locator('[data-node=font-note]')).toHaveAttribute('data-font-state', 'ready');
  await page.locator('[data-node=font-note]').dblclick({ position: { x: 10, y: 10 } });
  await expect(page.getByLabel('Tipografía de la nota', { exact: true })).toHaveValue(
    'google:Lora',
  );
  await page.getByLabel('Tipografía de la nota', { exact: true }).selectOption('serif');
  expect((await world(page)).nodes[1]!.data).toMatchObject({ font: 'google:Lora' });
  await capture(page, info, 'fuentes-nota-independiente');
});

test('C08-B167: error de fuente, cancelación, respuesta tardía y recuperación sin cambiar el original', async ({
  page,
}, info) => {
  await setup(page);
  // Fallos de transporte en el límite fetch, sin convertirlos en errores de ejecución del navegador.
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const url = String(args[0]);
      if (url.includes('family=No+Existe')) return new Response('', { status: 400 });
      if (url.includes('family=Sin+Red')) throw new TypeError('Failed to fetch');
      return original(...args);
    };
  });
  await open(page);
  const input = page.getByLabel('Nombre de la fuente', { exact: true });
  await input.fill('No Existe');
  await input.press('Enter');
  await expect(picker(page).locator('[data-font-message]')).toContainText('no encontró');
  await expect(picker(page).getByRole('button', { name: 'Usar fuente' })).toBeDisabled();
  await input.fill('Sin Red');
  await input.press('Enter');
  await expect(picker(page).locator('[data-font-message]')).toContainText('conexión');
  await capture(page, info, 'fuentes-error');
  await input.fill('Lora');
  await input.press('Enter');
  await expect(picker(page).getByRole('button', { name: 'Usar fuente' })).toBeEnabled();
  await input.press('Escape');
  await expect(picker(page)).toBeHidden();
  await expect(page.getByLabel('Tipografía de la nota', { exact: true })).toBeFocused();
  expect((await world(page)).nodes[0]!.data).not.toHaveProperty('font');
  await open(page);
  await page.route('https://fonts.googleapis.com/css2?family=Roboto+Mono*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fallback();
  });
  await input.fill('Roboto Mono');
  await input.press('Enter');
  await input.fill('Lora');
  await input.press('Enter');
  await expect(picker(page).locator('[data-font-message]')).toHaveText('Lora');
  await page.waitForResponse((response) => response.url().includes('family=Roboto+Mono'));
  await expect(picker(page).locator('[data-font-message]')).toHaveText('Lora');
  await picker(page).getByRole('button', { name: 'Usar fuente' }).click();
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Lora/);
  await capture(page, info, 'fuentes-recuperadas');
});

test('C08-B168: catálogo vacío, nombre largo, teclado y panel contenido a 320 px', async ({
  page,
}, info) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);
  const input = page.getByLabel('Nombre de la fuente', { exact: true });
  await input.fill('Noto Sans Egyptian');
  await expect(picker(page).locator('.font-results button')).toHaveCount(1);
  await picker(page).getByRole('button', { name: 'Noto Sans Egyptian Hieroglyphs' }).click();
  await expect(picker(page).getByRole('button', { name: 'Usar fuente' })).toBeEnabled();
  const box = (await picker(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(640);
  expect(await picker(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await capture(page, info, 'fuentes-320-nombre-largo');
  await input.fill('Sin coincidencia');
  await expect(picker(page).locator('.font-results')).toContainText('Sin coincidencias');
  await input.press('Escape');
  await expect(page.locator('.note-editor')).toBeVisible();
  await capture(page, info, 'fuentes-320-nota');
});

test('C08-B169: sin clave y sin conexión se conserva la elección y se puede reintentar', async ({
  page,
}, info) => {
  await setup(page);
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) =>
      String(args[0]) === '/api/google-fonts'
        ? Response.json({ error: 'not-configured' }, { status: 503 })
        : original(...args);
  });
  await open(page);
  await expect(picker(page).locator('.font-catalog-status')).toContainText('necesita una clave');
  await page.getByLabel('Nombre de la fuente', { exact: true }).fill('Lora');
  await page.getByLabel('Nombre de la fuente', { exact: true }).press('Enter');
  await expect(picker(page).getByRole('button', { name: 'Usar fuente' })).toBeEnabled();
  await picker(page).getByRole('button', { name: 'Usar fuente' }).click();
  await page.addInitScript(() => {
    const original = window.fetch;
    Object.assign(window, { fontNetworkAvailable: false });
    window.fetch = async (...args) => {
      if (
        String(args[0]).includes('fonts.googleapis.com') &&
        !(window as unknown as { fontNetworkAvailable: boolean }).fontNetworkAvailable
      )
        throw new TypeError('offline');
      return original(...args);
    };
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toBeVisible();
  expect((await world(page)).nodes[0]!.data).toMatchObject({ font: 'google:Lora' });
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toHaveAttribute(
    'title',
    /fuente de reemplazo/,
  );
  await page.getByLabel('Tipografía de la nota', { exact: true }).selectOption('serif');
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toHaveCount(0);
  await page.getByLabel('Tipografía de la nota', { exact: true }).selectOption('google:Lora');
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toBeVisible();
  await capture(page, info, 'fuentes-sin-conexion');
  await page.evaluate(() => Object.assign(window, { fontNetworkAvailable: true }));
  await page.getByRole('button', { name: 'Reintentar fuente Lora' }).click();
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toHaveCount(0);
  await capture(page, info, 'fuentes-reintento');
});
