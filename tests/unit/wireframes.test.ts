import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import {
  validWireframe,
  pasteWireframeCells,
  wireframeKinds,
  wireframeMaterial,
} from '../../src/domain/wireframes';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import { Store } from '../../src/app/store';
import { traceInput } from '../../src/app/diagnostics/trace-input';
import { validate } from '../../src/domain/invariants';
import type { WireframeContent } from '../../src/domain/wireframes';

test('C08-U42: bosquejos y tablas validan límites y pegan rangos sin truncar ni mutar su origen', () => {
  for (const kind of wireframeKinds) {
    const node = wireframeMaterial(kind, kind, { x: 0, y: 0 });
    assert.equal(node.data.kind, 'wireframe');
    if (node.data.kind === 'wireframe') assert.equal(validWireframe(node.data.content), true);
    assert.equal(node.x, -node.width / 2);
  }
  const cells = [
    ['Nombre', 'Estado'],
    ['A', 'Pendiente'],
  ];
  const before = structuredClone(cells);
  assert.deepEqual(pasteWireframeCells(cells, 1, 1, 'En curso\tGabi\r\nListo\tMilo\r\n'), [
    ['Nombre', 'Estado', ''],
    ['A', 'En curso', 'Gabi'],
    ['', 'Listo', 'Milo'],
  ]);
  assert.deepEqual(cells, before);
  assert.equal(pasteWireframeCells(cells, 100, 0, 'Fuera'), null);
  assert.equal(pasteWireframeCells(cells, 0, 20, 'Fuera'), null);
  assert.equal(pasteWireframeCells(cells, -1, 0, 'Fuera'), null);
  assert.equal(pasteWireframeCells(cells, 0, 0, '\n'.repeat(100_000)), null);
  assert.equal(pasteWireframeCells(cells, 0, 0, 'x'.repeat(200_000)), null);
  for (const invalid of [
    null,
    {},
    { type: 'unknown', text: '' },
    { type: 'table', cells: [] },
    { type: 'table', cells: [['a'], ['b', 'c']] },
    { type: 'table', cells: [[1]] },
    { type: 'table', cells: Array.from({ length: 101 }, () => ['a']) },
    { type: 'table', cells: [Array(21).fill('a')] },
    { type: 'text', text: 'a'.repeat(100001) },
    { type: 'table', cells: [['a'.repeat(60000), 'b'.repeat(60000)]] },
  ])
    assert.equal(validWireframe(invalid), false);
  assert.equal(validWireframe({ type: 'table', cells: [['']] }), true);
  assert.deepEqual(traceInput({ cells: [['Dato privado']] }), {
    cells: [[{ redacted: true, characters: 12 }]],
  });
});

test('C08-U43: bosquejos conservan independencia, grupos, vínculos, historial y persistencia', () => {
  const { store } = setup();
  const act = (command: Parameters<typeof store.dispatch>[0]) => store.dispatch(command, intent);
  const originalNodes = structuredClone(project(store).nodes);
  for (const kind of wireframeKinds)
    act({
      type: 'node.create',
      world: 'project',
      node: wireframeMaterial(kind, kind, { x: kind === 'screen' ? 0 : 300, y: 0 }),
    });
  assert.equal(project(store).nodes[0]!.id, 'screen');
  assert.deepEqual(
    project(store).nodes.filter((n) => originalNodes.some((o) => o.id === n.id)),
    originalNodes,
  );
  act({
    type: 'group.create',
    world: 'project',
    nodes: [...wireframeKinds],
    name: 'Vista de proyecto',
  });
  act({
    type: 'link.create',
    world: 'project',
    from: 'input',
    to: 'table',
    fromAnchor: 'east',
    toAnchor: 'west',
  });
  const captured = captureCanvasCopies(project(store), wireframeKinds);
  assert.deepEqual(parseCanvasClipboard(JSON.stringify(captured)), captured);
  act({
    type: 'nodes.duplicate',
    world: 'project',
    nodes: [...wireframeKinds],
    offset: { x: 30, y: 30 },
  });
  const copies = project(store).nodes.slice(-wireframeKinds.length);
  assert.equal(
    copies.every((n) => n.data.kind === 'wireframe'),
    true,
  );
  const table = copies.find((n) => n.data.kind === 'wireframe' && n.data.content.type === 'table')!;
  const content: WireframeContent = {
    type: 'table',
    cells: [
      ['Alternativa', 'Estado'],
      ['Copia', 'Revisión'],
    ],
  };
  act({ type: 'wireframe.edit', world: 'project', id: table.id, content });
  assert.deepEqual(
    project(store).nodes.find((n) => n.id === 'table')!.data,
    captured.nodes.find((n) => n.id === 'table')!.data,
  );
  act({ type: 'canvas.undo', world: 'project' });
  assert.deepEqual(
    project(store).nodes.find((n) => n.id === table.id)!.data,
    copies.find((n) => n.id === table.id)!.data,
  );
  act({ type: 'canvas.redo', world: 'project' });
  assert.deepEqual(
    (project(store).nodes.find((n) => n.id === table.id)!.data as { content: WireframeContent })
      .content,
    content,
  );
  assert.deepEqual(project(new Store(store.snapshot())).nodes, project(store).nodes);
  // Escritura en otra celda y cambios estructurales forman pasos independientes.
  const edit = (cells: readonly (readonly string[])[]) =>
    act({
      type: 'wireframe.edit',
      world: 'project',
      id: table.id,
      content: { type: 'table', cells },
    });
  const changedCells = content.cells.map((row) => [...row]);
  changedCells[0]![0] = 'Nombre editado';
  edit(changedCells);
  changedCells[0]![1] = 'Otro estado';
  edit(changedCells);
  act({ type: 'canvas.undo', world: 'project' });
  const oneCell = project(store).nodes.find((node) => node.id === table.id)!.data;
  assert.ok(oneCell.kind === 'wireframe' && oneCell.content.type === 'table');
  assert.equal(oneCell.content.cells[0]![0], 'Nombre editado');
  assert.equal(oneCell.content.cells[0]![1], 'Estado');
  const expanded = [...oneCell.content.cells, ['', '']];
  edit(expanded);
  act({ type: 'canvas.undo', world: 'project' });
  assert.deepEqual(project(store).nodes.find((node) => node.id === table.id)!.data, oneCell);
  const before = store.snapshot();
  for (const command of [
    {
      type: 'wireframe.edit',
      world: 'project',
      id: 'table',
      content: { type: 'text', text: 'Cambio de tipo' },
    },
    {
      type: 'wireframe.edit',
      world: 'project',
      id: 'table',
      content: { type: 'table', cells: [] },
    },
    {
      type: 'wireframe.edit',
      world: 'project',
      id: 'note-a',
      content: { type: 'text', text: 'No es un bosquejo' },
    },
  ] as const) {
    assert.throws(() => act(command));
    assert.deepEqual(store.snapshot(), before);
  }
  act({ type: 'assign', world: 'project', agent: 'eve', node: 'table' });
  const occupied = store.snapshot();
  assert.throws(() => act({ type: 'wireframe.edit', world: 'project', id: 'table', content }));
  assert.deepEqual(store.snapshot(), occupied);
  validate(store.snapshot());
});
