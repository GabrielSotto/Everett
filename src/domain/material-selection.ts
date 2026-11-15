import { rectsCross } from './rotation';
import { corners, intersectPolygons, visiblePolygon, type FrameMasks } from './frame-clipping';
import type { Material, Rect } from './model';
import type { DeepReadonly } from './readonly';

/** La selección cruza los límites del material; zonas y conjuntos no son materiales. */
export function materialsInRect(
  nodes: readonly DeepReadonly<Material>[],
  rect: Rect,
  masks?: FrameMasks,
): string[] {
  if (rect.width <= 0 || rect.height <= 0) return [];
  const box = corners(rect);
  return nodes
    .filter((n) => {
      if (n.owner || !rectsCross(n, rect)) return false;
      const mask = masks?.get(n.id);
      return !mask || intersectPolygons(visiblePolygon(n, mask), box).length > 0;
    })
    .map((n) => n.id);
}
