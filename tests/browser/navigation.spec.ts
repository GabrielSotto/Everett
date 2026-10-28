import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { enterWorld, openSurface, reachSurface } from './interaction-helpers';

test('UI-NAV-08: entrar por el rótulo visible cuando el centro de la superficie queda detrás de la cabecera', async ({
  page,
}, info) => {
  await enterWorld(page);
  await reachSurface(page, 'Agents');
  const surface = page.getByRole('main').getByRole('button', { name: 'Agents', exact: true });
  const shell = (await page.locator('#shell').boundingBox())!;
  const bounds = (await surface.boundingBox())!;
  const center = bounds.y + bounds.height / 2;
  if (center >= shell.y + shell.height) {
    const viewport = page.viewportSize()!;
    const height = Math.round(viewport.height - 2 * (center - shell.height + 20));
    expect(height).toBeGreaterThanOrEqual(300);
    await page.setViewportSize({ width: viewport.width, height });
  }
  await expect
    .poll(async () => {
      const box = (await surface.boundingBox())!;
      return box.y + box.height / 2;
    })
    .toBeLessThan(shell.y + shell.height);
  const label = (await surface.locator('.surface-label').boundingBox())!;
  expect(label.y).toBeGreaterThan(shell.y + shell.height);
  await info.attach('rotulo-alcanzable-centro-cubierto', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await openSurface(page, 'Agents');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'scout/agents/');
});

async function focusWorld(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Resource Scout');
  const world = page.getByRole('main').getByRole('button', { name: 'Resource Scout', exact: true });
  await expect(world).toBeInViewport();
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await world.click();
  const id = await world.getAttribute('data-focus');
  expect(id).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.EverettDebug?.snapshot().focus)).toBe(id);
  await expect
    .poll(() =>
      world.evaluate((element) => {
        const object = element.getBoundingClientRect();
        const viewport = document.getElementById('viewport')!.getBoundingClientRect();
        return Math.hypot(
          object.x + object.width / 2 - viewport.x - viewport.width / 2,
          object.y + object.height / 2 - viewport.y - viewport.height / 2,
        );
      }),
    )
    .toBeLessThan(0.1);
  expect(
    await page.locator('#space').evaluate((space) => [space.scrollLeft, space.scrollTop]),
  ).toEqual([0, 0]);
  return id!;
}

test('UI-NAV-01: enfocar un Mundo, entrar con teclado y volver conserva su cámara', async ({
  page,
}) => {
  const id = await focusWorld(page);
  const before = await page.evaluate(() => window.EverettDebug?.snapshot().camera);
  await page.keyboard.press('Enter');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', `world/${id}`);
  await expect(page.locator('.surface-object')).toHaveCount(6);
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  const after = await page.evaluate(() => window.EverettDebug?.snapshot().camera);
  expect(after?.x).toBeCloseTo(before?.x ?? NaN, 1);
  expect(after?.y).toBeCloseTo(before?.y ?? NaN, 1);
  expect(after?.z).toBeCloseTo(before?.z ?? NaN, 3);
});

