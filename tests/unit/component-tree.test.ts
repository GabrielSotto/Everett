import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { prepareComponentLayout, layoutComponent } from '../../src/domain/component-layout';
import {
  elementAt,
  elementMaterials,
  validComponentTree,
  writeTreeGeometry,
} from '../../src/domain/component-tree';
import type { LibraryComposition } from '../../src/domain/sketch-library';
import { captureCanvasCopies } from '../../src/domain/canvas-copies';
import type { ComponentEdit } from '../../src/domain/commands/components';
import { Store } from '../../src/app/store';
import { Trace } from '../../src/app/diagnostics/trace';
import type { State } from '../../src/domain/model';

const recipe: LibraryComposition = {
  name: 'Formulario',
  width: 300,
  height: 180,
  parts: [0, 1, 2].map((i) => ({
    name: `Campo ${i}`,
    x: 0,
    y: i * 60,
    width: 120,
    height: 40,
    content: {
      type: 'text',
      text: `Contenido ${i}`,
      piece: { style: { fontSize: '14px', color: '#111111' } },
    },
  })),
};
async function component() {
  await prepareComponentLayout();
  const { store } = setup();
  store.dispatch(
    {
      type: 'wireframe.library',
      world: 'project',
      id: 'form',
      center: { x: 0, y: 0 },
      composition: recipe,
    },
    intent,
  );
  return store;
}
const edit = (store: Awaited<ReturnType<typeof component>>, value: ComponentEdit) =>
  store.dispatch(
    { type: 'component.edit', world: 'project', id: 'form-group', edit: value },
    intent,
  );

test('C08-U88: apilar un subárbol respeta la disposición, evita ciclos y conserva el orden en una composición guardada', async () => {
  const store = await component();
  const before = project(store).nodes.map((n) => n.id);
  edit(store, { kind: 'container', elements: ['part-0', 'part-1'], name: 'Campos' });
  const group = project(store).canvasGroups![0]!;
  const nested = group.structure!.root.children.find((c) => c.children.length)!;
  assert.throws(
    () => edit(store, { kind: 'stack', element: nested.id, target: 'part-1', side: 'above' }),
    /capas distintas/,
  );
  assert.deepEqual(
    project(store).nodes.map((n) => n.id),
    before,
  );
  edit(store, { kind: 'stack', element: nested.id, target: 'part-2', side: 'above' });
  const members = new Set(group.nodes);
  const ordered = project(store).nodes.filter((n) => members.has(n.id));
  assert.deepEqual(
    ordered.map((n) => n.id),
    [group.nodes[2], group.nodes[0], group.nodes[1]],
  );
  assert.deepEqual(project(store).canvasGroups![0]!.structure, group.structure);
  store.dispatch(
    { type: 'composition.save', world: 'project', id: group.id, name: 'Orden probado' },
    intent,
  );
  const saved = project(store).compositions!.at(-1)!;
  assert.deepEqual(
    saved.composition.parts.map((p) => p.name),
    ['Campo 2', 'Campo 0', 'Campo 1'],
  );
});

