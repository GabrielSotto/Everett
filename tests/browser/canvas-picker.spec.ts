import { dockChat } from './interaction-helpers';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import { storedFixture } from './canvas-fixtures';

async function openPicker(page: Page): Promise<void> {
  const direct = page.getByRole('button', { name: 'Incorporar materiales', exact: true });
  await direct
    .or(page.getByRole('button', { name: 'Más herramientas', exact: true }))
    .filter({ visible: true })
    .click();
  if (
    await page.getByRole('menuitem', { name: 'Incorporar materiales', exact: true }).isVisible()
  ) {
    await page.getByRole('menuitem', { name: 'Incorporar materiales', exact: true }).click();
  }
}

async function geometry(page: Page) {
  const menu = page.locator('.reference-menu');
  await expect(menu).toBeVisible();
  const direct = page.getByRole('button', { name: 'Incorporar materiales', exact: true });
  const trigger = (await direct.isVisible())
    ? direct
    : page.getByRole('button', { name: 'Más herramientas', exact: true });
  const box = (await menu.boundingBox())!;
  const origin = (await trigger.boundingBox())!;
  const gapX = Math.max(origin.x - box.x - box.width, box.x - origin.x - origin.width, 0);
  const gapY = Math.max(origin.y - box.y - box.height, box.y - origin.y - origin.height, 0);
  expect(
    Math.hypot(gapX, gapY),
    'El menú debe permanecer junto a su disparador',
  ).toBeLessThanOrEqual(20);
  expect(gapX > 0 || gapY > 0, 'El menú no debe cubrir su disparador').toBe(true);
  const dock = (await page.locator('.canvas-tools').boundingBox())!;
  const overlapX = Math.max(
    0,
    Math.min(box.x + box.width, dock.x + dock.width) - Math.max(box.x, dock.x),
  );
  const overlapY = Math.max(
    0,
    Math.min(box.y + box.height, dock.y + dock.height) - Math.max(box.y, dock.y),
  );
  expect(overlapX * overlapY, 'El menú no debe tapar herramientas del dock').toBe(0);
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(11);
  expect(box.y).toBeGreaterThanOrEqual(69);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 11);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 11);
  expect(box.width).toBeLessThanOrEqual(258);
  expect(box.height).toBeLessThanOrEqual(322);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return { box, trigger };
}

test('C08-B46: incorporación compacta junto al dock, zoom independiente, bordes, chat, lista extensa y teclado', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1850, height: 835 });
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const snapshot = await page.evaluate(() => window.EverettDebug!.snapshot());
  const scout = snapshot.state.worlds.find((world) => world.id === 'scout')!;
  const prototype = scout.docs[0]!;
  for (let index = 0; index < 30; index++)
    scout.docs.push({
      ...prototype,
      id: 'picker-doc-' + index,
      title: 'Documento de prueba con nombre extenso para comprobar truncamiento y acceso ' + index,
    });
  await storedFixture(page, snapshot.state, snapshot.ui);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
  await openPicker(page);
  const initial = (await geometry(page)).box;
  const initialDock = (await page.locator('.canvas-tools').boundingBox())!;
  expect(
    initial.x,
    'Con espacio libre, Incorporar debe quedar al costado derecho del dock',
  ).toBeGreaterThanOrEqual(initialDock.x + initialDock.width + 7);
  expect(initial.y + initial.height).toBeGreaterThan(initialDock.y);
  for (const zoom of [0.2, 1, 4]) {
    const current = (await page.evaluate(() => window.EverettDebug!.snapshot())).camera.z;
    await page.mouse.move(30, 200);
    await page.mouse.wheel(0, -Math.log(zoom / current) / 0.00165);
    await expect
      .poll(async () => (await page.evaluate(() => window.EverettDebug!.snapshot())).camera.z)
      .toBeCloseTo(zoom, 2);
    const box = (await geometry(page)).box;
    expect(box.width).toBeCloseTo(initial.width, 1);
    expect(box.height).toBeCloseTo(initial.height, 1);
    expect(box.x).toBeCloseTo(initial.x, 1);
    expect(box.y).toBeCloseTo(initial.y, 1);
  }
  await testInfo.attach('incorporacion-junto-al-dock', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('.reference-menu')).toHaveCount(0);
  await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
  await dockChat(page);
  for (const position of [
    { x: 600, y: 100, lateral: true },
    { x: 1770, y: 410, lateral: false },
    { x: 600, y: 780, lateral: true },
  ]) {
    const grip = (await page.locator('.dock-grip').boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(position.x, position.y, { steps: 12 });
    await page.mouse.up();
    await openPicker(page);
    const { box, trigger } = await geometry(page);
    if (position.lateral) {
      const dock = (await page.locator('.canvas-tools').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(dock.x + dock.width + 7);
    }
    await trigger.click();
    await expect(page.locator('.reference-menu,.dock-more-menu')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await openPicker(page);
    await geometry(page);
    await page.keyboard.press('Escape');
  }
  for (const width of [801, 800, 799, 390, 300]) {
    await page.emulateMedia({ reducedMotion: width <= 390 ? 'reduce' : 'no-preference' });
    await page.setViewportSize({ width, height: 500 });
    await openPicker(page);
    const { trigger } = await geometry(page);
    await trigger.click();
    await expect(page.locator('.reference-menu,.dock-more-menu')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await openPicker(page);
    await geometry(page);
    const menu = page.locator('.reference-menu');
    await expect(
      menu.getByRole('button', { name: 'Importar archivos locales', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('End');
    const last = menu.getByRole('button').last();
    await expect(last).toBeFocused();
    await expect(last).toBeInViewport({ ratio: 0.99 });
    await page.keyboard.press('Home');
    await expect(menu.getByRole('button').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('button').nth(1)).toBeFocused();
    const name = menu.locator('[data-id="picker-doc-29"]');
    await expect(name).toHaveAttribute('title', /nombre extenso/);
    expect(
      await name.locator('span').evaluate((element) => element.scrollWidth > element.clientWidth),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    const direct = page.getByRole('button', { name: 'Incorporar materiales', exact: true });
    await expect(
      (await direct.isVisible())
        ? direct
        : page.getByRole('button', { name: 'Más herramientas', exact: true }),
    ).toBeFocused();
  }
  await openPicker(page);
  const menu = page.locator('.reference-menu');
  const before = (await page.evaluate(() => window.EverettDebug!.snapshot())).camera;
  const bounds = (await menu.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 40);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect((await page.evaluate(() => window.EverettDebug!.snapshot())).camera).toEqual(before);
  await testInfo.attach('incorporacion-estrecha', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  const worldBefore = (
    await page.evaluate(() => window.EverettDebug!.snapshot())
  ).state.worlds.find((world) => world.id === 'scout')!;
  const last = menu.getByRole('button').last();
  const targetId = await last.getAttribute('data-id');
  const targetKind = await last.getAttribute('data-kind');
  await page.keyboard.press('End');
  await expect(last).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveCount(0);
  const worldAfter = (await page.evaluate(() => window.EverettDebug!.snapshot())).state.worlds.find(
    (world) => world.id === 'scout',
  )!;
  expect(worldAfter.nodes).toHaveLength(worldBefore.nodes.length + 1);
  const added = worldAfter.nodes.find(
    (node) => !worldBefore.nodes.some((old) => old.id === node.id),
  )!;
  expect(added.data).toMatchObject({ kind: 'reference', ref: { kind: targetKind, id: targetId } });
  for (const node of worldBefore.nodes)
    expect(worldAfter.nodes.find((current) => current.id === node.id)).toEqual(node);
});
