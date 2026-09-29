import assert from 'node:assert/strict';
import test from 'node:test';
import { note, setup, project, intent } from './fixtures';

test('STATE-01: los datos entregados al Store no conservan acceso al estado confirmado', () => {
  const { store, state, worldId } = setup();
  state.profile.name = 'Cambio externo';
  state.worlds.length = 0;
  assert.notEqual(store.get().profile.name, 'Cambio externo');
  assert.equal(store.get().worlds.length, 1);

  const material = note('external');
  store.dispatch({ type: 'node.create', world: worldId, node: material }, intent);
  material.x = 999;
  assert.equal(project(store).nodes.find((node) => node.id === material.id)?.x, 10);
});

test('STATE-02: leer estado permite inspeccionarlo y exige comandos para modificarlo', () => {
  const { store } = setup();
  assert.throws(() => {
    // @ts-expect-error La lectura del estado también debe impedir mutaciones al compilar.
    store.get().profile.name = 'Cambio fuera de comando';
  }, TypeError);
  const snapshot = store.snapshot();
  snapshot.profile.name = 'Copia editable';
  assert.notEqual(store.get().profile.name, snapshot.profile.name);
});

test('STATE-03: las trazas conservan los valores registrados y sus copias son independientes', () => {
  const { log } = setup();
  const details = { camera: { x: 10 } };
  log.add('test', details, intent);
  details.camera.x = 20;
  const copy = log.snapshot();
  assert.deepEqual(copy[0]?.details, { camera: { x: 10 } });
  copy[0]!.details.camera = { x: 30 };
  assert.deepEqual(log.snapshot()[0]?.details, { camera: { x: 10 } });
});

test('DOCS-03: índices fraccionarios o no finitos no crean propiedades ocultas en las celdas', () => {
  const { store, worldId } = setup();
  store.dispatch({ type: 'document.create', world: worldId, sheet: true }, intent);
  const document = project(store).docs.at(-1)!;
  const before = store.snapshot();
  for (const col of [0.5, NaN, Infinity, -1]) {
    assert.throws(() =>
      store.dispatch(
        { type: 'sheet.edit', world: worldId, id: document.id, row: 0, col, value: 'Cambio' },
        intent,
      ),
    );
    assert.deepEqual(store.snapshot(), before);
  }
});

test('AGENTS-04: eliminar memoria exige un índice entero existente', () => {
  const { store, worldId } = setup();
  store.dispatch(
    { type: 'agent.memory', world: worldId, id: 'eve', text: 'Recordatorio', remove: null },
    intent,
  );
  const before = store.snapshot();
  for (const remove of [-1, 0.5, NaN, Infinity, 1000]) {
    assert.throws(() =>
      store.dispatch({ type: 'agent.memory', world: worldId, id: 'eve', text: '', remove }, intent),
    );
    assert.deepEqual(store.snapshot(), before);
  }
});

test('PROFILE-01: tareas y comentarios nuevos utilizan la identidad activa', () => {
  const { store, worldId } = setup();
  store.dispatch(
    { type: 'profile.edit', profile: { ...store.get().profile, name: 'Alex' } },
    intent,
  );
  store.dispatch(
    { type: 'task.create', world: worldId, title: 'Primera tarea', origin: 'board' },
    intent,
  );
  store.dispatch({ type: 'comment', world: worldId, node: 'note-a', text: 'Revisar' }, intent);
  assert.equal(project(store).tasks.at(-1)?.creator, 'Alex');
  assert.equal(project(store).comments.at(-1)?.author, 'Alex');
});
