import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, project, intent, note } from './fixtures';
import { rebaseAnchor, referenceExcerpt } from '../../src/domain/reference-anchors';
import type { ReferenceAnchor } from '../../src/domain/model';
import { alpha, rgba } from '../../src/features/canvas/color';
import { labelPosition, overlaps } from '../../src/domain/cable-labels';
import { semanticParent } from '../../src/domain/navigation';
import { materialRoute } from '../../src/domain/model';
import { searchWorkspace } from '../../src/domain/workspace-search';
import { zoneMarkup } from '../../src/features/canvas/materials';

test('C08-U14: conjuntos duraderos preservan miembros, exclusividad, movimiento, historial y devolución', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'group.create',
    world: 'project',
    nodes: ['note-a', 'note-b'],
    name: 'Arquitectura',
  });
  const group = structuredClone(project(store).canvasGroups![0]!);
  assert.throws(() =>
    act({ type: 'group.create', world: 'project', nodes: ['note-a', 'note-b'], name: 'Otra' }),
  );
  act({
    type: 'nodes.move',
    world: 'project',
    nodes: group.nodes.map((id) => ({ id, point: { x: 100, y: 200 } })),
  });
  act({ type: 'group.rename', world: 'project', id: group.id, name: 'Decisiones' });
  act({ type: 'group.ungroup', world: 'project', id: group.id });
  assert.equal(project(store).nodes.length, 2);
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(project(store).canvasGroups![0]!.name, 'Decisiones');
  act({ type: 'node.delete', world: 'project', id: 'note-a' });
  assert.deepEqual(project(store).canvasGroups![0]!.nodes, ['note-b']);
  act({ type: 'canvas.undo', world: 'project' });
  assert.deepEqual(project(store).canvasGroups![0]!.nodes, group.nodes);
  act({ type: 'assign', world: 'project', node: 'note-a', agent: 'eve' });
  assert.deepEqual(project(store).canvasGroups![0]!.nodes, group.nodes);
  act({
    type: 'assignment.finish',
    world: 'project',
    id: project(store).assignments[0]!.id,
    decision: 'cancel',
  });
  assert.deepEqual(project(store).canvasGroups![0]!.nodes, group.nodes);
});

test('C08-U15: fragmentos siguen su origen, se invalidan al borrarse y duplican con independencia', () => {
  assert.deepEqual(
    semanticParent({
      kind: 'surface',
      world: 'project',
      surface: 'docs',
      entity: 'document',
      fragment: 'fragment',
    }),
    { kind: 'surface', world: 'project', surface: 'docs', entity: null },
  );
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'node.create',
    world: 'project',
    node: {
      ...note('doc-ref'),
      data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
    },
  });
  act({
    type: 'reference.fragment',
    world: 'project',
    id: 'doc-ref',
    range: { start: 7, end: 14 },
  });
  const ref = () => {
    const n = project(store).nodes.find((n) => n.id === 'doc-ref')!;
    if (n.data.kind !== 'reference') throw Error('Referencia');
    return n.data.ref;
  };
  assert.equal(referenceExcerpt(project(store), ref()), 'Párrafo');
  act({
    type: 'document.edit',
    world: 'project',
    id: 'document',
    title: 'Documento',
    body: 'Prefacio\nTexto\n\nPárrafo',
  });
  assert.equal(referenceExcerpt(project(store), ref()), 'Párrafo');
  act({ type: 'node.duplicate', world: 'project', id: 'doc-ref' });
  const copy = project(store).nodes.at(-1)!;
  assert.equal(copy.data.kind, 'reference');
  if (copy.data.kind !== 'reference') return;
  assert.notEqual(copy.data.ref.id, ref().id);
  assert.notEqual(copy.data.ref.fragment, ref().fragment);
  assert.equal(referenceExcerpt(project(store), copy.data.ref), 'Párrafo');
  act({
    type: 'document.edit',
    world: 'project',
    id: 'document',
    title: 'Documento',
    body: 'Prefacio\nTexto\n\n',
  });
  assert.equal(referenceExcerpt(project(store), ref()), null);
  assert.throws(() => act({ type: 'assign', world: 'project', node: 'doc-ref', agent: 'eve' }));
  assert.equal(project(store).nodes.find((n) => n.id === 'doc-ref')!.owner, null);
  assert.equal(referenceExcerpt(project(store), copy.data.ref), 'Párrafo');
  act({
    type: 'document.edit',
    world: 'project',
    id: 'document',
    title: 'Documento',
    body: 'Prefacio\nTexto\n\nPárrafo',
  });
  assert.equal(referenceExcerpt(project(store), ref()), 'Párrafo');
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(project(store).docs[0]!.body, 'Prefacio\nTexto\n\nPárrafo');
  assert.equal(referenceExcerpt(project(store), ref()), 'Párrafo');
  assert.throws(() =>
    act({
      type: 'reference.fragment',
      world: 'project',
      id: 'doc-ref',
      range: { start: -1, end: 100 },
    }),
  );
});

test('fragmentos: ediciones internas, límites y recuperación ambigua', () => {
  const create = (): ReferenceAnchor => ({
    id: 'a',
    kind: 'file',
    source: 'f',
    start: 3,
    end: 6,
    quote: 'def',
    status: 'attached',
  });
  const inside = create();
  rebaseAnchor(inside, 'abcdefghi', 'abcdXefghi');
  assert.equal(inside.quote, 'dXef');
  assert.equal(inside.end, 7);
  const removed = create();
  rebaseAnchor(removed, 'abcdefghi', 'abcghi');
  assert.equal(removed.status, 'missing');
  rebaseAnchor(removed, 'abcghi', 'def abc def');
  assert.equal(removed.status, 'missing');
});

