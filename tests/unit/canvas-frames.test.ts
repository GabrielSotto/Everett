import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent, note } from './fixtures';
import type { Material } from '../../src/domain/model';
import { componentPoses } from '../../src/domain/component-geometry';
import { prepareComponentLayout } from '../../src/domain/component-layout';
import { groupDropTarget } from '../../src/domain/manual-groups';
import { componentElements } from '../../src/domain/component-tree';

const background = (id: string, x: number, rotation: number): Material => ({
  ...note(id),
  x,
  width: 280,
  height: 200,
  rotation,
  data: { kind: 'wireframe', title: id, content: { type: 'screen', text: '' } },
});
test('C08-U86: dos marcos girados conservan pose, selección explícita y rutas al transferir una parte', async () => {
  await prepareComponentLayout();
  const { store, worldId: world } = setup();
  const guides = { columns: { count: 4, margin: 8, gap: 4 } };
  for (const node of [
    background('Explorar', 0, 35),
    background('Agenda', 500, 320),
    background('Detalle', 900, 0),
  ])
    store.dispatch({ type: 'node.create', world, node }, intent);
  store.dispatch(
    { type: 'frame.create', world, background: 'Explorar', members: ['note-a'] },
    intent,
  );
  store.dispatch({ type: 'frame.create', world, background: 'Agenda', members: [] }, intent);
  store.dispatch({ type: 'frame.create', world, background: 'Detalle', members: [] }, intent);
  const [a, b, c] = project(store).canvasGroups!;
  store.dispatch(
    { type: 'layout-guides.set', world, target: { kind: 'group', id: b!.id }, guides },
    intent,
  );
  const node = project(store).nodes.find((n) => n.id === 'note-a')!;
  const unrelated = project(store).nodes.find((n) => n.id === 'note-b')!;
  const part = a!.structure!.root.children.find((e) => e.material === node.id)!;
  store.dispatch(
    {
      type: 'screen-flow.set',
      world,
      from: a!.id,
      part: part.id,
      to: c!.id,
      label: 'Abrir detalle',
    },
    intent,
  );
  const route = project(store).screenFlows![0]!;
  const initial = componentPoses(a!.structure!).get(part.id)!;
  assert.ok(Math.hypot(initial.x - node.x, initial.y - node.y) < 0.001);
  assert.throws(
    () =>
      store.dispatch({ type: 'frame.create', world, background: 'Explorar', members: [] }, intent),
    /contenedor/,
  );
  store.dispatch(
    {
      type: 'component.edit',
      world,
      id: a!.id,
      edit: { kind: 'transfer', element: part.id, frame: b!.id },
    },
    intent,
  );
  const transferred = project(store).nodes.find((n) => n.id === node.id)!;
  assert.ok(Math.hypot(transferred.x - node.x, transferred.y - node.y) < 0.001);
  assert.deepEqual(
    project(store).canvasGroups!.map((g) => g.nodes),
    [['Explorar'], ['Agenda', 'note-a'], ['Detalle']],
  );
  assert.deepEqual(project(store).screenFlows![0], { ...route, from: b!.id });
  assert.deepEqual(
    project(store).nodes.find((n) => n.id === 'note-b'),
    unrelated,
  );
  assert.deepEqual(project(store).links[0]!.from, 'note-a');
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.deepEqual(project(store).canvasGroups![0], a);
  assert.deepEqual(project(store).screenFlows![0], route);
  assert.equal(groupDropTarget(project(store), [{ id: 'note-b', point: { x: 15, y: 24 } }]), null);
  store.dispatch(
    {
      type: 'component.edit',
      world,
      id: a!.id,
      edit: { kind: 'nest', parent: 'root', group: b!.id },
    },
    intent,
  );
  const group = project(store).canvasGroups![0]!;
  const nested = group.structure!.root.children.find((e) => e.frame)!;
  const pose = componentPoses(group.structure!).get(nested.id)!;
  assert.ok(Math.abs(pose.x - 500) < 0.001 && Math.abs(pose.rotation! - 320) < 0.001);
  const leaf = componentElements(nested).find((e) => e.material === 'Agenda')!;
  assert.ok(Math.abs(componentPoses(group.structure!).get(leaf.id)!.x - 500) < 0.001);
  assert.deepEqual(project(store).nodes.find((n) => n.id === 'Agenda')!.layoutGuides, guides);
  store.dispatch({ type: 'canvas.undo', world }, intent);
  store.dispatch({ type: 'group.ungroup', world, id: b!.id }, intent);
  assert.deepEqual(project(store).nodes.find((n) => n.id === 'Agenda')!.layoutGuides, guides);
});
test('C08-U89: enmarcar conserva grupos enteros, coordenadas y enlaces y respeta el borde girado', () => {
  const { store, worldId: world } = setup();
  const screen = background('marco', 1000, 30);
  const pixel = (id: string, x: number, y: number, width = 8): Material => ({
    ...note(id),
    x,
    y,
    width,
    height: 8,
  });
  for (const node of [
    screen,
    pixel('foto', 1140, 115),
    pixel('icono', 1110, 150),
    pixel('texto', 1120, 150),
    pixel('esquina', 1001, 21),
    pixel('dentro', 1112, 110),
    pixel('fuera', 1500, 30),
  ])
    store.dispatch({ type: 'node.create', world, node }, intent);
  for (const [name, nodes] of [
    ['Navegación', ['icono', 'texto']],
    ['Cruza', ['dentro', 'fuera']],
  ] as const)
    store.dispatch({ type: 'group.create', world, name, nodes: [...nodes] }, intent);
  const before = project(store);
  store.dispatch(
    { type: 'frame.create', world, background: 'marco', members: [], includeInterior: true },
    intent,
  );
  const after = project(store);
  const frame = after.canvasGroups!.find((g) => g.structure?.root.frame)!;
  assert.deepEqual(new Set(frame.nodes), new Set(['marco', 'foto', 'icono', 'texto']));
  assert.deepEqual(
    frame
      .structure!.root.children.find((p) => p.name === 'Navegación')!
      .children.map((p) => p.material),
    ['icono', 'texto'],
  );
  assert.deepEqual(
    after.canvasGroups!.find((g) => g.name === 'Cruza'),
    before.canvasGroups!.find((g) => g.name === 'Cruza'),
  );
  for (const n of before.nodes)
    assert.deepEqual(
      after.nodes.find((o) => o.id === n.id),
      n,
    );
  assert.deepEqual(after.links, before.links);
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.deepEqual(project(store).canvasGroups, before.canvasGroups);
});

