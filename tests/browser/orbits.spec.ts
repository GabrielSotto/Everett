import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { installOrbitProbe, orbitPixels, type RenderedWorld } from './orbit-probe';

async function focusWorld(page: Page, name = 'Resource Scout'): Promise<void> {
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar en Everett', exact: true }).fill(name);
  const world = page.getByRole('main').getByRole('button', { name, exact: true });
  await expect(world).toBeInViewport();
  await page.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
  await world.click();
  await page.mouse.move(10, 70);
  await expect
    .poll(async () => {
      const box = (await world.boundingBox())!;
      return Math.abs(box.x + box.width / 2 - page.viewportSize()!.width / 2);
    })
    .toBeLessThan(0.1);
}

async function rendered(page: Page, id = 'scout'): Promise<RenderedWorld> {
  const worlds = JSON.parse(
    (await page.locator('.planet-renderer').getAttribute('data-worlds'))!,
  ) as RenderedWorld[];
  const world = worlds.find((w) => w.id === id);
  if (!world) throw new Error(`El Mundo ${id} debe estar dibujado`);
  return world;
}

test('UI-ORBIT-01: las órbitas pertenecen a la proyección del Mundo y tienen una luna en movimiento', async ({
  page,
}) => {
  await focusWorld(page);
  await expect(page.locator('.planet-ring')).toHaveCount(0);
  const first = await rendered(page);
  expect(first.orbit).not.toBeNull();
  expect(first.orbit!.moonRadius).toBeGreaterThan(0);
  await expect.poll(async () => (await rendered(page)).orbit!.moon).not.toEqual(first.orbit!.moon);
  await focusWorld(page, 'Everett');
  expect((await rendered(page, 'everett')).orbit).toBeNull();
  await focusWorld(page);
  const again = await rendered(page);
  expect(again.orbit!.periodSeconds).toBe(first.orbit!.periodSeconds);
  expect(again.orbit!.direction).toBe(first.orbit!.direction);
  await page.keyboard.press('Enter');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'world/scout');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewport')).toHaveAttribute('data-route', 'universe');
  await expect(page.locator('.transition-ghost')).toHaveCount(0);
  expect((await rendered(page)).orbit).not.toBeNull();
});