for (const [surface, label] of [
  ['code', 'Code'],
  ['canvas', 'Canvas'],
  ['docs', 'Docs'],
  ['board', 'Board'],
  ['agents', 'Agents'],
  ['session', 'Session'],
] as const) {
  test(`UI-NAV-02 ${surface}: entrar y regresar mantiene el Mundo de origen`, async ({ page }) => {
    await focusWorld(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.surface-object')).toHaveCount(6);
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    const worldRoute = await page.locator('#viewport').getAttribute('data-route');
    if (surface === 'agents' || surface === 'board') {
      const before = await page.evaluate(() => window.EverettDebug!.snapshot().camera.y);
      const dy = surface === 'agents' ? 220 : -200;
      await page.mouse.move(720, 400);
      await page.mouse.down();
      await page.mouse.move(720, 400 + dy, { steps: 12 });
      await page.mouse.up();
      await expect
        .poll(async () =>
          Math.abs((await page.evaluate(() => window.EverettDebug!.snapshot().camera.y)) - before),
        )
        .toBeGreaterThan(100);
    }
    await page
      .locator('.surface-object')
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator('.surface-label')
      .click();
    await expect
      .poll(() => page.evaluate(() => window.EverettDebug?.snapshot().focus))
      .toBe(surface);
    await page.keyboard.press('Enter');
    await expect(page.locator('#viewport')).toHaveAttribute(
      'data-route',
      new RegExp(`/${surface}/`),
    );
    await expect(page.locator('.transition-ghost')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#viewport')).toHaveAttribute('data-route', worldRoute!);
  });
}

test('UI-NAV-03: el movimiento reducido conserva entrada, salida y controles accesibles', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await focusWorld(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('.surface-object')).toHaveCount(6);
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await expect(page.locator('.surface-object').first()).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
});

test('UI-NAV-04: la rueda entra y regresa una sola escala por gesto', async ({ page }) => {
  const id = await focusWorld(page);
  const viewport = page.locator('#viewport');
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (
    let step = 0;
    step < 40 && (await viewport.getAttribute('data-route')) === 'universe';
    step++
  ) {
    await page.mouse.wheel(0, -180);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  await expect(viewport).toHaveAttribute('data-route', `world/${id}`);
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  for (
    let step = 0;
    step < 40 && (await viewport.getAttribute('data-route')) !== 'universe';
    step++
  ) {
    await page.mouse.wheel(0, 180);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  await expect(viewport).toHaveAttribute('data-route', 'universe');
  const routes = await page.evaluate(() =>
    window
      .EverettDebug!.logs()
      .filter((entry) => entry.event === 'transition.started')
      .map((entry) => entry.details.to),
  );
  expect(routes).toEqual([`world/${id}`, 'universe']);
});

test('UI-NAV-05: el minimapa desplaza con teclado y su rueda conserva el zoom del Universo', async ({
  page,
}) => {
  await focusWorld(page);
  const minimap = page.getByLabel('Minimapa del universo', { exact: true });
  const before = await page.evaluate(() => window.EverettDebug!.snapshot().camera);
  await minimap.press('ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.EverettDebug!.snapshot().camera.x))
    .toBeCloseTo(before.x - 160, 0);
  await minimap.hover();
  await page.mouse.wheel(0, -300);
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
  expect((await page.evaluate(() => window.EverettDebug!.snapshot().camera)).z).toBeCloseTo(
    before.z,
    5,
  );
  await minimap.press('ArrowLeft');
  await expect
    .poll(() => page.evaluate(() => window.EverettDebug!.snapshot().camera.x))
    .toBeCloseTo(before.x, 0);
});

test('UI-NAV-06: los filtros atenúan los Mundos ajenos y recuperan los resultados al quitarse', async ({
  page,
}) => {
  const worlds = await page.evaluate(() =>
    window
      .EverettDebug!.snapshot()
      .state.worlds.map(({ id, region, archived }) => ({ id, region, archived })),
  );
  await page.getByRole('button', { name: 'Filtrar mundos', exact: true }).click();
  const region = page.getByRole('combobox', { name: 'Región', exact: true });
  await region.selectOption('Investigación');
  for (const world of worlds) {
    const button = page.locator(`.world-body[data-focus="${world.id}"]`);
    if (world.region === 'Investigación') await expect(button).not.toHaveClass(/dimmed/);
    else await expect(button).toHaveClass(/dimmed/);
  }
  await region.selectOption('Todas');
  await page.getByRole('button', { name: 'Archivados', exact: true }).click();
  for (const world of worlds) {
    const button = page.locator(`.world-body[data-focus="${world.id}"]`);
    if (world.archived) await expect(button).not.toHaveClass(/dimmed/);
    else await expect(button).toHaveClass(/dimmed/);
  }
  await page.getByRole('button', { name: 'Archivados', exact: true }).click();
  await expect(page.locator('.world-body.dimmed')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Filtrar mundos', exact: true })).toBeFocused();
});

test('UI-NAV-07: arrastrar permite escapar de la gravedad y volver a enfocar sin entrar', async ({
  page,
}, testInfo) => {
  const id = await focusWorld(page);
  const before = await page.evaluate(() => window.EverettDebug!.snapshot().camera);
  await page.mouse.move(720, 480);
  await page.mouse.down();
  await page.mouse.move(1320, 750, { steps: 40 });
  const during = await page.evaluate(() => window.EverettDebug!.snapshot());
  await page.mouse.up();
  expect(Math.hypot(during.camera.x - before.x, during.camera.y - before.y)).toBeGreaterThan(10);
  expect(during.gravity?.manualTravel).toBe(false);
  expect(during.gravity?.inputGain).toBeGreaterThan(0);
  expect(during.gravity?.inputGain).toBeLessThanOrEqual(1);
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
  const world = page.locator(`.world-body[data-focus="${id}"]`);
  await world.click();
  await expect
    .poll(() => page.evaluate(() => window.EverettDebug!.snapshot().camera.x))
    .toBeCloseTo(before.x, 0);
  await expect.poll(() => page.evaluate(() => window.EverettDebug!.snapshot().focus)).toBe(id);
  await expect(world).toHaveAttribute('aria-pressed', 'true');
  await testInfo.attach('gravedad-durante-arrastre', {
    body: JSON.stringify({ before, during }),
    contentType: 'application/json',
  });
});
