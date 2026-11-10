import { rectsCross } from './rotation';
import type { Material, Rect } from './model';
import type { DeepReadonly } from './readonly';

/** La selección cruza los límites del material; zonas y conjuntos no son materiales. */
export function materialsInRect(nodes: readonly DeepReadonly<Material>[], rect: Rect): string[] {
  if (rect.width <= 0 || rect.height <= 0) return [];
  return nodes.filter((n) => !n.owner && rectsCross(n, rect)).map((n) => n.id);
}
