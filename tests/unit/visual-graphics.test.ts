import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import { labelDistance } from '../../src/domain/cable-labels';
import { rectsCross } from '../../src/domain/rotation';
import { selectionBounds } from '../../src/domain/alignment';
import { imageDetailAt, detailPoint } from '../../src/domain/cable-geometry';
import { graphics, type GraphicKind } from '../../src/domain/visual-graphics';
test('C08-U80: gráficos editables independientes en espacio libre, ciclo cerrado y deshacer por composición', () => {
  const { store, worldId: world } = setup();
  for (const kind of Object.keys(graphics) as GraphicKind[]) {
    const before = structuredClone(project(store));
    store.dispatch({ type: 'graphic.insert', world, kind, center: { x: 60, y: 50 } }, intent);
    const after = project(store),
      additions = after.nodes.filter((n) => !before.nodes.some((b) => b.id === n.id));
    const box = selectionBounds([...additions]);
    assert.ok([...before.nodes, ...before.zones].every((n) => !rectsCross(box, n)));
    assert.ok(
      additions.some((n) => n.data.kind === 'image') &&
        additions.some((n) => n.data.kind === 'text'),
    );
    assert.deepEqual(after.nodes.slice(0, before.nodes.length), before.nodes);
    const addedLinks = after.links.slice(before.links.length);
    if (kind === 'cycle') {
      assert.equal(addedLinks.length, 4);
      assert.deepEqual(addedLinks.map((l) => l.from).sort(), addedLinks.map((l) => l.to).sort());
    }
    assert.equal(addedLinks.length, { sequence: 2, comparison: 0, cycle: 4, anatomy: 3 }[kind]);
    const clip = captureCanvasCopies(
      after,
      additions.map((n) => n.id),
    );
    assert.deepEqual(parseCanvasClipboard(JSON.stringify(clip)).links, addedLinks);
    store.dispatch({ type: 'canvas.undo', world }, intent);
    assert.deepEqual(project(store).nodes, before.nodes);
    assert.deepEqual(project(store).links, before.links);
    store.dispatch({ type: 'canvas.redo', world }, intent);
    assert.deepEqual(project(store).nodes, after.nodes);
  }
  assert.throws(
    () =>
      store.dispatch(
        { type: 'graphic.insert', world, kind: 'pie' as GraphicKind, center: { x: 0, y: 0 } },
        intent,
      ),
    { code: 'GRAPHIC_KIND' },
  );
});
test('C08-U81: el recorrido respeta la posición, conserva cables con nombre y valida sentidos y selección', () => {
  const { store, worldId: world } = setup();
  store.dispatch({ type: 'node.move', world, id: 'note-b', point: { x: -300, y: 20 } }, intent);
  store.dispatch({ type: 'link.label', world, id: 'link', text: 'Camino existente' }, intent);
  const before = project(store),
    ids = ['note-a', 'note-b'];
  store.dispatch({ type: 'graphic.connect', world, kind: 'sequence', nodes: ids }, intent);
  assert.deepEqual(project(store).nodes, before.nodes);
  assert.deepEqual(project(store).links, [{ ...before.links[0], direction: 'backward' }]);
  store.dispatch({ type: 'link.direction', world, id: 'link', direction: 'forward' }, intent);
  store.dispatch({ type: 'graphic.connect', world, kind: 'sequence', nodes: ids }, intent);
  assert.equal(project(store).links[0]?.direction, 'both');
  const copy = captureCanvasCopies(project(store), ids);
  assert.equal(parseCanvasClipboard(JSON.stringify(copy)).links[0]?.direction, 'both');
  assert.throws(() => parseCanvasClipboard(JSON.stringify(copy).replace('"both"', '"oops"')), {
    code: 'CLIPBOARD_LINK',
  });
  for (const nodes of [ids, ['note-a', 'note-a', 'note-b'], ['note-a', 'note-b', 'missing']])
    assert.throws(
      () => store.dispatch({ type: 'graphic.connect', world, kind: 'cycle', nodes }, intent),
      { code: 'GRAPHIC_SELECTION' },
    );
  assert.throws(
    () =>
      store.dispatch(
        { type: 'link.direction', world, id: 'link', direction: 'invalid' as 'forward' },
        intent,
      ),
    { code: 'LINK_DIRECTION' },
  );
});

