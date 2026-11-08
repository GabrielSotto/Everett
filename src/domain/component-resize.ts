import type { CanvasGroup, Material, Rect, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { groupBounds } from './manual-groups';
import { layoutComponent } from './component-layout';
import { elementRect, componentElements } from './component-tree';

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
    const elements = componentElements(tree.root);
    return group.nodes.map((id) => ({
      ...structuredClone(world.nodes.find((n) => n.id === id)!),
      ...elementRect(tree, elements.find((e) => e.material === id)!.id)!,
    })) as Material[];
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
