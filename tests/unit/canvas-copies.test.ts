import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, note, intent } from './fixtures';
import { Store } from '../../src/app/store';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import { validate } from '../../src/domain/invariants';
import type { LocalContent } from '../../src/domain/model';

test('C08-U39: copias de documentos, tareas y código viven en Canvas y se incorporan explícitamente', () => {
  const { state } = setup();
  const world = state.worlds.find((w) => w.id === 'project')!;
  world.tasks.push({
    id: 'task-original',
    title: 'Preparar revisión',
    description: 'Descripción original',
    status: 'planned',
    priority: 'Media',
    assignee: 'Gabi',
    creator: 'Gabi',
    start: '',
    due: '',
    origin: 'board',
    shipping: 'later',
    custom: {},
  });
  world.nodes.push(
    { ...note('doc'), data: { kind: 'reference', ref: { kind: 'document', id: 'document' } } },
    { ...note('code'), data: { kind: 'reference', ref: { kind: 'file', id: 'file' } } },
    { ...note('task'), data: { kind: 'reference', ref: { kind: 'task', id: world.tasks[0]!.id } } },
  );
  const originals = structuredClone({ docs: world.docs, files: world.files, tasks: world.tasks });
  const store = new Store(state);
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'nodes.duplicate',
    world: 'project',
    nodes: ['doc', 'code', 'task'],
    offset: { x: 30, y: 40 },
  });
  assert.deepEqual(
    { docs: project(store).docs, files: project(store).files, tasks: project(store).tasks },
    originals,
  );
  const copies = project(store).nodes.slice(-3);
  for (const copy of copies) {
    assert.equal(copy.data.kind, 'local');
    if (copy.data.kind !== 'local') throw Error('Falta copia');
    const content: LocalContent = structuredClone(copy.data.content);
    if (content.kind === 'document') content.body = 'Documento independiente';
    if (content.kind === 'file') content.text = 'const independent = true;';
    if (content.kind === 'task') content.task.description = 'Tarea independiente';
    act({
      type: 'node.local-edit',
      world: 'project',
      id: copy.id,
      title: 'Copia ' + content.kind,
      content,
    });
  }
  assert.deepEqual(
    { docs: project(store).docs, files: project(store).files, tasks: project(store).tasks },
    originals,
  );
  validate(store.snapshot());
  const recovered = new Store(store.snapshot());
  assert.deepEqual(project(recovered).nodes.slice(-3), project(store).nodes.slice(-3));
  for (const copy of copies)
    act({
      type: 'node.publish',
      world: 'project',
      id: copy.id,
      name:
        copy.data.kind === 'local' && copy.data.content.kind === 'file'
          ? 'independent.ts'
          : copy.data.kind === 'local'
            ? 'Nueva ' + copy.data.content.kind
            : '',
    });
  assert.equal(project(store).docs.length, originals.docs.length + 1);
  assert.equal(project(store).files.length, originals.files.length + 1);
  assert.equal(project(store).tasks.length, originals.tasks.length + 1);
  assert.deepEqual(project(store).docs.slice(0, originals.docs.length), originals.docs);
  assert.deepEqual(project(store).files.slice(0, originals.files.length), originals.files);
  assert.deepEqual(project(store).tasks.slice(0, originals.tasks.length), originals.tasks);
  assert.equal(project(store).files.at(-1)!.text, 'const independent = true;');
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(project(store).tasks.length, originals.tasks.length);
  assert.equal(project(store).nodes.at(-1)!.data.kind, 'local');
  act({ type: 'canvas.redo', world: 'project' });
  assert.equal(project(store).tasks.length, originals.tasks.length + 1);
});

test('C08-U40: selección con conexiones y conjuntos conserva geometría, identidad e historial', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({ type: 'group.create', world: 'project', nodes: ['note-a', 'note-b'], name: 'Ideas' });
  const original = structuredClone(project(store).nodes);
  act({
    type: 'nodes.duplicate',
    world: 'project',
    nodes: ['note-a', 'note-b'],
    offset: { x: 20, y: -10 },
  });
  const copies = project(store).nodes.slice(-2);
  assert.deepEqual(project(store).nodes.slice(0, 2), original);
  for (let i = 0; i < copies.length; i++) {
    assert.notEqual(copies[i]!.id, original[i]!.id);
    assert.equal(copies[i]!.x, original[i]!.x + 20);
    assert.equal(copies[i]!.y, original[i]!.y - 10);
  }
  assert.deepEqual(
    project(store).canvasGroups!.at(-1)!.nodes,
    copies.map((n) => n.id),
  );
  assert.equal(project(store).links.at(-1)!.from, copies[0]!.id);
  assert.equal(project(store).links.at(-1)!.to, copies[1]!.id);
  act({ type: 'canvas.undo', world: 'project' });
  assert.deepEqual(project(store).nodes, original);
  assert.equal(project(store).links.length, 1);
  act({ type: 'canvas.redo', world: 'project' });
  assert.deepEqual(project(store).nodes.slice(-2), copies);
  const clipboard = captureCanvasCopies(project(store), ['note-a']);
  assert.equal(clipboard.links.length, 0);
  assert.equal(clipboard.groups.length, 0);
});

test('C08-U41: lote externo inválido y nombre ocupado no dejan efectos parciales', () => {
  const { store } = setup();
  const clipboard = captureCanvasCopies(project(store), ['note-a', 'note-b']);
  assert.deepEqual(parseCanvasClipboard(JSON.stringify(clipboard)), clipboard);
  assert.throws(() => parseCanvasClipboard('{'), { code: 'CLIPBOARD_JSON' });
  for (const value of [
    'null',
    '{}',
    '{',
    JSON.stringify({ ...clipboard, version: 2 }),
    JSON.stringify({
      ...clipboard,
      nodes: [
        {
          ...clipboard.nodes[0],
          data: { kind: 'note', title: 'x', text: '', color: 'red;position:fixed' },
        },
      ],
    }),
  ]) {
    assert.throws(() => parseCanvasClipboard(value));
  }
  const invalid = structuredClone(clipboard);
  invalid.links[0]!.to = 'missing';
  const before = store.snapshot();
  assert.throws(() =>
    store.dispatch(
      { type: 'nodes.paste', world: 'project', clipboard: invalid, offset: { x: 0, y: 0 } },
      intent,
    ),
  );
  assert.deepEqual(store.snapshot(), before);
  store.dispatch(
    {
      type: 'node.create',
      world: 'project',
      node: { ...note('code'), data: { kind: 'reference', ref: { kind: 'file', id: 'file' } } },
    },
    intent,
  );
  store.dispatch({ type: 'node.duplicate', world: 'project', id: 'code' }, intent);
  const copy = project(store).nodes.at(-1)!;
  const beforePublish = store.snapshot();
  assert.throws(() =>
    store.dispatch(
      { type: 'node.publish', world: 'project', id: copy.id, name: 'main.ts' },
      intent,
    ),
  );
  assert.deepEqual(store.snapshot(), beforePublish);
});
