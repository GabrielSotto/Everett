import { around, centerOf, rotateVector, visualBounds } from './rotation';
import { boundsInFrame, type SnapBounds } from './alignment-bounds';
import type { Rect, Point } from './model';
import { layoutBands, type LayoutFrame } from './layout-guides';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  from: number;
  to: number;
  markers: number[];
  transform?: { degrees: number; pivot: Point };
  target?: string;
  source?: 'object' | 'layout' | 'gap';
}
export interface SnapTarget extends SnapBounds {
  id?: string;
}
export interface SnapMemory {
  x?: string;
  y?: string;
}
type Axis = 'x' | 'y';
const axes = ['x', 'y'] as const;
const cross = (axis: Axis): Axis => (axis === 'x' ? 'y' : 'x');
const extent = (axis: Axis) => (axis === 'x' ? 'width' : 'height');
const end = (r: Rect, axis: Axis) => r[axis] + r[extent(axis)];
const middle = (r: Rect, axis: Axis) => r[axis] + r[extent(axis)] / 2;
const anchors = (r: Rect, axis: Axis) => [r[axis], middle(r, axis), end(r, axis)];
const identity = (r: SnapTarget) => r.id ?? [r.x, r.y, r.width, r.height].join(',');
const acquire = 5,
  release = 8,
  epsilon = 1e-6;

interface Match {
  key: string;
  offset: number;
  target: SnapTarget;
  position: number;
  separation: number;
}

function closestAnchor(
  moving: Rect,
  axis: Axis,
  target: SnapTarget,
  values: number[],
  source: 'layout' | 'object',
  zoom: number,
  previous?: string,
): Match | undefined {
  const other = cross(axis);
  const separation = Math.max(
    0,
    target[other] - end(moving, other),
    moving[other] - end(target, other),
  );
  const points = anchors(moving, axis);
  const prefix = source + ':' + identity(target) + ':' + axis + ':';
  let best: Match | undefined;
  for (const [i, position] of values.entries()) {
    for (const [j, point] of points.entries()) {
      const offset = position - point;
      if (Math.abs(offset) * zoom > release) continue;
      const key = prefix + i + ':' + j;
      if (key === previous) return { key, position, offset, target, separation };
      if (Math.abs(offset) * zoom <= acquire && (!best || Math.abs(offset) < Math.abs(best.offset)))
        best = { key, position, offset, target, separation };
    }
  }
  return best;
}

// Un representante por lado impide que una segunda tarjeta detrás de la primera robe el gesto.
function prefer(a: Match, b: Match, previous?: string): number {
  return (
    a.separation - b.separation ||
    Number(b.key === previous) - Number(a.key === previous) ||
    Math.abs(a.offset) - Math.abs(b.offset) ||
    a.key.localeCompare(b.key)
  );
}

function objectNeighbors(
  moving: Rect,
  targets: SnapTarget[],
  axis: Axis,
  zoom: number,
  previous?: string,
) {
  const nearest = new Map<number, Match>();
  const other = cross(axis);
  for (const target of targets) {
    const match = closestAnchor(
      moving,
      axis,
      target,
      anchors(target, axis),
      'object',
      zoom,
      previous,
    );
    if (!match) continue;
    const side =
      end(target, other) <= moving[other] ? -1 : target[other] >= end(moving, other) ? 1 : 0;
    const old = nearest.get(side);
    if (!old || prefer(match, old, previous) < 0) nearest.set(side, match);
  }
  return [...nearest.values()].sort((a, b) => prefer(a, b, previous));
}

function objectGuides(
  moving: Rect,
  axis: Axis,
  neighbors: Match[],
  winner: Match,
): AlignmentGuide[] {
  const other = cross(axis);
  const points = anchors(moving, axis);
  const guides = new Map<number, AlignmentGuide>();
  for (const { target } of neighbors) {
    const aligned = points.map((point) =>
      anchors(target, axis).some((value) => Math.abs(point - value) < epsilon),
    );
    for (const [i, position] of points.entries()) {
      if (!aligned[i] || (i === 1 && aligned[0] && aligned[2])) continue;
      let line = guides.get(position);
      if (!line) {
        line = {
          axis,
          position,
          from: moving[other],
          to: end(moving, other),
          markers: [middle(moving, other)],
          source: 'object',
        };
        guides.set(position, line);
      }
      line.from = Math.min(line.from, target[other]);
      line.to = Math.max(line.to, end(target, other));
      const mark = middle(target, other);
      if (!line.markers.includes(mark)) line.markers.push(mark);
      if (target.id !== undefined && (!line.target || target === winner.target))
        line.target = target.id;
    }
  }
  return [...guides.values()].sort((a, b) => a.position - b.position);
}