test('C08-U62: jerarquía editable conserva identidades, evita ciclos y deshace agrupación, orden y separación', async () => {
  const store = await component();
  const original = structuredClone(project(store).nodes);
  edit(store, { kind: 'container', elements: ['part-0', 'part-1'], name: 'Campos' });
  let group = project(store).canvasGroups![0]!;
  const child = group.structure!.root.children[0]!;
  assert.equal(child.children.length, 2);
  assert.deepEqual(project(store).nodes, original);
  assert.equal(validComponentTree(group.structure, group.nodes), true);
  assert.throws(
    () => edit(store, { kind: 'reparent', element: child.id, parent: child.id, index: 0 }),
    /sí misma/,
  );
  edit(store, { kind: 'duplicate', element: child.id });
  group = project(store).canvasGroups![0]!;
  assert.equal(group.nodes.length, 5);
  assert.equal(new Set(group.nodes).size, 5);
  const copy = group.structure!.root.children[1]!;
  assert.notDeepEqual(elementMaterials(copy), elementMaterials(child));
  edit(store, { kind: 'detach', element: copy.id });
  assert.equal(project(store).canvasGroups![0]!.nodes.length, 3);
  assert.equal(project(store).nodes.length, 7);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).canvasGroups![0]!.nodes.length, 5);
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  assert.equal(project(store).canvasGroups![0]!.nodes.length, 3);
});
test('C08-U63: Yoga resuelve fila, columna, padding y fill; resize conserva tipografía y escala es explícita', async () => {
  const store = await component();
  edit(store, {
    kind: 'properties',
    element: 'root',
    width: 400,
    height: 240,
    layout: { direction: 'row', padding: 16, gap: 12, align: 'center' },
  });
  let g = project(store).canvasGroups![0]!,
    r = g.structure!.root;
  assert.equal(r.children[0]!.x, 16);
  assert.equal(r.children[1]!.x, 148);
  assert.equal(r.children[0]!.y, 100);
  edit(store, { kind: 'properties', element: 'part-2', widthMode: 'fill' });
  r = project(store).canvasGroups![0]!.structure!.root;
  assert.equal(r.children[2]!.width, 104);
  assert.throws(
    () => edit(store, { kind: 'properties', element: 'root', widthMode: 'hug' }),
    /sí mismo/,
  );
  const originalFont = project(store).nodes.find((n) => n.id === 'form')!;
  edit(store, { kind: 'resize', rect: { x: 20, y: 30, width: 500, height: 300 }, scale: false });
  let n = project(store).nodes.find((n) => n.id === 'form')!;
  assert.deepEqual(n.data, originalFont.data);
  assert.equal(n.x, 36);
  edit(store, { kind: 'resize', rect: { x: 20, y: 30, width: 1000, height: 600 }, scale: true });
  n = project(store).nodes.find((n) => n.id === 'form')!;
  assert.equal(n.data.kind === 'wireframe' && n.data.content.piece!.style.fontSize, '28px');
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(project(store).nodes.find((n) => n.id === 'form')!.data, originalFont.data);
});
test('C08-U64: recetas y duplicados son independientes; solo la copia vinculada recibe actualización explícita', async () => {
  const store = await component();
  store.dispatch(
    { type: 'composition.save', world: 'project', id: 'form-group', name: 'Mi formulario' },
    intent,
  );
  const saved = project(store).compositions![0]!;
  for (const linked of [false, true])
    store.dispatch(
      {
        type: 'composition.insert',
        world: 'project',
        id: saved.id,
        center: { x: 600, y: 200 },
        linked,
      },
      intent,
    );
  const independent = structuredClone(project(store).canvasGroups![1]!),
    linked = project(store).canvasGroups![2]!;
  const before = structuredClone(
    project(store).nodes.filter((n) => independent.nodes.includes(n.id)),
  );
  edit(store, { kind: 'properties', element: 'root', width: 700 });
  store.dispatch(
    {
      type: 'composition.save',
      world: 'project',
      id: 'form-group',
      name: 'Mi formulario',
      replace: saved.id,
    },
    intent,
  );
  assert.equal(project(store).canvasGroups![2]!.recipe!.revision, 1);
  store.dispatch({ type: 'composition.update', world: 'project', id: linked.id }, intent);
  assert.equal(project(store).canvasGroups![2]!.recipe!.revision, 2);
  assert.equal(project(store).canvasGroups![2]!.structure!.root.width, 700);
  assert.deepEqual(
    project(store).nodes.filter((n) => independent.nodes.includes(n.id)),
    before,
  );
  const clipboard = captureCanvasCopies(project(store), project(store).canvasGroups![2]!.nodes);
  // Un portapapeles externo tampoco puede convertir el pegado en una instancia vinculada.
  clipboard.groups[0]!.recipe = { id: saved.id, revision: saved.revision };
  store.dispatch(
    { type: 'nodes.paste', world: 'project', clipboard, offset: { x: 50, y: 50 } },
    intent,
  );
  const copied = project(store).canvasGroups!.at(-1)!;
  assert.equal(copied.recipe, undefined);
  assert.ok(validComponentTree(copied.structure, copied.nodes));
  assert.ok(!copied.nodes.some((id) => linked.nodes.includes(id)));
});
test('C08-U65: recorridos validan destino, mantienen acción por pieza y se recuperan con deshacer', async () => {
  const store = await component();
  store.dispatch(
    {
      type: 'nodes.duplicate',
      world: 'project',
      nodes: [...project(store).canvasGroups![0]!.nodes],
      offset: { x: 500, y: 0 },
    },
    intent,
  );
  const target = project(store).canvasGroups![1]!.id;
  store.dispatch(
    {
      type: 'screen-flow.set',
      world: 'project',
      from: 'form-group',
      to: target,
      part: 'part-0',
      label: 'Entrar',
    },
    intent,
  );
  assert.equal(project(store).screenFlows![0]!.part, 'part-0');
  assert.throws(
    () =>
      store.dispatch(
        { type: 'screen-flow.set', world: 'project', from: 'form-group', to: 'missing', label: '' },
        intent,
      ),
    /destino/,
  );
  store.dispatch(
    { type: 'nodes.delete', world: 'project', nodes: [...project(store).canvasGroups![1]!.nodes] },
    intent,
  );
  assert.equal(project(store).screenFlows!.length, 0);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).screenFlows!.length, 1);
  const tree = structuredClone(
    project(store).canvasGroups![0]!.structure!,
  ) as import('../../src/domain/component-tree').ComponentTree;
  elementAt(tree.root, 'part-0')!.material = 'missing';
  assert.equal(validComponentTree(tree, project(store).canvasGroups![0]!.nodes), false);
});

