import { test, expect } from './fixtures';
import { enterWorld } from './interaction-helpers';

test('UI-WORLD-01: la representación circular conserva seis destinos y permite panear antes de entrar', async ({
  page,
}, testInfo) => {
  await enterWorld(page);
  const surfaces = page.locator('.surface-object');
  await expect(surfaces).toHaveCount(6);
  for (const label of ['Session', 'Canvas', 'Docs', 'Code', 'Board', 'Agents']) {
    const button = page.getByRole('main').getByRole('button', { name: label, exact: true });
    await expect(button.locator('.surface-art')).toHaveAttribute('viewBox', '0 0 246 246');
    await expect(button.locator('.surface-preview')).toHaveCSS('border-radius', '50%');
    await expect(button.locator('.surface-preview img')).toHaveCount(0);
  }
  await testInfo.attach('vista-del-mundo', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  const before = await page.evaluate(() => window.EverettDebug!.snapshot().camera);
  await page.mouse.move(720, 400);
  await page.mouse.down();
  await page.mouse.move(850, 460, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.EverettDebug!.snapshot().camera.x))
    .toBeGreaterThan(before.x + 40);
  await page.getByRole('main').getByRole('button', { name: 'Docs', exact: true }).click();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('textbox', { name: 'Contenido del documento', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(surfaces).toHaveCount(6);
  await expect(page.locator('.surface-art')).toHaveCount(6);
});