interface Gap {
  before: SnapTarget;
  after: SnapTarget;
  key: string;
  offset: number;
}

function betweenNeighbors(moving: Rect, targets: SnapTarget[], axis: Axis): Gap | undefined {
  const other = cross(axis);
  let before: SnapTarget | undefined, after: SnapTarget | undefined;
  for (const t of targets) {
    if (t[other] >= end(moving, other) || end(t, other) <= moving[other]) continue;
    if (
      end(t, axis) <= moving[axis] &&
      (!before ||
        end(t, axis) > end(before, axis) ||
        (end(t, axis) === end(before, axis) && identity(t) < identity(before)))
    )
      before = t;
    if (
      t[axis] >= end(moving, axis) &&
      (!after ||
        t[axis] < after[axis] ||
        (t[axis] === after[axis] && identity(t) < identity(after)))
    )
      after = t;
  }
  if (!before || !after || after[axis] - end(before, axis) <= moving[extent(axis)]) return;
  if (
    Math.max(before[other], after[other], moving[other]) >=
    Math.min(end(before, other), end(after, other), end(moving, other))
  )
    return;
  return {
    before,
    after,
    key: JSON.stringify(['gap', axis, identity(before), identity(after)]),
    offset: (after[axis] - end(moving, axis) - (moving[axis] - end(before, axis))) / 2,
  };
}

function gapGuides(moving: Rect, axis: Axis, gap: Gap): AlignmentGuide[] {
  const { before, after } = gap,
    other = cross(axis);
  const low = Math.max(moving[other], before[other], after[other]),
    high = Math.min(end(moving, other), end(before, other), end(after, other));
  const left = moving[axis] - end(before, axis),
    right = after[axis] - end(moving, axis);
  if (high <= low || left <= 0 || Math.abs(left - right) > epsilon) return [];
  const spans: [number, number][] = [
    [end(before, axis), moving[axis]],
    [end(moving, axis), after[axis]],
  ];
  return spans.map(([from, to]) => ({
    axis: other,
    position: (low + high) / 2,
    from,
    to,
    markers: [from, to],
    source: 'gap',
  }));
}

