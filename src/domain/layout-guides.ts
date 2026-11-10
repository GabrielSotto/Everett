import type { Material, Rect, WorldSnapshot } from './model';
import { isComponent } from './manual-groups';

export interface LayoutTracks {
  count: number;
  margin: number;
  gap: number;
}
export interface LayoutGuides {
  columns?: LayoutTracks;
  rows?: LayoutTracks;
}
export type LayoutTarget = { kind: 'node' | 'group'; id: string };
export interface LayoutFrame extends Rect {
  rotation?: number;
  target: LayoutTarget;
  guides: LayoutGuides;
  members: readonly string[];
}
export interface LayoutBand extends Rect {
  axis: 'x' | 'y';
}
export function validLayoutGuides(value: unknown): value is LayoutGuides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const guides = value as LayoutGuides;
  if (!guides.columns && !guides.rows) return false;
  return [guides.columns, guides.rows].every(
    (tracks) =>
      tracks === undefined ||
      (!!tracks &&
        Number.isInteger(tracks.count) &&
        tracks.count >= 1 &&
        tracks.count <= 64 &&
        Number.isFinite(tracks.margin) &&
        tracks.margin >= 0 &&
        tracks.margin <= 10000 &&
        Number.isFinite(tracks.gap) &&
        tracks.gap >= 0 &&
        tracks.gap <= 10000),
  );
}
/** Las pistas se calculan a partir del marco; nunca se guardan coordenadas de pantalla. */
export function layoutBands(rect: Rect, guides: LayoutGuides): LayoutBand[] {
  if (!validLayoutGuides(guides)) return [];
  return (['x', 'y'] as const).flatMap((axis) => {
    const tracks = axis === 'x' ? guides.columns : guides.rows;
    if (!tracks) return [];
    const length = axis === 'x' ? rect.width : rect.height;
    const size = (length - 2 * tracks.margin - (tracks.count - 1) * tracks.gap) / tracks.count;
    // Un marco puede encogerse por edición. Una retícula sin espacio no pinta
    // bandas negativas ni altera el contenido: el editor permite corregirla.
    if (size < 1) return [];
    return Array.from({ length: tracks.count }, (_, index) => ({
      ...rect,
      axis,
      [axis]: rect[axis] + tracks.margin + index * (size + tracks.gap),
      [axis === 'x' ? 'width' : 'height']: size,
    }));
  });
}
export function layoutGuideError(rect: Rect, guides: LayoutGuides): string | null {
  if (!validLayoutGuides(guides))
    return 'Usá entre 1 y 64 pistas, con margen y separación de 0 a 10.000.';
  for (const [tracks, length, name] of [
    [guides.columns, rect.width, 'columnas'],
    [guides.rows, rect.height, 'filas'],
  ] as const) {
    if (tracks && length - 2 * tracks.margin - (tracks.count - 1) * tracks.gap < tracks.count)
      return `Las ${name} no caben en el marco. Reducí el margen, la separación o la cantidad.`;
  }
  return null;
}
export function supportsLayoutGuides(node: Pick<Material, 'data' | 'owner'>): boolean {
  return (
    !node.owner &&
    (node.data.kind === 'wireframe' ||
      (node.data.kind === 'shape' && node.data.shape === 'rectangle'))
  );
}
export function selectedLayoutTarget(
  world: WorldSnapshot,
  ids: readonly string[],
): LayoutTarget | null {
  if (!ids.length) return null;
  const selected = new Set(ids);
  const nodes = new Map(world.nodes.map((node) => [node.id, node]));
  const group = world.canvasGroups?.find(
    (g) =>
      g.nodes.length === ids.length &&
      g.nodes.every((id) => selected.has(id)) &&
      isComponent(world, g, nodes) &&
      g.nodes.every((id) => nodes.has(id) && !nodes.get(id)!.owner),
  );
  if (group) return { kind: 'group', id: group.id };
  const node = ids.length === 1 ? nodes.get(ids[0]!) : undefined;
  return node && supportsLayoutGuides(node) ? { kind: 'node', id: node.id } : null;
}
export function layoutFrame(world: WorldSnapshot, target: LayoutTarget): LayoutFrame | null {
  return indexedLayoutFrame(world, target, new Map(world.nodes.map((n) => [n.id, n])));
}
function indexedLayoutFrame(
  world: WorldSnapshot,
  target: LayoutTarget,
  nodes: ReadonlyMap<string, WorldSnapshot['nodes'][number]>,
): LayoutFrame | null {
  if (target.kind === 'group') {
    const group = world.canvasGroups?.find((g) => g.id === target.id);
    if (!group || !isComponent(world, group, nodes)) return null;
    const members = group.nodes.flatMap((id) => nodes.get(id) ?? []);
    if (!members.length || members.length !== group.nodes.length || members.some((n) => n.owner))
      return null;
    if (group.structure) {
      const { origin, root } = group.structure;
      return {
        ...(group.structure.rotation ? { rotation: group.structure.rotation } : {}),
        x: origin.x + root.x,
        y: origin.y + root.y,
        width: root.width,
        height: root.height,
        target,
        members: group.nodes,
        guides: group.layoutGuides ?? {},
      };
    }
    const x = Math.min(...members.map((n) => n.x)),
      y = Math.min(...members.map((n) => n.y));
    return {
      x,
      y,
      width: Math.max(...members.map((n) => n.x + n.width)) - x,
      height: Math.max(...members.map((n) => n.y + n.height)) - y,
      target,
      members: group.nodes,
      guides: group.layoutGuides ?? {},
    };
  }
  const node = nodes.get(target.id);
  return node && supportsLayoutGuides(node)
    ? { ...node, target, members: [node.id], guides: node.layoutGuides ?? {} }
    : null;
}
export function layoutFrames(world: WorldSnapshot): LayoutFrame[] {
  const nodes = new Map(world.nodes.map((n) => [n.id, n]));
  const targets: LayoutTarget[] = [
    ...world.nodes.filter((n) => n.layoutGuides).map((n) => ({ kind: 'node' as const, id: n.id })),
    ...(world.canvasGroups ?? [])
      .filter((g) => g.layoutGuides)
      .map((g) => ({ kind: 'group' as const, id: g.id })),
  ];
  return targets.flatMap((target) => indexedLayoutFrame(world, target, nodes) ?? []);
}
