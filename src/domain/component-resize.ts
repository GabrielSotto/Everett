import type { CanvasGroup, Material, Rect, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { groupBounds } from './manual-groups';

/** Escalar la composición mantiene las proporciones y la tipografía de sus piezas. */
export function resizedComponent(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
  rect: Rect,
): Material[] {
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
