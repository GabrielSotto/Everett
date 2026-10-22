import assert from 'node:assert/strict';
import test from 'node:test';
import { canOrderMaterials, orderMaterials } from '../../src/domain/material-order';
import { setup, project, note, intent } from './fixtures';

test('C08-U24: cada paso atraviesa una superposición, ignora materiales lejanos y ofrece límites contextuales', () => {
  let items = ['a', 'far-1', 'b', 'far-2', 'c'].map((id) => ({
    ...note(id),
    x: id.startsWith('far') ? 10000 : 0,
  }));
  const original = structuredClone(items);
  const visible = () =>
    items
      .filter((n) => !n.id.startsWith('far'))
      .map((n) => n.id)
      .join('');
  for (const [action, expected] of [
    ['forward', 'bac'],
    ['forward', 'bca'],
    ['backward', 'bac'],
    ['backward', 'abc'],
  ] as const) {
    assert.equal(canOrderMaterials(items, ['a'], action), true);
    items = orderMaterials(items, ['a'], action);
    assert.equal(visible(), expected);
  }
  assert.equal(canOrderMaterials(items, ['a'], 'backward'), false);
  assert.equal(canOrderMaterials(items, ['a'], 'back'), false);
  for (const action of ['front', 'forward', 'backward', 'back'] as const) {
    assert.equal(
      canOrderMaterials([original[0]!, { ...note('alone'), x: -1000 }], ['alone'], action),
      false,
    );
    const moved = orderMaterials(items, ['a', 'b'], action);
    assert.deepEqual(
      moved.filter((n) => ['a', 'b'].includes(n.id)).map((n) => n.id),
      ['a', 'b'],
    );
    assert.deepEqual(
      [...moved].sort((a, b) => a.id.localeCompare(b.id)),
      [...original].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }
  const { store } = setup();
  const initial = project(store).nodes;
  store.dispatch(
    { type: 'nodes.order', world: 'project', nodes: ['note-b'], order: 'forward' },
    intent,
  );
  assert.deepEqual(project(store).nodes, initial);
  assert.equal(store.canvasHistory.status('project').undo, 0, 'Un límite no crea un paso vacío');
});
