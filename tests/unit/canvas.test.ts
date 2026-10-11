import assert from 'node:assert/strict';
import test from 'node:test';
import { materialDensity, materialGroups } from '../../src/domain/material-density';
import { setup, project, note, intent } from './fixtures';

test('CANVAS-01: asignar conserva identidad y contenido e impide modificar el material ocupado', () => {
  const { store } = setup();
  const before = structuredClone(project(store).nodes[0]);
  store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
  assert.deepEqual(project(store).nodes[0], { ...before, owner: 'eve' });
  assert.equal(project(store).links.length, 0);
  const assigned = store.snapshot();
  assert.throws(() =>
    store.dispatch(
      { type: 'node.move', world: 'project', id: 'note-a', point: { x: 0, y: 0 } },
      intent,
    ),
  );
  assert.throws(() =>
    store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'milo' }, intent),
  );
  assert.deepEqual(store.snapshot(), assigned);
});

test('CANVAS-02: cancelar devuelve el material, su posición y sus conexiones', () => {
  const { store } = setup();
  const before = structuredClone(project(store));
  store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
  const assignment = project(store).assignments[0];
  assert.ok(assignment);
  store.dispatch(
    { type: 'assignment.finish', world: 'project', id: assignment.id, decision: 'cancel' },
    intent,
  );
  assert.deepEqual(project(store).nodes, before.nodes);
  assert.deepEqual(project(store).links, before.links);
  assert.equal(project(store).assignments.length, 0);
});

test('CANVAS-03: una propuesta solo agrega el resultado después de aceptarse', () => {
  const { store } = setup();
  const original = structuredClone(project(store).nodes[0]);
  store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
  const assignment = project(store).assignments[0];
  assert.ok(assignment);
  assert.throws(() =>
    store.dispatch(
      { type: 'assignment.finish', world: 'project', id: assignment.id, decision: 'accept' },
      intent,
    ),
  );
  store.dispatch(
    {
      type: 'assignment.ready',
      world: 'project',
      id: assignment.id,
      revision: 1,
      text: 'Propuesta nueva',
    },
    intent,
  );
  assert.equal(project(store).nodes.length, 2);
  assert.deepEqual(project(store).nodes[0]?.data, original?.data);
  store.dispatch(
    { type: 'assignment.finish', world: 'project', id: assignment.id, decision: 'accept' },
    intent,
  );
  assert.deepEqual(project(store).nodes[0], original);
  assert.equal(project(store).nodes.length, 3);
  assert.deepEqual(project(store).nodes[2]?.data, {
    kind: 'note',
    title: 'Idea',
    text: 'Propuesta nueva',
    color: '#e4efdf',
  });
});

test('CANVAS-04: respuestas antiguas no sustituyen la revisión en curso', () => {
  const { store } = setup();
  store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
  const assignment = project(store).assignments[0];
  assert.ok(assignment);
  store.dispatch(
    {
      type: 'assignment.ready',
      world: 'project',
      id: assignment.id,
      revision: 1,
      text: 'Primera propuesta',
    },
    intent,
  );
  store.dispatch(
    { type: 'assignment.revise', world: 'project', id: assignment.id, text: 'Revisar' },
    intent,
  );
  store.dispatch(
    { type: 'assignment.ready', world: 'project', id: assignment.id, revision: 1, text: 'Antigua' },
    intent,
  );
  assert.equal(project(store).assignments[0]?.phase, 'working');
  store.dispatch(
    { type: 'assignment.ready', world: 'project', id: assignment.id, revision: 2, text: 'Actual' },
    intent,
  );
  assert.equal(project(store).assignments[0]?.text, 'Actual');
});

for (const action of ['zone.delete', 'zone.agent'] as const) {
  test(`CANVAS-05: ${action} devuelve materiales y elimina la asignación`, () => {
    const { store } = setup();
    const nodes = structuredClone(project(store).nodes);
    store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
    store.dispatch(
      action === 'zone.delete'
        ? { type: action, world: 'project', id: 'zone' }
        : { type: action, world: 'project', id: 'zone', agent: null },
      intent,
    );
    assert.deepEqual(project(store).nodes, nodes);
    assert.equal(project(store).assignments.length, 0);
    assert.equal(project(store).links[0]?.id, 'link');
  });
}

