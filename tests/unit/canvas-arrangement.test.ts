import assert from 'node:assert/strict';
import test from 'node:test';
import { arrangementMoves, arrangementUnits, arrangements } from '../../src/domain/arrangement';
import { note, setup, project, intent } from './fixtures';

test('C08-U47: separación exacta entre dos o más piezas conserva orden, tamaños, grupos y primera pieza en ambos ejes', () => {
  const { store } = setup();
  const w = {
    ...project(store),
    canvasGroups: [],
    nodes: [
      { ...note('a'), x: -80, y: -50, width: 90, height: 40 },
      { ...note('b'), x: -20, y: -10, width: 60, height: 80 },
      { ...note('c'), x: 20, y: 10, width: 110, height: 30 },
    ],
  };
  for (const axis of ['x', 'y'] as const)
    for (const count of [2, 3])
      for (const gap of [0, 0.5, 24, 10000]) {
        const units = arrangementUnits(
          w,
          w.nodes.slice(0, count).map((n) => n.id),
        );
        const action = axis === 'x' ? 'space-x' : 'space-y';
        const moves = arrangementMoves(units, action, gap);
        const size = axis === 'x' ? 'width' : 'height';
        const placed = units
          .map((u) => ({ ...u, ...(moves.find((m) => m.id === u.nodes[0]!.id)?.point ?? {}) }))
          .sort((a, b) => a[axis] - b[axis]);
        assert.equal(placed[0]![axis], units[0]![axis]);
        placed
          .slice(1)
          .forEach((item, i) =>
            assert.equal(item[axis] - placed[i]![axis] - placed[i]![size], gap),
          );
        assert.deepEqual(arrangementMoves(placed, action, gap), []);
      }
  const before = structuredClone(w);
  const grouped = { ...w, canvasGroups: [{ id: 'g', name: 'G', nodes: ['a', 'b'] }] };
  grouped.nodes = w.nodes.map((n) => (n.id === 'c' ? { ...n, x: -500 } : n));
  const units = arrangementUnits(grouped, ['a', 'b', 'c']);
  assert.equal(units.length, 2);
  const moves = arrangementMoves(units, 'space-x', 16);
  const a = moves.find((m) => m.id === 'a')?.point ?? w.nodes[0]!;
  const b = moves.find((m) => m.id === 'b')?.point ?? w.nodes[1]!;
  assert.equal(b.x - a.x, 60);
  const c = moves.find((m) => m.id === 'c')?.point ?? grouped.nodes[2]!;
  assert.equal(a.x - c.x - grouped.nodes[2]!.width, 16);
  assert.deepEqual(w, before);
  for (const value of [-1, NaN, Infinity, 10001])
    assert.deepEqual(arrangementMoves(units, 'space-x', value), []);
});

test('C08-U36: seis alineaciones conservan tamaño y eje perpendicular sin mutar los materiales', () => {
  const { store } = setup();
  const w = {
    ...project(store),
    canvasGroups: [],
    nodes: [
      { ...note('a'), x: -250, y: -100, width: 100, height: 80 },
      { ...note('b'), x: -10, y: 70, width: 70, height: 40 },
      { ...note('c'), x: 310, y: 220, width: 140, height: 60 },
    ],
  };
  const before = structuredClone(w),
    ids = w.nodes.map((n) => n.id);
  for (const action of arrangements.filter((item) => !item.startsWith('space'))) {
    const moves = arrangementMoves(arrangementUnits(w, ids), action);
    const axis = ['left', 'center-x', 'right'].includes(action) ? 'x' : 'y';
    const size = axis === 'x' ? 'width' : 'height';
    const fraction = action.startsWith('center')
      ? 0.5
      : ['right', 'bottom'].includes(action)
        ? 1
        : 0;
    const expected = (axis === 'x' ? -250 : -100) + (axis === 'x' ? 700 : 380) * fraction;
    for (const node of w.nodes) {
      const point = moves.find((item) => item.id === node.id)?.point ?? node;
      assert.equal(point[axis] + node[size] * fraction, expected);
      assert.equal(point[axis === 'x' ? 'y' : 'x'], node[axis === 'x' ? 'y' : 'x']);
    }
  }
  assert.deepEqual(w, before);
  assert.ok(
    arrangementMoves(arrangementUnits(w, ['a', 'b']), 'right').every((move) => move.id !== 'c'),
  );
  assert.deepEqual(arrangementMoves([], 'left'), []);
  assert.deepEqual(arrangementMoves(arrangementUnits(w, ['a']), 'left'), []);
});

test('C08-U37: espaciar iguala huecos con medidas distintas y conserva ambos extremos', () => {
  const { store } = setup();
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'width' : 'height';
    const w = {
      ...project(store),
      canvasGroups: [],
      nodes: [0, 190, 340, 660].map((position, i) => ({
        ...note(String(i)),
        [axis]: position,
        [size]: [100, 70, 140, 40][i]!,
      })),
    };
    const units = arrangementUnits(
      w,
      w.nodes.map((n) => n.id),
    );
    const moves = arrangementMoves(units, axis === 'x' ? 'space-x' : 'space-y');
    const values = w.nodes.map((n) => ({ ...n, ...moves.find((item) => item.id === n.id)?.point }));
    assert.equal(values[0]![axis], 0);
    assert.equal(values[3]![axis], 660);
    const gaps = values.slice(1).map((n, i) => n[axis] - values[i]![axis] - values[i]![size]);
    assert.ok(gaps.every((gap) => Math.abs(gap - 350 / 3) < 0.000001));
    assert.deepEqual(arrangementMoves(units.slice(0, 2), 'space-x'), []);
    const overlap = units.map((unit) => ({ ...unit, [axis]: 0 }));
    const overlapMoves = arrangementMoves(overlap, axis === 'x' ? 'space-x' : 'space-y');
    assert.ok(overlapMoves.length > 0);
  }
});

