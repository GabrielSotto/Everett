import test from 'node:test';
import assert from 'node:assert/strict';
import { measureBounds, dimensionText } from '../../src/domain/measurements';
import { alignRect } from '../../src/domain/alignment';
import { alignmentScene } from '../../src/domain/alignment-targets';
import { arrangementMoves, arrangementUnits } from '../../src/domain/arrangement';
import { treeFromMaterials } from '../../src/domain/component-tree';
import { project, setup, note } from './fixtures';

test('C08-U96: las cotas distinguen espacio, contacto, solape y márgenes en unidades de Canvas', () => {
  const a = { x: -40, y: 10, width: 100, height: 80 };
  const read = (x: number, y: number, width = 100, height = 80) => {
    const b = { x, y, width, height },
      forward = measureBounds(a, b),
      reverse = measureBounds(b, a);
    assert.equal(reverse.kind, forward.kind);
    const values = forward.dimensions.map((d) => [d.label, dimensionText(d)]);
    assert.deepEqual(
      reverse.dimensions.map((d) => [d.label, dimensionText(d)]),
      values,
    );
    return [forward.kind, values];
  };
  assert.deepEqual(read(97.25, 42), ['Distancia', [['Horizontal', '37,25 px']]]);
  assert.deepEqual(read(-20, 90), ['Distancia', [['Vertical', '0 px']]]);
  assert.deepEqual(read(72, 100), [
    'Distancia',
    [
      ['Horizontal', '12 px'],
      ['Vertical', '10 px'],
    ],
  ]);
  assert.deepEqual(read(50, 60), [
    'Solapamiento',
    [
      ['Horizontal', '10 px'],
      ['Vertical', '30 px'],
    ],
  ]);
  assert.deepEqual(read(-30, 20, 20, 35), [
    'Márgenes',
    [
      ['Izquierda', '10 px'],
      ['Derecha', '70 px'],
      ['Arriba', '10 px'],
      ['Abajo', '35 px'],
    ],
  ]);
  assert.deepEqual(read(-40, 10), ['Coinciden', []]);
  const child = { ...note('rótulo'), x: 20, width: 40 };
  const card = { ...note('tarjeta'), x: 128 };
  const tree = treeFromMaterials([child], 'marco');
  tree.origin.x = 0;
  tree.root.width = 100;
  const scene = {
    ...project(setup().store),
    nodes: [child, card],
    canvasGroups: [
      { id: 'marco', name: 'Marco', nodes: [child.id], component: true, structure: tree },
    ],
  };
  const ids = [child.id, card.id];
  const units = arrangementUnits(scene, ids);
  const parts = alignmentScene(scene, new Set(ids)).parts;
  for (const [first, second] of [units, parts]) {
    const distance = measureBounds(first!, second!);
    assert.deepEqual(distance.dimensions.map(dimensionText), ['28 px']);
  }
  assert.deepEqual(arrangementMoves(units, 'space-x', 28), []);
  const frame = { x: 0, y: 0, width: 390, height: 844, id: 'marco' };
  for (const zoom of [0.21, 1, 3]) {
    const offset = 3 / zoom;
    for (const [x, y, axis, center] of [
      [offset, 940, 'x', 195],
      [500, offset, 'y', 422],
    ] as const) {
      const guides = alignRect({ ...frame, x, y }, [frame], zoom).guides.filter(
        (g) => g.axis === axis,
      );
      assert.deepEqual(
        guides.map((g) => Math.round(g.position)),
        [0, center, 2 * center],
      );
      assert.equal(guides[1]!.from, Math.min(...guides[1]!.markers));
      assert.equal(guides[1]!.to, Math.max(...guides[1]!.markers));
    }
    const half = alignRect({ ...frame, x: 195 + offset, y: 940 }, [frame], zoom);
    assert.deepEqual(
      half.guides.filter((g) => g.axis === 'x').map((g) => Math.round(g.position)),
      [195, 390],
    );
  }
});