test('CANVAS-06: deshacer y rehacer conserva los demás datos y la navegación', () => {
  const { store } = setup();
  const before = structuredClone(project(store).nodes);
  store.dispatch(
    { type: 'node.move', world: 'project', id: 'note-a', point: { x: 200, y: -100 } },
    intent,
  );
  store.dispatch(
    {
      type: 'document.edit',
      world: 'project',
      id: 'document',
      title: 'Documento',
      body: 'Edición conservada',
    },
    intent,
  );
  store.dispatch(
    { type: 'navigate', route: { kind: 'world', world: 'project' }, camera: store.get().camera },
    intent,
  );
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(project(store).nodes, before);
  assert.equal(project(store).docs[0]?.body, 'Edición conservada');
  assert.deepEqual(store.get().route, { kind: 'world', world: 'project' });
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  assert.equal(project(store).nodes[0]?.x, 200);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  store.dispatch({ type: 'node.create', world: 'project', node: note('new') }, intent);
  assert.equal(store.canvasHistory.status('project').redo, 0);
});

test('CANVAS-07: un traspaso de responsabilidad no se revierte mediante el historial', () => {
  const { store } = setup();
  store.dispatch(
    { type: 'node.move', world: 'project', id: 'note-a', point: { x: 2, y: 3 } },
    intent,
  );
  store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
  assert.deepEqual(store.canvasHistory.status('project'), { undo: 0, redo: 0 });
});

test('CANVAS-08: las densidades mantienen todas las identidades al cruzar límites', () => {
  for (const [count, density] of [
    [0, 'previews'],
    [1, 'previews'],
    [6, 'previews'],
    [7, 'types'],
    [15, 'types'],
    [16, 'summary'],
  ] as const) {
    assert.equal(materialDensity(count), density);
    const materials = Array.from({ length: count }, (_, index) => note(`n-${index}`));
    const before = structuredClone(materials);
    assert.deepEqual(
      materialGroups(materials).flatMap((group) => group.ids),
      materials.map((material) => material.id),
    );
    assert.deepEqual(materials, before);
  }
});

for (const decision of ['cancel', 'reject', 'accept'] as const) {
  test(`CANVAS-09 ${decision}: devolver materiales conectados en distinto orden conserva el enlace`, () => {
    const { store } = setup();
    const link = structuredClone(project(store).links[0]);
    store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
    store.dispatch({ type: 'assign', world: 'project', node: 'note-b', agent: 'milo' }, intent);
    const assignments = project(store).assignments;
    const first = assignments[0]!;
    const second = assignments[1]!;
    store.dispatch(
      { type: 'assignment.ready', world: 'project', id: first.id, revision: 1, text: 'Resultado' },
      intent,
    );
    store.dispatch({ type: 'assignment.finish', world: 'project', id: first.id, decision }, intent);
    assert.equal(project(store).links.length, 0);
    store.dispatch(
      { type: 'assignment.finish', world: 'project', id: second.id, decision: 'cancel' },
      intent,
    );
    assert.deepEqual(project(store).links, [link]);
    assert.ok(project(store).nodes.every((node) => node.owner === null));
  });
}

test('CANVAS-10: retirar la zona conserva conexiones con materiales que otro agente sigue usando', () => {
  const { store } = setup();
  store.dispatch({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' }, intent);
  store.dispatch({ type: 'assign', world: 'project', node: 'note-b', agent: 'milo' }, intent);
  store.dispatch({ type: 'zone.delete', world: 'project', id: 'zone' }, intent);
  const remaining = project(store).assignments[0]!;
  store.dispatch(
    { type: 'assignment.finish', world: 'project', id: remaining.id, decision: 'cancel' },
    intent,
  );
  assert.equal(project(store).links[0]?.id, 'link');
});