export function selectionBounds(input: Rect[]): Rect {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const rect of input) {
    const r = visualBounds(rect);
    x = Math.min(x, r.x);
    y = Math.min(y, r.y);
    right = Math.max(right, r.x + r.width);
    bottom = Math.max(bottom, r.y + r.height);
  }
  return { x, y, width: right - x, height: bottom - y };
}
/** Umbral de pantalla: la misma proximidad funciona con cualquier cámara. */
export function alignRect(
  moving: SnapBounds,
  targets: SnapTarget[],
  zoom: number,
  options: { previous?: SnapMemory; frames?: LayoutFrame[] } = {},
): { correction: Point; guides: AlignmentGuide[]; memory: SnapMemory } {
  const correction = { x: 0, y: 0 },
    guides: AlignmentGuide[] = [],
    memory: SnapMemory = {};

  const z = Math.max(0.01, zoom);
  const contains = (frame: LayoutFrame, item: Rect): boolean => {
    const center = around(centerOf(item), centerOf(frame), -(frame.rotation ?? 0));
    return (
      center.x >= frame.x &&
      center.x <= end(frame, 'x') &&
      center.y >= frame.y &&
      center.y <= end(frame, 'y')
    );
  };
  const frame = options.frames
    ?.filter((item) => contains(item, moving))
    .sort(
      (a, b) => a.width * a.height - b.width * b.height || a.target.id.localeCompare(b.target.id),
    )[0];
  const inside = frame ? targets.filter((t) => contains(frame, t)) : targets;
  if (frame?.rotation) {
    // Evaluar los bordes en los ejes de la retícula y devolver el desplazamiento al Mundo.
    const pivot = centerOf(frame),
      degrees = frame.rotation;
    const local = boundsInFrame(moving, pivot, degrees);
    const neighbors = inside.map((t) => ({
      ...boundsInFrame(t, pivot, degrees),
      ...(t.id !== undefined ? { id: t.id } : {}),
    }));
    const snapped = alignRect(local, neighbors, zoom, {
      ...options,
      frames: [{ ...frame, rotation: 0 }],
    });
    if (snapped.guides.length)
      return {
        correction: rotateVector(snapped.correction, degrees),
        guides: snapped.guides.map((g) => ({ ...g, transform: { degrees, pivot } })),
        memory: snapped.memory,
      };
  }
  // Dentro de un marco se intenta primero con referencias de ese contexto. La retícula
  // sigue disponible aunque estén ocultas las guías de objetos.
  const bands = frame && !frame.rotation ? layoutBands(frame, frame.guides) : [];
  const geometry = new Map<Axis, { match: Match; neighbors: Match[]; layout: boolean }>();
  const appliedGaps = new Map<Axis, Gap>();
  for (const axis of axes) {
    const previous = options.previous?.[axis];
    let neighbors = objectNeighbors(moving, inside, axis, z, previous);
    const positions = [
      ...new Set(bands.filter((b) => b.axis === axis).flatMap((b) => [b[axis], end(b, axis)])),
    ];
    const layout =
      frame && positions.length
        ? closestAnchor(
            moving,
            axis,
            { ...frame, id: frame.target.kind + ':' + frame.target.id },
            positions,
            'layout',
            z,
            previous,
          )
        : undefined;
    if (!neighbors.length && !layout && inside !== targets)
      neighbors = objectNeighbors(moving, targets, axis, z, previous);
    const object = neighbors[0];
    const useLayout =
      !!layout &&
      (!object ||
        layout.key === previous ||
        (object.key !== previous && Math.abs(layout.offset) < Math.abs(object.offset)));
    const match = useLayout ? layout : object;
    if (match) {
      geometry.set(axis, { match, neighbors, layout: useLayout });
      correction[axis] = match.offset;
      memory[axis] = match.key;
    }
  }
  const aligned = { ...moving, x: moving.x + correction.x, y: moving.y + correction.y };
  for (const axis of axes) {
    const other = cross(axis);
    const gap = betweenNeighbors({ ...moving, [other]: aligned[other] }, inside, axis);
    if (!gap) continue;
    const previous = options.previous?.[axis],
      retained = gap.key === previous;
    if (Math.abs(gap.offset) * z > (retained ? release : acquire)) continue;
    const winner = geometry.get(axis)?.match;
    if (
      winner &&
      (winner.key === previous || (!retained && Math.abs(winner.offset) <= Math.abs(gap.offset)))
    )
      continue;
    correction[axis] = gap.offset;
    memory[axis] = gap.key;
    appliedGaps.set(axis, gap);
  }
  const final = { ...moving, x: moving.x + correction.x, y: moving.y + correction.y };
  // Un ajuste perpendicular puede sacar la pieza de la fila que justificaba el hueco.
  // Cada descarte recupera la corrección geométrica de ese eje, como máximo una vez.
  while (appliedGaps.size) {
    const invalid = [...appliedGaps].find(
      ([axis, gap]) => betweenNeighbors(final, inside, axis)?.key !== gap.key,
    );
    if (!invalid) break;
    const [axis] = invalid,
      fallback = geometry.get(axis)?.match;
    appliedGaps.delete(axis);
    correction[axis] = fallback?.offset ?? 0;
    final[axis] = moving[axis] + correction[axis];
    if (fallback) memory[axis] = fallback.key;
    else delete memory[axis];
  }
  for (const axis of axes) {
    const choice = geometry.get(axis);
    const objects = choice ? objectGuides(final, axis, choice.neighbors, choice.match) : [];
    guides.push(...objects);
    if (
      choice?.layout &&
      Math.abs(choice.match.offset - correction[axis]) < epsilon &&
      !objects.some((g) => Math.abs(g.position - choice.match.position) < epsilon)
    ) {
      const other = cross(axis),
        target = choice.match.target;
      guides.push({
        axis,
        position: choice.match.position,
        from: Math.min(final[other], target[other]),
        to: Math.max(end(final, other), end(target, other)),
        markers: [middle(final, other), middle(target, other)],
        source: 'layout',
        target: target.id!,
      });
    }
    const gap = betweenNeighbors(final, inside, axis);
    if (gap) guides.push(...gapGuides(final, axis, gap));
  }
  return { correction, guides, memory };
}
