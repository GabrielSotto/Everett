import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { newCanvasText } from '../../src/domain/canvas-text';
import type { Material } from '../../src/domain/model';
import type { Command } from '../../src/domain/command-types';
import { prepareComponentLayout } from '../../src/domain/component-layout';
import { validate } from '../../src/domain/invariants';
import { instanceProperties } from '../../src/domain/component-instances';
import { componentElements } from '../../src/domain/component-tree';
import { wireframeAppearance, wireframeMaterial } from '../../src/domain/wireframes';
import { validSketchPiece, type SketchPiece } from '../../src/domain/sketch-pieces';

test('C08-U98: una variante local conserva su estado al actualizar y restablecer el símbolo en una copia', async () => {
  await prepareComponentLayout();
  const { store, worldId: world } = setup();
  const act = (c: Command) => store.dispatch(c, intent);
  const block = wireframeMaterial('block', 'base', { x: 0, y: 0 });
  const icon = wireframeMaterial('block', 'icon', { x: 10, y: 10 });
  assert(icon.data.kind === 'wireframe');
  icon.data.content.piece = { style: { color: '#445566' }, symbol: 'house' };
  assert(validSketchPiece(icon.data.content.piece));
  assert(!validSketchPiece({ style: {}, symbol: 'house', symbolVariant: 'unknown' }));
  assert(!validSketchPiece({ style: {}, symbolVariant: 'fill' }));
  for (const node of [block, icon]) act({ type: 'node.create', world, node });
  act({ type: 'group.create', world, nodes: [block.id, icon.id], name: 'Navegación' });
  const source = project(store).canvasGroups![0]!.id;
  act({ type: 'component.edit', world, id: source, edit: { kind: 'initialize' } });
  act({ type: 'composition.save', world, id: source, name: 'Navegación' });
  const saved = project(store).compositions![0]!.id;
  for (const x of [400, 800])
    act({ type: 'composition.insert', world, id: saved, linked: true, center: { x, y: 0 } });
  const [, active, inactive] = project(store).canvasGroups!;
  const activeId = active!.nodes[1]!,
    inactiveId = inactive!.nodes[1]!;
  const content = (id: string) => {
    const node = project(store).nodes.find((n) => n.id === id)!;
    assert(node.data.kind === 'wireframe');
    return structuredClone(node.data.content);
  };
  const change = (id: string, patch: Partial<SketchPiece>) => {
    const next = content(id);
    act({
      type: 'wireframe.edit',
      world,
      id,
      content: { ...next, piece: { ...next.piece!, ...patch } },
    });
  };
  change(activeId, { symbolVariant: 'fill' });
  assert.equal(content(icon.id).piece!.symbolVariant, undefined);
  assert.equal(content(inactiveId).piece!.symbolVariant, undefined);
  change(icon.id, { symbol: 'compass', style: { color: '#225588' } });
  act({ type: 'composition.save', world, id: source, name: 'Navegación', replace: saved });
  for (const instance of [active!, inactive!])
    act({ type: 'composition.update', world, id: instance.id });
  assert.deepEqual(content(activeId).piece, {
    symbol: 'compass',
    symbolVariant: 'fill',
    style: { color: '#225588' },
  });
  assert.deepEqual(content(inactiveId).piece, content(icon.id).piece);
  act({
    type: 'component.edit',
    world,
    id: active!.id,
    edit: { kind: 'reset-property', element: 'part-1', property: 'content.piece.symbolVariant' },
  });
  assert.equal(content(activeId).piece!.symbolVariant ?? 'regular', 'regular');
  assert.equal(content(activeId).piece!.symbol, 'compass');
});

