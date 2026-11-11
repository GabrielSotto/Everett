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
  const ink = await label.evaluate((el) => {
    const style = getComputedStyle(el),
      c = document.createElement('canvas').getContext('2d')!;
    c.font = style.fontWeight + ' 60px ' + style.fontFamily;
    return ['4', 'C'].map((ch) => {
      const m = c.measureText(ch);
      return { top: m.actualBoundingBoxAscent, bottom: m.actualBoundingBoxDescent };
    });
  });
  expect(Math.abs(ink[0]!.top - ink[1]!.top)).toBeLessThanOrEqual(3);
  expect(Math.abs(ink[0]!.bottom - ink[1]!.bottom)).toBeLessThanOrEqual(2);
  const truckBox = (await truck.boundingBox())!,
    caption = (await label.boundingBox())!;
  expect(caption.y).toBeGreaterThan(truckBox.y + truckBox.height);
  expect(caption.y - truckBox.y - truckBox.height).toBeLessThan(40);
  await expect(scene.locator('.material.note')).toHaveCount(2);
  await expect(scene.locator('.free-arrow')).toBeInViewport();
  // La ruta pasa bajo el camión y termina junto a la nota, sin atravesar los rótulos.
  const crossesLabel = await scene.evaluate((stage) => {
    const path = stage.querySelector<SVGPathElement>('.arrow-ink')!;
    const boxes = [
      ...stage.querySelectorAll(
        '[data-node=etapa-1] .canvas-text-run,[data-node=etapa-3] .canvas-text-run,[data-node=frio] .canvas-text-run',
      ),
    ].flatMap((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()];
    });
    const transform = path.getScreenCTM()!,
      length = path.getTotalLength();
    for (let distance = 0; distance <= length; distance += 2) {
      const p = path.getPointAtLength(distance).matrixTransform(transform);
      if (
        boxes.some(
          (r) => p.x >= r.left - 3 && p.x <= r.right + 3 && p.y >= r.top - 3 && p.y <= r.bottom + 3,
        )
      )
        return true;
    }
    return false;
  });
  expect(crossesLabel).toBe(false);
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

test('C08-B203: girar camión y flecha, escalar la ilustración sobre sus ejes y retocar la curva @development', async ({
  page,
}, info) => {
  await page.goto('/design/composicion-visual/');
  const truck = page.locator('[data-node=camion]'),
    arrow = page.locator('[data-node=recorrido]');
  await truck.click();
  const control = page.getByRole('button', { name: 'Girar selección', exact: true });
  await control.press('Shift+ArrowLeft');
  await expect(truck).toHaveCSS('rotate', '345deg');
  const nw = page.locator('[data-id=camion][data-corner=nw]'),
    se = page.locator('[data-id=camion][data-corner=se]');
  const midpoint = async (el: typeof nw) => {
    const r = (await el.boundingBox())!;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const fixed = await midpoint(nw),
    handle = await midpoint(se);
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 24, handle.y + 14, { steps: 6 });
  await page.mouse.up();
  const after = await midpoint(nw);
  expect(Math.hypot(after.x - fixed.x, after.y - fixed.y)).toBeLessThan(2);
  const ink = arrow.locator('.arrow-ink');
  const xy = await ink.evaluate((el) => {
    const svg = el as SVGPathElement,
      p = svg.getPointAtLength(svg.getTotalLength() * 0.35).matrixTransform(svg.getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  await page.mouse.click(xy.x, xy.y);
  await control.press('Shift+ArrowRight');
  await expect(arrow).toHaveCSS('rotate', '15deg');
  const bend = await midpoint(page.locator('[data-id=recorrido][data-arrow-handle=bend]')),
    before = await ink.getAttribute('d');
  await page.mouse.move(bend.x, bend.y);
  await page.mouse.down();
  await page.mouse.move(bend.x, bend.y + 18, { steps: 4 });
  await page.mouse.up();
  expect(await ink.getAttribute('d')).not.toBe(before);
  await page.reload();
  await expect(truck).toHaveCSS('rotate', '345deg');
  await expect(arrow).toHaveCSS('rotate', '15deg');
  await truck.click();
  await capture(page, info, 'camion-y-recorrido-girados');
});
