import { alignRect } from '../../src/domain/alignment';
import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { createArrow, editArrow } from '../../src/domain/free-arrow';
import { anchorPoint } from '../../src/domain/geometry';
import { around, centerOf, rectsCross, visualBounds } from '../../src/domain/rotation';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import type { Material, Point } from '../../src/domain/model';

test('C08-U78: el giro usa un pivote compartido; puertos, selección, copia, curva e historial conservan geometría', () => {
  const { store } = setup(),
    world = 'project';
  const a: Material = {
    id: 'pa',
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    owner: null,
    data: { kind: 'note', title: 'A', text: '', color: '#f3ebcf' },
  };
  const b = { ...a, id: 'pb', x: 200 };
  for (const node of [a, b]) store.dispatch({ type: 'node.create', world, node }, intent);
  const command = { type: 'nodes.rotate' as const, world, nodes: ['pa', 'pb'], degrees: 90 };
  store.dispatch(command, intent);
  const read = () => project(store).nodes.find((n) => n.id === 'pa')!;
  const close = (p: Point, q: Point) => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-7);
  close(centerOf(read()), { x: 150, y: -80 });
  close(anchorPoint(read(), 'east'), { x: 150, y: -30 });
  assert.ok(Math.abs(visualBounds(read()).width - 40) < 1e-7);
  assert.equal(rectsCross({ ...a, rotation: 45 }, { x: -1, y: -29, width: 5, height: 5 }), false);
  const clip = captureCanvasCopies(project(store), ['pa']);
  assert.equal(parseCanvasClipboard(JSON.stringify(clip)).nodes[0]!.rotation, 90);
  clip.nodes[0]!.rotation = 360;
  assert.throws(() => parseCanvasClipboard(JSON.stringify(clip)), { code: 'CLIPBOARD_MATERIAL' });
  assert.throws(() => store.dispatch({ ...command, degrees: NaN }, intent), { code: 'GEOMETRY' });
  store.dispatch({ type: 'canvas.undo', world }, intent);
  close(centerOf(read()), centerOf(a));
  assert.equal(read().rotation ?? 0, 0);
  store.dispatch({ type: 'canvas.redo', world }, intent);
  assert.equal(read().rotation, 90);
  const arrow = {
    ...createArrow('p', { x: 11, y: -22 }, { x: 110, y: 30 }, true, '#334455', 4),
    rotation: 67,
  };
  const at = (n: typeof arrow, i: number) =>
    around({ x: n.x + n.data.points[i]!.x, y: n.y + n.data.points[i]!.y }, centerOf(n), n.rotation);
  const old = at(arrow, 0),
    next = editArrow(arrow, 'end', { x: 170, y: 88 });
  close(at({ ...next, rotation: next.rotation! }, 0), old);
  close(at({ ...next, rotation: next.rotation! }, 2), { x: 170, y: 88 });
});

test('Una retícula girada impone la corrección en sus propios ejes', () => {
  const frame = {
    x: 0,
    y: 0,
    width: 160,
    height: 100,
    rotation: 90,
    target: { kind: 'node' as const, id: 'pantalla' },
    members: ['pantalla'],
    guides: { columns: { count: 1, margin: 10, gap: 0 } },
  };
  const result = alignRect({ x: 65, y: -18, width: 30, height: 10 }, [], 1, { frames: [frame] });
  assert.ok(result.guides.length);
  assert.ok(result.guides.every((g) => g.transform?.degrees === 90));
  assert.ok(Math.abs(result.correction.x) < 1e-8);
  assert.ok(Math.abs(result.correction.y + 2) < 1e-8);
});
