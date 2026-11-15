import { expect, test } from './fixtures';
import { start, snapshot, world, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import { treeFromMaterials } from '../../src/domain/component-tree';
import type { Material } from '../../src/domain/model';

test('C08-B245: dos marcos a 21 % conservan el centro y se pueden medir sin moverlos', async ({
  page,
}, info) => {
  await start(page);
  const seed = await snapshot(page);
  const w = seed.state.worlds.find((item) => item.id === 'scout')!;
  const frame = (id: string, x: number, y: number) => {
    const node: Material = {
      id,
      x,
      y,
      width: 390,
      height: 844,
      owner: null,
      data: { kind: 'shape', shape: 'rectangle', color: '#42576b', title: id },
    };
    const tree = treeFromMaterials([node], id);
    tree.root.frame = true;
    tree.root.children[0]!.background = true;
    return {
      node,
      group: { id: 'frame-' + id, name: id, component: true, nodes: [id], structure: tree },
    };
  };
  const a = frame('Explorar', -420, -888),
    b = frame('Evento', -60, 52);
  w.nodes = [a.node, b.node];
  w.canvasGroups = [a.group, b.group];
  seed.state.camera = { x: 0, y: 0, z: 0.21 };
  await storedFixture(page, seed.state, seed.ui);
  await page.reload();
  const first = page.locator('[data-node=Explorar]'),
    second = page.locator('[data-node=Evento]');
  const box = (await second.boundingBox())!,
    sx = box.x + box.width / 2,
    sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx - 359 * 0.21, sy, { steps: 4 });
  const guides = page.locator('.alignment-guides line[data-snap-source=object]');
  await expect(guides).toHaveCount(3);
  await expect(guides.nth(1)).toHaveAttribute('x1', '-225');
  await expect(guides.nth(1)).toHaveAttribute('y1', '-466');
  expect(Number(await guides.nth(1).getAttribute('y2'))).toBeCloseTo(474, 7);
  const visibleStroke = await guides
    .nth(1)
    .evaluate(
      (line: SVGLineElement) =>
        parseFloat(getComputedStyle(line).strokeWidth) * line.getScreenCTM()!.a,
    );
  expect(visibleStroke).toBeCloseTo(1, 3);
  const live = page.locator('.alignment-guides text');
  await expect(live).toHaveText('96 px');
  await capture(page, info, 'centro-entre-marcos');
  await page.mouse.move(sx - 359 * 0.21, sy + 21);
  await expect(live).toHaveText('196 px');
  await page.mouse.move(sx - 359 * 0.21, sy);
  await expect(live).toHaveText('96 px');
  await page.mouse.up();
  await expect(live).toHaveCount(0);
  const geometry = (await world(page)).nodes;
  const moved = geometry.find((n) => n.id === 'Evento')!;
  expect(moved.x).toBeCloseTo(-420, 7);
  expect(moved.y).toBeCloseTo(52, 7);
  await first.hover();
  await page.keyboard.down('Alt');
  const overlay = page.getByRole('img', { name: 'Distancia, Vertical 96 px' });
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('text')).toHaveText('96 px');
  await capture(page, info, 'distancia-entre-marcos');
  await page.keyboard.up('Alt');
  await expect(overlay).toHaveCount(0);
  await first.click({ modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Alinear selección', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Distancia entre los dos elementos' }),
  ).toContainText('Vertical 96 px');
  expect((await world(page)).nodes).toEqual(geometry);
});

test('C08-B246: los cuatro accesos de Canvas usan solo iconos y conservan nombre y foco', async ({
  page,
}) => {
  await start(page);
  for (const width of [1440, 1000, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 820 });
    const tools = page
      .getByRole('toolbar', { name: 'Creación, organización y vista de Canvas' })
      .locator('button.canvas-actions-trigger');
    await expect(tools).toHaveCount(4);
    for (const [i, name] of [
      'Bosquejos',
      'Gráficos explicativos',
      'Alinear selección',
      'Vista y ajustes de Canvas',
    ].entries()) {
      const trigger = tools.nth(i);
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAccessibleName(name);
      await expect(trigger.locator('svg')).toHaveCount(1);
      await expect(trigger).toHaveText('');
      await trigger.focus();
      await expect(trigger).toBeFocused();
    }
    if (width === 1000) {
      await tools.nth(2).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#tooltip.visible')).toHaveText('Vista y ajustes de Canvas');
      await page.keyboard.press('Escape');
      await expect(page.locator('#tooltip.visible')).toHaveCount(0);
    }
  }
});