test('C08-U91: actualizar una tarjeta mixta conserva sus datos locales y hereda el diseño por identidad de capa', async () => {
  await prepareComponentLayout();
  const { store, worldId: world } = setup();
  const act = (c: Command) => store.dispatch(c, intent);
  const bg: Material = {
    id: 'fondo',
    x: 0,
    y: 0,
    width: 230,
    height: 210,
    owner: null,
    data: { kind: 'wireframe', title: 'Base', content: { type: 'block', text: '' } },
  };
  const photo: Material = {
    ...bg,
    id: 'foto',
    x: 10,
    y: 15,
    width: 200,
    height: 100,
    data: { kind: 'image', title: 'Portada', asset: 'archivo-a', ratio: 2, mime: 'image/png' },
  };
  const title: Material = {
    ...bg,
    id: 'titulo',
    x: 12,
    y: 130,
    width: 170,
    height: 36,
    data: { ...newCanvasText('wrap'), title: 'Artista', text: 'Festival' },
  };
  for (const node of [bg, photo, title]) act({ type: 'node.create', world, node });
  const ids = [bg.id, photo.id, title.id];
  act({ type: 'group.create', world, nodes: ids, name: 'Tarjeta' });
  const source = project(store).canvasGroups![0]!.id;
  const edit = (id: string, edit: Extract<Command, { type: 'component.edit' }>['edit']) =>
    act({ type: 'component.edit', world, id, edit });
  edit(source, { kind: 'initialize' });
  act({ type: 'composition.save', world, id: source, name: 'Tarjeta' });
  const saved = project(store).compositions![0]!.id;
  for (const [i, linked] of [true, true, false].entries())
    act({
      type: 'composition.insert',
      world,
      id: saved,
      center: { x: 400 + i * 250, y: 300 },
      linked,
    });
  const [original, a, b, independent] = project(store).canvasGroups!;
  const data = (id: string) => project(store).nodes.find((n) => n.id === id)!;
  const paint = (id: string, patch: { fill?: string; radius?: number }) => {
    const part = data(id).data;
    assert(part.kind === 'wireframe');
    act({
      type: 'wireframe.edit',
      world,
      id,
      content: { ...part.content, appearance: { ...wireframeAppearance(part.content), ...patch } },
    });
  };
  paint(a!.nodes[0]!, { radius: 18 });
  paint(bg.id, { fill: '#223344' });
  const write = (id: string, text: string, color: string | null) => {
    const n = data(id);
    assert(n.data.kind === 'text');
    act({
      type: 'text.edit',
      world,
      id,
      session: id,
      data: { ...n.data, text, color },
      width: n.width,
      height: n.height,
    });
  };
  write(a!.nodes[2]!, 'After Hours', null);
  write(b!.nodes[2]!, 'Prisma DJ Set', null);
  act({
    type: 'image.replace',
    world,
    id: a!.nodes[1]!,
    asset: 'foto-personal',
    mime: 'image/png',
    ratio: 0.5,
  });
  act({ type: 'comment', world, node: a!.nodes[2]!, text: 'Confirmado' });
  write('titulo', 'Festival de verano', '#445566');
  edit(source, { kind: 'properties', element: 'part-2', name: 'Nombre del evento' });
  edit(source, { kind: 'position', element: 'part-2', axis: 'y', value: 161 });
  edit(source, { kind: 'stack', element: 'part-1', target: 'part-2', side: 'above' });
  act({ type: 'composition.save', world, id: source, name: 'Tarjeta', replace: saved });
  const before = structuredClone(project(store));
  const oldOthers = before.nodes.filter(
    (n) =>
      b!.nodes.includes(n.id) ||
      independent!.nodes.includes(n.id) ||
      original!.nodes.includes(n.id),
  );
  act({ type: 'composition.update', world, id: a!.id });
  assert.deepEqual(
    project(store).nodes.filter((n) => oldOthers.some((o) => o.id === n.id)),
    oldOthers,
  );
  const updated = data(a!.nodes[2]!);
  const background = data(a!.nodes[0]!).data;
  assert(background.kind === 'wireframe');
  assert.equal(background.content.appearance?.radius, 18);
  assert.equal(background.content.appearance?.fill, '#223344');
  assert(updated.data.kind === 'text');
  assert.equal(updated.data.text, 'After Hours');
  assert.equal(updated.data.color, '#445566');
  assert.equal(updated.y, before.canvasGroups![1]!.structure!.origin.y + 161);
  const custom = data(a!.nodes[1]!);
  assert(custom.data.kind === 'image');
  assert.equal(custom.data.asset, 'foto-personal');
  assert.equal(custom.width / custom.height, 0.5);
  assert.deepEqual(
    instanceProperties(
      project(store).compositions![0]!,
      project(store).canvasGroups![1]!.recipe!,
      'part-2',
      updated.data,
    ).map((x) => x.key),
    ['text'],
  );
  edit(a!.id, { kind: 'reset-property', element: 'part-2', property: 'text' });
  assert.equal((data(a!.nodes[2]!).data as { text: string }).text, 'Festival de verano');
  edit(a!.id, { kind: 'reset-property', element: 'part-1', property: 'image' });
  const restored = data(a!.nodes[1]!);
  assert(restored.data.kind === 'image');
  assert.equal(restored.data.asset, 'archivo-a');
  assert.equal(restored.width, 200);
  edit(source, { kind: 'detach', element: 'part-2' });
  act({ type: 'composition.save', world, id: source, name: 'Tarjeta', replace: saved });
  act({ type: 'composition.update', world, id: b!.id });
  assert.equal((data(b!.nodes[2]!).data as { text: string }).text, 'Prisma DJ Set');
  assert(
    !project(store)
      .canvasGroups!.find((g) => g.id === b!.id)!
      .nodes.includes(b!.nodes[2]!),
  );
  act({ type: 'composition.update', world, id: a!.id });
  assert(project(store).comments.some((c) => c.node === a!.nodes[2]!));
  assert(data(a!.nodes[2]!));
  act({ type: 'canvas.undo', world });
  assert(
    project(store)
      .canvasGroups!.find((g) => g.id === a!.id)!
      .nodes.includes(a!.nodes[2]!),
  );
  validate(store.snapshot());
  act({ type: 'group.create', world, nodes: ['note-a', 'note-b'], name: 'Notas' });
  const bad = project(store).canvasGroups!.at(-1)!;
  assert.throws(() => edit(bad.id, { kind: 'initialize' }), /Separá «Idea»/);
  assert.equal(project(store).canvasGroups!.at(-1)!.structure, undefined);
});

