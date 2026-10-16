import assert from 'node:assert/strict';
import test from 'node:test';
import { searchWorkspace } from '../../src/domain/workspace-search';
import { setup, note } from './fixtures';

test('C08-U13: búsqueda de materiales tipados, contenido compartido, nombres vigentes y destinos independientes', () => {
  const { state } = setup();
  const world = state.worlds.find((item) => item.id === 'project')!;
  world.nodes = [note('decision')];
  world.nodes[0]!.data = {
    kind: 'note',
    title: 'Decisión: guardado local',
    text: 'Conservar cámara y borradores',
    color: '#ddd',
  };
  world.tasks.push({
    id: 'search-task',
    title: 'Validar almacenamiento',
    description: 'Prueba de recuperación',
    status: 'planned',
    priority: 'Alta',
    assignee: 'Gabi',
    creator: 'Gabi',
    start: '',
    due: '',
    origin: 'board',
    custom: {},
    shipping: 'later',
  });
  const values = [
    { kind: 'reference' as const, ref: { kind: 'task' as const, id: 'search-task' } },
    { kind: 'reference' as const, ref: { kind: 'agent' as const, id: world.agents[0]!.id } },
    { kind: 'shape' as const, shape: 'rectangle' as const, title: 'Componente API', color: '#ddd' },
    {
      kind: 'drawing' as const,
      title: 'Boceto navegación',
      points: [{ x: 0, y: 0 }],
      color: '#ddd',
      thickness: 2,
    },
    ...(['image', 'video', 'pdf'] as const).map((kind) => ({
      kind,
      title: `Archivo ${kind}`,
      asset: kind,
      mime: kind === 'pdf' ? 'application/pdf' : `${kind}/test`,
      ratio: 1,
    })),
    {
      kind: 'link' as const,
      title: 'Sin nombre',
      url: 'https://example.org/referencia',
      description: 'Criterios de recuperación',
    },
    { kind: 'reference' as const, ref: { kind: 'document' as const, id: 'document' } },
    { kind: 'reference' as const, ref: { kind: 'file' as const, id: 'file' } },
  ];
  values.forEach((data, index) => world.nodes.push({ ...note(`item-${index}`), data }));
  const original = structuredClone(state);
  assert.equal(searchWorkspace(state, '  DECISION guardado  ')[0]?.id, 'decision');
  assert.equal(searchWorkspace(state, 'camara borradores')[0]?.id, 'decision');
  for (const query of [
    'Validar almacenamiento',
    world.agents[0]!.role,
    'Componente API',
    'Boceto navegacion',
    'Archivo image',
    'Archivo video',
    'Archivo pdf',
    'example.org/referencia',
    'criterios recuperacion',
    'Párrafo',
    'const value',
  ])
    assert.ok(
      searchWorkspace(state, query).some((result) => result.kind === 'material'),
      query,
    );
  assert.equal(
    searchWorkspace(state, 'Documento').filter((result) => result.world === world.id).length,
    1,
  );
  assert.deepEqual(searchWorkspace(state, '   '), []);
  assert.deepEqual(searchWorkspace(state, 'no-existe-aquí-7092'), []);
  assert.deepEqual(state, original);
  world.docs[0]!.title = 'Contrato renombrado';
  assert.equal(searchWorkspace(state, 'Contrato renombrado')[0]?.kind, 'material');
  assert.equal(
    searchWorkspace(state, 'Documento').filter((result) => result.world === world.id).length,
    0,
  );
  world.nodes = world.nodes.filter((node) => node.data.kind !== 'reference');
  assert.equal(searchWorkspace(state, 'Contrato renombrado')[0]?.kind, 'document');
  world.nodes = world.nodes.filter((node) => node.id !== 'decision');
  assert.equal(searchWorkspace(state, 'Decisión: guardado local').length, 0);
  const other = structuredClone(world);
  other.id = 'other-world';
  state.worlds.push(other);
  other.nodes.push({
    ...note('decision'),
    data: { kind: 'note', title: 'Otra decisión', text: 'Otro Mundo', color: '#ddd' },
  });
  assert.equal(searchWorkspace(state, 'Otra decisión')[0]?.world, other.id);
});
