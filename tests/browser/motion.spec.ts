import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

for (const [surface, trigger, prompt] of [
  ['Code', 'Hablar con Milo', 'Pedile un cambio a Milo…'],
  ['Docs', 'Asistente de escritura', 'Trabajá sobre este documento…'],
] as const) {
  test(`UI-MOTION-01 ${surface}: el composer conserva borrador, foco y geometría al invertir la apertura`, async ({
    page,
  }, testInfo) => {
    await enterWorld(page);
    await openSurface(page, surface);
    const fab = page.getByRole('button', { name: trigger, exact: true });
    const input = page.getByRole('textbox', { name: prompt, exact: true });
    const reveal = page.locator('.composer-reveal');
    await fab.click();
    const frames = await reveal.evaluate(async (element) => {
      const frames: { time: number; opacity: number; width: number; height: number }[] = [];
      for (let i = 0; i < 28; i++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const bounds = element.getBoundingClientRect();
        frames.push({
          time: performance.now(),
          opacity: Number(getComputedStyle(element).opacity),
          width: bounds.width,
          height: bounds.height,
        });
      }
      return frames;
    });
    await testInfo.attach('apertura-composer', {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    });
    expect(frames.some((frame) => frame.opacity > 0.3 && frame.opacity < 0.98)).toBe(true);
    expect(
      frames.every((frame) => Number.isFinite(frame.width) && frame.width > 0 && frame.height > 0),
    ).toBe(true);
    await input.fill('Borrador que debe conservarse');
    await input.press('Escape');
    await expect(fab).toBeFocused();
    await fab.click();
    await fab.click();
    await fab.click();
    await expect(reveal).not.toHaveAttribute('inert');
    await expect(input).toHaveValue('Borrador que debe conservarse');
    await expect
      .poll(() =>
        reveal.evaluate(
          (element) =>
            element.getAnimations().filter((animation) => animation.playState === 'running').length,
        ),
      )
      .toBe(0);
    await page.setViewportSize({ width: 720, height: 640 });
    await expect
      .poll(async () => {
        const bounds = await reveal.boundingBox();
        const anchor = await fab.boundingBox();
        return (
          !!bounds &&
          !!anchor &&
          bounds.x >= 0 &&
          bounds.x + bounds.width <= 720 &&
          bounds.y >= 0 &&
          bounds.y + bounds.height <= 640 &&
          (bounds.x + bounds.width <= anchor.x ||
            bounds.y + bounds.height <= anchor.y ||
            bounds.x >= anchor.x + anchor.width)
        );
      })
      .toBe(true);
    await expect(input).toHaveValue('Borrador que debe conservarse');
    await testInfo.attach('composer-estrecho', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });
}

test('UI-MOTION-02: la preferencia de movimiento reducido elimina transformaciones del composer', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterWorld(page);
  await openSurface(page, 'Code');
  await page.getByRole('button', { name: 'Hablar con Milo', exact: true }).click();
  await expect(page.locator('.composer-reveal')).toHaveCSS('transform', 'none');
  await expect(
    page.getByRole('textbox', { name: 'Pedile un cambio a Milo…', exact: true }),
  ).toBeVisible();
});

test('UI-MOTION-03: cerrar y reabrir el perfil mantiene una única presentación y devuelve el foco', async ({
  page,
}, testInfo) => {
  const trigger = page.getByRole('button', { name: 'Perfil de Gabi', exact: true });
  await trigger.click();
  const panel = page.locator('.profile-pop:not(.panel-exit)');
  await expect(panel).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Descripción del perfil', exact: true })
    .fill('Edición conservada durante el cierre');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
  await expect(page.locator('.panel-exit')).toHaveAttribute('aria-hidden', 'true');
  await trigger.click();
  await expect(panel).toHaveCount(1);
  await expect(
    page.getByRole('textbox', { name: 'Descripción del perfil', exact: true }),
  ).toHaveValue('Edición conservada durante el cierre');
  await expect(page.locator('.panel-exit')).toHaveCount(0);
  await testInfo.attach('perfil-reabierto', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('.profile-pop')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
