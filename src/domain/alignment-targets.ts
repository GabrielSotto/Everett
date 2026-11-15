import { snapBounds, type SnapBounds } from './alignment-bounds';
import type { WorldSnapshot } from './model';
import { groupBounds, isComponent } from './manual-groups';
import { selectionBounds, type SnapTarget } from './alignment';
import { componentElements, elementMaterials, parentOf } from './component-tree';
import { componentPoses } from './component-geometry';
import { corners, intersectPolygons, visiblePolygon, type Polygon } from './frame-clipping';
import { layoutFrames } from './layout-guides';

type EditingScope = { group: string; element: string };

/** Durante un arrastre la selección y sus vecinos usan las mismas cajas de capa. */
export function alignmentScene(
  world: WorldSnapshot,
  selected: ReadonlySet<string>,
  editing?: EditingScope,
) {
  const nodes = new Map(world.nodes.map((n) => [n.id, n]));
  const remaining = new Set(selected);
  const moving: SnapBounds[] = [],
    targets: SnapTarget[] = [];
  const add = (rect: SnapBounds, id: string, chosen: boolean) => {
    if (chosen) moving.push(rect);
    else targets.push({ ...rect, id });
  };
  const structure = world.canvasGroups?.find((g) => g.id === editing?.group)?.structure;
  const scope =
    structure && componentElements(structure.root).find((e) => e.id === editing?.element);
  if (structure && scope) {
    const poses = componentPoses(structure);
    let mask: Polygon | undefined;
    for (
      let parent: typeof scope | undefined = scope;
      parent;
      parent = parentOf(structure.root, parent.id)
    ) {
      if (parent.clipContent) {
        const polygon = corners(poses.get(parent.id)!);
        mask = mask ? intersectPolygons(mask, polygon) : polygon;
      }
    }
    for (const child of scope.children) {
      const members = elementMaterials(child);
      if (!members.length || members.some((id) => nodes.get(id)?.owner)) continue;
      const chosen = members.every((id) => selected.has(id));
      if (!chosen && (child.background || members.some((id) => selected.has(id)))) continue;
      const pose = {
        ...poses.get(child.id)!,
        rotation: child.material
          ? nodes.get(child.material)?.rotation
          : poses.get(child.id)!.rotation,
      };
      if (mask && !chosen) {
        const visible = visiblePolygon(pose, mask);
        if (!visible.length) continue;
        add(snapBounds(pose, visible), child.id, false);
      } else add(snapBounds(pose), child.id, chosen);
      if (chosen) for (const id of members) remaining.delete(id);
    }
  } else {
    const grouped = new Set<string>();
    for (const group of world.canvasGroups ?? []) {
      const chosen = group.nodes.every((id) => selected.has(id));
      if (!chosen && !isComponent(world, group, nodes)) continue;
      for (const id of group.nodes) grouped.add(id);
      const members = group.nodes.flatMap((id) => nodes.get(id) ?? []);
      if (!members.length || members.length !== group.nodes.length || members.some((n) => n.owner))
        continue;
      if (!chosen && group.nodes.some((id) => selected.has(id))) continue;
      const tree = group.structure;
      const box = tree
        ? snapBounds({ ...groupBounds(world, group), rotation: tree.rotation })
        : selectionBounds(members);
      add(box, group.id, chosen);
      if (chosen) for (const id of group.nodes) remaining.delete(id);
    }
    for (const node of nodes.values()) {
      if (!node.owner && !grouped.has(node.id)) {
        add(snapBounds(node), node.id, selected.has(node.id));
        remaining.delete(node.id);
      }
    }
  }
  for (const id of remaining) {
    const n = nodes.get(id);
    if (n) moving.push(snapBounds(n));
  }
  return {
    moving: moving.length > 1 ? selectionBounds(moving) : moving[0],
    parts: moving,
    targets,
  };
}

export function alignmentLayoutFrames(
  world: WorldSnapshot,
  selected: ReadonlySet<string>,
  editing?: EditingScope,
) {
  const frames = layoutFrames(world);
  if (!editing) return frames.filter((f) => !f.members.some((id) => selected.has(id)));
  const tree = world.canvasGroups?.find((g) => g.id === editing.group)?.structure;
  const scope = tree && componentElements(tree.root).find((e) => e.id === editing.element);
  if (!scope) return [];
  const local = new Set(
    scope.children.flatMap((child) => (child.material ? [child.material] : [])),
  );
  return frames.filter((f) =>
    f.target.kind === 'group'
      ? f.target.id === editing.group && !f.members.every((id) => selected.has(id))
      : local.has(f.target.id) && !selected.has(f.target.id),
  );
}

export function alignmentTargets(
  world: WorldSnapshot,
  selected: ReadonlySet<string>,
  editing?: EditingScope,
) {
  return alignmentScene(world, selected, editing).targets;
}