for (const pixelRatio of [1, 2]) {
  test.describe(`órbitas DPR ${pixelRatio}`, () => {
    test.use({ deviceScaleFactor: pixelRatio });
    test(`UI-ORBIT-02: el Mundo oculta el tramo posterior y la luna durante un ciclo completo, DPR ${pixelRatio}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);
      await page.clock.install();
      await page.reload();
      await focusWorld(page);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await page.evaluate(installOrbitProbe);
      await page.clock.runFor(120);
      const initial = await rendered(page);
      const observations = [];
      let hidden = 0,
        inFront = 0,
        outside = 0;
      for (let step = 0; step < 9; step++) {
        const sample = await page.evaluate(orbitPixels);
        expect(sample.rearChanges).toBe(0);
        expect(sample.frontChanges).toBeGreaterThan(30);
        const moon = sample.world.orbit!.moon;
        const distance = Math.hypot(moon.x, moon.y);
        if (distance < 0.8) {
          if (moon.depth < 0) {
            expect(sample.moonChanges).toBe(0);
            if (!hidden++)
              await testInfo.attach('luna-oculta-por-el-mundo', {
                body: await page.screenshot(),
                contentType: 'image/png',
              });
          } else {
            expect(sample.moonChanges).toBeGreaterThan(10);
            if (!inFront++)
              await testInfo.attach('luna-delante-del-mundo', {
                body: await page.screenshot(),
                contentType: 'image/png',
              });
          }
        } else if (distance > 1.2) {
          expect(sample.moonAlpha).toBeGreaterThan(240);
          outside++;
        }
        observations.push(sample);
        if (step < 8) await page.clock.runFor((initial.orbit!.periodSeconds * 1000) / 8);
      }
      expect(hidden).toBeGreaterThan(0);
      expect(inFront).toBeGreaterThan(0);
      expect(outside).toBeGreaterThan(0);
      await testInfo.attach('occlusion-por-fotograma', {
        body: JSON.stringify(observations),
        contentType: 'application/json',
      });
      // El control dibuja deliberadamente la órbita trasera encima de la cara del Mundo.
      await page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('.planet-renderer')!;
        const world = (JSON.parse(canvas.dataset.worlds!) as RenderedWorld[]).find(
          (w) => w.id === 'scout',
        )!;
        const ctx = canvas.getContext('2d')!;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          world.x,
          world.y,
          world.radius * world.orbit!.radius,
          world.radius * world.orbit!.minorRadius,
          world.orbit!.angle,
          Math.PI,
          Math.PI * 2,
        );
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      });
      expect((await page.evaluate(orbitPixels)).rearChanges).toBeGreaterThan(30);
      await testInfo.attach('control-negativo-orbita-sobre-el-planeta', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
      await page.clock.runFor(120);
      expect((await page.evaluate(orbitPixels)).rearChanges).toBe(0);
      await page.clock.resume();
    });
  });
}

test('UI-ORBIT-03: movimiento reducido conserva luna, escala y oclusión al cambiar el zoom', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await focusWorld(page);
  const initial = await rendered(page);
  await expect(page.locator('.planet-renderer')).toHaveAttribute('data-paused', 'true');
  await page.mouse.move(720, 420);
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => (await rendered(page)).radius).toBeLessThan(initial.radius * 0.95);
  const after = await rendered(page);
  expect(after.orbit!.moon).toEqual(initial.orbit!.moon);
  expect(after.angle).toBe(initial.angle);
  await page.evaluate(installOrbitProbe);
  await page.setViewportSize({ width: 1000, height: 720 });
  await expect.poll(() => page.evaluate(() => !!window.EverettOrbitPixels)).toBe(true);
  const pixels = await page.evaluate(orbitPixels);
  expect(pixels.rearChanges).toBe(0);
  expect(pixels.frontChanges).toBeGreaterThan(10);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(async () => (await rendered(page)).orbit!.moon).not.toEqual(after.orbit!.moon);
});

test('UI-ORBIT-04: atenuar un Mundo con el filtro conserva la oclusión de su órbita', async ({
  page,
}, testInfo) => {
  await page.clock.install();
  await page.reload();
  await focusWorld(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(installOrbitProbe);
  await page.getByRole('button', { name: 'Buscar en Everett', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Buscar en Everett', exact: true })
    .fill('Mundo inexistente para comprobar atenuación');
  const world = page.locator('.world-body[data-focus="scout"]');
  await expect(world).toHaveClass(/dimmed/);
  await expect
    .poll(() =>
      world.evaluate((el) => Number((el as HTMLElement).style.getPropertyValue('--capture'))),
    )
    .toBeLessThan(0.001);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const sample = await page.evaluate(orbitPixels);
  expect(sample.rearChanges, JSON.stringify(sample.rearExamples)).toBe(0);
  expect(sample.frontChanges).toBeGreaterThan(10);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.planet-renderer')!;
    const world = (JSON.parse(canvas.dataset.worlds!) as RenderedWorld[]).find(
      (w) => w.id === 'scout',
    )!;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.ellipse(
      world.x,
      world.y,
      world.radius * world.orbit!.radius,
      world.radius * world.orbit!.minorRadius,
      world.orbit!.angle,
      Math.PI,
      Math.PI * 2,
    );
    ctx.strokeStyle = 'rgba(176,190,207,.24)';
    ctx.lineWidth = Math.max(0.65, world.radius * 0.007);
    ctx.stroke();
    ctx.restore();
  });
  const corrupted = await page.evaluate(orbitPixels);
  expect(corrupted.rearChanges).toBeGreaterThan(10);
  await page.setViewportSize({ width: 1441, height: 900 });
  await page.clock.runFor(160);
  await expect.poll(async () => (await page.evaluate(orbitPixels)).rearChanges).toBe(0);
  await testInfo.attach('occlusion-atenuada-y-control-negativo', {
    body: JSON.stringify({
      original: sample,
      corrupted,
      restored: await page.evaluate(orbitPixels),
    }),
    contentType: 'application/json',
  });
  await page.clock.resume();
  await page.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
  await expect(world).not.toHaveClass(/dimmed/);
});
