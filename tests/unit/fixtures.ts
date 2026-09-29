import { Store } from '../../src/app/store';
import { Trace } from '../../src/app/diagnostics/trace';
import { emptyWorld, seed } from '../../src/domain/seed';
import { getWorld, type Material, type State } from '../../src/domain/model';

export function note(id = 'note-a'): Material {
  return {
    id,
    x: 10,
    y: 20,
    width: 200,
    height: 160,
    owner: null,
    data: { kind: 'note', title: 'Idea', text: 'Contenido original\nSegunda línea', color: '#ddd' },
  };
}

export function setup(): { store: Store; log: Trace; state: State; worldId: string } {
  const state = seed(true, 42);
  const world = emptyWorld('project', 'Proyecto', 42, 0, 0);
  world.nodes = [note(), note('note-b')];
  world.docs = [{ id: 'document', title: 'Documento', body: 'Texto\n\nPárrafo', sheet: null }];
  world.files = [
    {
      id: 'file',
      name: 'main.ts',
      text: 'const value = 1;\n',
      saved: 'const value = 1;\n',
      revision: 0,
    },
  ];
  world.zones = [
    { id: 'zone', agent: 'eve', name: 'Eve', x: 500, y: 100, width: 320, height: 300 },
  ];
  world.links = [
    { id: 'link', from: 'note-a', to: 'note-b', fromAnchor: 'east', toAnchor: 'west' },
  ];
  state.worlds.push(world);
  const log = new Trace();
  const store = new Store(state, log);
  return { store, log, state, worldId: world.id };
}

export const intent = {
  verb: 'comprobar contrato',
  requirement: 'REC075',
  interaction: 'unit',
  source: 'test',
} as const;
export const project = (store: Store) => getWorld(store.get(), 'project');
