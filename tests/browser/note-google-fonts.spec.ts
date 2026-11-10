import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

const families = [
  'Lora',
  'Roboto Mono',
  'Bodoni Moda SC',
  'Noto Sans Egyptian Hieroglyphs',
  'Molle',
  ...Array.from({ length: 70 }, (_, i) => `Familia ${i}`),
];
async function setup(page: Page, missingKey = false) {
  // El archivo del fixture se decodifica de verdad, solo en memoria; no simula una fuente cargada.
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
    const requested = new URL(route.request().url()).searchParams.get('family')!;
    const family = requested.split(':')[0]!;
    const weight = requested.split('@')[1]!.split(',').at(-1)!;
    const style = requested.includes(':ital,') ? 'italic' : 'normal';
    return route.fulfill({
      contentType: 'text/css',
      headers: { 'access-control-allow-origin': '*' },
      body: `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; src: url(https://fonts.gstatic.com/fixture-${weight}.ttf) format('truetype'); }`,
    });
  });
  await page.route('**/api/google-fonts', (route) =>
    route.fulfill({
      json: {
        families: families.map((family) => ({
          family,
          category: 'sans-serif',
          weights: ['Bodoni Moda SC', 'Molle'].includes(family) ? [400] : [300, 400, 700],
          italic: family === 'Molle',
        })),
      },
    }),
  );
  if (missingKey)
    await page.addInitScript(() => {
      const original = window.fetch;
      Object.assign(window, { catalogueAvailable: false });
      window.fetch = async (...args) =>
        String(args[0]) === '/api/google-fonts' &&
        !(window as unknown as { catalogueAvailable: boolean }).catalogueAvailable
          ? Response.json({ error: 'not-configured' }, { status: 503 })
          : original(...args);
    });
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
const picker = (page: Page) => page.locator('.note-font-picker');
const input = (page: Page) =>
  page.getByRole('combobox', { name: /Tipografía del (título|cuerpo)/ });

