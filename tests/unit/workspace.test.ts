import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentService } from '../../src/app/agent-service';
import { compareLines } from '../../src/domain/code-diff';
import { materialRoute } from '../../src/domain/model';
import { parseShippingIntent, releaseSummary } from '../../src/domain/shipping';
import { setup, project, intent } from './fixtures';

test('CODE-01: proponer no modifica el archivo y aceptar respeta su revisión', () => {
  const { store } = setup();
  const file = project(store).files[0];
  assert.ok(file);
  store.dispatch(
    {
      type: 'code.propose',
      world: 'project',
      proposal: {
        file: file.id,
        before: file.text,
        after: 'const value = 2;\n',
        revision: file.revision,
        summary: 'Cambiar valor',
      },
    },
    intent,
  );
  assert.equal(project(store).files[0]?.text, file.text);
  store.dispatch({ type: 'code.accept', world: 'project', accept: true }, intent);
  assert.equal(project(store).files[0]?.text, 'const value = 2;\n');
  assert.equal(project(store).files[0]?.saved, file.saved);
  assert.equal(project(store).proposal, null);
  store.dispatch({ type: 'file.save', world: 'project', id: file.id }, intent);
  assert.equal(project(store).files[0]?.saved, 'const value = 2;\n');
});

test('CODE-02: una propuesta antigua no sobrescribe una edición manual posterior', () => {
  const { store } = setup();
  store.dispatch(
    {
      type: 'code.propose',
      world: 'project',
      proposal: {
        file: 'file',
        before: 'const value = 1;\n',
        after: 'propuesta',
        revision: 0,
        summary: 'Cambiar',
      },
    },
    intent,
  );
  store.dispatch(
    { type: 'file.edit', world: 'project', id: 'file', text: 'Cambio manual' },
    intent,
  );
  const before = store.snapshot();
  assert.throws(
    () => store.dispatch({ type: 'code.accept', world: 'project', accept: true }, intent),
    /cambió/,
  );
  assert.deepEqual(store.snapshot(), before);
  store.dispatch({ type: 'code.accept', world: 'project', accept: false }, intent);
  assert.equal(project(store).files[0]?.text, 'Cambio manual');
  assert.equal(project(store).proposal, null);
});

test('CODE-03: los nombres inválidos o duplicados no crean archivos', () => {
  const { store } = setup();
  for (const name of ['', '  ', '/absolute.ts', '../parent.ts', 'a\\b.ts', 'main.ts', 'bad?.ts']) {
    assert.throws(() => store.dispatch({ type: 'file.create', world: 'project', name }, intent));
  }
  assert.equal(project(store).files.length, 1);
  store.dispatch({ type: 'file.create', world: 'project', name: 'src/new.ts' }, intent);
  assert.equal(project(store).files[1]?.name, 'src/new.ts');
});

test('CODE-04: la comparación conserva líneas vacías, inserciones y eliminaciones', () => {
  const before = 'a\n\nb\nc\n';
  const after = 'a\n\nx\nc\n';
  const rows = compareLines(before, after);
  assert.equal(
    rows
      .filter((row) => row.before !== null)
      .map((row) => row.before)
      .join('\n'),
    before,
  );
  assert.equal(
    rows
      .filter((row) => row.after !== null)
      .map((row) => row.after)
      .join('\n'),
    after,
  );
  assert.ok(rows.some((row) => row.type === 'remove' && row.before === 'b'));
  assert.ok(rows.some((row) => row.type === 'insert' && row.after === 'x'));
});

test('DOCS-01: una referencia abre el documento compartido y conserva su edición', () => {
  const { store } = setup();
  store.dispatch(
    {
      type: 'node.create',
      world: 'project',
      node: {
        id: 'reference',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        owner: null,
        data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
      },
    },
    intent,
  );
  const route = materialRoute(store.get(), 'project', 'reference');
  assert.deepEqual(route, {
    kind: 'surface',
    world: 'project',
    surface: 'docs',
    entity: 'document',
  });
  store.dispatch(
    {
      type: 'document.edit',
      world: 'project',
      id: 'document',
      title: 'Título nuevo',
      body: '# Encabezado\n\nContenido\n',
    },
    intent,
  );
  assert.equal(project(store).docs.length, 1);
  assert.equal(project(store).docs[0]?.body, '# Encabezado\n\nContenido\n');
  assert.deepEqual(materialRoute(store.get(), 'project', 'reference'), route);
});