test('fragmentos: Rehacer conserva ediciones externas y aceptar no reemplaza contenido vecino ni cambios posteriores', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'node.create',
    world: 'project',
    node: {
      ...note('ref'),
      data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
    },
  });
  act({ type: 'reference.fragment', world: 'project', id: 'ref', range: { start: 7, end: 14 } });
  act({ type: 'canvas.undo', world: 'project' });
  act({
    type: 'document.edit',
    world: 'project',
    id: 'document',
    title: 'Documento',
    body: 'Nuevo\nTexto\n\nPárrafo',
  });
  act({ type: 'canvas.redo', world: 'project' });
  const material = project(store).nodes.find((n) => n.id === 'ref')!;
  if (material.data.kind !== 'reference') throw Error('Referencia');
  assert.equal(referenceExcerpt(project(store), material.data.ref), 'Párrafo');
  act({ type: 'assign', world: 'project', node: 'ref', agent: 'eve' });
  const id = project(store).assignments[0]!.id;
  act({
    type: 'assignment.ready',
    world: 'project',
    id,
    revision: 1,
    text: 'Revisión del párrafo',
  });
  assert.equal(
    project(store).assignments[0]!.output![0]!.document!.body,
    'Nuevo\nTexto\n\nRevisión del párrafo',
  );
  act({
    type: 'document.edit',
    world: 'project',
    id: 'document',
    title: 'Documento',
    body: 'Nuevo\nTexto\n\nPárrafo\nAcuerdo posterior',
  });
  assert.throws(() => act({ type: 'assignment.finish', world: 'project', id, decision: 'accept' }));
  assert.equal(project(store).nodes.find((n) => n.id === 'ref')!.owner, 'eve');
  assert.equal(project(store).docs[0]!.body, 'Nuevo\nTexto\n\nPárrafo\nAcuerdo posterior');
  act({ type: 'assignment.revise', world: 'project', id, text: 'Conservar el acuerdo posterior' });
  act({ type: 'assignment.ready', world: 'project', id, revision: 2, text: 'Revisión final' });
  act({ type: 'assignment.finish', world: 'project', id, decision: 'accept' });
  assert.equal(project(store).docs[0]!.body, 'Nuevo\nTexto\n\nRevisión final\nAcuerdo posterior');
  assert.equal(referenceExcerpt(project(store), material.data.ref), 'Revisión final');
  act({ type: 'assign', world: 'project', node: 'ref', agent: 'eve' });
  const missingJob = project(store).assignments[0]!.id;
  act({
    type: 'document.edit',
    world: 'project',
    id: 'document',
    title: 'Documento',
    body: 'Origen reescrito',
  });
  act({
    type: 'assignment.ready',
    world: 'project',
    id: missingJob,
    revision: 1,
    text: 'Resultado pendiente',
  });
  assert.throws(() =>
    act({ type: 'assignment.finish', world: 'project', id: missingJob, decision: 'accept' }),
  );
  assert.equal(project(store).docs[0]!.body, 'Origen reescrito');
  assert.equal(project(store).assignments[0]!.id, missingJob);
});

test('C08-U16: transparencia conserva RGB, cero y estilos opacos; etiquetas evitan tarjetas', () => {
  assert.equal(rgba('#ff0000', 50), '#ff000080');
  assert.equal(alpha('#ff000080'), 50);
  assert.equal(rgba('#ff000080', 0), '#ff000000');
  assert.equal(rgba('#ff000000', 100), '#ff0000');
  const obstacle = { x: 10, y: 10, width: 100, height: 80 },
    size = { width: 90, height: 20 };
  const p = labelPosition({ x: 60, y: 40 }, size, [obstacle]);
  assert.equal(overlaps({ x: p.x - 45, y: p.y - 10, ...size }, obstacle), false);
});

test('C08-U17: quitar y deshacer una referencia conserva el destino preciso ya compartido', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'node.create',
    world: 'project',
    node: {
      ...note('shared-ref'),
      data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
    },
  });
  act({
    type: 'reference.fragment',
    world: 'project',
    id: 'shared-ref',
    range: { start: 7, end: 14 },
  });
  const route = materialRoute(store.get(), 'project', 'shared-ref')!;
  act({ type: 'node.delete', world: 'project', id: 'shared-ref' });
  act({ type: 'canvas.undo', world: 'project' });
  act({ type: 'canvas.undo', world: 'project' });
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(
    project(store).nodes.some((n) => n.id === 'shared-ref'),
    false,
  );
  assert.deepEqual(materialRoute(store.get(), 'project', 'shared-ref'), route);
  act({ type: 'navigate', route, camera: store.get().camera });
  assert.equal(project(store).referenceAnchors![0]!.quote, 'Párrafo');
});

test('C08-U18: la zona usa el fragmento y la búsqueda conserva el documento completo', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'node.create',
    world: 'project',
    node: {
      ...note('context-ref'),
      data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
    },
  });
  act({
    type: 'reference.fragment',
    world: 'project',
    id: 'context-ref',
    range: { start: 7, end: 14 },
  });
  assert.ok(
    searchWorkspace(store.get(), 'Texto').some((r) => r.kind === 'document' && r.id === 'document'),
  );
  assert.equal(
    searchWorkspace(store.get(), 'Texto').some(
      (r) => r.kind === 'material' && r.id === 'context-ref',
    ),
    false,
  );
  act({ type: 'assign', world: 'project', node: 'context-ref', agent: 'eve' });
  const world = project(store),
    preview = zoneMarkup(world, world.zones[0]!, true);
  assert.ok(preview.includes('Párrafo'));
  assert.equal(preview.includes('Texto'), false);
});
