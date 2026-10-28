import assert from 'node:assert/strict';
import test from 'node:test';
import { spatialModifier, spatialWheel, spatialHint } from '../../src/domain/spatial-shortcut';
import { alignRect, selectionBounds } from '../../src/domain/alignment';

test('C08-U34: modificador espacial configurable conserva Alt por defecto y distingue rueda local', () => {
  const event = { altKey: false, ctrlKey: false, shiftKey: false, metaKey: false };
  for (const [key, field] of [
    ['Alt', 'altKey'],
    ['Control', 'ctrlKey'],
    ['Shift', 'shiftKey'],
    ['Meta', 'metaKey'],
  ] as const) {
    assert.equal(spatialWheel(event, key), false);
    assert.equal(spatialWheel({ ...event, [field]: true }, key), true);
    assert.equal(spatialWheel({ ...event, altKey: key !== 'Alt' }, key), false);
    assert.match(spatialHint(key), /rueda/);
  }
  assert.equal(spatialModifier('corrupto'), 'Alt');
  assert.equal(spatialWheel({ ...event, altKey: true }, undefined), true);
});

test('C08-U45: la guía elige una referencia cercana y sus marcas corresponden a la posición final en ambos ejes', () => {
  const moving = { x: 103, y: 102, width: 100, height: 60 };
  const near = { x: 100, y: 200, width: 100, height: 60 };
  const distant = { x: 103, y: -2000, width: 100, height: 60 };
  const result = alignRect(moving, [distant, near], 1);
  assert.equal(result.correction.x, -3);
  const x = result.guides.find((g) => g.axis === 'x')!;
  assert.ok(x.from >= 100);
  assert.ok(x.to <= 260);
  assert.deepEqual(x.markers, [132, 230]);
  for (const z of [0.1, 0.38, 1, 2, 6]) {
    const a = { x: 100 + 3 / z, y: 202 + 3 / z, width: 100, height: 60 };
    const r = alignRect(a, [near], z);
    for (const g of r.guides) assert.ok(Math.abs(r.correction[g.axis]) * z <= 5);
  }
});

test('C08-U35: guías comparan bordes y centros con cinco píxeles de pantalla sin mutar objetivos', () => {
  const target = { x: 100, y: -200, width: 100, height: 60 };
  const before = structuredClone(target);
  for (const zoom of [0.01, 0.03, 0.38, 1, 2, 6]) {
    const moving = { x: 100 + 4 / zoom, y: 800, width: 100, height: 60 };
    const result = alignRect(moving, [target], zoom);
    assert.ok(Math.abs(result.correction.x * zoom) <= 5);
    assert.equal(result.guides[0]?.axis, 'x');
    assert.ok(
      [100, 150, 200].some((edge) =>
        [0, 50, 100].some(
          (offset) => Math.abs(moving.x + result.correction.x + offset - edge) < 0.001,
        ),
      ),
    );
  }
  assert.deepEqual(target, before);
  assert.deepEqual(alignRect({ x: 110, y: 800, width: 100, height: 60 }, [target], 1).guides, []);
  const center = alignRect({ x: 178, y: 800, width: 40, height: 60 }, [target], 1);
  assert.equal(center.correction.x, 2);
  const group = selectionBounds([
    { x: -80, y: 50, width: 30, height: 30 },
    { x: 10, y: 90, width: 70, height: 50 },
  ]);
  assert.deepEqual(group, { x: -80, y: 50, width: 160, height: 90 });
});
