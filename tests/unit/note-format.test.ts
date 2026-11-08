import assert from 'node:assert/strict';
import test from 'node:test';
import { colors, noteInk, noteStyle } from '../../src/features/canvas/note-colors';
import { setup, project, intent } from './fixtures';
import type { NodeData } from '../../src/domain/model';
import { googleFontUrl, validNoteFont, type NoteFont } from '../../src/domain/note-fonts';

function luminance(hex: string): number {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
test('C08-U53: tinta accesible en paleta y tonos heredados; formato durable, validado e independiente', () => {
  const samples = [...colors];
  for (let r = 0; r < 256; r += 17)
    for (let g = 0; g < 256; g += 17)
      for (let b = 0; b < 256; b += 17)
        samples.push('#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''));
  for (const color of samples) {
    const ink = luminance(noteInk(color)),
      paper = luminance(color);
    assert.ok((Math.max(ink, paper) + 0.05) / (Math.min(ink, paper) + 0.05) >= 4.5, color);
  }
  assert.equal(noteInk('#777'), noteInk('#777777'));
  assert.match(
    noteStyle({ kind: 'note', title: '', text: '', color: '#ddd' }),
    /background:#dddddd/,
  );
  const { store } = setup();
  const edit = {
    type: 'node.edit',
    world: 'project',
    id: 'note-a',
    title: 'Decisión',
    text: 'Mantener el contexto',
    color: '#334155',
  } as const;
  store.dispatch({ ...edit, font: 'serif', fontSize: 20 }, intent);
  store.dispatch({ ...edit, text: 'Texto actualizado' }, intent);
  assert.equal((project(store).nodes[0]!.data as { font: string }).font, 'serif');
  for (const fontSize of [0, 11, 33, Infinity, NaN]) {
    const before = store.snapshot();
    assert.throws(() => store.dispatch({ ...edit, fontSize }, intent), /12 a 32/);
    assert.deepEqual(store.snapshot(), before);
  }
  assert.deepEqual(project(store).nodes[1]!.data, {
    kind: 'note',
    title: 'Idea',
    text: 'Contenido original\nSegunda línea',
    color: '#ddd',
  });
});

test('C08-U56: fuentes remotas validan nombre, conservan notas anteriores y se guardan como referencia', () => {
  const { store } = setup();
  const edit = {
    type: 'node.edit',
    world: 'project',
    id: 'note-a',
    title: 'Idea',
    text: 'Texto privado',
    color: '#ddd',
  } as const;
  for (const font of [
    'google:',
    'google: Lora',
    'google:Lora;display:none',
    'google:A" onclick="x',
    'google:../x',
    'google:Lora&text=privado',
    'otro',
  ]) {
    assert.equal(validNoteFont(font), false);
    const before = store.snapshot();
    assert.throws(() => store.dispatch({ ...edit, font: font as NoteFont }, intent), /tipografía/);
    assert.deepEqual(store.snapshot(), before);
  }
  store.dispatch({ ...edit, font: 'google:Roboto Mono' }, intent);
  store.dispatch({ ...edit, text: 'Conservar fuente' }, intent);
  assert.equal((project(store).nodes[0]!.data as { font: string }).font, 'google:Roboto Mono');
  assert.match(
    noteStyle(project(store).nodes[0]!.data as Extract<NodeData, { kind: 'note' }>),
    /'Roboto Mono'/,
  );
  const persisted = JSON.stringify(store.snapshot());
  assert.ok(persisted.includes('google:Roboto Mono'));
  assert.ok(!persisted.includes('fonts.gstatic.com'));
  assert.equal(
    googleFontUrl('Roboto Mono'),
    'https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap',
  );
  assert.throws(() => googleFontUrl('Lora&text=privado'));
  assert.equal(validNoteFont('google:42dot Sans'), true);
  store.dispatch({ ...edit, font: 'serif' }, intent);
  assert.equal((project(store).nodes[0]!.data as { font: string }).font, 'serif');
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.equal((project(store).nodes[0]!.data as { font: string }).font, 'google:Roboto Mono');
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  assert.equal((project(store).nodes[0]!.data as { font: string }).font, 'serif');
  assert.equal((project(store).nodes[1]!.data as { font?: string }).font, undefined);
});
