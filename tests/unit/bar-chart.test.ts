import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { barScale } from '../../src/domain/bar-chart';
import { legacyBars, linkedBarCopy } from '../../src/domain/legacy-bars';
import { newCanvasText } from '../../src/domain/canvas-text';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
import type { Material } from '../../src/domain/model';

test('C08-U84: las barras derivan de los datos, se copian por valor y solo admiten series válidas', () => {
  const { store, worldId: world } = setup();
  store.dispatch({ type: 'graphic.insert', world, kind: 'bars', center: { x: 0, y: 0 } }, intent);
  const chart = project(store).nodes.find((n) => n.data.kind === 'bars')!;
  const rows = [
    { label: 'Incremento', value: 80 },
    { label: 'Caída', value: -20 },
    { label: 'Cero', value: 0 },
    { label: 'Desconocido', value: null },
  ];
  const edit = (items: typeof rows) =>
    store.dispatch({ type: 'bars.edit', world, id: chart.id, rows: items }, intent);
  for (const invalid of [
    [],
    [{ label: ' ', value: 8 }],
    [{ label: 'A', value: NaN }],
    [{ label: 'A', value: Infinity }],
  ]) {
    assert.throws(() => edit(invalid), { code: 'BAR_DATA' });
    assert.deepEqual(
      project(store).nodes.find((n) => n.id === chart.id),
      chart,
    );
  }
  edit(rows);
  const scale = barScale(rows);
  assert.equal(scale.position(-20), 0);
  assert.equal(scale.zero, 0.2);
  assert.equal(scale.position(80), 1);
  const extreme = barScale([
    { label: 'Máx.', value: Number.MAX_VALUE },
    { label: 'Mín.', value: -Number.MAX_VALUE },
  ]);
  assert.equal(extreme.zero, 0.5);
  assert.equal(extreme.position(Number.MAX_VALUE), 1);
  assert.equal(barScale([{ label: 'Sin dato', value: null }]).position(0), 0);
  const clip = parseCanvasClipboard(
    JSON.stringify(captureCanvasCopies(project(store), [chart.id])),
  );
  store.dispatch(
    { type: 'nodes.paste', world, clipboard: clip, offset: { x: 1000, y: 0 } },
    intent,
  );
  const copy = project(store).nodes.at(-1)!;
  store.dispatch(
    { type: 'bars.edit', world, id: copy.id, rows: [{ label: 'Otro', value: 1 }] },
    intent,
  );
  assert.deepEqual(project(store).nodes.find((n) => n.id === chart.id)?.data, {
    ...chart.data,
    rows,
  });
  assert.throws(
    () => parseCanvasClipboard(JSON.stringify(clip).replace('"value":80', '"value":"80"')),
    { code: 'CLIPBOARD_MATERIAL' },
  );
});
test('C08-U85: recuperar los números escritos en barras antiguas sin reemplazar anotaciones o piezas movidas', () => {
  const { store } = setup();
  const world = { ...project(store), nodes: [...project(store).nodes] };
  const nodes: Material[] = [];
  const base = () => ({
    id: 'e-' + (120 + nodes.length),
    x: 60 + nodes.length * 9,
    y: 100,
    width: 65,
    height: 35,
    owner: null,
  });
  const text = (value: string) =>
    nodes.push({ ...base(), data: { ...newCanvasText('wrap'), text: value } });
  text('Encuesta revisada');
  text('Personas encuestadas');
  for (const [label, value] of [
    ['Tren', '80'],
    ['Caminando', '12,5'],
    ['Otro', '0'],
    ['Sin respuesta', ''],
  ]) {
    text(label!);
    nodes.push({
      ...base(),
      data: { kind: 'shape', shape: 'rectangle', color: '#abcdef', title: label! },
    });
    text(value!);
  }
  world.nodes.push(...nodes);
  const before = structuredClone(world.nodes);
  const copy = linkedBarCopy(world, 'e-123', 'copia');
  assert.ok(copy?.data.kind === 'bars');
  assert.deepEqual(
    copy.data.rows.map((r) => r.value),
    [80, 12.5, 0, null],
  );
  assert.equal(legacyBars(world, 'note-a'), null);
  assert.deepEqual(world.nodes, before);
  world.nodes = world.nodes.filter((n) => n.id !== 'e-125');
  assert.equal(legacyBars(world, 'e-123'), null);
});
