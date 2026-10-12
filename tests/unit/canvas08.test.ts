import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, project, intent } from './fixtures';
import { AgentService } from '../../src/app/agent-service';
import { Store } from '../../src/app/store';
import { shortcutConflict, canvasDefaults } from '../../src/domain/shortcuts';
import { uiState } from '../../src/app/ui-state';
import { conversationDraft } from '../../src/domain/conversations';
import { materialRoute, materialTitle } from '../../src/domain/model';
import { anchorPoint } from '../../src/domain/geometry';
import { proposalOverlaps, arrangeProposals, proposalSize } from '../../src/domain/proposal-layout';
import type { Material } from '../../src/domain/model';
import { canvasProposal } from '../../src/domain/canvas-proposal';

test('C08-U07: reconectar modifica el mismo vínculo, conserva etiqueta y admite Undo/Redo sin destinos inválidos', () => {
  const { store } = setup();
  const third = { ...project(store).nodes[0]!, id: 'third', x: 300 };
  store.dispatch({ type: 'node.create', world: 'project', node: structuredClone(third) }, intent);
  store.dispatch({ type: 'link.label', world: 'project', id: 'link', text: 'Juan' }, intent);
  const original = structuredClone(project(store).links[0]!);
  store.dispatch(
    {
      type: 'link.reconnect',
      world: 'project',
      id: 'link',
      end: 'to',
      node: 'third',
      anchor: 'north',
    },
    intent,
  );
  assert.deepEqual(project(store).links, [{ ...original, to: 'third', toAnchor: 'north' }]);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(project(store).links, [original]);
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  const snapshot = store.snapshot();
  for (const node of ['zone', 'note-a', 'missing']) {
    assert.throws(() =>
      store.dispatch(
        { type: 'link.reconnect', world: 'project', id: 'link', end: 'to', node, anchor: 'north' },
        intent,
      ),
    );
    assert.deepEqual(store.snapshot(), snapshot);
  }
  store.dispatch(
    {
      type: 'link.create',
      world: 'project',
      from: 'note-a',
      to: 'note-b',
      fromAnchor: 'east',
      toAnchor: 'west',
    },
    intent,
  );
  assert.throws(() =>
    store.dispatch(
      {
        type: 'link.reconnect',
        world: 'project',
        id: 'link',
        end: 'to',
        node: 'note-b',
        anchor: 'west',
      },
      intent,
    ),
  );
  store.dispatch(
    { type: 'assign', world: 'project', node: 'note-b', agent: 'eve', instruction: 'Resumir' },
    intent,
  );
  assert.throws(() =>
    store.dispatch(
      {
        type: 'link.reconnect',
        world: 'project',
        id: 'link',
        end: 'to',
        node: 'note-b',
        anchor: 'north',
      },
      intent,
    ),
  );
  assert.equal(project(store).links[0]!.id, 'link');
  assert.equal(project(store).links[0]!.label, 'Juan');
});

test('C08-U08: propuesta reproducible usa el material y busca espacio junto a la zona sin desplazar contenido', () => {
  const source = 'Capturar información con su fuente.\nConservar decisiones y preguntas abiertas.';
  const analysis = canvasProposal(source, 'Analizar');
  assert.match(analysis, /Observaciones del material/);
  assert.match(analysis, /Capturar información con su fuente/);
  assert.match(analysis, /Conservar decisiones y preguntas abiertas/);
  assert.equal(canvasProposal(source, 'Analizar'), analysis);
  assert.match(canvasProposal(source, 'Analizar', 'Más breve'), /^Resumen\n/);
  assert.match(canvasProposal('', 'Resumir'), /no contiene texto disponible/);
  const { store } = setup();
  store.dispatch(
    { type: 'assign', world: 'project', node: 'note-a', agent: 'eve', instruction: 'Analizar' },
    intent,
  );
  const world = store.snapshot().worlds.find((world) => world.id === 'project')!;
  const zone = world.zones[0]!;
  world.nodes.push({
    ...world.nodes[1]!,
    id: 'obstruction',
    x: zone.x,
    y: zone.y + zone.height + 20,
    width: 1000,
    height: 1600,
  });
  const before = structuredClone(world.nodes);
  arrangeProposals(world);
  const card = { ...world.assignments[0]!.position, ...proposalSize };
  assert.ok(
    world.nodes.filter((node) => !node.owner).every((node) => !proposalOverlaps(card, node)),
  );
  assert.ok(!proposalOverlaps(card, zone));
  const dx = Math.max(0, zone.x - card.x - card.width, card.x - zone.x - zone.width);
  const dy = Math.max(0, zone.y - card.y - card.height, card.y - zone.y - zone.height);
  assert.equal(Math.hypot(dx, dy), 24);
  assert.deepEqual(world.nodes, before);
});

