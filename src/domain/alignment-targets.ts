import { visualBounds } from './rotation';
import type { WorldSnapshot } from './model';
import { isComponent } from './manual-groups';
import { selectionBounds, type SnapTarget } from './alignment';
import { componentElements, elementMaterials, elementRect } from './component-tree';
import { componentPoses } from './component-geometry';

/** Un componente intacto aporta su límite, no cada detalle decorativo interno. */
export function alignmentTargets(
  world: WorldSnapshot,
  selected: ReadonlySet<string>,
  editing?: { group: string; element: string },
): SnapTarget[] {
  const structure = world.canvasGroups?.find((g) => g.id === editing?.group)?.structure;
  if (structure) {
    const scope = componentElements(structure.root).find((e) => e.id === editing?.element);
    if (scope) {
      const poses = componentPoses(structure);
      const nodes = new Map(world.nodes.map((n) => [n.id, n]));
      return scope.children
        .filter((e) => !e.background && !elementMaterials(e).some((id) => selected.has(id)))
        .map((e) => ({
          ...visualBounds({
            ...poses.get(e.id)!,
            rotation: e.material ? nodes.get(e.material)?.rotation : poses.get(e.id)!.rotation,
          }),
          id: e.id,
        }));
    }
  }
  const grouped = new Set<string>();
  const targets: SnapTarget[] = [];
  const nodes = new Map(world.nodes.map((node) => [node.id, node]));
  for (const group of world.canvasGroups ?? []) {
    if (!isComponent(world, group, nodes) || group.nodes.some((id) => selected.has(id))) continue;
    group.nodes.forEach((id) => grouped.add(id));
    const members = group.nodes.flatMap((id) => nodes.get(id) ?? []);
    if (members.length && members.length === group.nodes.length && members.every((n) => !n.owner))
      targets.push({
        ...(group.structure
          ? visualBounds({
              ...elementRect(group.structure, group.structure.root.id)!,
              rotation: group.structure.rotation,
            })
          : selectionBounds(members)),
        id: group.id,
      });
  }
  return [
    ...targets,
    ...world.nodes
      .filter((n) => !n.owner && !selected.has(n.id) && !grouped.has(n.id))
      .map((n) => ({ ...visualBounds(n), id: n.id })),
  ];
}
