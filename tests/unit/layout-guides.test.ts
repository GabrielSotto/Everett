import assert from 'node:assert/strict';
import test from 'node:test';
import {
  layoutBands,
  layoutFrame,
  layoutFrames,
  layoutGuideError,
  validLayoutGuides,
  selectedLayoutTarget,
  type LayoutGuides,
} from '../../src/domain/layout-guides';
import { alignRect } from '../../src/domain/alignment';
import { alignmentTargets } from '../../src/domain/alignment-targets';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import { wireframeMaterial } from '../../src/domain/wireframes';
import { setup, project, intent, note } from './fixtures';
import type { CanvasGroup, Material } from '../../src/domain/model';

const rect = { x: -40, y: 80, width: 960, height: 640 };
test('C08-U57: retículas derivan pistas y huecos de su marco, rechazan parámetros inválidos y no producen bandas negativas', () => {
  for (const count of [1, 4, 8, 12, 24, 64]) {
    const guides = {
      columns: { count, margin: 24, gap: 2 },
      rows: { count: 4, margin: 16, gap: 8 },
    };
    const before = structuredClone(guides);
    const bands = layoutBands(rect, guides),
      columns = bands.filter((b) => b.axis === 'x');
    assert.equal(columns.length, count);
    assert.equal(columns[0]!.x, rect.x + 24);
    assert.ok(
      Math.abs(columns.at(-1)!.x + columns.at(-1)!.width - (rect.x + rect.width - 24)) < 1e-8,
    );
    for (let i = 1; i < count; i++)
      assert.ok(Math.abs(columns[i]!.x - columns[i - 1]!.x - columns[i - 1]!.width - 2) < 1e-8);
    assert.deepEqual(guides, before);
    assert.equal(layoutGuideError(rect, guides), null);
  }
  for (const count of [0, -1, 1.5, 65, NaN, Infinity])
    assert.equal(validLayoutGuides({ columns: { count, margin: 0, gap: 0 } }), false);
  for (const value of [-1, 10001, NaN, Infinity]) {
    assert.equal(validLayoutGuides({ columns: { count: 4, margin: value, gap: 0 } }), false);
    assert.equal(validLayoutGuides({ columns: { count: 4, margin: 0, gap: value } }), false);
  }
  for (const input of [
    null,
    [],
    {},
    { rows: null },
    { columns: { count: 4, margin: '8', gap: 4 } },
  ])
    assert.equal(validLayoutGuides(input), false);
  const tooLarge = { columns: { count: 12, margin: 30, gap: 90 } };
  assert.match(layoutGuideError(rect, tooLarge)!, /no caben/);
  assert.deepEqual(layoutBands(rect, tooLarge), []);
  // Contraejemplo: desplazar una banda rompe la igualdad de márgenes.
  const bands = layoutBands(rect, { columns: { count: 4, margin: 24, gap: 16 } });
  bands[0]!.x += 5;
  assert.notEqual(bands[0]!.x, rect.x + 24);
});

test('C08-U58: retículas se editan atómicamente, copian sin compartir datos y sobreviven historial y resize', () => {
  const { store } = setup();
  const frame = wireframeMaterial('screen', 'frame', { x: 0, y: 0 });
  Object.assign(frame, rect);
  store.dispatch({ type: 'node.create', world: 'project', node: frame }, intent);
  const guides: LayoutGuides = { columns: { count: 12, margin: 24, gap: 16 } };
  const target = { kind: 'node' as const, id: frame.id };
  store.dispatch({ type: 'layout-guides.set', world: 'project', target, guides }, intent);
  const original = structuredClone(layoutFrame(project(store), target)!);
  guides.columns!.count = 1;
  assert.equal(layoutFrame(project(store), target)!.guides.columns!.count, 12);
  store.dispatch({ type: 'canvas.undo', world: 'project' }, intent);
  assert.deepEqual(layoutFrame(project(store), target)!.guides, {});
  store.dispatch({ type: 'canvas.redo', world: 'project' }, intent);
  assert.deepEqual(layoutFrame(project(store), target), original);
  store.dispatch({ type: 'node.duplicate', world: 'project', id: frame.id }, intent);
  const copy = project(store).nodes.at(-1)!;
  assert.deepEqual(copy.layoutGuides, original.guides);
  store.dispatch(
    { type: 'layout-guides.set', world: 'project', target: { kind: 'node', id: copy.id }, guides },
    intent,
  );
  assert.deepEqual(layoutFrame(project(store), target)!.guides, original.guides);
  store.dispatch(
    { type: 'node.resize', world: 'project', id: frame.id, rect: { ...rect, width: 1200 } },
    intent,
  );
  const resized = layoutFrame(project(store), target)!;
  assert.equal(layoutBands(resized, resized.guides)[0]!.width, (1200 - 48 - 11 * 16) / 12);
  const before = store.snapshot();
  assert.throws(() =>
    store.dispatch(
      {
        type: 'layout-guides.set',
        world: 'project',
        target,
        guides: { columns: { count: 12, margin: 1000, gap: 100 } },
      },
      intent,
    ),
  );
  assert.deepEqual(store.snapshot(), before);
  assert.throws(() =>
    store.dispatch(
      {
        type: 'layout-guides.set',
        world: 'project',
        target: { kind: 'node', id: 'note-a' },
        guides,
      },
      intent,
    ),
  );
  const clipboard = captureCanvasCopies(project(store), [frame.id]);
  clipboard.nodes[0]!.layoutGuides = { columns: { count: -1, margin: 0, gap: 0 } };
  assert.throws(() => parseCanvasClipboard(JSON.stringify(clipboard)));
});

