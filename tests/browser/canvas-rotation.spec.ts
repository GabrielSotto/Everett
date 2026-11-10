import { test, expect } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';

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
    y = handle.y + handle.height / 2,
    r = Math.hypot(x - cx, y - cy);
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
  await page.mouse.move(cx + 3, cy + r, { steps: 8 });
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
  await page.mouse.move(cx - r, cy);
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
