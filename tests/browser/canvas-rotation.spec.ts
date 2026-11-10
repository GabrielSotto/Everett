import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import type { Locator } from '@playwright/test';
import { googleFontFiles } from './google-font-files';

async function middle(target: Locator) {
  const { x, y, width, height } = (await target.boundingBox())!;
  return { x: x + width / 2, y: y + height / 2 };
}

test('C08-B204: girar directamente al cambiar la fuente mueve la tinta y deja un solo marco @development', async ({
  page,
}, info) => {
  await page.goto('/design/composicion-visual/');
  const label = page.locator('[data-node=frio]'),
    ink = label.locator('.canvas-text-run');
  await ink.dblclick();
  const font = page.getByRole('combobox', { name: 'Tipografía', exact: true });
  await font.fill('Monoespaciada');
  await page.locator('[data-action=font-select][data-font=mono]').click();
  await expect(label).toHaveCSS('outline-style', 'none');
  await expect(page.getByRole('textbox', { name: 'Texto en Canvas' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  const handle = page.getByRole('button', { name: 'Girar selección', exact: true });
  const origin = await middle(handle);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await expect(page.locator('.direct-text-draft')).toHaveCount(0, { timeout: 900 });
  await expect(ink).toBeVisible();
  const pivot = await middle(label);
  const x = origin.x - pivot.x,
    y = origin.y - pivot.y;
  await page.mouse.move(pivot.x - y, pivot.y + x, { steps: 8 });
  // Medir la tinta, no solo el marco: al girar 90° la línea pasa a ser vertical.
  const textBox = await ink.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  expect(textBox.height).toBeGreaterThan(textBox.width * 3);
  const name = label.locator('.material-identification button');
  async function expectNameAboveText() {
    await expect(name).toBeVisible();
    const box = (await name.boundingBox())!;
    expect(box.y + box.height).toBeLessThan((await label.boundingBox())!.y);
  }
  await expectNameAboveText();
  await capture(page, info, 'girar-texto-tras-cambiar-fuente');
  await page.mouse.up();
  await page.reload();
  await expect(ink).toHaveCSS('font-family', /mono/i);
  expect(parseFloat(await label.evaluate((el) => getComputedStyle(el).rotate))).toBeCloseTo(90, 0);
  await ink.click();
  await expectNameAboveText();
});

test('C08-B205: el control sigue la esquina al cruzar cero en ambos sentidos @development', async ({
  page,
}) => {
  await page.goto('/design/composicion-visual/');
  const truck = page.locator('[data-node=camion]');
  await truck.click();
  const handle = page.getByRole('button', { name: 'Girar selección', exact: true });
  await handle.press('ArrowLeft');
  const pivot = await middle(truck),
    initial = await middle(handle);
  const x = initial.x - pivot.x,
    y = initial.y - pivot.y;
  await page.mouse.move(initial.x, initial.y);
  await page.mouse.down();
  for (const degrees of [2, -1, 3]) {
    const angle = (degrees * Math.PI) / 180;
    const target = {
      x: pivot.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: pivot.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
    await page.mouse.move(target.x, target.y);
    const errors = await handle.evaluate(async (el, target) => {
      const errors = [];
      for (let i = 0; i < 10; i++) {
        await new Promise(requestAnimationFrame);
        const r = el.getBoundingClientRect();
        errors.push(Math.hypot(r.x + r.width / 2 - target.x, r.y + r.height / 2 - target.y));
      }
      return errors;
    }, target);
    expect(Math.max(...errors)).toBeLessThan(3);
  }
  await page.mouse.up();

  const note = page.locator('.material.note').first();
  await note.click();
  const box = (await note.boundingBox())!;
  for (const corner of ['sw', 'se']) {
    const edge = page.locator(`.rotation-handle[data-rotation-corner=${corner}]`);
    const at = await middle(edge);
    expect(at.y).toBeCloseTo(box.y + box.height + 16, 0);
    expect(at.x).toBeCloseTo(corner === 'sw' ? box.x - 16 : box.x + box.width + 16, 0);
    const resize = page.locator(
      `[data-resize=node][data-id="${await note.getAttribute('data-node')}"][data-corner=${corner}]`,
    );
    await resize.hover();
    await expect(edge.locator('svg')).toHaveCSS('opacity', '1');
    expect(await resize.evaluate((el) => el.matches(':hover'))).toBe(true);
    await edge.hover();
    await expect(edge).toHaveCSS('cursor', /url\(/);
  }
  // Cruzar el centro con la esquina izquierda no debe introducir 180°.
  const left = page.locator('[data-rotation-corner=sw]'),
    leftCorner = await middle(left);
  const center = await middle(note);
  await page.mouse.move(leftCorner.x, leftCorner.y);
  await page.mouse.down();
  await page.mouse.move(2 * center.x - leftCorner.x, 2 * center.y - leftCorner.y);
  await expect(note).toHaveCSS('rotate', 'none');
  await page.mouse.move(center.x + leftCorner.y - center.y, center.y - leftCorner.x + center.x);
  expect(parseFloat(await note.evaluate((el) => getComputedStyle(el).rotate))).toBeCloseTo(90, 0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(note).toHaveCSS('rotate', 'none');
});

test('C08-B206: una fuente remota termina de cargar con el giro en curso y el texto sigue al puntero', async ({
  page,
}) => {
  await start(page);
  let release!: () => void;
  await googleFontFiles(
    page,
    new Promise<void>((done) => {
      release = done;
    }),
  );
  await page.route('**/api/google-fonts', (route) =>
    route.fulfill({
      json: {
        families: [{ family: 'Lora', category: 'serif', weights: [400, 700], italic: false }],
      },
    }),
  );
  await page.keyboard.press('t');
  await page.mouse.click(390, 295);
  const editor = page.getByRole('textbox', { name: 'Texto en Canvas' });
  await editor.fill('MMMM en movimiento');
  await editor.press('Escape');
  const node = page.locator('.material.text');
  await node.dblclick();
  await page.getByRole('combobox', { name: 'Tipografía' }).fill('Lora');
  await page.locator('[data-action=font-select][data-font="google:Lora"]').click();
  const handle = page.getByRole('button', { name: 'Girar selección', exact: true });
  const at = await middle(handle);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  const c = await middle(node),
    x = at.x - c.x,
    y = at.y - c.y;
  await page.mouse.move(c.x + (x - y) / Math.SQRT2, c.y + (x + y) / Math.SQRT2);
  release();
  await expect(node).toHaveAttribute('data-font-state', 'ready');
  expect(parseFloat(await node.evaluate((el) => getComputedStyle(el).rotate))).toBeCloseTo(45, 0);
  await page.mouse.move(c.x - y, c.y + x);
  expect(parseFloat(await node.evaluate((el) => getComputedStyle(el).rotate))).toBeCloseTo(90, 0);
  await page.mouse.up();
  await page.reload();
  const saved = (await world(page)).nodes[0]!;
  expect(saved.data).toMatchObject({ font: 'google:Lora', text: 'MMMM en movimiento' });
  expect(saved.rotation).toBeCloseTo(90, 0);
});

test('C08-B202: girar con mouse y teclado, cancelar, recargar y editar el ángulo sin perder el cable', async ({
  page,
}, info) => {
  await start(page);
  const fixture = await snapshot(page),
    w = fixture.state.worlds.find((w) => w.id === 'scout')!;
  w.nodes = Array.from({ length: 240 }, (_, i) => ({
    id: 'pieza-' + i,
    x: i < 2 ? (i === 0 ? -190 : 80) : 2000 + 180 * i,
    y: -90,
    width: 140,
    height: 60,
    owner: null,
    data: { kind: 'note', title: 'Pieza ' + i, text: '', color: '#f3ebcf' },
  }));
  w.links = [
    {
      id: 'ruta',
      from: 'pieza-0',
      to: 'pieza-1',
      fromAnchor: 'east',
      toAnchor: 'west',
      label: 'Movimiento',
    },
  ];
  await storedFixture(page, fixture.state, fixture.ui);
  await page.reload();
  const item = page.locator('[data-node=pieza-0]'),
    line = page.locator('[data-link=ruta] .link-line');
  await item.click();
  const h = page.getByRole('button', { name: 'Girar selección', exact: true });
  const box = (await item.boundingBox())!,
    handle = (await h.boundingBox())!,
    cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  const x = handle.x + handle.width / 2,
    y = handle.y + handle.height / 2;
  const angle = async () => (await world(page)).nodes[0]!.rotation ?? 0;
  const before = await line.getAttribute('d');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.evaluate(() => {
    const node = document.querySelector('[data-node=pieza-239]')!;
    const observer = new MutationObserver(() => node.setAttribute('data-unexpected', 'true'));
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true,
    });
  });
  await page.keyboard.down('Shift');
  await page.mouse.move(cx - (y - cy) + 3, cy + (x - cx), { steps: 8 });
  await expect(item).toHaveCSS('rotate', '90deg');
  expect(await line.getAttribute('d')).not.toBe(before);
  await expect(page.locator('[data-unexpected]')).toHaveCount(0);
  expect(await angle()).toBe(0);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  expect(await angle()).toBe(90);
  await page.keyboard.press('Control+z');
  expect(await angle()).toBe(0);
  await page.keyboard.press('Control+Shift+z');
  expect(await angle()).toBe(90);
  await item.click();
  await h.press('ArrowRight');
  expect(await angle()).toBe(91);
  const hb = (await h.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(cx - (x - cx), cy);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await angle()).toBe(91);
  await item.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Girar…' }).click();
  const number = page.getByRole('spinbutton', { name: 'Ángulo en grados' });
  await number.fill('-45');
  await number.press('Enter');
  expect(await angle()).toBe(315);
  await page.reload();
  await expect(item).toHaveCSS('rotate', '315deg');
  await capture(page, info, 'seleccion-girada-con-conexion');
});
