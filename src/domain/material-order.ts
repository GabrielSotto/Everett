import { rectsCross } from './rotation';
export type MaterialOrder = 'front' | 'forward' | 'backward' | 'back';

interface LayerItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  owner?: string | null;
}

function overlaps(a: LayerItem, b: LayerItem): boolean {
  return !a.owner && !b.owner && rectsCross(a, b);
}

/** Orden de fondo a frente. Cada paso cruza una superposición visible, sin
 * detenerse en materiales lejanos ni invertir los miembros seleccionados. */
export function orderMaterials<T extends LayerItem>(
  items: readonly T[],
  ids: readonly string[],
  order: MaterialOrder,
): T[] {
  const selected = new Set(ids);
  const forward = order === 'front' || order === 'forward';
  const movable = items.some(
    (item, index) =>
      selected.has(item.id) &&
      items.some(
        (other, otherIndex) =>
          !selected.has(other.id) &&
          (forward ? otherIndex > index : otherIndex < index) &&
          overlaps(item, other),
      ),
  );
  if (!movable) return [...items];
  if (order === 'front' || order === 'back') {
    const moved = items.filter((item) => selected.has(item.id)),
      rest = items.filter((item) => !selected.has(item.id));
    return order === 'front' ? [...rest, ...moved] : [...moved, ...rest];
  }
  const result = [...items];
  if (order === 'forward') {
    for (const item of [...items].reverse().filter((item) => selected.has(item.id))) {
      const at = result.indexOf(item),
        next = result.findIndex(
          (other, index) => index > at && !selected.has(other.id) && overlaps(item, other),
        );
      if (next < 0) continue;
      // Mantener la selección como bloque estable al atravesar la capa encontrada.
      const target = result[next]!,
        block = result.slice(at, next).filter((other) => selected.has(other.id));
      for (const member of block) result.splice(result.indexOf(member), 1);
      result.splice(result.indexOf(target) + 1, 0, ...block);
    }
  } else {
    for (const item of items.filter((item) => selected.has(item.id))) {
      const at = result.indexOf(item);
      let previous = at - 1;
      while (
        previous >= 0 &&
        (selected.has(result[previous]!.id) || !overlaps(item, result[previous]!))
      )
        previous--;
      if (previous < 0) continue;
      const target = result[previous]!,
        block = result.slice(previous + 1, at + 1).filter((other) => selected.has(other.id));
      for (const member of block) result.splice(result.indexOf(member), 1);
      result.splice(result.indexOf(target), 0, ...block);
    }
  }
  return result;
}

export function canOrderMaterials<T extends LayerItem>(
  items: readonly T[],
  ids: readonly string[],
  order: MaterialOrder,
): boolean {
  return orderMaterials(items, ids, order).some((item, index) => item.id !== items[index]?.id);
}
