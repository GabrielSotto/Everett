import type { ComponentElement } from './component-tree';
import { elementMaterials, treeFromMaterials } from './component-tree';
import { nodeTitle, type CanvasGroup, type World, type WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';

/** Orden del inspector, de frente a fondo. El orden de los hijos también gobierna el layout. */
export function layersFrontFirst(
  parent: DeepReadonly<ComponentElement>,
  levels: ReadonlyMap<string, number>,
) {
  const rank = (child: DeepReadonly<ComponentElement>) =>
    elementMaterials(child).reduce((front, id) => Math.max(front, levels.get(id) ?? -1), -1);
  return parent.children
    .map((element) => ({ element, rank: rank(element) }))
    .sort((a, b) => b.rank - a.rank)
    .map(({ element }) => element);
}

export function layerLevels(world: WorldSnapshot): Map<string, number> {
  return new Map(world.nodes.map((n, i) => [n.id, i]));
}

/** Los conjuntos manuales son planos. Inspeccionarlos conserva su representación guardada. */
export function flatLayers(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
): ComponentElement {
  const ids = new Set(group.nodes);
  const nodes = world.nodes.filter((n) => ids.has(n.id));
  const root = treeFromMaterials(nodes, group.name).root;
  root.children.forEach((e, i) => {
    e.id = nodes[i]!.id;
    e.name = nodeTitle(world, nodes[i]!);
  });
  return root;
}

/** Mueve un subárbol completo. Las piezas ajenas conservan sus posiciones en la pila global. */
export function restackLayer(
  world: World,
  parent: ComponentElement,
  source: ComponentElement,
  target: ComponentElement,
  side: 'above' | 'below' | 'inside',
): void {
  const members = new Set(elementMaterials(parent)),
    moved = new Set(elementMaterials(source)),
    anchor = new Set(elementMaterials(target));
  const siblings = world.nodes.filter((n) => members.has(n.id));
  const rest = siblings.filter((n) => !moved.has(n.id));
  const at =
    side === 'inside'
      ? rest.length
      : side === 'above'
        ? rest.findLastIndex((n) => anchor.has(n.id)) + 1
        : rest.findIndex((n) => anchor.has(n.id));
  rest.splice(at, 0, ...siblings.filter((n) => moved.has(n.id)));
  let i = 0;
  world.nodes = world.nodes.map((n) => (members.has(n.id) ? rest[i++]! : n));
}
