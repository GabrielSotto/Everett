import type { WorldSnapshot, World, Anchor, Link, Material, Point } from './model';
import { centerOf, rotateVector } from './rotation';
import { ensure } from './invariants';
import { isComponent } from './manual-groups';

export type FlowKind = 'sequence' | 'cycle';
function facing(
  n: Pick<Material, 'rotation' | 'x' | 'y' | 'width' | 'height'>,
  target: Point,
): Anchor {
  const c = centerOf(n),
    delta = rotateVector({ x: target.x - c.x, y: target.y - c.y }, -(n.rotation ?? 0));
  return Math.abs(delta.x) >= Math.abs(delta.y)
    ? delta.x >= 0
      ? 'east'
      : 'west'
    : delta.y >= 0
      ? 'south'
      : 'north';
}
export function selectionFlow(world: WorldSnapshot, ids: readonly string[], kind: FlowKind) {
  if (kind !== 'sequence' && kind !== 'cycle') return null;
  const selected = new Set(ids);
  if (selected.size !== ids.length || ids.length < (kind === 'cycle' ? 3 : 2)) return null;
  const points = world.nodes
    .filter((n) => selected.has(n.id) && !n.owner)
    .map((node) => ({ node, ...centerOf(node) }));
  if (
    points.length !== ids.length ||
    world.canvasGroups?.some((g) => isComponent(world, g) && g.nodes.some((id) => selected.has(id)))
  )
    return null;
  const x = points.map((p) => p.x),
    y = points.map((p) => p.y);
  const horizontal = Math.max(...x) - Math.min(...x) >= Math.max(...y) - Math.min(...y);
  const pivot = points.reduce(
    (a, p) => ({ x: a.x + p.x / points.length, y: a.y + p.y / points.length }),
    { x: 0, y: 0 },
  );
  const angle = (p: Point) =>
    (Math.atan2(p.x - pivot.x, pivot.y - p.y) + 2 * Math.PI) % (2 * Math.PI);
  points.sort(
    (a, b) =>
      (kind === 'cycle' ? angle(a) - angle(b) : 0) ||
      (horizontal ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x) ||
      a.node.id.localeCompare(b.node.id),
  );
  const pairs = points.slice(0, kind === 'cycle' ? points.length : -1).map((p, i) => {
    const q = points[(i + 1) % points.length]!;
    return {
      from: p.node.id,
      to: q.node.id,
      fromAnchor: facing(p.node, q),
      toAnchor: facing(q.node, p),
    };
  });
  return {
    pairs,
    order:
      kind === 'cycle'
        ? 'En sentido horario'
        : horizontal
          ? 'De izquierda a derecha'
          : 'De arriba abajo',
  };
}
export function connectVisualFlow(world: World, ids: string[], kind: FlowKind, uid: () => string) {
  const plan = selectionFlow(world, ids, kind);
  ensure(
    !!plan,
    'GRAPHIC_SELECTION',
    'Seleccioná materiales sueltos: al menos dos para una secuencia o tres para un ciclo.',
  );
  if (!plan) return;
  const existing = new Map<string, Link>();
  const key = (a: string, b: string) => JSON.stringify(a < b ? [a, b] : [b, a]);
  for (const link of world.links) if (!link.detail) existing.set(key(link.from, link.to), link);
  for (const pair of plan.pairs) {
    const link = existing.get(key(pair.from, pair.to));
    if (!link) {
      world.links.push({ ...pair, id: uid(), direction: 'forward' });
      continue;
    }
    const desired = link.from === pair.from ? 'forward' : 'backward';
    if (!link.direction || link.direction === 'none') link.direction = desired;
    else if (link.direction !== desired) link.direction = 'both';
  }
}
