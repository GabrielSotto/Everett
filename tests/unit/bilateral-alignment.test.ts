import test from 'node:test';
import assert from 'node:assert/strict';
import { alignRect, type SnapTarget } from '../../src/domain/alignment';
import { alignmentScene, alignmentLayoutFrames } from '../../src/domain/alignment-targets';
import { treeFromMaterials } from '../../src/domain/component-tree';
import { snapBounds } from '../../src/domain/alignment-bounds';
import { centerOf, rotatedPose, rotateVector } from '../../src/domain/rotation';
import { setup, project, note } from './fixtures';

const box = (id: string, x: number, y: number, width = 80, height = 40): SnapTarget => ({
  id,
  x,
  y,
  width,
  height,
});
const transpose = (r: SnapTarget) => ({ ...r, x: r.y, y: r.x, width: r.height, height: r.width });

test('C08-U93: fila y columna muestran solo las coincidencias finales con los vecinos de ambos lados', () => {
  for (const vertical of [false, true]) {
    for (const zoom of [0.38, 1, 2, 6]) {
      const orient = (r: SnapTarget) => (vertical ? transpose(r) : r);
      const axis = vertical ? 'x' : 'y',
        along = vertical ? 'y' : 'x';
      const near = orient(box('cerca', -90, 0)),
        other = orient(box('otra', 90, 0));
      const distant = orient(box('tercera', -117, 2 / zoom));
      const moved = orient(box('móvil', 0, 3 / zoom));
      const targets = [distant, other, near];
      const snap = alignRect(moved, targets, zoom);
      assert(Math.abs(snap.correction[axis] + 3 / zoom) < 1e-8);
      const guides = snap.guides.filter((g) => g.source === 'object' && g.axis === axis);
      assert.deepEqual(
        guides.map((g) => Math.round(g.position)),
        [0, 20, 40],
      );
      for (const g of guides) {
        assert.equal(g.from, Math.round(g.position) === 20 ? -50 : -90);
        assert.equal(g.to, Math.round(g.position) === 20 ? 130 : 170);
        assert.deepEqual(
          [...g.markers].sort((a, b) => a - b),
          [-50, 40, 130],
        );
      }
      const gap = snap.guides.filter((g) => g.source === 'gap');
      assert.deepEqual(
        gap.map((g) => [g.from, g.to]),
        [
          [-10, 0],
          [80, 90],
        ],
      );
      assert.deepEqual(snap, alignRect(moved, [...targets].reverse(), zoom));
      const unequal = alignRect({ ...moved, [along]: 6 / zoom }, [near, other], zoom);
      assert.equal(unequal.guides.filter((g) => g.source === 'gap').length, 0);
      const within = alignRect({ ...moved, [along]: 1 / zoom }, [near, other], zoom);
      assert(Math.abs(within.correction[along] + 1 / zoom) < 1e-6);
      assert.equal(within.guides.filter((g) => g.source === 'gap').length, 2);
    }
  }
  const moving = box('móvil', 0, 3);
  for (const [near, positions] of [
    [box('centro', -100, -15, 70, 70), [20]],
    [box('borde', -100, 0, 70, 69), [0]],
  ] as const) {
    const r = alignRect(moving, [near], 1);
    assert.deepEqual(
      r.guides.filter((g) => g.axis === 'y' && g.source === 'object').map((g) => g.position),
      positions,
    );
  }
  const close = box('cerca', 90, 0),
    far = box('lejos', 117, 2);
  const previous = alignRect(moving, [far], 1).memory;
  assert.equal(alignRect(moving, [far, close], 1, { previous }).correction.y, -3);
  assert.equal(alignRect(moving, [far], 1).correction.y, -1);
  const conflict = alignRect(moving, [close, box('opuesta', -110, 2)], 1);
  for (const g of conflict.guides.filter((g) => g.axis === 'y' && g.source === 'object'))
    assert.equal(g.from, g.position === 20 ? 40 : 0);
});

