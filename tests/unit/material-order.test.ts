import assert from 'node:assert/strict';
import test from 'node:test';
import { orderMaterials } from '../../src/domain/material-order';
import { setup, project, intent, note } from './fixtures';

test('C08-U23: capas estables, límites, validación, contenido e historial atómicos', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, content: id })),
    ids = (items: readonly { id: string }[]) => items.map((item) => item.id).join('');
  assert.equal(ids(orderMaterials(items, ['b', 'd'], 'front')), 'acebd');
  assert.equal(ids(orderMaterials(items, ['b', 'd'], 'back')), 'bdace');
  assert.equal(ids(orderMaterials(items, ['b', 'd'], 'forward')), 'acbed');
  assert.equal(ids(orderMaterials(items, ['b', 'd'], 'backward')), 'badce');
  assert.equal(ids(orderMaterials(items, ['d', 'e'], 'forward')), 'abcde');
  assert.equal(ids(orderMaterials(items, ['a', 'b'], 'backward')), 'abcde');
  assert.equal(ids(items), 'abcde');
  const { store } = setup(),
    act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({ type: 'node.create', world: 'project', node: note('front') });
  const original = project(store),
    nodes = structuredClone(original.nodes),
    links = structuredClone(original.links);
  for (const selected of [[], ['missing'], ['note-a', 'note-a']])
    assert.throws(() =>
      act({ type: 'nodes.order', world: 'project', nodes: selected, order: 'front' }),
    );
  assert.deepEqual(project(store).nodes, nodes);
  const before = store.canvasHistory.status('project').undo;
  act({ type: 'nodes.order', world: 'project', nodes: ['note-a'], order: 'front' });
  assert.equal(project(store).nodes.at(-1)!.id, 'note-a');
  assert.equal(store.canvasHistory.status('project').undo, before + 1);
  assert.deepEqual(
    [...project(store).nodes].sort((a, b) => a.id.localeCompare(b.id)),
    [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
  );
  assert.deepEqual(project(store).links, links);
  act({ type: 'canvas.undo', world: 'project' });
  assert.deepEqual(project(store).nodes, nodes);
  act({ type: 'canvas.redo', world: 'project' });
  assert.equal(project(store).nodes.at(-1)!.id, 'note-a');
  act({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' });
  const owned = store.snapshot();
  assert.throws(() =>
    act({ type: 'nodes.order', world: 'project', nodes: ['note-b', 'note-a'], order: 'back' }),
  );
  assert.deepEqual(store.snapshot(), owned);
});