test('C08-U06: anclajes sobre el contenido, zona con nombre propio y propuestas sin cubrir resultados', () => {
  const drawing: Material = {
    id: 'drawing',
    x: 100,
    y: 200,
    width: 100,
    height: 80,
    owner: null,
    data: {
      kind: 'drawing',
      title: 'Sin nombre',
      color: '#fff',
      thickness: 2,
      points: [
        { x: 10, y: 20 },
        { x: 35, y: 3 },
        { x: 92, y: 65 },
        { x: 40, y: 75 },
      ],
    },
  };
  assert.deepEqual(anchorPoint(drawing, 'north'), { x: 135, y: 203 });
  assert.deepEqual(anchorPoint(drawing, 'west'), { x: 110, y: 220 });
  assert.deepEqual(anchorPoint(drawing, 'east'), { x: 192, y: 265 });
  assert.deepEqual(anchorPoint(drawing, 'south'), { x: 140, y: 275 });
  const triangle: Material = {
    ...drawing,
    data: { kind: 'shape', shape: 'triangle', color: '#fff' },
  };
  assert.deepEqual(anchorPoint(triangle, 'west'), { x: 125, y: 240 });
  assert.deepEqual(anchorPoint(triangle, 'east'), { x: 175, y: 240 });
  const { store } = setup();
  store.dispatch(
    { type: 'zone.rename', world: 'project', id: 'zone', name: 'Investigación' },
    intent,
  );
  store.dispatch({ type: 'zone.agent', world: 'project', id: 'zone', agent: 'milo' }, intent);
  assert.equal(project(store).zones[0]!.name, 'Investigación');
  assert.equal(project(store).zones[0]!.agent, 'milo');
  store.dispatch(
    { type: 'assign', world: 'project', node: 'note-a', agent: 'milo', instruction: 'Analizar' },
    intent,
  );
  const world = store.snapshot().worlds.find((world) => world.id === 'project')!;
  const job = world.assignments[0]!;
  world.nodes.push({
    id: 'accepted',
    x: job.position.x,
    y: job.position.y,
    width: 280,
    height: 160,
    owner: null,
    data: { kind: 'note', title: 'Resultado aceptado', text: 'Conservar', color: '#fff' },
  });
  const originalPosition = { ...job.position };
  arrangeProposals(world);
  assert.ok(
    !proposalOverlaps(
      { ...job.position, ...proposalSize },
      { ...originalPosition, width: 280, height: 160 },
    ),
  );
  assert.deepEqual(world.nodes.at(-1)!.data, {
    kind: 'note',
    title: 'Resultado aceptado',
    text: 'Conservar',
    color: '#fff',
  });
  assert.equal(job.instruction, 'Analizar');
  const position = { ...job.position };
  arrangeProposals(world);
  assert.deepEqual(job.position, position);
});

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
  assert.equal(materialTitle(project(store), copyId), 'Sin nombre');
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.ok(project(store).nodes.some((n) => n.id === copyId));
  assert.equal(project(store).docs.at(-1)!.body, 'Contenido independiente');
});

test('C08-U02: conversaciones múltiples no mezclan participantes, mensajes ni borradores personales', async () => {
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
  store.dispatch(
    { type: 'profile.edit', profile: { ...store.get().profile, name: 'Eve' } },
    intent,
  );
  store.dispatch({ type: 'conversation.create', world: 'project', origin: 'canvas' }, intent);
  const sameName = project(store).conversations.at(-1)!;
  assert.deepEqual(sameName.participants, ['Eve', 'Eve']);
  store.dispatch(
    { type: 'participant', world: 'project', conversation: sameName.id, name: 'Ada' },
    intent,
  );
  const service = new AgentService(store);
  await service.converse('project', 'chat', 'Mensaje sin invocación', [], sameName.id);
  assert.equal(project(store).conversations.at(-1)!.messages.length, 1);
  await service.converse('project', 'chat', '@Eve revisá este contexto', [], sameName.id);
  assert.equal(
    project(store)
      .conversations.at(-1)!
      .messages.filter((m) => m.role === 'agent').length,
    1,
  );
  service.dispose();
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
