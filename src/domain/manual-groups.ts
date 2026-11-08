import type { CanvasGroup, Material, Rect, WorldSnapshot, Point } from './model';
import type { DeepReadonly } from './readonly';
import { componentElements, elementMaterials } from './component-tree';

/** Compatibilidad con las composiciones de biblioteca guardadas antes de marcar su tipo. */
export function isComponent(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
  indexedNodes?: ReadonlyMap<string, WorldSnapshot['nodes'][number]>,
): boolean {
  const prefix = group.id.slice(0, -'-group'.length);
  return (
    group.component ??
    (group.id.endsWith('-group') &&
      group.nodes.length > 0 &&
      group.nodes.every(
        (id) =>
          (id === prefix || id.startsWith(prefix + '-')) &&
          (() => {
            const node = indexedNodes ? indexedNodes.get(id) : world.nodes.find((n) => n.id === id);
            return node?.data.kind === 'wireframe' && !!node.data.content.piece;
          })(),
      ))
  );
}
export function componentFor(
  world: WorldSnapshot,
  id: string,
): DeepReadonly<CanvasGroup> | undefined {
  return world.canvasGroups?.find((g) => g.nodes.includes(id) && isComponent(world, g));
}
export function componentSelection(
  world: WorldSnapshot,
  ids: readonly string[],
  editing?: { group: string; element: string },
): string[] {
  return [
    ...new Set(
      ids.flatMap((id) => {
        const group = componentFor(world, id);
        if (group && editing?.group === group.id) {
          const scope =
            group.structure &&
            componentElements(group.structure.root).find((e) => e.id === editing.element);
          const child = scope?.children.find((e) => elementMaterials(e).includes(id));
          return child ? elementMaterials(child) : [id];
        }
        return group?.nodes ?? [id];
      }),
    ),
  ].filter((id) => world.nodes.some((n) => n.id === id && !n.owner));
}

export function groupBounds(
  world: WorldSnapshot,
  group: DeepReadonly<CanvasGroup>,
  preview: readonly Material[] = [],
): Rect {
  if (group.structure) {
    const { origin, root } = group.structure;
    const moved = preview.find((n) => group.nodes.includes(n.id)),
      old = moved && world.nodes.find((n) => n.id === moved.id);
    return {
      x: origin.x + root.x + (moved && old ? moved.x - old.x : 0),
      y: origin.y + root.y + (moved && old ? moved.y - old.y : 0),
      width: root.width,
      height: root.height,
    };
  }
  const nodes = group.nodes.flatMap((id) => {
    const node = preview.find((n) => n.id === id) ?? world.nodes.find((n) => n.id === id);
    if (!node) return [];
    const returned = node.owner ? world.assignments.find((a) => a.node === id)?.returnTo : null;
    return [{ ...node, ...(returned ?? {}) }];
  });
  const padding = isComponent(world, group) ? 0 : 16;
  const x = Math.min(...nodes.map((n) => n.x)) - padding;
  const y = Math.min(...nodes.map((n) => n.y)) - padding;
  return {
    x,
    y,
    width: Math.max(...nodes.map((n) => n.x + n.width)) - x + padding,
    height: Math.max(...nodes.map((n) => n.y + n.height)) - y + padding,
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
    if (isComponent(world, g)) return false;
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
