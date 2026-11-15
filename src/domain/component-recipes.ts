import type { SavedRecipe } from './sketch-library';
import type { CanvasGroup, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { incompatibleMaterial, type PartData } from './composition-materials';
import { nodeTitle } from './model';
import { ensure } from './invariants';
import { componentElements, type ComponentElement } from './component-tree';

export interface SavedComposition {
  id: string;
  /** Grupo desde el que se guardó por primera vez. La biblioteca puede sobrevivir a ese grupo. */
  sourceGroup?: string;
  name: string;
  revision: number;
  composition: SavedRecipe;
  /** Una base compartida por las copias que aún no aceptaron la revisión nueva. */
  previous?: { revision: number; composition: SavedRecipe }[];
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
): SavedRecipe {
  const members = new Set(group.nodes);
  const nodes = world.nodes.filter((n) => members.has(n.id));
  const incompatible = incompatibleMaterial(world, group);
  ensure(
    !incompatible,
    'COMPONENT_CONTENT',
    incompatible
      ? `«${nodeTitle(world, incompatible)}» no se puede guardar en un componente. Separá ese material para continuar.`
      : '',
  );
  const indices = new Map(nodes.map((node, i) => [node.id, String(i)]));
  const x = group.structure?.origin.x ?? Math.min(...nodes.map((n) => n.x)),
    y = group.structure?.origin.y ?? Math.min(...nodes.map((n) => n.y));
  const structure = group.structure
    ? (structuredClone(group.structure) as NonNullable<CanvasGroup['structure']>)
    : undefined;
  if (structure) {
    structure.origin = { x: 0, y: 0 };
    for (const e of componentElements(structure.root)) {
      delete e.instance;
      if (e.material) (e as ComponentElement).material = indices.get(e.material)!;
    }
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
      name: nodeTitle(world, n).slice(0, 200),
      ...(n.data.kind === 'wireframe' && n.data.content.piece
        ? { content: structuredClone(n.data.content) }
        : { data: structuredClone(n.data) as PartData }),
    })),
  };
}
