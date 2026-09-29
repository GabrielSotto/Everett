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
  await expect(page.locator('.dragging:has(> .space)')).toHaveCSS('cursor', 'grabbing');
  await expect(page.locator('.space')).toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(850, 460, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.space')).toHaveCSS('cursor', 'grab');
  await expect(page.locator('.dragging')).toHaveCount(0);
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

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`UI-WORLD-02: foco visible y exclusivo con salida reversible (${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion });
    await enterWorld(page);
    const positions = await page.locator('.surface-object').evaluateAll((elements) =>
      elements.map((element) => ({
        x: parseFloat((element as HTMLElement).style.left),
        y: parseFloat((element as HTMLElement).style.top),
      })),
    );
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        expect(
          Math.hypot(positions[i]!.x - positions[j]!.x, positions[i]!.y - positions[j]!.y),
        ).toBeGreaterThan(400);
      }
    }
    const canvas = page.getByRole('main').getByRole('button', { name: 'Canvas', exact: true });
    const docs = page.getByRole('main').getByRole('button', { name: 'Docs', exact: true });
    const halo = (element: Element) => getComputedStyle(element, '::before').opacity;
    for (const [target, previous] of [
      [canvas, docs],
      [docs, canvas],
      [canvas, docs],
    ]) {
      await target!.click();
      await expect(target!).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.surface-object[aria-pressed="true"]')).toHaveCount(1);
      await expect.poll(() => target!.evaluate(halo)).toBe('1');
      await expect.poll(() => previous!.evaluate(halo)).toBe('0');
      await expect(target!.locator('.surface-label > svg')).not.toHaveCSS('transform', 'none');
      if (reducedMotion === 'reduce') {
        await expect(target!.locator('.surface-label')).toHaveCSS('transition-duration', '0s');
      }
    }
    await testInfo.attach(`foco-${reducedMotion}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });
}