test('C08-B189: colores centrados, selección sin doble marco y formato automático sin controles redundantes', async ({
  page,
}, info) => {
  await setup(page);
  for (const width of [900, 320]) {
    await page.setViewportSize({ width, height: 740 });
    const swatches = page.locator('.note-colors button');
    await swatches.first().click();
    await capture(page, info, `nota-colores-${width}`);
    for (const button of await swatches.all()) {
      const outer = (await button.boundingBox())!;
      const inner = (await button.locator('span').boundingBox())!;
      expect(Math.abs(inner.x + inner.width / 2 - outer.x - outer.width / 2)).toBeLessThan(0.5);
      expect(Math.abs(inner.y + inner.height / 2 - outer.y - outer.height / 2)).toBeLessThan(0.5);
      await expect(button).toHaveCSS('border-width', '0px');
    }
    await swatches.last().focus();
    await page.keyboard.press('Enter');
    await expect(swatches.last()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.note-colors [aria-pressed=true]')).toHaveCount(1);
    await expect(swatches.last().locator('svg')).toBeVisible();
    await expect(swatches.last()).toBeFocused();
    await expect(swatches.last()).toHaveCSS('outline-style', 'solid');
    await capture(page, info, `nota-color-teclado-${width}`);
  }
  await expect(page.getByRole('button', { name: /^(Título|Cuerpo)$/ })).toHaveCount(0);
  await expect(page.getByText('Guardado automático', { exact: true })).toHaveCount(0);
  const title = page.getByRole('textbox', { name: 'Título de la nota' });
  await title.fill('');
  await expect(input(page)).toHaveAccessibleName('Tipografía del título');
  await choose(page, 'Serif');
  await page.getByLabel('Peso del título', { exact: true }).selectOption('700');
  await title.fill('Título después del formato');
  await expect(title).toHaveCSS('font-weight', '700');
  await expect(title).toHaveCSS('font-family', 'Georgia, Cambria, serif');
  await expect(page.locator('#note-text')).not.toHaveCSS('font-family', 'Georgia, Cambria, serif');
  await page.reload();
  await expect(title).toHaveValue('Título después del formato');
  await expect(page.locator('.note-colors button').last()).toHaveAttribute('aria-pressed', 'true');
});

async function choose(page: Page, family: string) {
  await input(page).fill(family);
  await picker(page).getByRole('button', { name: family, exact: true }).click();
  await expect(picker(page)).toBeHidden();
}

async function failingCatalogue(page: Page) {
  await page.addInitScript(() => {
    const original = window.fetch;
    const state = { failure: 'service-unreachable', calls: 0, delay: 0 };
    Object.assign(window, { catalogueTest: state });
    window.fetch = async (...args) => {
      if (String(args[0]) !== '/api/google-fonts') return original(...args);
      state.calls++;
      const failure = state.failure;
      if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
      if (failure === 'service-unreachable') throw new TypeError('Failed to fetch');
      if (failure === 'invalid-response') return Response.json({ families: [null] });
      if (failure) return Response.json({ error: failure }, { status: 502 });
      return original(...args);
    };
  });
}
async function catalogueState(page: Page, changes: { failure?: string; delay?: number }) {
  await page.evaluate(
    (next) => Object.assign((window as unknown as { catalogueTest: object }).catalogueTest, next),
    changes,
  );
}

test('C08-B190: error de catálogo legible y accesible, causas distintas y recuperación sin perder la nota', async ({
  page,
}, info) => {
  await failingCatalogue(page);
  await setup(page);
  await choose(page, 'Serif');
  await page.getByLabel('Peso del cuerpo').selectOption('700');
  const before = (await world(page)).nodes[0]!.data;
  await input(page).click();
  await picker(page).getByRole('button', { name: 'Favorita: Serif' }).click();
  await input(page).fill('Roboto');
  const status = picker(page).locator('.font-catalog-status');
  const retry = picker(page).getByRole('button', { name: 'Reintentar catálogo' });
  await expect(status).toContainText('servidor esté en marcha');
  await expect(input(page)).toHaveAttribute('aria-describedby', 'note-font-catalog-status');
  await expect(retry).toHaveAccessibleDescription(/servidor esté en marcha/);
  await expect(status).toHaveCSS('font-size', '14px');
  for (const width of [900, 320]) {
    await page.setViewportSize({ width, height: 740 });
    const bounds = (await picker(page).boundingBox())!;
    for (const element of [status, retry]) {
      const box = (await element.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
    expect(await picker(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await capture(page, info, `catalogo-servicio-caido-${width}`);
  }
  for (const [failure, text] of [
    ['quota', 'límite de consultas'],
    ['access-denied', 'restricciones de la clave'],
    ['credentials', 'rechazó la clave'],
    ['api-disabled', 'API de Google Fonts está deshabilitada'],
    ['network', 'conectarse con Google Fonts'],
    ['invalid-response', 'formato válido'],
  ] as const) {
    await catalogueState(page, { failure });
    await retry.click();
    await expect(status).toContainText(text);
    await expect(input(page)).toHaveValue('Roboto');
    expect((await world(page)).nodes[0]!.data).toEqual(before);
  }
  await catalogueState(page, { failure: '', delay: 600 });
  await input(page).focus();
  await page.keyboard.press('Tab');
  await expect(retry).toBeFocused();
  const callsBefore = await page.evaluate(
    () => (window as unknown as { catalogueTest: { calls: number } }).catalogueTest.calls,
  );
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('Cargando fuentes…');
  await expect(retry).toBeFocused();
  await expect(retry).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(status).toBeHidden();
  await expect(input(page)).toBeFocused();
  await expect(input(page)).toHaveValue('Roboto');
  expect(
    await page.evaluate(
      () => (window as unknown as { catalogueTest: { calls: number } }).catalogueTest.calls,
    ),
  ).toBe(callsBefore + 1);
  await expect(
    picker(page).getByRole('button', { name: 'Roboto Mono', exact: true }),
  ).toBeVisible();
  expect((await world(page)).nodes[0]!.data).toEqual(before);
  await input(page).fill('');
  await expect(picker(page).getByRole('row').first()).toContainText('Serif');
  await capture(page, info, 'catalogo-recuperado-320');
  await choose(page, 'Roboto Mono');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('#note-text')).toHaveCSS('font-weight', '700');
  await expect(page.locator('#note-title')).not.toHaveCSS('font-family', /Roboto Mono/);
  await page.reload();
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Roboto Mono/);
  await expect(page.locator('#note-text')).toHaveValue('Conservar el contexto y las decisiones.');
});

test('C08-B191: reintento tardío no reabre el selector ni roba el foco al volver a escribir o salir', async ({
  page,
}) => {
  await failingCatalogue(page);
  await setup(page);
  // Una fuente guardada conserva un solo peso conocido mientras falta el catálogo.
  await input(page).fill('Lora');
  await input(page).press('Enter');
  await expect(page.getByLabel('Peso del cuerpo')).toBeDisabled();
  await input(page).click();
  await expect(picker(page).locator('.font-catalog-status')).toContainText(
    'servidor esté en marcha',
  );
  await input(page).press('Tab');
  await expect(picker(page).getByRole('button', { name: 'Reintentar catálogo' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(input(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('spinbutton', { name: 'Tamaño del texto' })).toBeFocused();
  await input(page).click();
  await catalogueState(page, { failure: 'quota', delay: 400 });
  await picker(page).getByRole('button', { name: 'Reintentar catálogo' }).click();
  await page.locator('#note-title').fill('Seguir trabajando');
  await expect(picker(page)).toBeHidden();
  await expect(picker(page).locator('.font-catalog-status')).toHaveText(/límite de consultas/);
  await expect(page.locator('#note-title')).toBeFocused();
  await input(page).click();
  await catalogueState(page, { failure: '', delay: 400 });
  await picker(page).getByRole('button', { name: 'Reintentar catálogo' }).click();
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await expect(picker(page)).toHaveCount(0);
  // Esperar la respuesta tardía controlada y comprobar que no reconstruye UI destruida.
  await page.waitForTimeout(600);
  await expect(picker(page)).toHaveCount(0);
  await catalogueState(page, { failure: 'service-unreachable', delay: 0 });
  await page.locator('[data-node=font-note]').dblclick({ position: { x: 10, y: 10 } });
  await input(page).click();
  await expect(picker(page).locator('.font-catalog-status')).toContainText(
    'servidor esté en marcha',
  );
  await expect(page.locator('#note-title')).toHaveValue('Seguir trabajando');
});

test('C08-B166: catálogo completo, favoritas, pesos reales, tarjeta, copia y persistencia', async ({
  page,
}, info) => {
  await setup(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) requests.push(request.url());
  });
  await input(page).click();
  await expect(picker(page).getByRole('row')).toHaveCount(families.length + 3);
  expect(requests).toHaveLength(0);
  const anchor = (await page.locator('.note-font-field').boundingBox())!,
    box = (await picker(page).boundingBox())!;
  expect(Math.abs(box.x - anchor.x)).toBeLessThan(1);
  expect(Math.abs(box.y - anchor.y - anchor.height - 6)).toBeLessThan(1);
  expect(box.height).toBeLessThanOrEqual(330);
  await input(page).press('Control+End');
  await expect(picker(page).locator('[data-active]')).toHaveText('Familia 69');
  expect(await picker(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(1000);
  await input(page).fill('Lora');
  await picker(page).getByRole('button', { name: 'Favorita: Lora', exact: true }).click();
  expect((await world(page)).nodes[0]!.data).not.toHaveProperty('font');
  await expect(picker(page).getByRole('button', { name: 'Favorita: Lora' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await input(page).fill('');
  await expect(picker(page).getByRole('row').first()).toContainText('Lora');
  await capture(page, info, 'fuentes-lista-favoritas');
  await choose(page, 'Lora');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await page.getByLabel('Peso del cuerpo').selectOption('700');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('#note-text')).toHaveCSS('font-weight', '700');
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family === 'Lora' && font.weight === '700' && font.status === 'loaded',
      ),
    ),
  ).toBe(true);
  expect(requests.some((url) => new URL(url).searchParams.get('family') === 'Lora:wght@700')).toBe(
    true,
  );
  await page
    .getByLabel('Contenido de la nota', { exact: true })
    .fill('Un texto privado que nunca se envía a Google.');
  expect(requests.every((url) => !url.includes('text=') && !url.includes('key='))).toBe(true);
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  await expect(page.locator('[data-node=font-note] p')).toHaveCSS('font-family', /Lora/);
  await expect(page.locator('[data-node=font-note] p')).toHaveCSS('font-weight', '700');
  await page.locator('[data-node=font-note]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click();
  expect((await world(page)).nodes[1]!.data).toMatchObject({
    typography: { body: { font: 'google:Lora', weight: 700 } },
  });
  await page.reload();
  await page.locator('[data-node=font-note]').dblclick({ position: { x: 10, y: 10 } });
  await expect(input(page)).toHaveValue('Lora');
  await expect(page.getByLabel('Peso del cuerpo')).toHaveValue('700');
  await input(page).click();
  await expect(picker(page).getByRole('row').first()).toContainText('Lora');
  await expect(picker(page).getByRole('button', { name: 'Favorita: Lora' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await picker(page).getByRole('button', { name: 'Favorita: Lora' }).click();
  await expect(picker(page).getByRole('row').first()).not.toContainText('Lora');
  await choose(page, 'Serif');
  expect((await world(page)).nodes[1]!.data).toMatchObject({
    typography: { body: { font: 'google:Lora', weight: 700 } },
  });
  await capture(page, info, 'fuentes-nota-independiente');
});

test('C08-B167: fallos diferenciados, cierre sin aplicar, respuestas tardías y recuperación', async ({
  page,
}, info) => {
  await setup(page);
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const url = String(args[0]);
      if (url.includes('family=Lora')) return new Response('', { status: 400 });
      if (url.includes('family=Roboto+Mono')) throw new TypeError('Failed to fetch');
      return original(...args);
    };
    Object.assign(window, {
      restoreFontFetch: () => {
        window.fetch = original;
      },
    });
  });
  await input(page).fill('Lora');
  await input(page).press('Escape');
  await expect(input(page)).toHaveValue('Sans serif');
  expect((await world(page)).nodes[0]!.data).not.toHaveProperty('font');
  await choose(page, 'Lora');
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toHaveAttribute(
    'title',
    /no encontró/,
  );
  await choose(page, 'Roboto Mono');
  await expect(page.getByRole('button', { name: 'Reintentar fuente Roboto Mono' })).toHaveAttribute(
    'title',
    /conexión/,
  );
  await capture(page, info, 'fuentes-error');
  await page.evaluate(() => (window as unknown as { restoreFontFetch(): void }).restoreFontFetch());
  await page.getByRole('button', { name: 'Reintentar fuente Roboto Mono' }).click();
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await page.route('https://fonts.googleapis.com/css2?family=Roboto+Mono*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fallback();
  });
  const delayed = page.waitForResponse(
    (response) => new URL(response.url()).searchParams.get('family') === 'Roboto Mono:wght@700',
  );
  await page.getByLabel('Peso del cuerpo').selectOption('700');
  await choose(page, 'Bodoni Moda SC');
  await delayed;
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Bodoni Moda SC/);
  await expect(page.getByLabel('Peso del cuerpo')).toHaveValue('400');
  await expect(page.getByLabel('Peso del cuerpo')).toBeDisabled();
  await choose(page, 'Molle');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('#note-text')).toHaveCSS('font-style', 'italic');
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (f) => f.family === 'Molle' && f.style === 'italic' && f.status === 'loaded',
      ),
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator('#note-text')).toHaveCSS('font-style', 'italic');
  await choose(page, 'Serif');
  await expect(page.locator('#note-text')).toHaveCSS('font-style', 'normal');
  await capture(page, info, 'fuentes-recuperadas');
});

test('C08-B168: teclado, favoritas sin ratón, nombres largos y geometría a 320 px', async ({
  page,
}, info) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await input(page).fill('Noto Sans Egyptian');
  await expect(picker(page).getByRole('row')).toHaveCount(1);
  await input(page).press('ArrowDown');
  await input(page).press('ArrowRight');
  await input(page).press('Enter');
  await expect(
    picker(page).getByRole('button', { name: 'Favorita: Noto Sans Egyptian Hieroglyphs' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect((await world(page)).nodes[0]!.data).not.toHaveProperty('font');
  const box = (await picker(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(640);
  expect(await picker(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await capture(page, info, 'fuentes-320-lista');
  await input(page).press('ArrowLeft');
  await input(page).press('Enter');
  await expect(input(page)).toHaveValue('Noto Sans Egyptian Hieroglyphs');
  await expect(picker(page)).toBeHidden();
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await input(page).fill('Sin coincidencia');
  await expect(picker(page).locator('.font-empty')).toHaveText('No hay fuentes con ese nombre.');
  await input(page).press('Enter');
  await expect(picker(page)).toBeVisible();
  await input(page).press('Tab');
  await expect(picker(page)).toBeHidden();
  await expect(page.getByLabel('Peso del cuerpo')).toBeFocused();
  await expect(input(page)).toHaveValue('Noto Sans Egyptian Hieroglyphs');
  await choose(page, 'Lora');
  await page.getByRole('button', { name: 'Mostrar fuentes' }).click();
  await expect(picker(page)).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar fuentes' }).click();
  await expect(picker(page)).toBeHidden();
  expect(
    await page.locator('.note-editor').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await capture(page, info, 'fuentes-320-nota');
});

test('C08-B169: catálogo fallido, nombre exacto, fallback al recargar y reintento', async ({
  page,
}, info) => {
  await setup(page, true);
  await input(page).click();
  await expect(picker(page).locator('.font-catalog-status')).toContainText('necesita una clave');
  await input(page).fill('Lora');
  await input(page).press('Enter');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
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
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toHaveAttribute(
    'title',
    /fuente de reemplazo/,
  );
  expect((await world(page)).nodes[0]!.data).toMatchObject({
    typography: { body: { font: 'google:Lora' } },
  });
  await choose(page, 'Serif');
  await expect(page.locator('.note-font-warning')).toHaveCount(0);
  await input(page).fill('Lora');
  await expect(picker(page).locator('.font-catalog-status')).toContainText('necesita una clave');
  await input(page).press('Enter');
  await expect(page.getByRole('button', { name: 'Reintentar fuente Lora' })).toBeVisible();
  await capture(page, info, 'fuentes-sin-conexion');
  await page.evaluate(() => Object.assign(window, { fontNetworkAvailable: true }));
  await page.getByRole('button', { name: 'Reintentar fuente Lora' }).click();
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('.note-font-warning')).toHaveCount(0);
  await page.route('**/api/google-fonts', (route) =>
    route.fulfill({
      json: { families: [{ family: 'Lora', category: 'serif', weights: [400, 700] }] },
    }),
  );
  await page.evaluate(() => Object.assign(window, { catalogueAvailable: true }));
  await input(page).click();
  await picker(page).getByRole('button', { name: 'Reintentar catálogo' }).click();
  await expect(picker(page).locator('.font-catalog-status')).toBeHidden();
  await expect(page.getByLabel('Peso del cuerpo')).toBeEnabled();
  await input(page).press('Escape');
  await capture(page, info, 'fuentes-reintento');
});

test('C08-B187: tipografía y peso por título/cuerpo, foco, copia, persistencia y 320 px', async ({
  page,
}, info) => {
  await setup(page);
  const title = page.getByRole('textbox', { name: 'Título de la nota', exact: true });
  const body = page.getByRole('textbox', { name: 'Contenido de la nota', exact: true });
  await expect(input(page)).toHaveAccessibleName('Tipografía del cuerpo');
  await expect(page.locator('#note-title')).toHaveCSS('font-weight', '600');
  await title.click();
  await expect(input(page)).toHaveAccessibleName('Tipografía del título');
  await choose(page, 'Lora');
  await page.getByLabel('Peso del título', { exact: true }).selectOption('700');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-title-font-state', 'ready');
  await expect(page.locator('#note-title')).toHaveCSS('font-family', /Lora/);
  await expect(page.locator('#note-title')).toHaveCSS('font-weight', '700');
  await expect(page.locator('#note-text')).toHaveCSS('font-weight', '400');
  await expect(page.locator('#note-text')).not.toHaveCSS('font-family', /Lora/);
  await page.locator('#note-text').click();
  await expect(input(page)).toHaveAccessibleName('Tipografía del cuerpo');
  await expect(input(page)).toHaveValue('Sans serif');
  await choose(page, 'Roboto Mono');
  await page.getByLabel('Peso del cuerpo', { exact: true }).selectOption('300');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Roboto Mono/);
  await expect(page.locator('#note-text')).toHaveCSS('font-weight', '300');
  await expect(page.locator('#note-title')).toHaveCSS('font-weight', '700');
  const typography = {
    title: { font: 'google:Lora', weight: 700, italic: false },
    body: { font: 'google:Roboto Mono', weight: 300, italic: false },
  };
  await page.locator('#note-title').fill('Decisiones de diseño');
  await expect(input(page)).toHaveAccessibleName('Tipografía del título');
  await expect(input(page)).toHaveValue('Lora');
  await expect(page.getByLabel('Peso del título', { exact: true })).toHaveValue('700');
  await page.locator('#note-title').press('Enter');
  await expect(page.locator('#note-text')).toBeFocused();
  await expect(input(page)).toHaveValue('Roboto Mono');
  await page.locator('#note-text').fill('Cada parte conserva su tipografía y su peso.');
  expect((await world(page)).nodes[0]!.data).toMatchObject({ typography });
  // Cambiar el destino no aplica el texto de búsqueda pendiente a la otra parte.
  await input(page).fill('Bodoni');
  await title.click();
  await expect(picker(page)).toBeHidden();
  await expect(input(page)).toHaveValue('Lora');
  expect((await world(page)).nodes[0]!.data).toMatchObject({ typography });
  await capture(page, info, 'nota-titulo-cuerpo');
  await page.getByRole('button', { name: 'Volver al Canvas', exact: true }).click();
  const card = page.locator('[data-node=font-note]');
  await expect(card.locator('h3')).toHaveCSS('font-family', /Lora/);
  await expect(card.locator('h3')).toHaveCSS('font-weight', '700');
  await expect(card.locator('p')).toHaveCSS('font-family', /Roboto Mono/);
  await expect(card.locator('p')).toHaveCSS('font-weight', '300');
  await card.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click();
  expect((await world(page)).nodes[1]!.data).toMatchObject({ typography });
  await page.reload();
  await card.dblclick({ position: { x: 10, y: 10 } });
  await title.click();
  await expect(input(page)).toHaveValue('Lora');
  await expect(page.getByLabel('Peso del título', { exact: true })).toHaveValue('700');
  await choose(page, 'Serif');
  expect((await world(page)).nodes[1]!.data).toMatchObject({ typography });
  await page.setViewportSize({ width: 320, height: 640 });
  await title.click();
  await title.press('Tab');
  await expect(body).toBeFocused();
  await expect(input(page)).toHaveValue('Roboto Mono');
  await expect(page.getByLabel('Peso del cuerpo', { exact: true })).toHaveValue('300');
  await input(page).click();
  await input(page).press('Tab');
  await expect(page.getByLabel('Peso del cuerpo', { exact: true })).toBeFocused();
  expect(
    await page.locator('.note-editor').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  for (const control of [title, body, input(page), page.locator('#note-weight')]) {
    const rect = (await control.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(320);
  }
  await capture(page, info, 'nota-partes-320');
});

test('C08-B188: fallo de una fuente no altera la otra y una respuesta tardía no revive el error', async ({
  page,
}, info) => {
  await setup(page);
  await choose(page, 'Roboto Mono');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-body-font-state', 'ready');
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) =>
      String(args[0]).includes('family=Lora')
        ? new Response('', { status: 400 })
        : original(...args);
    Object.assign(window, {
      restoreFontFetch: () => {
        window.fetch = original;
      },
    });
  });
  await page.getByRole('textbox', { name: 'Título de la nota', exact: true }).click();
  await choose(page, 'Lora');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-title-font-state', 'error');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-body-font-state', 'ready');
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Roboto Mono/);
  await expect(page.locator('.note-font-warning')).toHaveCount(1);
  await capture(page, info, 'nota-fallo-solo-titulo');
  let finishBody!: () => void;
  const bodyPending = new Promise<void>((resolve) => {
    finishBody = resolve;
  });
  await page.route('https://fonts.googleapis.com/css2?family=Roboto+Mono*', async (route) => {
    await bodyPending;
    await route.fallback();
  });
  await page.getByRole('textbox', { name: 'Contenido de la nota', exact: true }).click();
  await page.getByLabel('Peso del cuerpo', { exact: true }).selectOption('700');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-body-font-state', 'loading');
  const retryTitle = page.getByRole('button', { name: 'Reintentar fuente Lora' });
  await retryTitle.focus();
  finishBody();
  await expect(page.locator('.note-paper')).toHaveAttribute('data-body-font-state', 'ready');
  await expect(retryTitle).toBeFocused();
  await page.evaluate(() => (window as unknown as { restoreFontFetch(): void }).restoreFontFetch());
  await page.keyboard.press('Enter');
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  // La respuesta queda retenida mientras el usuario cambia ambas partes.
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://fonts.googleapis.com/css2?family=Lora*', async (route) => {
    await held;
    // CSS recibido pero inválido: genera el fallo del cargador sin un error HTTP del navegador.
    await route.fulfill({ status: 200, contentType: 'text/css', body: 'body { color: red; }' });
  });
  const request = page.waitForRequest(
    (req) => new URL(req.url()).searchParams.get('family') === 'Lora:wght@700',
  );
  await page.getByRole('textbox', { name: 'Título de la nota', exact: true }).click();
  await page.getByLabel('Peso del título', { exact: true }).selectOption('700');
  await request;
  await choose(page, 'Serif');
  await page.getByRole('textbox', { name: 'Contenido de la nota', exact: true }).click();
  await choose(page, 'Molle');
  const response = page.waitForResponse(
    (res) => new URL(res.url()).searchParams.get('family') === 'Lora:wght@700',
  );
  release();
  await response;
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('.note-font-warning')).toHaveCount(0);
  await expect(page.locator('#note-title')).toHaveCSS('font-family', 'Georgia, Cambria, serif');
  await expect(page.locator('#note-title')).toHaveCSS('font-style', 'normal');
  await expect(page.locator('#note-text')).toHaveCSS('font-family', /Molle/);
  await expect(page.locator('#note-text')).toHaveCSS('font-style', 'italic');
  await page.reload();
  await expect(page.locator('.note-paper')).toHaveAttribute('data-font-state', 'ready');
  await expect(page.locator('#note-title')).toHaveCSS('font-style', 'normal');
  await expect(page.locator('#note-text')).toHaveCSS('font-style', 'italic');
  await capture(page, info, 'nota-fuentes-recuperadas-por-parte');
});
