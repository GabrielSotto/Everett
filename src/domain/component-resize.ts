import type { CanvasGroup, Material, Rect, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { groupBounds } from './manual-groups';
import { layoutComponent } from './component-layout';
import { componentElements } from './component-tree';
import { componentPoses } from './component-geometry';

/** Escalar la composición mantiene las proporciones y la tipografía de sus piezas. */
export function resizedComponent(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
  rect: Rect,
  scaleStructure = false,
): Material[] {
  if (group.structure && !scaleStructure) {
    const tree = structuredClone(group.structure) as NonNullable<CanvasGroup['structure']>;
    tree.root.width = rect.width;
    tree.root.height = rect.height;
    tree.root.widthMode = tree.root.heightMode = 'fixed';
    tree.origin = { x: rect.x - tree.root.x, y: rect.y - tree.root.y };
    layoutComponent(tree.root);
    const poses = componentPoses(tree);
    const geometry = new Map(
      componentElements(tree.root).map((e) => [e.material, poses.get(e.id)!]),
    );
    const members = new Map(world.nodes.map((n) => [n.id, n]));
    return group.nodes.map((id) => {
      const { x, y, width, height } = geometry.get(id)!;
      return { ...structuredClone(members.get(id)!), x, y, width, height } as Material;
    });
  }
  const bounds = groupBounds(world, group);
  const sx = rect.width / bounds.width,
    sy = rect.height / bounds.height;
  const scale = Math.min(sx, sy);
  return group.nodes.map((id) => {
    const original = world.nodes.find((n) => n.id === id)!;
    const node = structuredClone(original) as Material;
    Object.assign(node, {
      x: rect.x + (original.x - bounds.x) * sx,
      y: rect.y + (original.y - bounds.y) * sy,
      width: original.width * sx,
      height: original.height * sy,
    });
    if (node.data.kind === 'wireframe') {
      const content = node.data.content;
      if (content.piece)
        for (const [key, value] of Object.entries(content.piece.style)) {
          content.piece.style[key as keyof typeof content.piece.style] = value.replace(
            /(-?[\d.]+)px\b/g,
            (_, n: string) => Number(n) * scale + 'px',
          );
        }
      if (content.appearance) content.appearance.radius *= scale;
    }
    return node;
  });
}