test('C08-U66: incorporar, sustituir y arrastrar dentro de una fila conserva pertenencia, orden y separación', async () => {
  const store = await component();
  edit(store, { kind: 'detach', element: 'part-2' });
  edit(store, { kind: 'adopt', parent: 'root', materials: ['form-2'] });
  edit(store, { kind: 'replace', element: 'part-0', material: 'form-2' });
  const w = project(store);
  assert.deepEqual(
    w.nodes.find((n) => n.id === 'form')!.data,
    w.nodes.find((n) => n.id === 'form-2')!.data,
  );
  assert.equal(w.canvasGroups![0]!.nodes.length, 3);
  edit(store, {
    kind: 'properties',
    element: 'root',
    width: 600,
    layout: { direction: 'row', gap: 20, padding: 16, align: 'start' },
  });
  const node = project(store).nodes.find((n) => n.id === 'form')!;
  store.dispatch(
    {
      type: 'node.move',
      world: 'project',
      id: node.id,
      point: { x: node.x + 450, y: node.y + 50 },
    },
    intent,
  );
  const root = project(store).canvasGroups![0]!.structure!.root;
  assert.equal(root.children.at(-1)!.material, 'form');
  assert.ok(root.children.every((c) => c.y === 16));
  assert.equal(root.children[1]!.x - root.children[0]!.x - root.children[0]!.width, 20);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal(project(store).canvasGroups![0]!.structure!.root.children[0]!.material, 'form');
  assert.throws(() => edit(store, { kind: 'adopt', parent: 'root', materials: ['form'] }), /libre/);
});

