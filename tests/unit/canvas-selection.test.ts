import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, project, intent, note } from './fixtures';
import { materialsInRect } from '../../src/domain/material-selection';

test('C08-U11: selección, movimiento y eliminación de grupo atómicos, transferencia exclusiva y devolución con vínculos', () => {
  const { store } = setup();
  const initial = structuredClone(project(store));
  assert.deepEqual(materialsInRect(initial.nodes, { x: 10, y: 20, width: 200, height: 160 }), [
    'note-a',
    'note-b',
  ]);
  assert.deepEqual(materialsInRect(initial.nodes, { x: 11, y: 20, width: 200, height: 160 }), [
    'note-a',
    'note-b',
  ]);
  const positions = initial.nodes.map((n) => ({ id: n.id, point: { x: n.x + 120, y: n.y - 30 } }));
  store.dispatch({ type: 'nodes.move', world: 'project', nodes: positions }, intent);
  assert.equal(store.canvasHistory.status('project').undo, 1);
  assert.equal(project(store).nodes[1]!.x, initial.nodes[1]!.x + 120);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(project(store).nodes, initial.nodes);
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  const beforeInvalid = store.snapshot();
  assert.throws(() =>
    store.dispatch(
      {
        type: 'nodes.move',
        world: 'project',
        nodes: [...positions, { id: 'missing', point: { x: 0, y: 0 } }],
      },
      intent,
    ),
  );
  assert.deepEqual(store.snapshot(), beforeInvalid);
  assert.throws(() =>
    store.dispatch({ type: 'nodes.delete', world: 'project', nodes: ['note-a', 'note-a'] }, intent),
  );
  assert.deepEqual(store.snapshot(), beforeInvalid);
  store.dispatch({ type: 'nodes.delete', world: 'project', nodes: ['note-a', 'note-b'] }, intent);
  assert.equal(project(store).nodes.length, 0);
  assert.deepEqual(project(store).docs, initial.docs);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  const origins = project(store).nodes.map((n) => ({ id: n.id, returnTo: { x: n.x, y: n.y } }));
  const expected = structuredClone(project(store));
  store.dispatch(
    {
      type: 'nodes.assign',
      world: 'project',
      nodes: origins,
      agent: 'eve',
      instruction: 'Organizar el grupo',
    },
    intent,
  );
  assert.equal(project(store).assignments.length, 2);
  assert.ok(project(store).nodes.every((n) => n.owner === 'eve'));
  assert.deepEqual(
    materialsInRect(project(store).nodes, { x: -1000, y: -1000, width: 2000, height: 2000 }),
    [],
  );
  const owned = store.snapshot();
  assert.throws(() =>
    store.dispatch({ type: 'nodes.move', world: 'project', nodes: positions }, intent),
  );
  assert.deepEqual(store.snapshot(), owned);
  for (const job of [...project(store).assignments].reverse())
    store.dispatch(
      { type: 'assignment.finish', world: 'project', id: job.id, decision: 'cancel' },
      intent,
    );
  assert.deepEqual(project(store).nodes, expected.nodes);
  assert.deepEqual(project(store).links, expected.links);
});

test('C08-U21: marco intersecta cualquier parte con área positiva sin seleccionar fuera, líneas vacías ni materiales asignados', () => {
  const material = note();
  for (const ratio of [0.01, 0.05, 0.5, 0.95, 1]) {
    for (const rect of [
      {
        x: material.x,
        y: material.y - 10,
        width: material.width,
        height: 10 + material.height * ratio,
      },
      {
        x: material.x,
        y: material.y + material.height * (1 - ratio),
        width: material.width,
        height: material.height * ratio + 10,
      },
      {
        x: material.x - 10,
        y: material.y,
        width: 10 + material.width * ratio,
        height: material.height,
      },
      {
        x: material.x + material.width * (1 - ratio),
        y: material.y,
        width: material.width * ratio + 10,
        height: material.height,
      },
    ])
      assert.deepEqual(materialsInRect([material], rect), [material.id]);
  }
  for (const rect of [
    { x: -20, y: 20, width: 30, height: 160 },
    { x: 210, y: 20, width: 100, height: 160 },
    { x: 10, y: 10, width: 200, height: 10 },
    { x: 10, y: 180, width: 200, height: 40 },
    { x: 10, y: 20, width: 0, height: 160 },
    { x: 10, y: 20, width: 200, height: 0 },
  ])
    assert.deepEqual(materialsInRect([material], rect), []);
  material.owner = 'eve';
  assert.deepEqual(materialsInRect([material], { x: 0, y: 0, width: 400, height: 400 }), []);
});

test('C08-U12: la caché de fotograma se comparte por archivo sin modificar bytes, nombres ni historial de edición', () => {
  const { store } = setup();
  store.dispatch(
    {
      type: 'node.create',
      world: 'project',
      node: {
        id: 'video',
        x: 0,
        y: 0,
        width: 160,
        height: 90,
        owner: null,
        data: {
          kind: 'video',
          title: 'Original',
          asset: 'real-bytes',
          mime: 'video/webm',
          ratio: 16 / 9,
        },
      },
    },
    intent,
  );
  store.dispatch({ type: 'node.duplicate', world: 'project', id: 'video' }, intent);
  const before = structuredClone(project(store).nodes.filter((n) => n.data.kind === 'video'));
  store.dispatch(
    {
      type: 'nodes.move',
      world: 'project',
      nodes: before.map((n) => ({ id: n.id, point: { x: n.x + 20, y: n.y + 30 } })),
    },
    intent,
  );
  const count = store.canvasHistory.status('project').undo;
  const preview = 'data:image/jpeg;base64,cmVhbC1mcmFtZQ==';
  store.dispatch({ type: 'asset.preview', world: 'project', asset: 'real-bytes', preview }, intent);
  assert.equal(store.canvasHistory.status('project').undo, count);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  for (const node of project(store).nodes.filter((n) => n.data.kind === 'video')) {
    assert.deepEqual(node, {
      ...before.find((n) => n.id === node.id)!,
      data: { ...before.find((n) => n.id === node.id)!.data, preview },
    });
  }
  assert.throws(() =>
    store.dispatch(
      {
        type: 'asset.preview',
        world: 'project',
        asset: 'real-bytes',
        preview: 'https://invented.invalid/preview.jpg',
      },
      intent,
    ),
  );
});
