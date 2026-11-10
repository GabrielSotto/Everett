import { test, expect } from './fixtures';
import type { Page, Locator } from '@playwright/test';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

async function drag(page: Page, x: number, y: number, dx: number, dy: number) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}
async function pull(page: Page, handle: Locator, dx: number, dy: number) {
  const b = (await handle.boundingBox())!;
  await drag(page, b.x + b.width / 2, b.y + b.height / 2, dx, dy);
}
test('C08-B196: laterales redistribuyen sin desbordar grafemas; las esquinas escalan y conservan el extremo opuesto', async ({
  page,
}, info) => {
  await start(page);
  await page.keyboard.press('t');
  await page.mouse.click(300, 229);
  const field = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await field.fill('W🚚界');
  await page.locator('#note-size').fill('54');
  const bar = page.getByRole('group', { name: 'Formato del texto' });
  expect((await bar.boundingBox())!.width).toBeLessThan(370);
  for (const label of ['Centrar texto', 'Alinear a la derecha', 'Alinear a la izquierda']) {
    const b = bar.getByRole('button', { name: label, exact: true });
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'true');
  }
  await field.press('Escape');
  const item = page.locator('.material.text');
  const bounds = async () => (await item.boundingBox())!;
  const before = await bounds();
  await pull(page, item.locator('.se'), before.width, before.height);
  const enlarged = await bounds();
  expect(enlarged.width).toBeGreaterThan(before.width * 1.8);
  expect(enlarged.x).toBeCloseTo(before.x, 0);
  expect(enlarged.y).toBeCloseTo(before.y, 0);
  const saved = (await world(page)).nodes[0]!.data;
  expect(saved).toMatchObject({ kind: 'text', sizing: 'auto' });
  expect(saved.kind === 'text' && saved.size).toBeGreaterThan(95);
  await pull(page, item.locator('.w'), enlarged.width + 55, 0);
  const after = await bounds();
  expect(after.x + after.width).toBeCloseTo(enlarged.x + enlarged.width, 0);
  expect(after.height).toBeGreaterThan(enlarged.height * 2);
  const containment = () =>
    item.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el.querySelector('.canvas-text-run')!);
      const body = el.getBoundingClientRect();
      return [...range.getClientRects()]
        .filter(
          (r) =>
            r.left < body.left - 1 ||
            r.right > body.right + 1 ||
            r.top < body.top - 1 ||
            r.bottom > body.bottom + 1,
        )
        .map((r) => ({ box: body.toJSON(), run: r.toJSON() }));
    });
  expect(await containment()).toEqual([]);
  expect((await world(page)).nodes[0]!.data).toMatchObject({
    sizing: 'wrap',
    size: saved.kind === 'text' ? saved.size : 0,
  });
  await page.keyboard.press('Control+z');
  expect((await bounds()).width).toBeCloseTo(enlarged.width, 0);
  await page.keyboard.press('Control+Shift+z');
  await page.reload();
  await expect(item).toBeVisible();
  expect(await containment()).toEqual([]);
  await capture(page, info, 'texto-estrecho-contenido');
});

test('C08-B197: recorrido libre editable en vacío y cable grueso que sigue a sus materiales', async ({
  page,
}, info) => {
  await start(page);
  const fixture = await snapshot(page),
    w = fixture.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = [-290, 160].map((x, i) => ({
    id: 'hito-' + i,
    x,
    y: -125,
    width: 130,
    height: 100,
    owner: null,
    data: { kind: 'note', title: i ? 'Llegada' : 'Salida', text: '', color: '#f3ebcf' },
  }));
  w.links = [
    {
      id: 'ruta',
      from: 'hito-0',
      to: 'hito-1',
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'Traslado',
    },
  ];
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  await snapshot(page);
  const hit = page.locator('[data-link=ruta] .link-hit'),
    line = page.locator('[data-link=ruta] .link-line');
  await hit.focus();
  await hit.press(' ');
  const weight = page.getByRole('button', { name: 'Grosor 12 px', exact: true });
  await weight.click();
  await expect(weight).toHaveAttribute('aria-pressed', 'true');
  expect(
    parseFloat(await line.evaluate((el) => getComputedStyle(el).strokeWidth)),
  ).toBeGreaterThanOrEqual(12);
  const path = await line.getAttribute('d');
  const n = page.locator('[data-node=hito-0]');
  await pull(page, n, 35, 30);
  expect(await line.getAttribute('d')).not.toBe(path);
  await expect(page.locator('.cable-label')).toHaveText('Traslado');
  const draw = async (label: string, x: number, y: number, dx: number, dy: number) => {
    await page.getByRole('button', { name: 'Formas', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await drag(page, x, y, dx, dy);
  };
  await draw('Flecha recta', 620, 500, -240, -32);
  const arrow = page.locator('.free-arrow').first();
  await expect(arrow).toHaveCount(1);
  const ink = arrow.locator('.arrow-ink');
  const first = await ink.getAttribute('d');
  await pull(page, arrow.locator('[data-arrow-handle=bend]'), 10, -65);
  const curve = await ink.getAttribute('d');
  expect(curve).not.toBe(first);
  await page.keyboard.press('Control+z');
  await expect(ink).toHaveAttribute('d', first!);
  await page.keyboard.press('Control+Shift+z');
  await expect(ink).toHaveAttribute('d', curve!);
  const clickPoint = await ink.evaluate((el) => {
    const path = el as SVGPathElement;
    const { x, y } = path
      .getPointAtLength(path.getTotalLength() * 0.25)
      .matrixTransform(path.getScreenCTM()!);
    return { x, y };
  });
  await page.mouse.click(clickPoint.x, clickPoint.y);
  const end = arrow.locator('[data-arrow-handle=end]');
  await end.focus();
  await end.press('Shift+ArrowRight');
  expect(await ink.getAttribute('d')).not.toBe(curve);
  await draw('Flecha curva', 270, 530, 120, 0);
  expect((await world(page)).links).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.free-arrow')).toHaveCount(2);
  expect((await world(page)).links[0]).toMatchObject({
    id: 'ruta',
    label: 'Traslado',
    thickness: 12,
  });
  await capture(page, info, 'flechas-libres-y-conexion');
});
