import type { Material, Point, Rect, WorldSnapshot } from './model';
import { selectionBounds } from './alignment';

export const arrangements = [
  'left',
  'center-x',
  'right',
  'top',
  'center-y',
  'bottom',
  'space-x',
  'space-y',
] as const;
export type Arrangement = (typeof arrangements)[number];
export interface ArrangementUnit extends Rect {
  nodes: readonly Material[];
}

/** Los conjuntos seleccionados completos se ordenan como una sola pieza. */
export function arrangementUnits(world: WorldSnapshot, ids: readonly string[]): ArrangementUnit[] {
  const selected = world.nodes.filter((node) => !node.owner && ids.includes(node.id));
  const remaining = new Set(selected.map((node) => node.id));
  const units: ArrangementUnit[] = [];
  for (const group of world.canvasGroups ?? []) {
    if (!group.nodes.length || !group.nodes.every((id) => remaining.has(id))) continue;
    const nodes = selected.filter((node) => group.nodes.includes(node.id));
    units.push({ ...selectionBounds(nodes), nodes });
    nodes.forEach((node) => remaining.delete(node.id));
  }
  for (const node of selected) if (remaining.has(node.id)) units.push({ ...node, nodes: [node] });
  return units;
}

export function arrangementMoves(
  units: readonly ArrangementUnit[],
  action: Arrangement,
  spacing?: number,
): { id: string; point: Point }[] {
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0 || spacing > 10000))
    return [];
  if (units.length < (action.startsWith('space') && spacing === undefined ? 3 : 2)) return [];
  const axis = ['left', 'center-x', 'right', 'space-x'].includes(action) ? 'x' : 'y';
  const size = axis === 'x' ? 'width' : 'height';
  const positions = new Map<ArrangementUnit, number>();
  if (action.startsWith('space') && spacing !== undefined) {
    const ordered = [...units].sort((a, b) => a[axis] - b[axis]);
    let cursor = ordered[0]![axis];
    for (const item of ordered) {
      positions.set(item, cursor);
      cursor += item[size] + spacing;
    }
  } else if (action.startsWith('space')) {
    const ordered = [...units].sort((a, b) => a[axis] - b[axis]);
    const total = units.reduce((sum, item) => sum + item[size], 0);
    const gap =
      (ordered.at(-1)![axis] + ordered.at(-1)![size] - ordered[0]![axis] - total) /
      (units.length - 1);
    // Con solapamiento, repartir centros mantiene un orden estable incluso si
    // una pantalla contiene otras piezas mucho más pequeñas.
    const centers = gap < 0;
    const coordinate = (item: ArrangementUnit) => item[axis] + (centers ? item[size] / 2 : 0);
    const sorted = centers ? [...units].sort((a, b) => coordinate(a) - coordinate(b)) : ordered;
    const first = sorted[0]!,
      last = sorted.at(-1)!;
    const step = (coordinate(last) - coordinate(first)) / (sorted.length - 1);
    let position = first[axis];
    sorted.forEach((item, i) => {
      positions.set(
        item,
        centers
          ? coordinate(first) + step * i - item[size] / 2
          : i === sorted.length - 1
            ? last[axis]
            : position,
      );
      position += item[size] + gap;
    });
    if (centers) {
      const projected = units.map((item) => ({ item, start: positions.get(item)! }));
      const start = Math.min(...projected.map((p) => p.start));
      const end = Math.max(...projected.map((p) => p.start + p.item[size]));
      const resolvedGap = (end - start - total) / (units.length - 1);
      // Un elemento muy grande puede ampliar los límites al repartir centros.
      // Resolver el espacio resultante en el mismo paso evita que repetir la
      // acción cambie otra vez la disposición.
      if (resolvedGap >= 0) {
        let cursor = start;
        for (const { item } of projected.sort((a, b) => a.start - b.start)) {
          positions.set(item, cursor);
          cursor += item[size] + resolvedGap;
        }
      }
    }
  } else {
    const bounds = selectionBounds([...units]);
    const factor = action.startsWith('center') ? 0.5 : ['right', 'bottom'].includes(action) ? 1 : 0;
    for (const item of units)
      positions.set(item, bounds[axis] + (bounds[size] - item[size]) * factor);
  }
  return units.flatMap((item) => {
    const delta = positions.get(item)! - item[axis];
    return Math.abs(delta) < 0.000001
      ? []
      : item.nodes.map((node) => ({
          id: node.id,
          point: { x: node.x + (axis === 'x' ? delta : 0), y: node.y + (axis === 'y' ? delta : 0) },
        }));
  });
}
