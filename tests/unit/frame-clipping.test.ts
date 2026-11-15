import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent, note } from './fixtures';
import {
  corners,
  containsPoint,
  intersectPolygons,
  frameMasks,
  visiblePolygon,
} from '../../src/domain/frame-clipping';
import { materialsInRect } from '../../src/domain/material-selection';
import { prepareComponentLayout } from '../../src/domain/component-layout';
import { componentElements } from '../../src/domain/component-tree';
import type { Material } from '../../src/domain/model';

test('C08-U87: las ventanas giradas anidadas intersectan sus límites y conservan el contenido al deshacer', async () => {
  await prepareComponentLayout();
  const { store, worldId: world } = setup();
  const make = (id: string, x: number, rotation: number): Material => ({
    ...note(id),
    x,
    y: 0,
    width: 100,
    height: 100,
    rotation,
    data: { kind: 'shape', shape: 'rectangle', title: id, color: '#dadada' },
  });
  const outer = make('Escena', 0, 45),
    inner = make('Ventana', 45, 315),
    image = make('Lienzo', -40, 0);
  image.width = 240;
  image.height = 160;
  image.y = -36;
  for (const node of [outer, inner, image])
    store.dispatch({ type: 'node.create', world, node }, intent);
  for (const [id, members] of [
    [outer.id, []],
    [inner.id, [image.id]],
  ] as const)
    store.dispatch({ type: 'frame.create', world, background: id, members: [...members] }, intent);
  const [a, b] = project(store).canvasGroups!;
  for (const g of [a!, b!])
    store.dispatch(
      {
        type: 'component.edit',
        world,
        id: g.id,
        edit: { kind: 'clip', element: 'root', enabled: true },
      },
      intent,
    );
  store.dispatch(
    {
      type: 'component.edit',
      world,
      id: a!.id,
      edit: { kind: 'nest', parent: 'root', group: b!.id },
    },
    intent,
  );
  let w = project(store);
  const bounds = w.nodes.find((n) => n.id === image.id)!;
  const mask = frameMasks(w).get(image.id)!;
  for (let x = -10; x < 155; x += 7)
    for (let y = -10; y < 130; y += 7) {
      assert.equal(
        containsPoint(mask, { x, y }),
        containsPoint(corners(outer), { x, y }) && containsPoint(corners(inner), { x, y }),
      );
    }
  const region = { x: 125, y: 25, width: 4, height: 4 };
  assert.ok(!materialsInRect(w.nodes, region, frameMasks(w)).includes(image.id));
  assert.ok(!frameMasks(w).has('note-a'));
  const nested = componentElements(w.canvasGroups![0]!.structure!.root).find(
    (e) => e.frame && e.id !== 'root',
  )!;
  store.dispatch(
    {
      type: 'component.edit',
      world,
      id: a!.id,
      edit: { kind: 'clip', element: nested.id, enabled: false },
    },
    intent,
  );
  assert.ok(visiblePolygon(bounds, frameMasks(project(store)).get(image.id)).length >= 3);
  store.dispatch({ type: 'canvas.undo', world }, intent);
  w = project(store);
  assert.deepEqual(frameMasks(w).get(image.id), mask);
  assert.deepEqual(
    w.nodes.find((n) => n.id === image.id),
    bounds,
  );
  assert.deepEqual(
    intersectPolygons(
      corners({ x: 0, y: 0, width: 4, height: 4 }),
      corners({ x: 4, y: 0, width: 8, height: 8 }),
    ),
    [],
  );
});
