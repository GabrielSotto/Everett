import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function focusWorld(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Resource Scout');
  const world = page.getByRole('main').getByRole('button', { name: 'Resource Scout', exact: true });
  await expect(world).toBeInViewport();
  await page.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
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
    await page
      .locator('.surface-object')
      .filter({ has: page.getByText(label, { exact: true }) })
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
