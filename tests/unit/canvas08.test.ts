import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, project, intent } from './fixtures';
import { AgentService } from '../../src/app/agent-service';
import { Store } from '../../src/app/store';
import { shortcutConflict, canvasDefaults } from '../../src/domain/shortcuts';
import { uiState } from '../../src/app/ui-state';
import { conversationDraft } from '../../src/domain/conversations';
import { materialRoute, materialTitle } from '../../src/domain/model';

test('C08-U01: renombrado compartido, duplicado independiente, retirada y Undo/Redo conservan identidades', () => {
  const { store } = setup();
  store.dispatch(
    {
      type: 'node.create',
      world: 'project',
      node: {
        id: 'ref',
        x: 0,
        y: 0,
        width: 220,
        height: 170,
        owner: null,
        data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
      },
    },
    intent,
  );
  store.dispatch(
    { type: 'node.rename', world: 'project', id: 'ref', name: 'Nombre común' },
    intent,
  );
  assert.equal(project(store).docs[0]!.body, 'Texto\n\nPárrafo');
  assert.equal(project(store).docs[0]!.title, 'Nombre común');
  store.dispatch(
    {
      type: 'document.edit',
      world: 'project',
      id: 'document',
      title: 'Nombre común',
      body: 'Edición posterior',
    },
    intent,
  );
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).docs[0]!.title, 'Documento');
  assert.equal(project(store).docs[0]!.body, 'Edición posterior');
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  store.dispatch({ type: 'node.duplicate', world: 'project', id: 'ref' }, intent);
  const copy = project(store).docs.at(-1)!;
  assert.notEqual(copy.id, 'document');
  const reference = project(store).nodes.at(-1)!;
  const copyId = reference.id;
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).docs.length, 1);
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  assert.equal(project(store).nodes.at(-1)!.id, copyId);
  store.dispatch(
    {
      type: 'document.edit',
      world: 'project',
      id: copy.id,
      title: 'Copia editada',
      body: 'Contenido independiente',
    },
    intent,
  );
  assert.equal(project(store).docs[0]!.body, 'Edición posterior');
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).docs.length, 1);
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  assert.equal(project(store).nodes.at(-1)!.id, copyId);
  assert.equal(project(store).docs.at(-1)!.id, copy.id);
  assert.equal(project(store).docs.at(-1)!.title, 'Copia editada');
  assert.equal(project(store).docs.at(-1)!.body, 'Contenido independiente');
  store.dispatch({ type: 'node.delete', world: 'project', id: copyId }, intent);
  assert.ok(project(store).docs.some((d) => d.id === copy.id));
  assert.deepEqual(materialRoute(store.get(), 'project', copyId), {
    kind: 'surface',
    world: 'project',
    surface: 'docs',
    entity: copy.id,
  });
  store.dispatch(
    {
      type: 'document.edit',
      world: 'project',
      id: copy.id,
      title: '',
      body: 'Contenido independiente',
    },
    intent,
  );
  assert.equal(materialTitle(project(store), copyId), 'Sin título');
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.ok(project(store).nodes.some((n) => n.id === copyId));
  assert.equal(project(store).docs.at(-1)!.body, 'Contenido independiente');
});

test('C08-U02: conversaciones múltiples no mezclan participantes, mensajes ni borradores personales', () => {
  const { store } = setup(),
    ui = uiState();
  const first = project(store).conversations[0]!.id;
  ui.conversations.project = first;
  conversationDraft(project(store), ui).text = 'Privado A';
  store.dispatch(
    { type: 'participant', world: 'project', name: 'Otra persona', conversation: first },
    intent,
  );
  store.dispatch({ type: 'conversation.create', world: 'project', origin: 'canvas' }, intent);
  const second = project(store).conversations.at(-1)!;
  assert.deepEqual(second.participants, ['Gabi', 'Eve']);
  ui.conversations.project = second.id;
  assert.equal(conversationDraft(project(store), ui).text, '');
  conversationDraft(project(store), ui).text = 'Privado B';
  store.dispatch(
    {
      type: 'message',
      world: 'project',
      channel: 'chat',
      conversation: second.id,
      message: { id: 'm', role: 'user', name: 'Gabi', text: 'Mensaje B', refs: [], plan: null },
    },
    intent,
  );
  assert.equal(project(store).conversations[0]!.messages.length, 0);
  ui.conversations.project = first;
  assert.equal(conversationDraft(project(store), ui).text, 'Privado A');
  ui.userId = 'another-user';
  assert.equal(conversationDraft(project(store), ui).text, '');
});

