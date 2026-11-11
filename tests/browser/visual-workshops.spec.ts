import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, expect } from './fixtures';
import { capture, moveMaterial, snapshot } from './canvas-utility-helpers';
import type { Locator, Page } from '@playwright/test';

const route = (scene: string) => '/design/composicion-visual/?escena=' + scene;
async function ready(page: Page, scene: string) {
  await page.goto(route(scene));
  await expect
    .poll(() =>
      page
        .locator('.material.image img')
        .evaluateAll(
          (es) => es.length === 1 && es.every((el) => (el as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
}
async function point(ink: Locator, fraction: number) {
  return ink.evaluate((el, f) => {
    const p = el as SVGPathElement,
      xy = p.getPointAtLength(p.getTotalLength() * f).matrixTransform(p.getScreenCTM()!);
    return { x: xy.x, y: xy.y };
  }, fraction);
}
const center = async (el: Locator) => {
  const r = (await el.boundingBox())!;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
test('C08-B217: decidir una tirada, separar una rama sin perder su respuesta, deshacer y volver al mismo proyecto @development', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1260, height: 780 });
  await ready(page, 'imprenta');
  const yes = page.locator('[data-link=aprobar]'),
    no = page.locator('[data-link=ajustar]');
  await expect(yes.locator('text')).toHaveText('Sí');
  await expect(no.locator('text')).toHaveText('No');
  const proof = page.locator('[data-node=prueba]');
  await expect(proof).toBeInViewport();
  await legibleNotes(page);
  await capture(page, info, 'prueba-de-imprenta');
  const node = page.locator('[data-node=tirada]'),
    first = await center(node);
  await moveMaterial(page, 'tirada', first.x + 94, first.y - 72);
  await expect.poll(async () => dist(first, await center(node))).toBeGreaterThan(70);
  const ink = yes.locator('.link-line'),
    answer = yes.locator('text');
  expect(dist(await point(ink, 0), await center(answer))).toBeLessThan(91);
  expect(dist(await center(answer), await center(no.locator('text')))).toBeGreaterThan(22);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  expect(dist(await center(node), first)).toBeLessThan(2);
  const hit = no.locator('.link-hit');
  await hit.focus();
  await hit.press('Enter');
  const edit = page.getByLabel('Etiqueta de conexión', { exact: true });
  await edit.fill('Desfasadas');
  await edit.press('Enter');
  const placement = page.getByRole('combobox', { name: 'Ubicación de la etiqueta' });
  await expect(placement).toHaveValue('start');
  await placement.selectOption('end');
  await ready(page, 'optica');
  await expect(page.locator('.canvas-leaders .connection')).toHaveCount(4);
  await ready(page, 'imprenta');
  await expect(no.locator('text')).toHaveText('Desfasadas');
  expect(
    (await snapshot(page)).state.worlds[0]!.links.find((l) => l.id === 'ajustar')?.labelPlacement,
  ).toBe('end');
});
async function legibleNotes(page: Page) {
  for (const part of await page.locator('.material.note > :is(h3,p)').all()) {
    const fits = await part.evaluate((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      const text = range.getBoundingClientRect(),
        box = e.getBoundingClientRect();
      return text.bottom <= box.bottom + 1 && text.right <= box.right + 1;
    });
    expect(fits, await part.innerText()).toBe(true);
  }
}
const PNG = createRequire(import.meta.url)(
  resolve('node_modules/playwright-core/lib/utilsBundle.js'),
).PNG as { sync: { read(b: Buffer): { data: Buffer } } };
function luminance(data: Buffer, i: number) {
  const v = [0, 1, 2]
    .map((k) => data[i + k]! / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
}
async function onPaper(page: Page, ink: Locator) {
  const p = await point(ink, 0.62),
    clip = { x: Math.floor(p.x) - 3, y: Math.floor(p.y) - 5, width: 7, height: 11 };
  const read = async () => PNG.sync.read(await page.screenshot({ clip })).data;
  const drawn = await read();
  const off = await page.addStyleTag({ content: '.canvas-leaders{visibility:hidden}' });
  try {
    const paper = await read();
    let best = 1;
    for (let i = 0; i < drawn.length; i += 4) {
      const a = luminance(paper, i),
        b = luminance(drawn, i);
      if (a > 0.7) best = Math.max(best, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
    }
    return best;
  } finally {
    await off.evaluate((el) => el.parentNode?.removeChild(el));
  }
}
test('C08-B218: leer un corte óptico sobre papel claro y cámara oscura, moverlo y conservar las cuatro llamadas @development', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1120, height: 760 });
  await ready(page, 'optica');
  const leaders = page.locator('.canvas-leaders .link-line'),
    candle = page.locator('[data-link=detalle-llama] .link-line'),
    diagram = page.locator('[data-node=corte]');
  await expect(leaders).toHaveCount(4);
  await capture(page, info, 'camara-oscura');
  const contrast = await onPaper(page, candle);
  expect(
    contrast,
    'la guía sobre el papel necesita una frontera discernible',
  ).toBeGreaterThanOrEqual(3);
  await info.attach('contraste-del-indicador', {
    body: JSON.stringify({ muestra: 'papel junto a la llama', contraste: contrast }),
    contentType: 'application/json',
  });
  const nearby = page.locator('[data-node=orificio]'),
    independent = page.locator('[data-node=pantalla]');
  const before = await Promise.all((await leaders.all()).map((l) => point(l, 1)));
  const c = await center(diagram);
  await moveMaterial(page, 'corte', c.x + 52, c.y + 48);
  const after = await center(diagram);
  expect(dist(c, after)).toBeGreaterThan(45);
  for (const [i, el] of (await leaders.all()).entries()) {
    expect(
      dist(await point(el, 1), {
        x: before[i]!.x + after.x - c.x,
        y: before[i]!.y + after.y - c.y,
      }),
    ).toBeLessThan(2);
  }
  // Reordenar solo una parte: ni perder el punto, ni arrastrar los rótulos ajenos a la selección.
  await nearby.click({ modifiers: ['Shift'] });
  await expect(diagram).toHaveClass(/selected/);
  await expect(nearby).toHaveClass(/selected/);
  const near0 = await center(nearby),
    fixed = await center(independent);
  await moveMaterial(page, 'corte', after.x - 78, after.y - 36);
  const end = await center(diagram),
    delta = { x: end.x - after.x, y: end.y - after.y };
  expect(Math.hypot(delta.x, delta.y)).toBeGreaterThan(55);
  expect(dist(await center(nearby), { x: near0.x + delta.x, y: near0.y + delta.y })).toBeLessThan(
    2,
  );
  expect(dist(await center(independent), fixed)).toBeLessThan(2);
  for (const [i, el] of (await leaders.all()).entries())
    expect(
      dist(await point(el, 1), { x: before[i]!.x + end.x - c.x, y: before[i]!.y + end.y - c.y }),
    ).toBeLessThan(2);
  await page.reload();
  await expect(diagram).toBeVisible();
  expect(dist(await center(diagram), end)).toBeLessThan(2);
  const model = (await snapshot(page)).state.worlds[0]!;
  expect(model.links.every((l) => l.detail && l.to === 'corte')).toBe(true);
});
test('C08-B219: los dos ejemplos estrechos se abren completos y los rótulos siguen siendo legibles @development', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 760 });
  for (const id of ['imprenta', 'optica']) {
    await ready(page, id);
    await legibleNotes(page);
    await capture(page, info, id + '-estrecho');
    for (const el of await page
      .locator('.material .canvas-text-run,.material.note h3,.material.note p,.cable-label')
      .all()) {
      const r = await el.evaluate((e) => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const b = range.getBoundingClientRect(),
          host = e.closest('.material');
        return {
          l: b.left,
          r: b.right,
          t: b.top,
          b: b.bottom,
          size:
            parseFloat(getComputedStyle(e).fontSize) *
            (host ? host.getBoundingClientRect().width / (host as HTMLElement).offsetWidth : 1),
        };
      });
      expect(r.l).toBeGreaterThanOrEqual(0);
      expect(r.r).toBeLessThanOrEqual(390);
      expect(r.t).toBeGreaterThan(55);
      expect(r.b).toBeLessThan(675);
      expect(r.size).toBeGreaterThanOrEqual(11);
    }
  }
});
