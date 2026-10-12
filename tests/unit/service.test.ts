import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentService } from '../../src/app/agent-service';
import { setup, project, intent } from './fixtures';

function assign(store: ReturnType<typeof setup>['store'], world: string): string {
  store.dispatch(
    { type: 'assign', world, node: 'note-a', agent: 'eve', instruction: 'Resumir' },
    intent,
  );
  return project(store).assignments[0]!.id;
}

test('SERVICE-01: cancelar impide que el temporizador entregue una propuesta tardía', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const { store, worldId } = setup();
  const service = new AgentService(store);
  const assignment = assign(store, worldId);
  service.process(worldId, assignment);
  service.cancel(worldId, assignment);
  const before = store.snapshot();
  context.mock.timers.tick(2000);
  assert.deepEqual(store.snapshot(), before);
  assert.equal(project(store).runs[0]?.status, 'cancelled');
  assert.equal(project(store).assignments[0]?.phase, 'working');
});

test('SERVICE-02: una revisión nueva recibe únicamente su propia respuesta', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const { store, worldId } = setup();
  const service = new AgentService(store);
  const assignment = assign(store, worldId);
  service.process(worldId, assignment);
  context.mock.timers.tick(1600);
  store.dispatch(
    { type: 'assignment.revise', world: worldId, id: assignment, text: 'Analizar' },
    intent,
  );
  service.process(worldId, assignment);
  context.mock.timers.tick(1100);
  assert.equal(project(store).assignments[0]?.phase, 'working');
  context.mock.timers.tick(500);
  assert.equal(project(store).assignments[0]?.phase, 'ready');
  assert.match(project(store).assignments[0]!.text, /Pregunta para revisar/);
  assert.deepEqual(
    project(store).runs.map((run) => run.status),
    ['completed', 'completed'],
  );
});

test('SERVICE-03: cerrar la ventana libera temporizadores y conserva el trabajo recuperable', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const { store, worldId } = setup();
  const service = new AgentService(store);
  const assignment = assign(store, worldId);
  service.process(worldId, assignment);
  const reply = service.converse(worldId, 'messages', 'Activar Shipping Mode');
  service.dispose();
  service.dispose();
  const before = store.snapshot();
  await reply;
  context.mock.timers.tick(3000);
  assert.deepEqual(store.snapshot(), before);
  assert.ok(project(store).runs.every((run) => run.status === 'running'));
  assert.equal(project(store).shipping.active, false);
  await assert.rejects(service.converse(worldId, 'messages', 'Otro pedido'), /cerrado/);
});