test('C08-U67: actualizar una instancia conserva identidades y cables; rechaza fill circular al mover contenedores', async () => {
  const store = await component();
  store.dispatch(
    { type: 'composition.save', world: 'project', id: 'form-group', name: 'Base' },
    intent,
  );
  const saved = project(store).compositions![0]!;
  store.dispatch(
    {
      type: 'composition.insert',
      world: 'project',
      id: saved.id,
      center: { x: 600, y: 0 },
      linked: true,
    },
    intent,
  );
  const linked = project(store).canvasGroups![1]!,
    first = linked.nodes[0]!;
  store.dispatch(
    {
      type: 'link.create',
      world: 'project',
      from: first,
      to: 'form',
      fromAnchor: 'east',
      toAnchor: 'west',
    },
    intent,
  );
  edit(store, { kind: 'properties', element: 'part-0', width: 190 });
  store.dispatch(
    {
      type: 'composition.save',
      world: 'project',
      id: 'form-group',
      name: 'Base',
      replace: saved.id,
    },
    intent,
  );
  store.dispatch({ type: 'composition.update', world: 'project', id: linked.id }, intent);
  assert.equal(project(store).canvasGroups![1]!.nodes[0], first);
  assert.equal(project(store).nodes.find((n) => n.id === first)!.width, 190);
  assert.ok(project(store).links.some((l) => l.from === first && l.to === 'form'));
  edit(store, { kind: 'container', elements: ['part-0', 'part-1'], name: 'Contenido' });
  const container = project(store).canvasGroups![0]!.structure!.root.children[0]!;
  edit(store, { kind: 'properties', element: container.id, widthMode: 'hug' });
  edit(store, { kind: 'properties', element: 'part-2', widthMode: 'fill' });
  const before = structuredClone(project(store));
  assert.throws(
    () => edit(store, { kind: 'reparent', element: 'part-2', parent: container.id, index: 0 }),
    /sí mismo/,
  );
  assert.deepEqual(project(store), before);
});

test('C08-U68: anidar componentes conserva piezas y cables; deshacer recupera raíces y bloquea recorridos activos', async () => {
  const store = await component();
  store.dispatch(
    {
      type: 'nodes.duplicate',
      world: 'project',
      nodes: [...project(store).canvasGroups![0]!.nodes],
      offset: { x: 500, y: 0 },
    },
    intent,
  );
  const other = project(store).canvasGroups![1]!;
  store.dispatch(
    {
      type: 'link.create',
      world: 'project',
      from: 'form',
      to: other.nodes[0]!,
      fromAnchor: 'east',
      toAnchor: 'west',
    },
    intent,
  );
  const before = structuredClone(project(store));
  edit(store, { kind: 'nest', parent: 'root', group: other.id });
  const nested = project(store);
  assert.equal(nested.canvasGroups!.length, 1);
  assert.deepEqual(nested.nodes, before.nodes);
  assert.deepEqual(nested.links, before.links);
  assert.equal(nested.canvasGroups![0]!.nodes.length, 6);
  assert.ok(validComponentTree(nested.canvasGroups![0]!.structure, nested.canvasGroups![0]!.nodes));
  assert.throws(
    () => edit(store, { kind: 'nest', parent: 'root', group: 'form-group' }),
    /otro componente/,
  );
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(project(store).canvasGroups, before.canvasGroups);
  store.dispatch(
    {
      type: 'screen-flow.set',
      world: 'project',
      from: 'form-group',
      to: other.id,
      label: 'Continuar',
    },
    intent,
  );
  const linked = structuredClone(project(store));
  assert.throws(() => edit(store, { kind: 'nest', parent: 'root', group: other.id }), /recorridos/);
  assert.deepEqual(project(store), linked);
});

test('C08-U69: nombres internos y externos coinciden; mover una pieza con margen importado no duplica el desplazamiento', async () => {
  let store = await component();
  edit(store, { kind: 'properties', element: 'root', name: 'Pantalla de acceso' });
  assert.equal(project(store).canvasGroups![0]!.name, 'Pantalla de acceso');
  store.dispatch(
    { type: 'group.rename', world: 'project', id: 'form-group', name: 'Acceso móvil' },
    intent,
  );
  assert.equal(project(store).canvasGroups![0]!.structure!.root.name, 'Acceso móvil');
  edit(store, { kind: 'properties', element: 'part-0', name: 'Correo' });
  assert.equal(
    (project(store).nodes.find((n) => n.id === 'form')!.data as { title: string }).title,
    'Correo',
  );
  edit(store, { kind: 'container', elements: ['part-0', 'part-1'], name: 'Fila importada' });
  const state = structuredClone(store.get()) as State;
  const w = state.worlds.find((w) => w.id === 'project')!;
  const group = w.canvasGroups![0]!;
  const row = group.structure!.root.children[0]!;
  row.layout.direction = 'row';
  row.children[0]!.margin = [7, 0, 0, 11];
  layoutComponent(group.structure!.root);
  writeTreeGeometry(w, group);
  store = new Store(state, new Trace());
  const position = structuredClone(project(store).nodes.find((n) => n.id === 'form'));
  edit(store, { kind: 'reparent', element: 'part-0', parent: 'root', index: 0 });
  assert.deepEqual(
    project(store).nodes.find((n) => n.id === 'form'),
    position,
  );
});

