import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, project, intent } from './fixtures';
import { proposalMaterials } from '../../src/domain/proposal-materials';
import { AgentService } from '../../src/app/agent-service';

test('C08-U09: conexiones inversas son el mismo cable, reconectar no duplica y las copias tienen nombre independiente', () => {
  const { store } = setup();
  const original = structuredClone(project(store).nodes[0]!);
  store.dispatch(
    {
      type: 'link.create',
      world: 'project',
      from: 'note-b',
      to: 'note-a',
      fromAnchor: 'west',
      toAnchor: 'east',
    },
    intent,
  );
  assert.equal(project(store).links.length, 1);
  store.dispatch({ type: 'node.duplicate', world: 'project', id: 'note-a' }, intent);
  const copy = project(store).nodes.at(-1)!;
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.data.kind === 'note' && copy.data.title, 'Idea — copia');
  assert.deepEqual(project(store).nodes[0], original);
  store.dispatch({ type: 'node.duplicate', world: 'project', id: copy.id }, intent);
  assert.equal(
    project(store).nodes.at(-1)!.data.kind === 'note' &&
      (project(store).nodes.at(-1)!.data as { title: string }).title,
    'Idea — copia — copia',
  );
  store.dispatch(
    {
      type: 'link.create',
      world: 'project',
      from: 'note-a',
      to: copy.id,
      fromAnchor: 'north',
      toAnchor: 'south',
    },
    intent,
  );
  const extra = project(store).links.at(-1)!;
  assert.throws(() => {
    store.dispatch(
      {
        type: 'link.reconnect',
        world: 'project',
        id: extra.id,
        end: 'to',
        node: 'note-b',
        anchor: 'west',
      },
      intent,
    );
    store.dispatch(
      {
        type: 'link.reconnect',
        world: 'project',
        id: extra.id,
        end: 'from',
        node: 'note-a',
        anchor: 'east',
      },
      intent,
    );
  });
});

test('C08-U10: materiales propuestos conservan tipo y bytes, persisten pendientes y solo se aplican al aceptar', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { store } = setup();
  const media = ['image', 'video', 'pdf'] as const;
  for (const kind of media)
    store.dispatch(
      {
        type: 'node.create',
        world: 'project',
        node: {
          id: kind,
          x: 0,
          y: 0,
          width: 160,
          height: 90,
          owner: null,
          data: {
            kind,
            title: kind,
            asset: 'durable-' + kind,
            mime:
              kind === 'pdf' ? 'application/pdf' : kind + '/' + (kind === 'video' ? 'webm' : 'png'),
            ratio: 160 / 90,
          },
        },
      },
      intent,
    );
  store.dispatch(
    {
      type: 'node.create',
      world: 'project',
      node: {
        id: 'doc-ref',
        x: 0,
        y: 0,
        width: 240,
        height: 180,
        owner: null,
        data: { kind: 'reference', ref: { kind: 'document', id: 'document' } },
      },
    },
    intent,
  );
  const service = new AgentService(store);
  for (const id of [...media, 'doc-ref', 'note-a']) {
    const source = structuredClone(project(store).nodes.find((n) => n.id === id)!);
    const before = structuredClone(project(store).docs[0]!);
    store.dispatch(
      { type: 'assign', world: 'project', node: id, agent: 'eve', instruction: 'Analizar' },
      intent,
    );
    const job = project(store).assignments[0]!;
    service.process('project', job.id);
    context.mock.timers.tick(1700);
    const ready = project(store).assignments[0]!;
    assert.equal(ready.phase, 'ready');
    assert.ok(ready.output!.length > 0);
    assert.deepEqual(project(store).nodes.find((n) => n.id === id)!.data, source.data);
    assert.deepEqual(project(store).docs[0], before);
    if (id === 'doc-ref') {
      store.dispatch(
        {
          type: 'document.edit',
          world: 'project',
          id: 'document',
          title: 'Nombre cambiado durante la revisión',
          body: before.body,
        },
        intent,
      );
    }
    const restored = structuredClone(store.snapshot());
    assert.deepEqual(
      restored.worlds.find((w) => w.id === 'project')!.assignments[0]!.output,
      ready.output,
    );
    if (id === 'note-a') assert.equal(ready.output!.length, 2);
    if (media.some((kind) => kind === id)) {
      assert.equal(ready.output![0]!.material.data.kind, id);
      assert.equal((ready.output![0]!.material.data as { asset: string }).asset, 'durable-' + id);
    }
    store.dispatch(
      { type: 'assignment.finish', world: 'project', id: job.id, decision: 'accept' },
      intent,
    );
    for (const draft of ready.output!)
      assert.deepEqual(
        project(store).nodes.find((n) => n.id === draft.material.id)!.data,
        draft.material.data,
      );
    assert.deepEqual(project(store).nodes.find((n) => n.id === id)!.data, source.data);
    if (id === 'doc-ref') {
      assert.equal(project(store).docs[0]!.title, 'Nombre cambiado durante la revisión');
      assert.equal(project(store).docs[0]!.body, ready.output![0]!.document!.body);
      assert.equal(project(store).nodes.at(-1)!.data.kind, 'reference');
    }
  }
  // Rechazar y cancelar no aplican ni registros compartidos ni borradores de resultado.
  for (const decision of ['reject', 'cancel'] as const) {
    const before = structuredClone(project(store));
    store.dispatch({ type: 'assign', world: 'project', node: 'doc-ref', agent: 'eve' }, intent);
    const job = project(store).assignments[0]!;
    store.dispatch(
      {
        type: 'assignment.ready',
        world: 'project',
        id: job.id,
        revision: 1,
        text: 'Cambio no aceptado',
      },
      intent,
    );
    assert.equal(proposalMaterials(project(store), project(store).assignments[0]!).length, 1);
    store.dispatch({ type: 'assignment.finish', world: 'project', id: job.id, decision }, intent);
    assert.deepEqual(project(store).nodes, before.nodes);
    assert.deepEqual(project(store).docs, before.docs);
  }
  service.dispose();
});
