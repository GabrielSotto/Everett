import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';
import type { Page } from '@playwright/test';
const snapshot = (page: Page) => page.evaluate(() => window.EverettDebug!.snapshot());
const world = async (page: Page) =>
  (await snapshot(page)).state.worlds.find((w) => w.id === 'scout')!;

test('C08-B44: los ejemplos alternan tres imágenes reales y continúan tras recargar sin cambiar materiales anteriores', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await enterWorld(page);
  await openSurface(page, 'Canvas');
  const names = [
    'Paisaje — ejemplo.svg',
    'Ciudad — ejemplo.svg',
    'Naturaleza — ejemplo.svg',
    'Paisaje — ejemplo.svg',
  ];
  const samples: { id: string; bytes: number[] }[] = [];
  for (const [index, name] of names.entries()) {
    const before = (await world(page)).nodes;
    await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Importar archivos locales', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cargar ejemplos multimedia', exact: true }).click();
    await expect
      .poll(async () => (await snapshot(page)).ui.canvas.sampleImageIndex)
      .toBe((index + 1) % 3);
    const after = (await world(page)).nodes;
    expect(after).toHaveLength(before.length + 3);
    for (const node of before) expect(after.find((n) => n.id === node.id)).toEqual(node);
    const image = after.find(
      (n) => !before.some((old) => old.id === n.id) && n.data.kind === 'image',
    )!;
    expect(image.data.kind === 'image' ? image.data.title : '').toBe(name);
    const preview = page.locator('[data-node="' + image.id + '"] > img');
    await expect(preview).toBeVisible();
    await expect(preview).toBeInViewport();
    await expect
      .poll(() => preview.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBe(640);
    const bytes = await preview.evaluate(async (el) =>
      Array.from(new Uint8Array(await (await fetch((el as HTMLImageElement).src)).arrayBuffer())),
    );
    samples.push({ id: image.id, bytes });
    await testInfo.attach('imagen-ejemplo-' + index, {
      body: await preview.screenshot(),
      contentType: 'image/png',
    });
    if (index === 1) {
      await openSurface(page, 'Docs');
      await openSurface(page, 'Canvas');
      expect((await snapshot(page)).ui.canvas.sampleImageIndex).toBe(2);
    }
    await page.reload();
    await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
    expect((await world(page)).nodes).toEqual(after);
    expect((await snapshot(page)).ui.canvas.sampleImageIndex).toBe((index + 1) % 3);
    for (const sample of samples) {
      const saved = page.locator('[data-node="' + sample.id + '"] > img');
      await expect
        .poll(() => saved.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBe(640);
      const recovered = await saved.evaluate(async (el) =>
        Array.from(new Uint8Array(await (await fetch((el as HTMLImageElement).src)).arrayBuffer())),
      );
      expect(recovered).toEqual(sample.bytes);
    }
  }
  expect(new Set(samples.slice(0, 3).map((sample) => JSON.stringify(sample.bytes))).size).toBe(3);
  expect(samples[3]!.bytes).toEqual(samples[0]!.bytes);
  expect(new Set(samples.map((sample) => sample.id)).size).toBe(4);
});
