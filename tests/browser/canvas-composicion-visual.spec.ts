import { test, expect } from './fixtures';
import { start, capture, snapshot } from './canvas-utility-helpers';

test('C08-B200: una explicación ilustrada se ve, se edita y permanece separada del proyecto @development', async ({
  page,
}, info) => {
  await start(page);
  const original = (await snapshot(page)).state;
  const appUrl = page.url();
  await page.goto(new URL('/design/composicion-visual/', appUrl).href);
  const scene = page.locator('.canvas-stage');
  const pictures = scene.locator('.material.image img');
  await expect(pictures).toHaveCount(3);
  await expect
    .poll(() =>
      pictures.evaluateAll((imgs) =>
        imgs.every(
          (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 64,
        ),
      ),
    )
    .toBe(true);
  const truck = scene.locator('[data-node=camion]'),
    label = scene.locator('[data-node=frio] .canvas-text-run');
  await expect(label).toHaveText('4 °C en tránsito');
  const truckBox = (await truck.boundingBox())!,
    caption = (await label.boundingBox())!;
  expect(caption.y).toBeGreaterThan(truckBox.y + truckBox.height);
  expect(caption.y - truckBox.y - truckBox.height).toBeLessThan(40);
  await expect(scene.locator('.material.note')).toHaveCount(2);
  await expect(scene.locator('.free-arrow')).toBeInViewport();
  await capture(page, info, 'de-la-huerta-al-mercado');
  await label.dblclick();
  const editor = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await editor.fill('2 °C en tránsito');
  await editor.press('Escape');
  await page.reload();
  await expect(label).toHaveText('2 °C en tránsito');
  await page.goto(appUrl);
  const after = (await snapshot(page)).state;
  expect(after.worlds).toEqual(original.worlds);
  expect(after.camera).toEqual(original.camera);
});
