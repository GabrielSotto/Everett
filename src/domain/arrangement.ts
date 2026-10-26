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
): { id: string; point: Point }[] {
  if (units.length < (action.startsWith('space') ? 3 : 2)) return [];
  const axis = ['left', 'center-x', 'right', 'space-x'].includes(action) ? 'x' : 'y';
  const size = axis === 'x' ? 'width' : 'height';
  const positions = new Map<ArrangementUnit, number>();
  if (action.startsWith('space')) {
    const sorted = [...units].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0]!,
      last = sorted.at(-1)!;
    const gap =
      (last[axis] + last[size] - first[axis] - sorted.reduce((sum, item) => sum + item[size], 0)) /
      (sorted.length - 1);
    // Espaciar conserva los extremos y requiere espacio entre las piezas.
    if (gap < 0) return [];
    let position = first[axis];
    sorted.forEach((item, i) => {
      positions.set(item, i === sorted.length - 1 ? last[axis] : position);
      position += item[size] + gap;
    });
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