test('C08-U59: referencia cercana, continuidad y contexto vencen coincidencias lejanas sin impedir alineación distante', () => {
  const near = { id: 'near', x: 4, y: 120, width: 100, height: 100 };
  const far = { id: 'far', x: 1, y: 250, width: 100, height: 100 };
  const moving = { x: 0, y: 0, width: 100, height: 100 };
  const result = alignRect(moving, [far, near], 1);
  assert.equal(result.correction.x, 4);
  assert.equal(result.guides.find((g) => g.axis === 'x')!.target, 'near');
  assert.equal(result.guides.find((g) => g.axis === 'x')!.to, 220);
  assert.equal(alignRect(moving, [far], 1).correction.x, 1);
  // Contraste con el fallo reproducido: el tercer objeto no cambia el destino.
  assert.deepEqual(result, alignRect(moving, [near, far], 1));
  for (const zoom of [0.01, 0.03, 0.17, 0.38, 0.6, 1, 4.31, 6]) {
    const anchor = { id: 'one', x: 300, y: 150, width: 100 / zoom, height: 100 };
    const start = { ...moving, x: 300 - 4 / zoom, width: 100 / zoom };
    const first = alignRect(start, [anchor], zoom);
    assert.ok(first.memory.x);
    const retained = alignRect({ ...start, x: 300 - 7 / zoom }, [anchor], zoom, {
      previous: first.memory,
    });
    assert.equal(retained.memory.x, first.memory.x);
    const release = alignRect({ ...start, x: 300 - 9 / zoom }, [anchor], zoom, {
      previous: first.memory,
    });
    assert.notEqual(release.memory.x, first.memory.x);
    assert.ok(Math.abs(first.correction.x * zoom) <= 5.000001);
  }
  const frame = {
    ...rect,
    target: { kind: 'node' as const, id: 'screen' },
    members: ['screen'],
    guides: { columns: { count: 4, margin: 24, gap: 16 } },
  };
  const inside = { x: -19, y: 100, width: 20, height: 30 };
  const snapped = alignRect(
    inside,
    [{ id: 'outside', x: -18, y: 1800, width: 20, height: 30 }],
    1,
    { frames: [frame] },
  );
  assert.equal(snapped.correction.x, 3);
  assert.equal(snapped.guides.find((g) => g.axis === 'x')!.source, 'layout');
  assert.equal(alignRect({ ...inside, x: 2000 }, [], 1, { frames: [frame] }).guides.length, 0);
});

test('C08-U60: componentes intactos aportan su límite y conservan la retícula al duplicarlos', () => {
  const { store } = setup();
  const a = { ...note('a'), x: 0, y: 0, width: 100, height: 100 };
  const b = { ...note('b'), x: 10, y: 10, width: 20, height: 20 };
  const w = {
    ...project(store),
    nodes: [a, b],
    canvasGroups: [
      {
        id: 'component',
        name: 'C',
        nodes: ['a', 'b'],
        component: true,
        layoutGuides: { columns: { count: 4, margin: 4, gap: 4 } },
      },
    ],
  };
  assert.deepEqual(alignmentTargets(w, new Set()), [
    { id: 'component', x: 0, y: 0, width: 100, height: 100 },
  ]);
  const copied = captureCanvasCopies(w, ['a', 'b']);
  assert.deepEqual(copied.groups[0]!.layoutGuides, w.canvasGroups[0]!.layoutGuides);
  copied.groups[0]!.layoutGuides!.columns!.gap = 8;
  assert.equal(w.canvasGroups[0]!.layoutGuides.columns.gap, 4);
});

test('C08-U61: una escena densa conserva cada marco sin búsquedas cuadráticas de piezas, incluidas composiciones heredadas', () => {
  const { store } = setup();
  const nodes: Material[] = [],
    groups: CanvasGroup[] = [];
  for (let group = 0; group < 50; group++) {
    const prefix = `dense-${group}`;
    const ids: string[] = [];
    for (let part = 0; part < 80; part++) {
      const id = `${prefix}-${part}`;
      ids.push(id);
      nodes.push({
        id,
        x: group * 400 + (part % 8) * 20,
        y: Math.floor(part / 8) * 20,
        width: 16,
        height: 16,
        owner: null,
        data: {
          kind: 'wireframe',
          title: 'Pieza',
          content: { type: 'block', text: '', piece: { style: { backgroundColor: '#ffffff' } } },
        },
      });
    }
    groups.push({
      id: `${prefix}-group`,
      name: 'Marco',
      nodes: ids,
      ...(group % 2 ? { component: true } : {}),
      layoutGuides: { columns: { count: 4, margin: 4, gap: 4 } },
    });
  }
  let reads = 0;
  const counted = new Proxy(nodes, {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, receiver);
    },
  });
  const w = { ...project(store), nodes: counted, canvasGroups: groups };
  const frames = layoutFrames(w);
  const targets = alignmentTargets(w, new Set());
  assert.equal(frames.length, 50);
  assert.equal(targets.length, 50);
  frames.forEach((frame, index) => {
    assert.equal(frame.x, index * 400);
    assert.equal(frame.width, 156);
    assert.equal(frame.height, 196);
    assert.equal(layoutBands(frame, frame.guides).length, 4);
  });
  assert.equal(selectedLayoutTarget(w, []), null);
  assert.deepEqual(selectedLayoutTarget(w, groups[48]!.nodes), {
    kind: 'group',
    id: groups[48]!.id,
  });
  // Límite de accesos al documento, no de velocidad de una máquina concreta.
  assert.ok(
    reads <= nodes.length * 8,
    `La consulta recorrió ${reads} piezas para ${nodes.length} materiales`,
  );
});
