import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import {
  validLibraryComposition,
  instantiateLibrary,
  type LibraryComposition,
} from '../../src/domain/sketch-library';
import { validSketchPiece } from '../../src/domain/sketch-pieces';

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
