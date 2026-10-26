import assert from 'node:assert/strict';
import test from 'node:test';
import { arrangementMoves, arrangementUnits, arrangements } from '../../src/domain/arrangement';
import { note, setup, project, intent } from './fixtures';

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
    assert.deepEqual(arrangementMoves(overlap, axis === 'x' ? 'space-x' : 'space-y'), []);
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