test('C08-U70: agrupar partes no consecutivas de una fila redistribuye sus hermanos y deshacer restaura el orden', async () => {
  const store = await component();
  edit(store, {
    kind: 'properties',
    element: 'root',
    width: 800,
    layout: { direction: 'row', padding: 16, gap: 20, align: 'start' },
  });
  const before = structuredClone(project(store));
  edit(store, { kind: 'container', elements: ['part-0', 'part-2'], name: 'Extremos' });
  const root = project(store).canvasGroups![0]!.structure!.root;
  assert.equal(root.children.length, 2);
  assert.equal(root.children[1]!.x - root.children[0]!.x - root.children[0]!.width, 20);
  assert.equal(root.children[0]!.children.length, 2);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(project(store).nodes, before.nodes);
  assert.deepEqual(project(store).canvasGroups, before.canvasGroups);
});

test('C08-U71: distribuir conserva las cajas fraccionarias de texto en coordenadas del Mundo', async () => {
  const store = await component();
  edit(store, { kind: 'properties', element: 'part-0', width: 11.859375, height: 15.4 });
  edit(store, { kind: 'properties', element: 'part-1', width: 11.859375, height: 15.4 });
  edit(store, {
    kind: 'properties',
    element: 'root',
    layout: { direction: 'row', padding: 0.25, gap: 3.375, align: 'start' },
  });
  const first = project(store).nodes.find((n) => n.id === 'form')!;
  const second = project(store).nodes.find((n) => n.id === 'form-1')!;
  assert.equal(first.width, 11.859375);
  assert.equal(second.width, 11.859375);
  assert.ok(Math.abs(first.height - 15.4) < 0.0001);
  assert.ok(Math.abs(second.x - first.x - first.width - 3.375) < 0.0001);
});

test('C08-U79: girar un componente respeta su distribución local al redimensionar y no pierde la orientación de sus piezas', async () => {
  const store = await component();
  const group = () => project(store).canvasGroups![0]!;
  const tree = () => group().structure!;
  const local = structuredClone(tree().root);
  store.dispatch(
    { type: 'nodes.rotate', world: 'project', nodes: [...group().nodes], degrees: 90 },
    intent,
  );
  assert.deepEqual(tree().root, local);
  assert.equal(tree().rotation, 90);
  const w = project(store);
  const a = w.nodes.find((n) => n.id === group().nodes[0])!,
    b = w.nodes.find((n) => n.id === group().nodes[1])!;
  const centers = (n: typeof a) => ({ x: n.x + n.width / 2, y: n.y + n.height / 2 });
  assert.ok(centers(a).x > centers(b).x);
  assert.ok(Math.abs(centers(a).y - centers(b).y) < 0.001);
  store.dispatch(
    {
      type: 'group.resize',
      world: 'project',
      id: group().id,
      rect: { x: 40, y: 40, width: 350, height: 185 },
    },
    intent,
  );
  assert.equal(tree().rotation, 90);
  const [first, second] = group().nodes.map((id) => project(store).nodes.find((n) => n.id === id)!);
  assert.ok(centers(first!).x > centers(second!).x);
  assert.ok(Math.abs(centers(first!).y - centers(second!).y) < 0.001);
});