test('C08-U94: un marco arrastra sus márgenes y su inspector compara hermanos que siguen visibles', () => {
  const { store } = setup();
  const a = { ...note('a'), x: 20, y: 10, width: 80, height: 40 },
    b = { ...a, id: 'b', x: 130 },
    hidden = { ...a, id: 'oculta', x: 480 },
    partial = { ...a, id: 'recortada', x: 210 };
  const tree = treeFromMaterials([a, b, hidden, partial], 'Tarjeta');
  tree.origin = { x: 0, y: 0 };
  for (const e of tree.root.children) {
    e.x += 20;
    e.y += 10;
  }
  Object.assign(tree.root, { width: 240, height: 100, frame: true, clipContent: true });
  const outside = { ...a, id: 'otra-pantalla', x: 0 };
  const tracks = { columns: { count: 2, gap: 8, margin: 12 } };
  const group = {
    id: 'tarjeta',
    name: 'Tarjeta',
    component: true,
    structure: tree,
    nodes: [a.id, b.id, hidden.id, partial.id],
    layoutGuides: tracks,
  };
  const foreignGrid = {
    ...outside,
    id: 'otra-retícula',
    layoutGuides: tracks,
    data: { kind: 'shape' as const, shape: 'rectangle' as const, color: '#f00' },
  };
  const w = {
    ...project(store),
    nodes: [a, b, hidden, partial, outside, foreignGrid],
    canvasGroups: [group],
  };
  assert.deepEqual(alignmentScene(w, new Set(group.nodes)).moving, {
    x: 0,
    y: 0,
    width: 240,
    height: 100,
  });
  const scoped = alignmentScene(w, new Set(['a']), { group: group.id, element: tree.root.id });
  assert.deepEqual(
    scoped.targets.map((t) => [t.x, t.width]),
    [
      [130, 80],
      [210, 30],
    ],
  );
  assert.deepEqual(scoped.moving, { x: 20, y: 10, width: 80, height: 40 });
  const frames = alignmentLayoutFrames(w, new Set(['a']), {
    group: group.id,
    element: tree.root.id,
  });
  assert.deepEqual(
    frames.map((f) => f.target.id),
    [group.id],
  );
  assert.equal(alignRect({ ...a, x: 15 }, [], 1, { frames }).correction.x, -3);
  assert.deepEqual(
    alignmentLayoutFrames(w, new Set(group.nodes)).map((f) => f.target.id),
    [foreignGrid.id],
  );
  assert.deepEqual(alignmentScene(w, new Set(['b', outside.id])).moving, {
    x: 0,
    y: 10,
    width: 210,
    height: 40,
  });
});

test('C08-U95: una retícula girada conserva las coincidencias de ambos vecinos y los huecos sobre sus propios ejes', () => {
  const frame = {
    x: 0,
    y: 0,
    width: 400,
    height: 250,
    rotation: 35,
    target: { kind: 'group' as const, id: 'marco' },
    members: ['a', 'b', 'c'],
    guides: { rows: { count: 1, margin: 50, gap: 0 } },
  };
  const orient = (id: string, x: number, y: number) => {
    const r = box(id, x, y);
    return { ...snapBounds({ ...r, ...rotatedPose(r, centerOf(frame), frame.rotation) }), id };
  };
  const moving = orient('b', 143, 54),
    neighbors = [orient('a', 40, 50), orient('c', 240, 50)];
  const previous = alignRect(moving, [], 1, { frames: [frame] }).memory;
  assert.ok(previous.y);
  const actual = alignRect(moving, neighbors, 1, { frames: [frame], previous });
  const local = rotateVector(actual.correction, -frame.rotation);
  assert(Math.abs(local.x + 3) < 1e-6 && Math.abs(local.y + 4) < 1e-6);
  assert(actual.guides.every((g) => g.transform?.degrees === frame.rotation));
  const edges = actual.guides.filter((g) => g.source === 'object');
  assert.deepEqual(
    edges.map((g) => Math.round(g.position)),
    [50, 70, 90],
  );
  for (const edge of edges) {
    assert.equal(edge.axis, 'y');
    assert.equal(edge.markers.length, 3);
    assert.equal(Math.round(edge.from), Math.round(edge.position) === 70 ? 80 : 40);
    assert.equal(Math.round(edge.to), Math.round(edge.position) === 70 ? 280 : 320);
  }
  assert.equal(actual.guides.filter((g) => g.source === 'gap').length, 2);
  const free = alignRect(orient('b', 143, 76), [orient('a', 40, 51)], 6, { frames: [frame] });
  assert.deepEqual(free.correction, { x: 0, y: 0 });
  const readout = free.guides.filter((g) => g.source === 'distance');
  assert.equal(readout.length, 1);
  assert.equal(readout[0]!.transform?.degrees, frame.rotation);
  assert(Math.abs(readout[0]!.to - readout[0]!.from - 23) < 1e-6);
});
