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
        ).toBeGreaterThan(475);
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
      const labels = await page.locator('.surface-label').evaluateAll((elements) =>
        elements.map((element) => {
          const icon = element.querySelector('svg')!.getBoundingClientRect();
          const text = element.querySelector('.surface-label-text')!.getBoundingClientRect();
          return {
            name: element.textContent,
            delta: icon.y + icon.height / 2 - text.y - text.height / 2,
          };
        }),
      );
      for (const label of labels) expect(Math.abs(label.delta), label.name ?? '').toBeLessThan(0.5);
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

test('UI-WORLD-03: Session y Agents animan el conjunto sin desalinear icono y nombre', async ({
  page,
}, testInfo) => {
  await enterWorld(page);
  const evidence = [];
  for (const name of ['Session', 'Agents']) {
    const target = page.getByRole('main').getByRole('button', { name, exact: true });
    // El gesto dispara la medición antes del primer fotograma de foco.
    await target.evaluate((element) => {
      element.addEventListener(
        'pointerdown',
        () => {
          const label = element.querySelector<HTMLElement>('.surface-label')!;
          const icon = label.querySelector('svg')!;
          const text = label.querySelector('.surface-label-text')!;
          const frames: { delta: number; width: number; iconX: number }[] = [];
          const start = performance.now();
          const sample = (now: number) => {
            const i = icon.getBoundingClientRect(),
              t = text.getBoundingClientRect();
            frames.push({
              delta: i.y + i.height / 2 - t.y - t.height / 2,
              width: label.getBoundingClientRect().width,
              iconX: new DOMMatrix(getComputedStyle(icon).transform).m41,
            });
            if (now - start < 450) requestAnimationFrame(sample);
            else label.dataset.motionSamples = JSON.stringify(frames);
          };
          requestAnimationFrame(sample);
        },
        { once: true },
      );
    });
    await target.click();
    await expect(target).toHaveAttribute('aria-pressed', 'true');
    const label = target.locator('.surface-label');
    await expect(label).toHaveAttribute('data-motion-samples', /./);
    const frames = JSON.parse((await label.getAttribute('data-motion-samples'))!) as {
      delta: number;
      width: number;
      iconX: number;
    }[];
    expect(frames.length).toBeGreaterThan(5);
    expect(Math.max(...frames.map((frame) => Math.abs(frame.delta)))).toBeLessThan(0.5);
    expect(
      Math.max(...frames.map((frame) => frame.width)) /
        Math.min(...frames.map((frame) => frame.width)),
    ).toBeGreaterThan(1.05);
    expect(frames.some((frame) => frame.iconX > -2 && frame.iconX < 0)).toBe(true);
    evidence.push({ name, frames });
    await testInfo.attach(`alineacion-${name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
  await testInfo.attach('fotogramas-alineados', {
    body: JSON.stringify(evidence),
    contentType: 'application/json',
  });
});