test('C08-U92: dos tarjetas viajan con Explorar y la vinculada conserva sus cambios entre publicaciones', async () => {
  await prepareComponentLayout();
  const { store, worldId: world } = setup();
  const act = (command: Command) => store.dispatch(command, intent);
  const context = () => project(store);
  const material = (id: string) => context().nodes.find((n) => n.id === id)!;
  const edit = (id: string, edit: Extract<Command, { type: 'component.edit' }>['edit']) =>
    act({ type: 'component.edit', world, id, edit });
  const background: Material = {
    id: 'explorar',
    owner: null,
    x: 0,
    y: 0,
    width: 860,
    height: 640,
    data: { kind: 'wireframe', title: 'Explorar', content: { type: 'screen', text: '' } },
  };
  const photo: Material = {
    ...background,
    id: 'portada',
    width: 120,
    height: 80,
    data: { kind: 'image', title: 'Foto', asset: 'foto-1', mime: 'image/png', ratio: 1.5 },
  };
  const title: Material = {
    ...background,
    id: 'artista',
    y: 90,
    width: 120,
    height: 30,
    data: { ...newCanvasText('wrap'), text: 'Festival', title: 'Artista' },
  };
  for (const node of [background, photo, title]) act({ type: 'node.create', world, node });
  act({ type: 'frame.create', world, background: background.id, members: [] });
  const frame = context().canvasGroups![0]!.id;
  act({ type: 'group.create', world, nodes: [photo.id, title.id], name: 'Evento' });
  const original = context().canvasGroups!.at(-1)!.id;
  act({ type: 'composition.save', world, id: original, name: 'Evento' });
  const saved = context().compositions![0]!.id;
  for (const [index, linked] of [true, false].entries()) {
    act({
      type: 'composition.insert',
      world,
      id: saved,
      center: { x: 190 + index * 270, y: 170 },
      linked,
    });
    const card = context().canvasGroups!.at(-1)!;
    edit(frame, { kind: 'nest', parent: 'root', group: card.id });
  }
  const tree = () => context().canvasGroups!.find((g) => g.id === frame)!.structure!.root;
  const card = tree().children.find((e) => e.instance)!;
  const layer = card.children.find((e) => e.name === 'Artista')!;
  const photoLayer = card.children.find((e) => e.name === 'Foto')!;
  const write = (id: string, text: string) => {
    const n = material(id);
    assert(n.data.kind === 'text');
    act({
      type: 'text.edit',
      world,
      id,
      data: { ...n.data, text },
      session: id,
      width: n.width,
      height: n.height,
    });
  };
  write(layer.material!, 'After Hours');
  act({
    type: 'image.replace',
    world,
    id: photoLayer.material!,
    asset: 'foto-noche',
    ratio: 0.6,
    mime: 'image/png',
  });
  const positions = tree()
    .children.flatMap((c) => c.children)
    .map((c) => ({ id: c.material!, x: material(c.material!).x }));
  edit(frame, { kind: 'position', element: 'root', axis: 'x', value: 175 });
  for (const p of positions) assert.equal(material(p.id).x, p.x + 175);
  const publish = (text: string) => {
    write(title.id, text);
    act({ type: 'composition.save', world, id: original, name: 'Evento', replace: saved });
  };
  const update = () => act({ type: 'composition.update', world, id: frame, element: card.id });
  publish('After Hours');
  update();
  publish('Prisma DJ Set');
  update();
  assert.equal((material(layer.material!).data as { text: string }).text, 'After Hours');
  assert.equal((material(photoLayer.material!).data as { asset: string }).asset, 'foto-noche');
  const nested = componentElements(tree()).find((e) => e.id === card.id)!;
  assert.equal(nested.instance?.revision, 3);
  const independent = tree().children.find((e) => e.children.length && !e.instance)!;
  const otherTitle = independent.children.find((e) => e.name === 'Artista')!;
  assert.equal((material(otherTitle.material!).data as { text: string }).text, 'Festival');
  edit(frame, { kind: 'reset-property', element: layer.id, property: 'text' });
  assert.equal((material(layer.material!).data as { text: string }).text, 'Prisma DJ Set');
  publish('Nueva fecha');
  update();
  assert.equal((material(layer.material!).data as { text: string }).text, 'Nueva fecha');
  assert.equal((material(photoLayer.material!).data as { asset: string }).asset, 'foto-noche');
  edit(frame, {
    kind: 'properties',
    element: card.id,
    layout: { direction: 'column', align: 'stretch', gap: 12, padding: 8 },
    width: 190,
  });
  const image = material(photoLayer.material!);
  assert(Math.abs(image.width / image.height - 0.6) < 0.001);
  validate(store.snapshot());
});
