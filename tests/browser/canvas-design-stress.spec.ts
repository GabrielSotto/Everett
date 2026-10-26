import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { storedFixture } from './canvas-fixtures';
import { start, world, capture, snapshot } from './canvas-utility-helpers';

async function add(page: Page, url: string): Promise<string> {
  await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
  await page.locator('[data-action=canvas-link]').click();
  await page.getByLabel('Dirección del enlace').fill(url);
  await page.getByRole('button', { name: 'Agregar enlace', exact: true }).click();
  return (await world(page)).nodes.at(-1)!.id;
}

test('C08-B105: break-ui alterna datos reales extremos, vacío y uno; lectura usable a 320px y texto 200%', async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await start(page);
  const cases = {
    Demo: {
      title: 'Decisiones de arquitectura',
      byline: 'Jo',
      body: '<p>Una decisión con su contexto.</p>',
    },
    'Worst case': {
      title:
        'Q3 Board Deck — FINAL (revised) v12 [approved by legal] — Benachrichtigungseinstellungen y referencias de arquitectura',
      byline: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
      body: '<p>Đặng Thị Ngọc Hân · 王秀英 · 👩🏽‍💻 Priya · نور الهدى عبد الرحمن</p><p>https://example.org/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&amp;filter=unresolved</p><pre><code>IMG_20250914_183022_HDR_portrait_edited_edited.HEIC</code></pre>',
    },
    Empty: { title: '', byline: '', body: '' },
    One: { title: 'J', byline: 'Ólafur Darri Ólafsson', body: '<p>Una referencia.</p>' },
  };
  type Case = keyof typeof cases;
  let current: Case = 'Demo';
  await page.route('**/api/link-preview', (route) => {
    const data = cases[current];
    return route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: 'https://example.org/reference',
        title: data.title,
        reader: {
          title: data.title,
          byline: data.byline,
          html: data.body,
          text: 'Contenido',
          capturedAt: 123,
        },
      },
    });
  });
  const id = await add(page, 'https://example.org/reference');
  const card = page.locator(`[data-node="${id}"]`);
  await expect(card.locator('.link-open')).toBeVisible();
  await card.locator('.link-open').click();
  await page.exposeFunction('__everettStressCase', async (key: Case) => {
    current = key;
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    const next = await add(page, 'https://example.org/reference?case=' + encodeURIComponent(key));
    const target = page.locator(`[data-node="${next}"]`);
    await expect(target.locator('.link-open')).toBeVisible();
    await target.locator('.link-open').click();
    await expect(page.locator('.reader-content')).toBeVisible();
    await page.locator('#stress-switch').evaluate((e, key) => {
      (e as HTMLElement).dataset.current = key;
    }, key);
  });
  // Selector de fixtures exclusivo del navegador aislado: nunca forma parte del HTML de Everett.
  await page.evaluate((keys) => {
    const toggle = document.createElement('nav');
    toggle.id = 'stress-switch';
    toggle.ariaLabel = 'Datos de prueba';
    toggle.style.cssText =
      'position:fixed;bottom:3px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;gap:3px;background:#555;padding:3px;border-radius:6px;font:11px system-ui';
    for (const key of keys) {
      const button = document.createElement('button');
      button.textContent = key;
      button.style.cssText =
        'padding:4px;background:#eee;color:#222;border-radius:3px;font:11px system-ui';
      button.addEventListener('click', () => {
        void (
          window as unknown as { __everettStressCase(key: string): Promise<void> }
        ).__everettStressCase(key);
      });
      toggle.append(button);
    }
    document.body.append(toggle);
  }, Object.keys(cases));
  for (const mode of ['Worst case', 'Empty', 'One', 'Demo'] as const) {
    await page
      .getByRole('navigation', { name: 'Datos de prueba' })
      .getByRole('button', { name: mode, exact: true })
      .click();
    await expect(page.locator('#stress-switch')).toHaveAttribute('data-current', mode);
    const expected = cases[mode].title || 'example.org';
    await expect(page.locator('.reader-content > h2')).toHaveText(expected);
    for (const width of [320, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page.locator('.reader-scroll').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        )
        .toBe(true);
    }
    await page.setViewportSize({ width: 320, height: 760 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '26px';
    });
    await expect
      .poll(() =>
        page.locator('.reader-scroll').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      )
      .toBe(true);
    expect(
      await page
        .locator('.reader-content')
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(29);
    const back = page.getByRole('button', { name: 'Volver', exact: true });
    await expect(back).toBeInViewport();
    await expect(page.locator('.media-toolbar h1')).toHaveAttribute('title', expected);
    await capture(page, info, `break-ui-${mode.replace(' ', '-')}-320-texto-200`);
    await page.evaluate(() => document.documentElement.style.removeProperty('font-size'));
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test('C08-B106: panorámica y retrato extremos conservan proporción, ajuste y controles en una ventana estrecha', async ({
  page,
}, info) => {
  await start(page);
  const data = await page.evaluate(() => {
    return [
      [20000, 1000],
      [1000, 20000],
    ].map(([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w!;
      canvas.height = h!;
      const brush = canvas.getContext('2d')!;
      brush.fillStyle = '#efbd75';
      brush.fillRect(0, 0, w!, h!);
      return canvas.toDataURL('image/png').split(',')[1]!;
    });
  });
  await page.route('**/api/link-preview', (route) =>
    route.fulfill({
      json: {
        status: 'ready',
        checkedAt: 123,
        resolvedUrl: route.request().postDataJSON().url,
        file: {
          kind: 'image',
          mime: 'image/png',
          data: data[route.request().postDataJSON().url.endsWith('wide') ? 0 : 1],
        },
      },
    }),
  );
  for (const [name, ratio] of [
    ['wide', 20],
    ['tall', 0.05],
  ] as const) {
    const id = await add(page, 'https://example.org/' + name);
    await expect
      .poll(async () => (await world(page)).nodes.find((n) => n.id === id)?.data.kind)
      .toBe('image');
    await page.locator(`[data-node="${id}"]`).dblclick({ position: { x: 8, y: 8 } });
    await expect(page.locator('.image-inspector img')).toBeVisible();
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 760 });
    await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
    const image = page.locator('.image-inspector img');
    await expect
      .poll(async () => {
        const box = (await image.boundingBox())!;
        return box.width / box.height;
      })
      .toBeCloseTo(ratio, ratio > 1 ? 1 : 3);
    const bounds = (await image.boundingBox())!;
    expect(bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.height).toBeLessThanOrEqual(760);
    await capture(page, info, `break-ui-imagen-${name}`);
    await page.getByRole('button', { name: '100 %', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Zoom de imagen', exact: true })).toHaveText(
      '100 %',
    );
    const original = await image.evaluate((e) => ({
      width: (e as HTMLImageElement).naturalWidth,
      painted: e.getBoundingClientRect().width,
    }));
    expect(Math.abs(original.painted - original.width)).toBeLessThan(1);

    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test('C08-B107: controles de Canvas responden al teclado sin animar y el desborde conserva su origen', async ({
  page,
}, info) => {
  await start(page);
  const input = await snapshot(page);
  input.ui.shortcuts.rename = 'F2';
  await storedFixture(page, input.state, input.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  const id = await add(page, 'https://example.org/architecture');
  await page.locator(`[data-node="${id}"]`).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('F2');
  await expect(page.locator('.canvas-context-form input')).toBeFocused();
  expect(await page.locator('.canvas-context-form').evaluate((e) => e.getAnimations().length)).toBe(
    0,
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await expect(page.locator('#global-search')).toBeFocused();
  expect(
    await page.locator('.global-search').evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 760 });
  const more = page.getByRole('button', { name: 'Más herramientas', exact: true });
  await more.click();
  const menu = page.getByRole('menu', { name: 'Más herramientas de Canvas' });
  await expect(menu).toBeInViewport();
  const geometry = await menu.evaluate((e) => {
    const rect = e.getBoundingClientRect();
    const trigger = document.querySelector('[data-action=dock-more]')!.getBoundingClientRect();
    return {
      origin: getComputedStyle(e).transformOrigin.split(' ').map(parseFloat),
      x: Math.max(
        0,
        Math.min(
          e.clientWidth,
          trigger.x + trigger.width / 2 - parseFloat((e as HTMLElement).style.left),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          e.clientHeight,
          trigger.y + trigger.height / 2 - parseFloat((e as HTMLElement).style.top),
        ),
      ),
      bottom: rect.bottom,
    };
  });
  expect(Math.abs(geometry.origin[0]! - geometry.x)).toBeLessThan(3);
  expect(Math.abs(geometry.origin[1]! - geometry.y)).toBeLessThan(3);
  await capture(page, info, 'desborde-anclado-320');
  await page.keyboard.press('Escape');
  await more.focus();
  await page.keyboard.press('Enter');
  expect(await menu.evaluate((e) => e.getAnimations().length)).toBe(0);
  const menuButton = menu.locator('button').first();
  await menuButton.hover();
  await page.mouse.down();
  expect(await menu.evaluate((e) => e.getAnimations().length)).toBe(0);
  expect(await menu.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await page.mouse.up();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  const hand = page.getByRole('button', { name: 'Panear · H', exact: true });
  await hand.hover();
  await page.mouse.down();
  expect(await hand.evaluate((e) => getComputedStyle(e).scale)).toBe('0.97');
  await page.mouse.up();
  await expect(hand).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Seleccionar · V', exact: true }).click();
  await page.locator(`[data-node="${id}"]`).click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('c');
  await page
    .getByLabel('Nuevo comentario', { exact: true })
    .fill('Comprobar esta decisión de arquitectura');
  await page.getByRole('button', { name: 'Publicar comentario', exact: true }).click();
  await page.locator('[data-action=canvas-zoom]').click();
  const percent = page.getByRole('spinbutton', { name: 'Porcentaje de zoom', exact: true });
  await percent.fill('10');
  await percent.press('Enter');
  const marker = page.locator(`[data-node="${id}"] .comment-marker`);
  await marker.hover();
  const initial = (await marker.boundingBox())!;
  await page.mouse.down();
  const pressed = (await marker.boundingBox())!;
  expect(initial.width).toBeCloseTo(24, 0);
  expect(pressed.width).toBeGreaterThan(22);
  expect(pressed.width).toBeLessThanOrEqual(initial.width);
  await page.mouse.up();
  await capture(page, info, 'comentario-pulsado-zoom-10');
});
