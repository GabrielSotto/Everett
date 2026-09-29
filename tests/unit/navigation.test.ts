import assert from 'node:assert/strict';
import test from 'node:test';
import { routeKey, type Camera, type Route } from '../../src/domain/model';
import { setup, intent } from './fixtures';

test('NAV-01: entrar y regresar recupera cada contexto y su cámara', () => {
  const { store } = setup();
  const universeCamera: Camera = { x: 125, y: -91, z: 0.62 };
  const worldCamera: Camera = { x: -230, y: 184, z: 1.15 };
  const canvasCamera: Camera = { x: 310, y: -67, z: 1.4 };
  const world: Route = { kind: 'world', world: 'project' };
  const canvas: Route = { kind: 'surface', world: 'project', surface: 'canvas', entity: null };
  store.dispatch({ type: 'navigate', route: world, camera: universeCamera }, intent);
  store.dispatch({ type: 'navigate', route: canvas, camera: worldCamera }, intent);
  store.dispatch(
    {
      type: 'navigate',
      route: { kind: 'note', world: 'project', entity: 'note-a' },
      camera: canvasCamera,
    },
    intent,
  );
  for (const [route, camera] of [
    [canvas, canvasCamera],
    [world, worldCamera],
    [{ kind: 'universe' }, universeCamera],
  ] as const) {
    store.dispatch({ type: 'back' }, intent);
    assert.deepEqual(store.get().route, route);
    assert.deepEqual(store.get().camera, camera);
  }
  assert.equal(store.get().history.length, 0);
  store.dispatch({ type: 'back' }, intent);
  assert.deepEqual(store.get().camera, universeCamera);
});

test('NAV-02: una referencia de Canvas vuelve al Canvas de origen', () => {
  const { store } = setup();
  const camera = { x: 83, y: -127, z: 1.78 };
  const canvas: Route = { kind: 'surface', world: 'project', surface: 'canvas', entity: null };
  store.dispatch({ type: 'navigate', route: canvas, camera: store.get().camera }, intent);
  store.dispatch(
    {
      type: 'navigate',
      route: { kind: 'surface', world: 'project', surface: 'docs', entity: 'document' },
      camera,
    },
    intent,
  );
  store.dispatch(
    {
      type: 'document.edit',
      world: 'project',
      id: 'document',
      title: 'Revisado',
      body: 'Primero\n\nSegundo',
    },
    intent,
  );
  store.dispatch({ type: 'back' }, intent);
  assert.deepEqual(store.get().route, canvas);
  assert.deepEqual(store.get().camera, camera);
  assert.equal(store.get().worlds[0]?.docs[0]?.body, 'Primero\n\nSegundo');
});

test('NAV-03: cambiar entre superficies pares no acumula una pila de visitas', () => {
  const { store } = setup();
  for (const surface of ['canvas', 'docs', 'code', 'board', 'agents', 'session'] as const) {
    store.dispatch(
      {
        type: 'navigate',
        route: { kind: 'surface', world: 'project', surface, entity: null },
        camera: store.get().camera,
      },
      intent,
    );
    assert.deepEqual(
      store.get().history.map((frame) => routeKey(frame.route)),
      ['universe', 'world/project'],
    );
  }
  store.dispatch({ type: 'back' }, intent);
  assert.deepEqual(store.get().route, { kind: 'world', world: 'project' });
});

test('NAV-04: una ruta inválida no altera ruta, cámara ni historial', () => {
  const { store, log } = setup();
  const before = store.snapshot();
  assert.throws(() =>
    store.dispatch(
      {
        type: 'navigate',
        route: { kind: 'note', world: 'project', entity: 'missing' },
        camera: store.get().camera,
      },
      intent,
    ),
  );
  assert.deepEqual(store.snapshot(), before);
  assert.ok(log.snapshot().some((entry) => entry.event === 'command.rejected'));
});
