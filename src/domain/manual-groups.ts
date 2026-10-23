import type { CanvasGroup, Material, Rect, WorldSnapshot, Point } from './model';
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

/** Elegir el lado con geometría del Mundo evita invertirlo durante el zoom. */
export function groupHeadingSide(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
): 'top' | 'bottom' | 'blocked' {
  const bounds = groupBounds(world, group);
  const obstacles: Rect[] = [
    ...world.nodes.filter((node) => !node.owner && !group.nodes.includes(node.id)),
    ...(world.canvasGroups ?? [])
      .filter((other) => other.id !== group.id)
      .map((other) => groupBounds(world, other)),
  ];
  // Referencia a 100 %: 28 px de encabezado y 20 de separación. Las
  // colisiones proyectadas se comprueban aparte, sin invertir el lado elegido.
  const clear = (y: number): boolean =>
    !obstacles.some(
      (rect) =>
        bounds.x < rect.x + rect.width &&
        bounds.x + Math.min(360, bounds.width) > rect.x &&
        y < rect.y + rect.height &&
        y + 48 > rect.y,
    );
  if (clear(bounds.y - 48)) return 'top';
  if (clear(bounds.y + bounds.height)) return 'bottom';
  return 'blocked';
}

/** Un destino único admite materiales; un conjunto completo se mueve sin anidarse. */
export function groupDropTarget(
  world: WorldSnapshot,
  positions: readonly { id: string; point: Point }[],
): string | null {
  if (!positions.length) return null;
  const ids = positions.map((p) => p.id),
    groups = world.canvasGroups ?? [];
  if (groups.some((g) => g.nodes.every((id) => ids.includes(id)))) return null;
  const nodes = positions.map((p) => {
    const node = world.nodes.find((n) => n.id === p.id && !n.owner);
    return node ? { ...node, ...p.point } : null;
  });
  if (nodes.some((n) => n === null)) return null;
  const targets = groups.filter((g) => {
    if (g.nodes.some((id) => ids.includes(id))) return false;
    const bounds = groupBounds(world, g);
    return nodes.every(
      (n) =>
        n &&
        n.x + n.width / 2 > bounds.x &&
        n.x + n.width / 2 < bounds.x + bounds.width &&
        n.y + n.height / 2 > bounds.y &&
        n.y + n.height / 2 < bounds.y + bounds.height,
    );
  });
  return targets.length === 1 ? targets[0]!.id : null;
}
