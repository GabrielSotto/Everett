import { test, expect } from './fixtures';
import { start, world, snapshot, capture } from './canvas-utility-helpers';
import { storedFixture } from './canvas-fixtures';
import type { Material } from '../../src/domain/model';

for (const [id, vertical] of [
  ['C08-B243', false],
  ['C08-B244', true],
] as const) {
  test(
    id +
      ': una tarjeta entre dos vecinas confirma ambos bordes y ambos huecos en ' +
      (vertical ? 'columna' : 'fila'),
    async ({ page }, info) => {
      await start(page);
      const seed = await snapshot(page);
      const w = seed.state.worlds.find((item) => item.id === 'scout')!;
      const card = (id: string, title: string, x: number, y: number): Material => ({
        id,
        x: vertical ? y : x,
        y: vertical ? x : y,
        width: vertical ? 130 : 110,
        height: vertical ? 110 : 60,
        owner: null,
        data: { kind: 'note', title, text: '', color: '#e8efd8' },
      });
      const left = card('before', 'Entrada', -150, 0),
        middle = card('moving', 'Revisión', -38, -89),
        right = card('after', 'Entrega', 150, 0);
      w.nodes = [card('distant', 'Archivo', -300, 2), left, middle, right];
      w.canvasGroups = [];
      seed.ui.shell.canvasLayoutSnap = false;
      const zoom = vertical ? 1 : 1.25;
      seed.state.camera = { x: 0, y: 0, z: zoom };
      await storedFixture(page, seed.state, seed.ui);
      await page.reload();
      const item = page.locator('[data-node=moving]');
      const bounds = (await item.boundingBox())!;
      const startX = bounds.x + bounds.width / 2,
        startY = bounds.y + bounds.height / 2;
      const move = async (along: number, perp: number) => {
        const x = vertical ? perp : along,
          y = vertical ? along : perp;
        await page.mouse.move(startX + (x - middle.x) * zoom, startY + (y - middle.y) * zoom);
      };
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await move(1, 3);
      const guides = page.locator('.alignment-guides');
      const edges = guides.locator('line[data-snap-source=object]');
      const gaps = guides.locator('line[data-snap-source=gap]');
      await expect(edges).toHaveCount(3);
      await expect(gaps).toHaveCount(2);
      const along = vertical ? 'y' : 'x',
        perp = vertical ? 'x' : 'y';
      for (const [i, p] of [0, vertical ? 65 : 30, vertical ? 130 : 60].entries()) {
        const line = edges.nth(i);
        await expect(line).toHaveAttribute(perp + '1', String(p));
        await expect(line).toHaveAttribute(along + '1', i === 1 ? '-95' : '-150');
        await expect(line).toHaveAttribute(along + '2', i === 1 ? '205' : '260');
        await expect(line.locator('..').locator('path')).toHaveCount(3);
      }
      for (const [i, [a, b]] of [
        [-40, 0],
        [110, 150],
      ].entries()) {
        await expect(gaps.nth(i)).toHaveAttribute(along + '1', String(a));
        await expect(gaps.nth(i)).toHaveAttribute(along + '2', String(b));
      }
      await capture(page, info, vertical ? 'vecinas-columna' : 'vecinas-fila');
      await move(12, -3);
      await expect(gaps).toHaveCount(0);
      await expect(edges).toHaveCount(3);
      await move(-1, -3);
      await expect(gaps).toHaveCount(2);
      await page.mouse.up();
      const after = await world(page);
      expect(after.nodes.find((n) => n.id === 'moving')).toMatchObject({ x: 0, y: 0 });
      expect(after.nodes.filter((n) => n.id !== 'moving')).toEqual(
        w.nodes.filter((n) => n.id !== 'moving'),
      );
      await expect(guides).toHaveCount(0);
      await page.keyboard.press('Control+z');
      expect((await world(page)).nodes.find((n) => n.id === 'moving')).toEqual(middle);
    },
  );
}