test('C08-U90: alinear dentro de un marco girado usa límites locales y conserva las otras capas', async () => {
  await prepareComponentLayout();
  const { store, worldId: world } = setup();
  store.dispatch({ type: 'node.create', world, node: background('Mesa', 250, 40) }, intent);
  store.dispatch(
    { type: 'frame.create', world, background: 'Mesa', members: ['note-a', 'note-b'] },
    intent,
  );
  const group = project(store).canvasGroups![0]!;
  const root = group.structure!.root;
  const part = root.children.find((c) => c.material === 'note-a')!;
  const before = project(store).nodes;
  const align = (ids: string[]) =>
    store.dispatch(
      {
        type: 'component.edit',
        world,
        id: group.id,
        edit: { kind: 'arrange', elements: ids, action: 'center-x' },
      },
      intent,
    );
  align([part.id]);
  const after = project(store).canvasGroups![0]!.structure!.root.children.find(
    (c) => c.id === part.id,
  )!;
  assert.ok(Math.abs(after.x + after.width / 2 - root.width / 2) < 0.001);
  assert.equal(after.y, part.y);
  assert.deepEqual(
    project(store).nodes.find((n) => n.id === 'note-b'),
    before.find((n) => n.id === 'note-b'),
  );
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.deepEqual(project(store).nodes, before);
  for (const ids of [
    [part.id, part.id],
    [root.children.find((c) => c.background)!.id],
    ['missing'],
  ])
    assert.throws(() => align(ids), /mismo contenedor/);
  assert.deepEqual(project(store).nodes, before);
});