test('C08-U83: la etiqueta conserva su extremo en un cable largo y la posición viaja con una copia', () => {
  const { store, worldId: world } = setup();
  const place = (placement: 'start' | 'center' | 'end') =>
    store.dispatch({ type: 'link.label', world, id: 'link', text: 'Sí', placement }, intent);
  assert.equal(labelDistance(500), 250);
  for (const at of ['start', 'end', 'center'] as const) assert.equal(labelDistance(70, at), 35);
  assert.equal(labelDistance(500, 'start'), 64);
  assert.equal(labelDistance(500, 'end'), 436);
  place('start');
  const copy = captureCanvasCopies(project(store), ['note-a', 'note-b']);
  assert.equal(parseCanvasClipboard(JSON.stringify(copy)).links[0]?.labelPlacement, 'start');
  assert.throws(() => parseCanvasClipboard(JSON.stringify(copy).replace('"start"', '"bad"')), {
    code: 'CLIPBOARD_LINK',
  });
  place('end');
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.equal(project(store).links[0]?.labelPlacement, 'start');
  assert.throws(() => place('bad' as 'start'), { code: 'LINK_LABEL_PLACEMENT' });
  place('center');
  assert.equal(project(store).links[0]?.labelPlacement, undefined);
});
test('C08-U82: punto de imagen en píxeles visibles, guardado atómico y copia con vínculo independiente', () => {
  const { store, worldId: world } = setup();
  const photo = {
    id: 'photo',
    x: 10,
    y: 20,
    width: 200,
    height: 200,
    rotation: 90,
    owner: null,
    data: { kind: 'image' as const, title: 'Plano', asset: 'p', mime: 'image/png', ratio: 2 },
  };
  const detail = { x: 0.2, y: 0.75 },
    physical = detailPoint(photo, detail);
  assert.ok(Math.abs(physical.x - 85) < 1e-6 && Math.abs(physical.y - 60) < 1e-6);
  const round = imageDetailAt(photo, physical)!;
  assert.ok(Math.hypot(round.x - detail.x, round.y - detail.y) < 1e-6);
  assert.equal(imageDetailAt(photo, { x: 11, y: 122 }), null);
  store.dispatch({ type: 'node.create', world, node: { ...photo, height: 100 } }, intent);
  const cmd = { type: 'graphic.callout' as const, world, image: 'photo', detail, text: 'Tejido' };
  for (const bad of [{ detail: { x: 4, y: 0 } }, { text: '  ' }, { image: 'note-a' }])
    assert.throws(() => store.dispatch({ ...cmd, ...bad }, intent));
  const before = project(store);
  store.dispatch(cmd, intent);
  const after = project(store),
    l = after.links.at(-1)!;
  assert.equal(after.nodes.length, before.nodes.length + 1);
  assert.deepEqual(l.detail, detail);
  const clip = captureCanvasCopies(after, [l.from, l.to]);
  store.dispatch(
    { type: 'nodes.paste', world, clipboard: clip, offset: { x: 320, y: 100 } },
    intent,
  );
  const copy = project(store).links.at(-1)!;
  assert.notEqual(copy.to, l.to);
  assert.notEqual(copy.from, l.from);
  assert.deepEqual(copy.detail, l.detail);
  store.dispatch(
    { type: 'link.reconnect', world, id: copy.id, end: 'to', node: 'note-b', anchor: 'north' },
    intent,
  );
  assert.equal(project(store).links.at(-1)!.detail, undefined);
  assert.deepEqual(project(store).links.find((v) => v.id === l.id)!.detail, detail);
});
