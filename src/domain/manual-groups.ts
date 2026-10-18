import type { CanvasGroup, Material, Rect, WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';

export function groupBounds(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
  preview: readonly Material[] = [],
): Rect {
  const nodes = group.nodes.flatMap((id) => {
    const node = preview.find((n) => n.id === id) ?? world.nodes.find((n) => n.id === id);
    if (!node) return [];
    const returned = node.owner ? world.assignments.find((a) => a.node === id)?.returnTo : null;
    return [{ ...node, ...(returned ?? {}) }];
  });
  const x = Math.min(...nodes.map((n) => n.x)) - 16;
  const y = Math.min(...nodes.map((n) => n.y)) - 16;
  return {
    x,
    y,
    width: Math.max(...nodes.map((n) => n.x + n.width)) - x + 16,
    height: Math.max(...nodes.map((n) => n.y + n.height)) - y + 16,
  };
}
