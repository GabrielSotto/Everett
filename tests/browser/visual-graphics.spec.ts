import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { start, capture, world, moveMaterial } from './canvas-utility-helpers';

async function palette(page: Page) {
  const trigger = page.getByRole('button', { name: 'Incorporar materiales', exact: true });
  if (await trigger.isVisible()) await trigger.click();
  else {
    await page.getByRole('button', { name: 'Más herramientas', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Incorporar materiales', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Gráfico explicativo…', exact: true }).click();
  return page.getByRole('dialog', { name: 'Gráficos explicativos', exact: true });
}
const pickerNames = ['sequence', 'cycle', 'comparison', 'anatomy'] as const;
test('C08-B214: crear y editar cuatro formatos, comparar lo mismo y deshacer la inserción sin tocar el trabajo anterior', async ({
  page,
}, info) => {
  await start(page);
  await page.setViewportSize({ width: 375, height: 600 });
  const narrow = await palette(page);
  const rect = (await narrow.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(375);
  expect(rect.y + rect.height).toBeLessThanOrEqual(600);
  await narrow.locator('[data-graphic=anatomy]').hover();
  await capture(page, info, 'menu-estrecho');
  await narrow.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.setViewportSize({ width: 800, height: 670 });
  for (const kind of pickerNames) {
    const panel = await palette(page);
    await expect(panel.locator('.graphic-thumb svg')).toHaveCount(4);
    if (kind === 'sequence') await capture(page, info, 'menu-de-graficos');
    await panel.locator('[data-graphic=' + kind + ']').click();
    await expect(panel).toHaveCount(0);
    const stage = page.locator('.canvas-stage');
    const imgs = stage.locator('.material.image img');
    await expect(imgs).toHaveCount({ sequence: 3, cycle: 4, comparison: 2, anatomy: 1 }[kind]);
    await expect
      .poll(() =>
        imgs.evaluateAll((es) =>
          es.every((e) => e instanceof HTMLImageElement && e.complete && e.naturalWidth > 64),
        ),
      )
      .toBe(true);
    await page.mouse.move(5, 75);
    const runs = stage.locator('.canvas-text-run');
    const labels = await runs.evaluateAll((els) =>
      els.map((e) => {
        const r = document.createRange();
        r.selectNodeContents(e);
        const box = r.getBoundingClientRect();
        return { text: e.textContent, x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      }),
    );
    for (const [i, a] of labels.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.right).toBeLessThanOrEqual(800);
      expect(a.y).toBeGreaterThan(52);
      expect(a.bottom).toBeLessThan(610);
      for (const b of labels.slice(i + 1))
        expect(
          a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y,
          a.text + ' / ' + b.text,
        ).toBe(true);
    }
    if (kind === 'comparison') {
      const y = (text: string) => labels.find((l) => l.text === text)!.y;
      expect(Math.abs(y('Puerta a puerta') - y('Entre estaciones'))).toBeLessThan(2);
      expect(Math.abs(y('Elegís la salida') - y('Según el servicio'))).toBeLessThan(2);
    }
    await capture(page, info, 'grafico-' + kind);
    if (kind === 'anatomy') {
      await expect(stage.locator('.canvas-leaders .link-line')).toHaveCount(3);
      await runs.filter({ hasText: /^Manubrio$/ }).dblclick();
      const edit = page.getByRole('textbox', { name: 'Texto en Canvas' });
      await edit.fill('Dirección');
      await edit.press('Escape');
      await page.reload();
      await expect(
        stage.locator('.canvas-text-run').filter({ hasText: /^Dirección$/ }),
      ).toBeVisible();
      await expect(imgs).toHaveCount(1);
      break;
    }
    await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
    await expect(stage.locator('.material')).toHaveCount(0);
    await expect(stage.locator('[data-link]')).toHaveCount(0);
  }
});
test('C08-B215: enlazar materiales propios en orden espacial y cambiar las puntas sin perder el anclaje ni la etiqueta', async ({
  page,
}, info) => {
  await start(page);
  await (await palette(page)).locator('[data-graphic=comparison]').click();
  const pictures = page.locator('.material.image');
  await expect(pictures).toHaveCount(2);
  const before = await world(page);
  await pictures.nth(1).click();
  await pictures.nth(0).click({ modifiers: ['Shift'] });
  const p = await palette(page);
  await expect(p.getByRole('button', { name: 'En ciclo', exact: true })).toHaveCount(0);
  await p.getByRole('button', { name: 'En secuencia', exact: true }).click();
  const group = page.locator('.connection[data-link]');
  await expect(group).toHaveCount(1);
  const created = await world(page),
    link = created.links[0]!;
  expect(created.nodes).toEqual(before.nodes);
  expect(created.nodes.find((n) => n.id === link.from)!.x).toBeLessThan(
    created.nodes.find((n) => n.id === link.to)!.x,
  );
  const hit = group.locator('.link-hit'),
    line = group.locator('.link-line');
  await hit.focus();
  await page.keyboard.press('Enter');
  const field = page.getByLabel('Etiqueta de conexión', { exact: true });
  await field.fill('Transbordo');
  await field.press('Enter');
  await hit.focus();
  await page.keyboard.press('Space');
  const both = page.getByRole('button', { name: 'Flechas en ambos extremos' });
  await both.click();
  await expect(both).toHaveAttribute('aria-pressed', 'true');
  await expect(line).toHaveAttribute('marker-start', /url/);
  await expect(line).toHaveAttribute('marker-end', /url/);
  await capture(page, info, 'sentido-del-cable');
  const d = await line.getAttribute('d');
  const b = (await pictures.first().boundingBox())!;
  await moveMaterial(page, link.from, b.x + b.width / 2 - 30, b.y + b.height / 2 - 65);
  await expect(line).not.toHaveAttribute('d', d!);
  await page.reload();
  await expect(group.locator('text')).toHaveText('Transbordo');
  await expect(line).toHaveAttribute('marker-end', /url/);
  await expect(line).toHaveAttribute('marker-start', /url/);
  const existing = await world(page);
  await page
    .locator('.canvas-text-run')
    .filter({ hasText: /^Recorrido$/ })
    .click();
  await pictures.nth(0).click({ modifiers: ['Shift'] });
  await pictures.nth(1).click({ modifiers: ['Shift'] });
  await (await palette(page)).getByRole('button', { name: 'En ciclo', exact: true }).click();
  await expect(group).toHaveCount(3);
  const loop = await world(page);
  expect(loop.nodes).toEqual(existing.nodes);
  expect(loop.links.filter((l) => l.label === 'Transbordo')).toEqual(existing.links);
  const ends = loop.links.flatMap((l) => [l.from, l.to]);
  expect(new Set(ends).size).toBe(3);
  for (const id of new Set(ends)) expect(ends.filter((v) => v === id)).toHaveLength(2);
  await page.getByRole('button', { name: 'Deshacer · Ctrl+Z', exact: true }).click();
  await expect(group).toHaveCount(1);
  expect((await world(page)).links).toEqual(existing.links);
});

test('C08-B216: señalar un punto propio; la llamada sigue la tinta durante movimiento, giro y escala y admite otro destino', async ({
  page,
}, info) => {
  await start(page);
  await (await palette(page)).locator('[data-graphic=comparison]').click();
  const bike = page
    .getByRole('article', { name: 'Bicicleta', exact: true })
    .filter({ has: page.locator('img') });
  await expect(bike).toBeVisible();
  const box = (await bike.boundingBox())!,
    at = { x: box.x + box.width * 0.28, y: box.y + box.height * 0.69 };
  async function open() {
    await page.mouse.click(at.x, at.y, { button: 'right' });
    await page.getByRole('menuitem', { name: 'Señalar un detalle…' }).click();
    return page.getByRole('textbox', { name: 'Rótulo del detalle' });
  }
  const first = await open();
  await first.fill('Descartado');
  await first.press('Escape');
  await expect(page.locator('.canvas-leaders .connection')).toHaveCount(0);
  const field = await open();
  await field.fill('Rueda delantera');
  await field.press('Enter');
  const ink = page.locator('.canvas-leaders .link-line');
  async function tip() {
    return ink.evaluate((el) => {
      const p = el as SVGPathElement,
        pt = p.getPointAtLength(p.getTotalLength()).matrixTransform(p.getScreenCTM()!);
      return { x: pt.x, y: pt.y };
    });
  }
  // Un trazo horizontal tiene una caja geométrica sin alto aunque sí pinte y reciba clics.
  await expect(ink).toHaveCSS('stroke', 'rgb(255, 209, 139)');
  expect(await ink.evaluate((e) => (e as SVGPathElement).getTotalLength())).toBeGreaterThan(30);
  const initial = await tip();
  expect(Math.hypot(initial.x - at.x, initial.y - at.y)).toBeLessThan(2);
  const id = (await bike.getAttribute('data-node'))!;
  await moveMaterial(page, id, box.x + box.width / 2 + 47, box.y + box.height / 2 - 35);
  const testSpot = async () => {
    const b = (await bike.boundingBox())!,
      theta = await bike.evaluate(
        (el) => ((parseFloat(getComputedStyle(el).rotate) || 0) * Math.PI) / 180,
      );
    const side = b.width / (Math.abs(Math.cos(theta)) + Math.abs(Math.sin(theta)));
    const x = (0.28 - 0.5) * side,
      y = (0.69 - 0.5) * side;
    const expected = {
      x: b.x + b.width / 2 + x * Math.cos(theta) - y * Math.sin(theta),
      y: b.y + b.height / 2 + x * Math.sin(theta) + y * Math.cos(theta),
    };
    const end = await tip();
    expect(Math.hypot(end.x - expected.x, end.y - expected.y)).toBeLessThan(2.5);
  };
  await testSpot();
  await bike.click();
  await page
    .getByRole('button', { name: 'Girar selección', exact: true })
    .press('Shift+ArrowRight');
  await expect(bike).toHaveCSS('rotate', '15deg');
  await testSpot();
  const resize = page.locator('[data-id="' + id + '"][data-corner=se]');
  const b0 = (await bike.boundingBox())!;
  await resize.press('Shift+ArrowRight');
  await expect.poll(async () => (await bike.boundingBox())!.width).toBeGreaterThan(b0.width);
  await testSpot();
  const hit = page.locator('.canvas-leaders .link-hit');
  await hit.focus();
  await hit.press('Space');
  const dest = page.locator('.canvas-leaders [data-end=to] .endpoint-dot'),
    pos = (await dest.boundingBox())!,
    b = (await bike.boundingBox())!;
  const next = { x: b.x + b.width * 0.61, y: b.y + b.height * 0.42 };
  await page.mouse.move(pos.x + pos.width / 2, pos.y + pos.height / 2);
  await page.mouse.down();
  await page.mouse.move(next.x, next.y, { steps: 9 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const t = await tip();
      return Math.hypot(t.x - next.x, t.y - next.y);
    })
    .toBeLessThan(2.5);
  await page.reload();
  await expect(
    page.locator('.canvas-text-run').filter({ hasText: 'Rueda delantera' }),
  ).toBeVisible();
  const saved = await tip();
  expect(Math.hypot(saved.x - next.x, saved.y - next.y)).toBeLessThan(2.5);
  await capture(page, info, 'detalle-en-imagen-propia');
});
