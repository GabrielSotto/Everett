import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { newCanvasText } from '../../src/domain/canvas-text';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import { searchWorkspace } from '../../src/domain/workspace-search';

test('C08-U76: adjuntos y portapapeles conservan el texto; un gesto se revierte entero, incluso si se borra', () => {
  const { store } = setup(),
    world = 'project',
    id = 'shipping-date';
  const data = {
    ...newCanvasText('wrap'),
    font: 'google:Roboto Mono' as const,
    text: 'Día 3\nSale la carga',
  };
  const first = {
    type: 'text.edit' as const,
    world,
    id,
    session: 'first',
    data,
    width: 180,
    height: 60,
  };
  store.dispatch({ ...first, insertAt: { x: 0, y: 120 } }, intent);
  store.dispatch({ ...first, data: { ...data, text: 'Día 3\nSale la carga refrigerada' } }, intent);
  assert.ok(searchWorkspace(store.get(), 'refrigerada').some((m) => m.id === id));
  const clipboard = captureCanvasCopies(project(store), [id]);
  assert.deepEqual(parseCanvasClipboard(JSON.stringify(clipboard)), clipboard);
  for (const extra of [
    { size: 0 },
    { font: 'A;position:fixed' },
    { align: 'inherit' },
    { weight: -1 },
    { color: 'url(bad)' },
    { text: 'a'.repeat(100001) },
  ]) {
    const invalid = structuredClone(clipboard);
    Object.assign(invalid.nodes[0]!.data, extra);
    assert.throws(() => parseCanvasClipboard(JSON.stringify(invalid)));
  }
  assert.throws(() => store.dispatch({ ...first, width: NaN }, intent), { code: 'GEOMETRY' });
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.equal(
    project(store).nodes.some((n) => n.id === id),
    false,
  );
  store.dispatch({ type: 'canvas.redo', world }, intent);
  const before = structuredClone(project(store).nodes);
  store.dispatch({ ...first, session: 'second', data: { ...data, text: '' } }, intent);
  assert.equal(
    project(store).nodes.some((n) => n.id === id),
    false,
  );
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.deepEqual(project(store).nodes, before);
});
