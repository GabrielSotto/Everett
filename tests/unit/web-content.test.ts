import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent, note } from './fixtures';
import {
  enteredLink,
  validLinkPreview,
  validEmbed,
  retainLinkPreview,
} from '../../src/domain/link-previews';
import { SpatialCamera } from '../../src/spatial/camera';
import { canvasCameraTuning } from '../../src/spatial/tuning';

test('C08-U32: resolver medios conserva identidad, alias, posición e historial sin resucitar materiales', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  const url = 'https://example.org/photo';
  act({
    type: 'node.create',
    world: 'project',
    node: { ...note('remote'), data: { kind: 'link', title: 'Mi referencia', url } },
  });
  act({ type: 'node.move', world: 'project', id: 'remote', point: { x: 700, y: 150 } });
  const before = structuredClone(project(store).nodes.at(-1)!);
  const count = store.canvasHistory.status('project').undo;
  const data = {
    kind: 'image' as const,
    title: 'photo',
    asset: 'blob-1',
    mime: 'image/png',
    ratio: 2,
  };
  act({ type: 'node.resolve-link', world: 'project', id: 'remote', url, data });
  let current = project(store).nodes.at(-1)!;
  assert.equal(current.id, before.id);
  assert.equal(current.x, 700);
  assert.equal(current.width, before.width);
  assert.deepEqual(current.data, { ...data, title: 'Mi referencia', source: url });
  assert.equal(current.height, current.width / 2);
  assert.equal(store.canvasHistory.status('project').undo, count);
  act({ type: 'canvas.undo', world: 'project' });
  current = project(store).nodes.at(-1)!;
  assert.equal(current.x, 10);
  assert.equal(current.data.kind, 'image');
  act({ type: 'canvas.redo', world: 'project' });
  assert.equal(project(store).nodes.at(-1)!.x, 700);
  const state = store.snapshot();
  assert.throws(() =>
    act({
      type: 'node.resolve-link',
      world: 'project',
      id: 'remote',
      url,
      data: { ...data, ratio: 0 },
    }),
  );
  assert.deepEqual(store.snapshot(), state);
  act({ type: 'node.delete', world: 'project', id: 'remote' });
  act({ type: 'node.resolve-link', world: 'project', id: 'remote', url, data });
  assert.equal(
    project(store).nodes.some((n) => n.id === 'remote'),
    false,
  );
  for (const value of ['example.org/path', 'www.example.org', 'https://example.org/a'])
    assert.ok(enteredLink(value));
  for (const value of ['javascript:alert(1)', 'no es un enlace', 'https://u:p@example.org/'])
    assert.equal(enteredLink(value), null);
  assert.equal(validEmbed({ provider: 'youtube', id: 'abc123def45' }), true);
  assert.equal(validEmbed({ provider: 'youtube', id: '<script>' }), false);
  const saved = { status: 'ready' as const, checkedAt: 1, resolvedUrl: url, readerAsset: 'saved' };
  assert.equal(
    retainLinkPreview(saved, { status: 'error', checkedAt: 2, resolvedUrl: url }).readerAsset,
    'saved',
  );
  assert.equal(
    retainLinkPreview(saved, { ...saved, readerAsset: 'updated' }).readerAsset,
    'updated',
  );
  assert.equal(
    validLinkPreview({
      status: 'ready',
      checkedAt: 1,
      resolvedUrl: url,
      readerAsset: 'r',
      readerTitle: 'Lectura',
      readerText: 'Contenido',
      embed: { provider: 'vimeo', id: '123456' },
    }),
    true,
  );
});

test('C08-U33: zoom directo de Canvas responde, revierte y conserva el punto bajo el cursor sin cola', () => {
  let paints = 0;
  const cam = new SpatialCamera(
    { x: 120, y: -40, z: 1 },
    () => paints++,
    false,
    canvasCameraTuning,
  );
  const initial = cam.current;
  for (let step = 0; step < 40; step++) {
    const anchor = { x: step * 3 - 60, y: step - 20 };
    const before = cam.current;
    const world = { x: (anchor.x - before.x) / before.z, y: (anchor.y - before.y) / before.z };
    cam.zoom(-30, anchor);
    assert.deepEqual(cam.current, cam.destination);
    assert.ok(Math.abs((anchor.x - cam.current.x) / cam.current.z - world.x) < 1e-8);
    cam.zoom(30, anchor);
    assert.ok(Math.abs(cam.current.z - before.z) < 1e-9);
  }
  assert.ok(Math.abs(cam.current.x - initial.x) < 1e-7);
  assert.ok(paints >= 80);
  cam.zoom(-100000);
  assert.equal(cam.current.z, 6);
  cam.zoom(100000);
  assert.equal(cam.current.z, 0.01);
});