test('C08-U44: piezas solapadas distribuyen centros y conservan un orden estable con medidas distintas', () => {
  const { store } = setup();
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'width' : 'height';
    const w = {
      ...project(store),
      canvasGroups: [],
      nodes: [0, 20, 75].map((p, i) => ({
        ...note(String(i)),
        [axis]: p,
        [size]: [80, 65, 90][i]!,
      })),
    };
    const ids = w.nodes.map((n) => n.id),
      action = axis === 'x' ? 'space-x' : 'space-y';
    const moves = arrangementMoves(arrangementUnits(w, ids), action);
    const after = {
      ...w,
      nodes: w.nodes.map((n) => ({ ...n, ...moves.find((m) => m.id === n.id)?.point })),
    };
    const gaps = after.nodes
      .slice(1)
      .map((n, i) => n[axis] + n[size] / 2 - after.nodes[i]![axis] - after.nodes[i]![size] / 2);
    assert.ok(Math.abs(gaps[0]! - gaps[1]!) < 0.00001);
    assert.equal(after.nodes[0]![axis], 0);
    assert.equal(after.nodes[2]![axis], 75);
    assert.deepEqual(arrangementMoves(arrangementUnits(after, ids), action), []);
    // Pantalla muy grande con controles contenidos: no invertir el orden ni
    // caminar de una distribución a otra cada vez que se repite la acción.
    const nested = {
      ...w,
      nodes: [0, 0, 990, 1000].map((p, i) => ({
        ...note(String(i)),
        [axis]: p,
        [size]: [10, 1000, 10, 10][i]!,
      })),
    };
    const nestedIds = nested.nodes.map((n) => n.id);
    const nestedMoves = arrangementMoves(arrangementUnits(nested, nestedIds), action);
    const resolved = {
      ...nested,
      nodes: nested.nodes.map((n) => ({ ...n, ...nestedMoves.find((m) => m.id === n.id)?.point })),
    };
    assert.deepEqual(arrangementMoves(arrangementUnits(resolved, nestedIds), action), []);
  }
  // Geometrías reproducibles, con anidamiento y tamaños dispares: una segunda
  // aplicación debe ser neutra en cualquiera de los dos ejes.
  let seed = 87;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let sample = 0; sample < 1000; sample++)
    for (const axis of ['x', 'y'] as const) {
      const w = {
        ...project(store),
        canvasGroups: [],
        nodes: Array.from({ length: 3 + Math.floor(random() * 7) }, (_, i) => ({
          ...note(String(i)),
          x: random() * 1500,
          y: random() * 1500,
          width: 24 + random() * 1200,
          height: 24 + random() * 1200,
        })),
      };
      const ids = w.nodes.map((n) => n.id),
        action = axis === 'x' ? 'space-x' : 'space-y';
      const moves = arrangementMoves(arrangementUnits(w, ids), action);
      const after = {
        ...w,
        nodes: w.nodes.map((n) => ({ ...n, ...moves.find((m) => m.id === n.id)?.point })),
      };
      assert.deepEqual(
        arrangementMoves(arrangementUnits(after, ids), action),
        [],
        `Distribución inestable: ${sample}, ${axis}`,
      );
    }
});

test('C08-U38: ordenar conjuntos conserva distancias, pertenencia y un único paso de historial', () => {
  const { store } = setup(),
    act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({ type: 'node.move', world: 'project', id: 'note-b', point: { x: 250, y: 50 } });
  act({ type: 'group.create', world: 'project', nodes: ['note-a', 'note-b'], name: 'Panel' });
  for (const [i, x] of [-800, 1800].entries())
    act({
      type: 'node.create',
      world: 'project',
      node: { ...note('extra-' + i), x, y: 300 + i * 300 },
    });
  const before = structuredClone(project(store)),
    ids = before.nodes.map((n) => n.id);
  const units = arrangementUnits(before, [...ids, 'missing', ids[0]!]);
  assert.equal(units.length, 3);
  assert.equal(arrangementUnits(before, ['note-a']).length, 1);
  const undo = store.canvasHistory.status('project').undo;
  act({ type: 'nodes.move', world: 'project', nodes: arrangementMoves(units, 'space-x') });
  const after = structuredClone(project(store));
  assert.equal(after.nodes[1]!.x - after.nodes[0]!.x, 240);
  assert.equal(after.nodes[1]!.y - after.nodes[0]!.y, 30);
  assert.deepEqual(after.canvasGroups, before.canvasGroups);
  assert.equal(store.canvasHistory.status('project').undo, undo + 1);
  act({ type: 'canvas.undo', world: 'project' });
  assert.deepEqual(project(store).nodes, before.nodes);
  assert.deepEqual(project(store).canvasGroups, before.canvasGroups);
  assert.deepEqual(project(store).links, before.links);
  act({ type: 'canvas.redo', world: 'project' });
  assert.deepEqual(project(store).nodes, after.nodes);
  assert.deepEqual(project(store).canvasGroups, after.canvasGroups);
  assert.deepEqual(project(store).links, after.links);
  assert.equal(
    arrangementUnits({ ...before, nodes: before.nodes.map((n) => ({ ...n, owner: 'eve' })) }, ids)
      .length,
    0,
  );
});