test('DOCS-02: editar una celda no altera celdas vecinas y rechaza índices inválidos', () => {
  const { store } = setup();
  store.dispatch({ type: 'document.create', world: 'project', sheet: true }, intent);
  const sheet = project(store).docs.at(-1);
  assert.ok(sheet);
  store.dispatch(
    { type: 'sheet.edit', world: 'project', id: sheet.id, row: 0, col: 1, value: 'Dato' },
    intent,
  );
  assert.deepEqual(project(store).docs.at(-1)?.sheet?.[0], ['', 'Dato', '', '']);
  const before = store.snapshot();
  for (const [row, col] of [
    [-1, 0],
    [20, 0],
    [0, -1],
    [0, 4],
  ] as const) {
    assert.throws(() =>
      store.dispatch(
        { type: 'sheet.edit', world: 'project', id: sheet.id, row, col, value: 'Inválido' },
        intent,
      ),
    );
  }
  assert.deepEqual(store.snapshot(), before);
});

test('BOARD-01: las vistas comparten tareas, estado y propiedades', () => {
  const { store } = setup();
  store.dispatch(
    { type: 'task.create', world: 'project', title: 'Revisar', origin: 'session' },
    intent,
  );
  const task = project(store).tasks[0];
  assert.ok(task);
  store.dispatch(
    { type: 'task.edit', world: 'project', id: task.id, field: 'status', value: 'progress' },
    intent,
  );
  for (const view of ['table', 'calendar', 'kanban'] as const) {
    store.dispatch({ type: 'board.view', world: 'project', view }, intent);
    assert.equal(project(store).tasks[0]?.id, task.id);
    assert.equal(project(store).tasks[0]?.status, 'progress');
    assert.equal(project(store).tasks[0]?.origin, 'session');
  }
  store.dispatch(
    {
      type: 'property.add',
      world: 'project',
      property: { id: 'effort', name: 'Esfuerzo', type: 'number', custom: true },
    },
    intent,
  );
  store.dispatch(
    { type: 'task.edit', world: 'project', id: task.id, field: 'effort', value: '3' },
    intent,
  );
  assert.equal(project(store).tasks[0]?.custom.effort, '3');
  store.dispatch({ type: 'property.remove', world: 'project', id: 'effort' }, intent);
  assert.equal(project(store).tasks[0]?.custom.effort, undefined);
  assert.throws(() =>
    store.dispatch(
      { type: 'task.edit', world: 'project', id: task.id, field: 'status', value: 'inventado' },
      intent,
    ),
  );
});

test('SESSION-01: una instrucción de Shipping modifica el mismo estado que utiliza Board', async () => {
  const { store } = setup();
  const service = new AgentService(store);
  await service.converse('project', 'messages', 'Activa shipping');
  assert.equal(project(store).shipping.active, true);
  assert.equal(project(store).shipping.source, 'agent');
  store.dispatch(
    { type: 'task.create', world: 'project', title: 'Preparar', origin: 'session' },
    intent,
  );
  assert.equal(project(store).tasks[0]?.shipping, 'required');
  assert.equal(releaseSummary(project(store)).total, 1);
  await service.converse('project', 'messages', 'Desactiva shipping');
  assert.equal(project(store).shipping.active, false);
  assert.equal(project(store).tasks.length, 1);
  assert.ok(project(store).runs.every((run) => run.status === 'completed'));
});

test('SESSION-02: en un chat multiusuario el agente responde al ser invocado', async () => {
  const { store } = setup();
  const service = new AgentService(store);
  store.dispatch({ type: 'participant', world: 'project', name: 'Otra persona' }, intent);
  await service.converse('project', 'chat', 'Una observación');
  assert.equal(project(store).chat.length, 1);
  assert.equal(project(store).runs.length, 0);
  await service.converse('project', 'chat', '@Eve revisá el contexto');
  assert.equal(project(store).chat.length, 3);
  assert.equal(project(store).chat.at(-1)?.role, 'agent');
  assert.equal(project(store).runs.length, 1);
});

test('SHIPPING-01: las consultas y órdenes reconocidas conservan su intención', () => {
  assert.deepEqual(parseShippingIntent('Desactivá Shipping'), { type: 'set', active: false });
  assert.deepEqual(parseShippingIntent('¿Qué falta para lanzar?'), { type: 'query' });
  assert.equal(parseShippingIntent('Escribir un documento'), null);
});