test('C08-U03: recargar continúa el mismo trabajo una vez y revisar conserva instrucción y contexto', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const { store } = setup();
  store.dispatch(
    { type: 'assign', world: 'project', node: 'note-a', agent: 'eve', instruction: 'Analizar' },
    intent,
  );
  const id = project(store).assignments[0]!.id;
  const service = new AgentService(store);
  service.process('project', id);
  context.mock.timers.tick(500);
  service.dispose();
  const restored = new Store(store.snapshot()),
    resumed = new AgentService(restored);
  resumed.resume();
  resumed.resume();
  context.mock.timers.tick(1200);
  assert.equal(project(restored).assignments[0]!.id, id);
  assert.equal(project(restored).assignments[0]!.phase, 'ready');
  assert.equal(project(restored).runs.length, 1);
  assert.equal(project(restored).nodes.length, 2);
  const source = project(restored).assignments[0]!.input;
  restored.dispatch({ type: 'assignment.revise', world: 'project', id, text: 'Más breve' }, intent);
  resumed.process('project', id);
  context.mock.timers.tick(1700);
  assert.equal(project(restored).assignments[0]!.instruction, 'Analizar');
  assert.equal(project(restored).assignments[0]!.input, source);
  assert.equal(project(restored).assignments[0]!.revision, 2);
  assert.equal(project(restored).nodes.length, 2);
  resumed.dispose();
});

test('C08-U04: trazo y etiquetas se restauran sin perder anclajes y rechazan destinos inválidos', () => {
  const { store } = setup();
  store.dispatch({ type: 'link.label', world: 'project', id: 'link', text: 'Depende de' }, intent);
  store.dispatch(
    { type: 'node.move', world: 'project', id: 'note-a', point: { x: 300, y: 240 } },
    intent,
  );
  assert.equal(project(store).links[0]!.label, 'Depende de');
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).links[0]!.fromAnchor, 'east');
  assert.equal(project(store).links[0]!.label, 'Depende de');
  assert.throws(() =>
    store.dispatch(
      {
        type: 'link.create',
        world: 'project',
        from: 'note-a',
        to: 'zone',
        fromAnchor: 'north',
        toAnchor: 'south',
      },
      intent,
    ),
  );
  store.dispatch(
    {
      type: 'node.create',
      world: 'project',
      node: {
        id: 'drawing',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        owner: null,
        data: {
          kind: 'drawing',
          title: 'Trazo',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 50 },
          ],
          color: '#223344',
          thickness: 2,
        },
      },
    },
    intent,
  );
  store.dispatch(
    {
      type: 'node.resize',
      world: 'project',
      id: 'drawing',
      rect: { x: 0, y: 0, width: 200, height: 100 },
    },
    intent,
  );
  const drawing = project(store).nodes.at(-1)!;
  assert.ok(drawing.data.kind === 'drawing');
  assert.deepEqual(drawing.data.points, [
    { x: 0, y: 0 },
    { x: 200, y: 100 },
  ]);
});

test('C08-U05: atajos detectan conflictos y comentarios exigen un material completo', () => {
  assert.equal(canvasDefaults.rename, '');
  assert.equal(shortcutConflict(canvasDefaults, 'rename', 'N'), 'note');
  assert.equal(shortcutConflict(canvasDefaults, 'rename', 'Control+Z'), null);
  assert.equal(shortcutConflict(canvasDefaults, 'rename', 'Ctrl+Z'), 'global');
  const { store } = setup();
  assert.throws(() =>
    store.dispatch(
      { type: 'comment', world: 'project', node: 'background', text: 'No libre' },
      intent,
    ),
  );
  store.dispatch(
    { type: 'comment', world: 'project', node: 'note-a', text: 'Un comentario' },
    intent,
  );
  assert.equal(project(store).comments.length, 1);
  assert.equal(project(store).comments[0]!.node, 'note-a');
});
