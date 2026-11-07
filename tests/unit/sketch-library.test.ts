import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import {
  validLibraryComposition,
  instantiateLibrary,
  type LibraryComposition,
} from '../../src/domain/sketch-library';
import { validSketchPiece } from '../../src/domain/sketch-pieces';
import type { World } from '../../src/domain/model';
import {
  componentSelection,
  groupBounds,
  groupDropTarget,
  isComponent,
} from '../../src/domain/manual-groups';
import { captureCanvasCopies, insertCanvasCopies } from '../../src/domain/canvas-copies';

const recipe: LibraryComposition = {
  name: 'Botón',
  width: 120,
  height: 36,
  parts: [
    {
      name: 'Fondo',
      x: 0,
      y: 0,
      width: 120,
      height: 36,
      content: {
        type: 'block',
        text: '',
        piece: { style: { backgroundColor: '#eeeeee', borderRadius: '5px' } },
      },
    },
    {
      name: 'Texto',
      x: 20,
      y: 10,
      width: 80,
      height: 16,
      content: {
        type: 'text',
        text: 'Continuar',
        placeholder: true,
        piece: { style: { color: '#303842', fontSize: '13px' }, label: true },
      },
    },
  ],
};

test('C08-U51: componentes conservan unidad, escala, copia y separación explícita; conjuntos manuales siguen libres', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'wireframe.library',
    world: 'project',
    id: 'button',
    center: { x: 100, y: 100 },
    composition: recipe,
  });
  const w = structuredClone(project(store)) as World;
  const group = w.canvasGroups!.at(-1)!;
  assert.equal(isComponent(w, group), true);
  assert.deepEqual(componentSelection(w, ['button-1']), ['button', 'button-1']);
  const bounds = groupBounds(w, group);
  assert.deepEqual(bounds, { x: 40, y: 82, width: 120, height: 36 });
  group.component = false;
  assert.deepEqual(
    componentSelection(w, ['button-1']),
    ['button-1'],
    'contraejemplo del comportamiento anterior',
  );
  delete group.component;
  assert.equal(isComponent(w, group), true, 'reconocer composiciones ya guardadas');
  assert.equal(
    isComponent(w, { ...group, nodes: group.nodes.slice(1) }),
    true,
    'una parte retirada previamente no elimina la identidad del componente',
  );
  const clipboard = captureCanvasCopies(w, group.nodes);
  let i = 0;
  insertCanvasCopies(w, clipboard, () => `copy-${i++}`, { x: 200, y: 0 });
  assert.equal(w.canvasGroups!.at(-1)!.component, true);
  assert.equal(
    groupDropTarget(w, [{ id: w.canvasGroups!.at(-1)!.nodes[0]!, point: { x: 50, y: 90 } }]),
    null,
  );
  act({
    type: 'group.resize',
    world: 'project',
    id: group.id,
    rect: { ...bounds, width: 240, height: 72 },
  });
  let text = project(store).nodes.find((n) => n.id === 'button-1')!;
  assert.equal(text.width, 160);
  assert.equal(text.x, 80);
  assert.ok(text.data.kind === 'wireframe');
  assert.equal(text.data.content.piece!.style.fontSize, '26px');
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(project(store).nodes.find((n) => n.id === 'button-1')!.width, 80);
  const before = store.snapshot();
  assert.throws(() =>
    act({
      type: 'group.resize',
      world: 'project',
      id: group.id,
      rect: { ...bounds, width: 0, height: 0 },
    }),
  );
  assert.deepEqual(store.snapshot(), before);
  act({ type: 'group.ungroup', world: 'project', id: group.id });
  assert.deepEqual(componentSelection(project(store), ['button-1']), ['button-1']);
});

test('C08-U50: biblioteca materializa piezas independientes, valida el límite y conserva historial atómico', () => {
  const { store } = setup();
  const before = project(store).nodes.length;
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  act({
    type: 'wireframe.library',
    world: 'project',
    id: 'library-a',
    center: { x: 100, y: 100 },
    composition: recipe,
  });
  const first = project(store).nodes.find((n) => n.id === 'library-a')!;
  assert.equal(first.x, 40);
  assert.equal(project(store).canvasGroups?.at(-1)?.nodes.length, 2);
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(project(store).nodes.length, before);
  act({ type: 'canvas.redo', world: 'project' });
  assert.equal(project(store).nodes.length, before + 2);
  act({
    type: 'wireframe.library',
    world: 'project',
    id: 'library-b',
    center: { x: 300, y: 100 },
    composition: recipe,
  });
  const text = project(store).nodes.find((n) => n.id === 'library-b-1')!;
  assert.ok(text.data.kind === 'wireframe');
  act({
    type: 'wireframe.edit',
    world: 'project',
    id: text.id,
    content: { ...text.data.content, type: 'text', text: 'Aceptar' },
  });
  const original = project(store).nodes.find((n) => n.id === 'library-a-1')!;
  assert.ok(original.data.kind === 'wireframe' && original.data.content.type === 'text');
  assert.equal(original.data.content.text, 'Continuar');
  assert.equal(
    recipe.parts[1]!.content.type === 'text' && recipe.parts[1]!.content.text,
    'Continuar',
  );
  const frozen = store.snapshot();
  assert.throws(() =>
    act({
      type: 'wireframe.library',
      world: 'project',
      id: 'bad',
      center: { x: 0, y: 0 },
      composition: { ...recipe, parts: [{ ...recipe.parts[0]!, width: NaN }] },
    }),
  );
  assert.deepEqual(store.snapshot(), frozen);
  assert.ok(validLibraryComposition(recipe));
  assert.ok(!validLibraryComposition({ ...recipe, parts: [] }));
  const copy = instantiateLibrary(recipe, 'isolated', { x: 0, y: 0 });
  assert.ok(copy.nodes[0]!.data.kind === 'wireframe');
  copy.nodes[0]!.data.content.piece!.style.backgroundColor = '#ff0000';
  assert.equal(recipe.parts[0]!.content.piece!.style.backgroundColor, '#eeeeee');
  for (const bad of [
    null,
    { style: { backgroundImage: 'url(https://example.com)' } },
    { style: { color: 'red;position:fixed' } },
    { style: {}, paths: [null] },
    { style: {}, symbol: '../file' },
    { style: {}, clip: [-1, 0, 0, 0] },
    { style: {}, viewBox: 0 },
    { style: {}, placeholderColor: 'red;background:url(https://example.com)' },
    { style: { backgroundImage: 'url(https://example.com/private)' } },
  ])
    assert.equal(validSketchPiece(bad), false);
});
