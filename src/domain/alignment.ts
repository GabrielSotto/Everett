import { around, centerOf, rotateVector, rotatedPose, visualBounds } from './rotation';
import type { Rect, Point } from './model';
import { layoutBands, type LayoutFrame } from './layout-guides';
import { snapAxis } from '../vendor/snap-axis';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  from: number;
  to: number;
  markers: number[];
  transform?: { degrees: number; pivot: Point };
  target?: string;
  source?: 'object' | 'layout';
}
export interface SnapTarget extends Rect {
  id?: string;
}
export interface SnapMemory {
  x?: string;
  y?: string;
}
interface Candidate {
  key: string;
  axis: 'x' | 'y';
  target: SnapTarget;
  source: 'object' | 'layout';
  guide: number;
  offset: number;
  distance: number;
  context: number;
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
  moving: Rect,
  targets: SnapTarget[],
  zoom: number,
  options: { previous?: SnapMemory; frames?: LayoutFrame[] } = {},
): { correction: Point; guides: AlignmentGuide[]; memory: SnapMemory } {
  const correction = { x: 0, y: 0 },
    guides: AlignmentGuide[] = [],
    memory: SnapMemory = {};
  const matches: Candidate[] = [];
  const z = Math.max(0.01, zoom);
  const contains = (rect: Rect, item: Rect): boolean =>
    item.x + item.width / 2 >= rect.x &&
    item.x + item.width / 2 <= rect.x + rect.width &&
    item.y + item.height / 2 >= rect.y &&
    item.y + item.height / 2 <= rect.y + rect.height;
  const frame = options.frames
    ?.filter((item) => {
      const center = around(centerOf(moving), centerOf(item), -(item.rotation ?? 0));
      return contains(item, { ...center, width: 0, height: 0 });
    })
    .sort(
      (a, b) => a.width * a.height - b.width * b.height || a.target.id.localeCompare(b.target.id),
    )[0];
  if (frame?.rotation) {
    // Evaluar los bordes en los ejes de la retícula y devolver el desplazamiento al Mundo.
    const pivot = centerOf(frame),
      degrees = frame.rotation;
    const local = visualBounds({ ...moving, ...rotatedPose(moving, pivot, -degrees) });
    const snapped = alignRect(local, [], zoom, { ...options, frames: [{ ...frame, rotation: 0 }] });
    if (snapped.guides.length)
      return {
        correction: rotateVector(snapped.correction, degrees),
        guides: snapped.guides.map((g) => ({ ...g, transform: { degrees, pivot } })),
        memory: snapped.memory,
      };
  }
  const edges = (rect: Rect, axis: 'x' | 'y'): number[] => {
    const size = axis === 'x' ? rect.width : rect.height;
    return [rect[axis], rect[axis] + size / 2, rect[axis] + size];
  };
  for (const axis of ['x', 'y'] as const) {
    const other = axis === 'x' ? 'y' : 'x',
      size = axis === 'x' ? 'height' : 'width';
    const candidates: Candidate[] = [];
    const add = (target: SnapTarget, positions: number[], source: Candidate['source']): void => {
      const distance = Math.max(
        0,
        target[other] - moving[other] - moving[size],
        moving[other] - target[other] - target[size],
      );
      const identity = target.id ?? [target.x, target.y, target.width, target.height].join(',');
      positions.forEach((guide, edge) =>
        edges(moving, axis).forEach((point, anchor) => {
          const key = `${source}:${identity}:${axis}:${edge}:${anchor}`;
          const threshold = options.previous?.[axis] === key ? 8 : 5;
          const match = snapAxis([point], [guide], threshold / z);
          if (match)
            candidates.push({
              key,
              axis,
              target,
              source,
              guide,
              offset: match.offset,
              distance: distance * z,
              context: frame && !contains(frame, target) ? 1 : 0,
            });
        }),
      );
    };
    targets.forEach((target) => add(target, edges(target, axis), 'object'));
    if (frame && !frame.rotation) {
      const positions = [
        ...new Set(
          layoutBands(frame, frame.guides)
            .filter((band) => band.axis === axis)
            .flatMap((band) => [band[axis], band[axis] + band[axis === 'x' ? 'width' : 'height']]),
        ),
      ];
      add({ ...frame, id: `${frame.target.kind}:${frame.target.id}` }, positions, 'layout');
    }
    if (!candidates.length) continue;
    const context = Math.min(...candidates.map((c) => c.context));
    const nearest = Math.min(
      ...candidates.filter((c) => c.context === context).map((c) => c.distance),
    );
    // Vecindad en pantalla antes de precisión: una coincidencia lejana no roba
    // un borde cercano. Sin vecino próximo sigue siendo posible alinear a distancia.
    const local = candidates.filter((c) => c.context === context && c.distance <= nearest + 32);
    const retained = local.find((c) => c.key === options.previous?.[axis]);
    const match =
      retained ??
      local
        .filter((c) => Math.abs(c.offset) * z <= 5)
        .sort(
          (a, b) =>
            Math.abs(a.offset) - Math.abs(b.offset) ||
            a.distance - b.distance ||
            a.key.localeCompare(b.key),
        )[0];
    if (!match) continue;
    correction[axis] = -match.offset;
    memory[axis] = match.key;
    matches.push(match);
  }
  // Dibujar contra la geometría ya ajustada en ambos ejes, y solo contra la
  // referencia elegida: no prolongar la guía hasta todos los objetos coincidentes.
  for (const { axis, target, guide, source } of matches) {
    const other = axis === 'x' ? 'y' : 'x',
      size = axis === 'x' ? 'height' : 'width';
    const start = moving[other] + correction[other];
    guides.push({
      axis,
      position: guide,
      from: Math.min(start, target[other]),
      to: Math.max(start + moving[size], target[other] + target[size]),
      markers: [start + moving[size] / 2, target[other] + target[size] / 2],
      ...(target.id === undefined ? {} : { target: target.id }),
      source,
    });
  }
  return { correction, guides, memory };
}
