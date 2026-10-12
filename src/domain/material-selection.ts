import type { Material, Rect } from './model';
import type { DeepReadonly } from './readonly';

/** El rectángulo incluye materiales libres completos; las zonas son destinos fijos. */
export function materialsInRect(nodes: readonly DeepReadonly<Material>[], rect: Rect): string[] {
  return nodes
    .filter(
      (n) =>
        !n.owner &&
        n.x >= rect.x &&
        n.y >= rect.y &&
        n.x + n.width <= rect.x + rect.width &&
        n.y + n.height <= rect.y + rect.height,
    )
    .map((n) => n.id);
}
