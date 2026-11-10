import type { LibraryComposition } from './sketch-library';
import type { CanvasGroup, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { componentElements, type ComponentElement } from './component-tree';

export interface SavedComposition {
  id: string;
  name: string;
  revision: number;
  composition: LibraryComposition;
}
export interface ScreenFlow {
  id: string;
  from: string;
  to: string;
  part?: string;
  label: string;
}
export function captureComposition(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
): LibraryComposition {
  const nodes = group.nodes.map((id) => world.nodes.find((n) => n.id === id)!);
  if (!nodes.every((n) => n.data.kind === 'wireframe' && n.data.content.piece))
    throw new Error('Guardá una composición de piezas de bosquejo.');
  const x = group.structure?.origin.x ?? Math.min(...nodes.map((n) => n.x)),
    y = group.structure?.origin.y ?? Math.min(...nodes.map((n) => n.y));
  const structure = group.structure
    ? (structuredClone(group.structure) as NonNullable<CanvasGroup['structure']>)
    : undefined;
  if (structure) {
    structure.origin = { x: 0, y: 0 };
    for (const e of componentElements(structure.root))
      if (e.material)
        (e as ComponentElement).material = String(nodes.findIndex((n) => n.id === e.material));
  }
  return {
    name: group.name,
    width: structure?.root.width ?? Math.max(...nodes.map((n) => n.x + n.width)) - x,
    height: structure?.root.height ?? Math.max(...nodes.map((n) => n.y + n.height)) - y,
    component: true,
    ...(structure ? { structure } : {}),
    parts: nodes.map((n) => ({
      x: n.x - x,
      y: n.y - y,
      width: n.width,
      height: n.height,
      ...(n.rotation ? { rotation: n.rotation } : {}),
      name: 'title' in n.data ? n.data.title : 'Pieza',
      content: structuredClone(n.data.kind === 'wireframe' ? n.data.content : neverContent()),
    })),
  };
}
function neverContent(): never {
  throw new Error('La composición contiene materiales no compatibles.');
}
