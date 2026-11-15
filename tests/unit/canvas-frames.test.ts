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
