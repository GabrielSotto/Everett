import { nodeTitle, type State } from './model';
import type { DeepReadonly } from './readonly';
import { materialText } from './material-content';

export interface SearchResult {
  kind: 'world' | 'document' | 'material';
  world: string;
  id: string;
  title: string;
  detail: string;
  symbol: string;
}

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
const kinds = {
  text: ['Texto', 'text'],
  note: ['Nota', 'note'],
  shape: ['Forma', 'shapes'],
  drawing: ['Dibujo', 'draw'],
  image: ['Imagen', 'image'],
  video: ['Video', 'play'],
  pdf: ['PDF', 'docs'],
  link: ['Enlace', 'link'],
  wireframe: ['Bosquejo', 'canvas'],
  document: ['Documento', 'docs'],
  file: ['Archivo', 'code'],
  task: ['Tarea', 'board'],
  agent: ['Agente', 'agents'],
} as const;

/** Cada resultado conserva el destino real; una referencia usa el nombre y contenido compartidos. */
export function searchWorkspace(state: DeepReadonly<State>, query: string): SearchResult[] {
  const q = normalize(query),
    terms = q.split(/\s+/);
  if (!q) return [];
  const matches = (value: string): boolean => {
    const content = normalize(value);
    return terms.every((term) => content.includes(term));
  };
  const results: SearchResult[] = [];
  for (const world of state.worlds) {
    if (matches(world.name))
      results.push({
        kind: 'world',
        world: world.id,
        id: world.id,
        title: world.name,
        detail: 'Mundo',
        symbol: 'status',
      });
    for (const node of world.nodes) {
      const title = nodeTitle(world, node);
      if (!matches(title + '\n' + materialText(world, node))) continue;
      const kind =
        node.data.kind === 'reference'
          ? node.data.ref.kind
          : node.data.kind === 'local'
            ? node.data.content.kind
            : node.data.kind;
      const [label, symbol] = kinds[kind];
      results.push({
        kind: 'material',
        world: world.id,
        id: node.id,
        title,
        detail: `${label} · Canvas · ${world.name}${node.owner ? (world.zones.some((zone) => zone.agent === node.owner) ? ' · En zona' : ' · En trabajo') : ''}`,
        symbol,
      });
    }
    for (const doc of world.docs) {
      if (
        world.nodes.some(
          (node) =>
            node.data.kind === 'reference' &&
            node.data.ref.kind === 'document' &&
            node.data.ref.id === doc.id &&
            !node.data.ref.fragment,
        )
      )
        continue;
      if (matches(doc.title + '\n' + doc.body))
        results.push({
          kind: 'document',
          world: world.id,
          id: doc.id,
          title: doc.title || 'Sin nombre',
          detail: `Documento · Docs · ${world.name}`,
          symbol: 'docs',
        });
    }
  }
  const active = state.route.kind === 'universe' ? null : state.route.world;
  const score = (result: SearchResult): number =>
    (result.world === active ? 0 : 4) +
    (normalize(result.title) === q ? 0 : normalize(result.title).startsWith(q) ? 1 : 2);
  return results.sort((a, b) => score(a) - score(b));
}
