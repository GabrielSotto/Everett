import {
  componentElements,
  elementMaterials,
  parentOf,
  type ComponentElement,
} from './component-tree';
import { componentPoses, localPose } from './component-geometry';
import { refreshInstance } from './component-instances';
import type { SavedComposition } from './component-recipes';
import type { CanvasGroup, CompositionLink, World } from './model';
import type { DeepReadonly } from './readonly';

/** Los IDs del árbol identifican capas dentro del marco. Los de la receta identifican partes entre revisiones. */
export function remapInstanceLayers(root: ComponentElement, ids: ReadonlyMap<string, string>) {
  for (const element of componentElements(root)) {
    if (element.instance)
      for (const item of element.instance.layers) item.layer = ids.get(item.layer) ?? item.layer;
  }
}

export function* compositionLinks(groups: readonly DeepReadonly<CanvasGroup>[]) {
  for (const group of groups) {
    if (group.recipe) yield group.recipe;
    if (group.structure)
      for (const element of componentElements(group.structure.root))
        if (element.instance) yield element.instance;
  }
}

export function layerBinding(
  group: CanvasGroup,
  selected: ComponentElement,
): { link: CompositionLink; part: string } | undefined;
export function layerBinding(
  group: DeepReadonly<CanvasGroup>,
  selected: DeepReadonly<ComponentElement>,
): { link: DeepReadonly<CompositionLink>; part: string } | undefined;
export function layerBinding(
  group: DeepReadonly<CanvasGroup>,
  selected: DeepReadonly<ComponentElement>,
) {
  const root = group.structure?.root;
  if (!root) return;
  // El contenedor vinculado más cercano controla las propiedades de esta capa.
  const owners = new Map<string, DeepReadonly<ComponentElement>>();
  for (const element of componentElements(root))
    for (const child of element.children) owners.set(child.id, element);
  for (
    let scope: DeepReadonly<ComponentElement> | undefined = selected;
    scope;
    scope = owners.get(scope.id)
  ) {
    if (scope.instance) {
      const part = scope.instance.layers.find((entry) => entry.layer === selected.id)?.part;
      return part ? { link: scope.instance, part } : undefined;
    }
  }
  if (group.recipe) return { link: group.recipe, part: selected.id };
}

/** Aplica la misma actualización manual a un subárbol, conservando su ubicación y los IDs de sus capas. */
export function refreshNestedInstance(
  world: World,
  group: CanvasGroup,
  scope: ComponentElement,
  saved: SavedComposition,
  uid: () => string,
) {
  const binding = scope.instance!;
  const tree = group.structure!;
  const parent = parentOf(tree.root, scope.id)!;
  const poses = componentPoses(tree);
  const pose = poses.get(scope.id)!;
  const layerToPart = new Map(binding.layers.map((p) => [p.layer, p.part]));
  const partToLayer = new Map(binding.layers.map((p) => [p.part, p.layer]));
  const root = structuredClone(scope);
  delete root.instance;
  delete root.rotation;
  root.x = root.y = 0;
  for (const item of componentElements(root)) item.id = layerToPart.get(item.id) ?? uid();
  const members = elementMaterials(root);
  const memberIds = new Set(members);
  const link: CompositionLink = {
    id: binding.id,
    revision: binding.revision,
    ...(binding.overrides && { overrides: binding.overrides }),
  };
  const instance: CanvasGroup = {
    id: group.id,
    name: scope.name,
    nodes: members,
    recipe: link,
    structure: {
      version: 1,
      root,
      origin: { x: pose.x, y: pose.y },
      ...(pose.rotation && { rotation: pose.rotation }),
    },
  };
  const linkedParts = new Set(
    world.screenFlows
      ?.filter((f) => f.from === group.id && f.part)
      .map((f) => layerToPart.get(f.part!)),
  );
  refreshInstance(world, instance, saved, uid, linkedParts);
  const updated = instance.structure!;
  const placement = localPose(poses.get(parent.id)!, componentPoses(updated).get(updated.root.id)!);
  const layers = componentElements(updated.root).map((e) => {
    const part = e.id;
    e.id = e === updated.root ? scope.id : (partToLayer.get(part) ?? uid());
    return { layer: e.id, part };
  });
  Object.assign(updated.root, placement, { instance: { ...instance.recipe!, layers } });
  updated.root.widthMode = scope.widthMode;
  updated.root.heightMode = scope.heightMode;
  if (scope.margin) updated.root.margin = scope.margin;
  parent.children[parent.children.indexOf(scope)] = updated.root;
  const live = new Set([...group.nodes.filter((id) => !memberIds.has(id)), ...instance.nodes]);
  group.nodes = world.nodes.filter((n) => live.has(n.id)).map((n) => n.id);
}
