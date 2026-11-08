import type { WorldSnapshot } from './model';
import { isComponent } from './manual-groups';
import { selectionBounds, type SnapTarget } from './alignment';

/** Un componente intacto aporta su límite, no cada detalle decorativo interno. */
export function alignmentTargets(
  world: WorldSnapshot,
  selected: ReadonlySet<string>,
): SnapTarget[] {
  const grouped = new Set<string>();
  const targets: SnapTarget[] = [];
  const nodes = new Map(world.nodes.map((node) => [node.id, node]));
  for (const group of world.canvasGroups ?? []) {
    if (!isComponent(world, group, nodes) || group.nodes.some((id) => selected.has(id))) continue;
    group.nodes.forEach((id) => grouped.add(id));
    const members = group.nodes.flatMap((id) => nodes.get(id) ?? []);
    if (members.length && members.length === group.nodes.length && members.every((n) => !n.owner))
      targets.push({ ...selectionBounds(members), id: group.id });
  }
  return [
    ...targets,
    ...world.nodes.filter((n) => !n.owner && !selected.has(n.id) && !grouped.has(n.id)),
  ];
}
