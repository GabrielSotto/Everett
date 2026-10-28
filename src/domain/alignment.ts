import type { Rect, Point } from './model';
import { snapAxis } from '../vendor/snap-axis';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  from: number;
  to: number;
  markers: number[];
}
export function selectionBounds(items: Rect[]): Rect {
  const x = Math.min(...items.map((item) => item.x)),
    y = Math.min(...items.map((item) => item.y));
  return {
    x,
    y,
    width: Math.max(...items.map((item) => item.x + item.width)) - x,
    height: Math.max(...items.map((item) => item.y + item.height)) - y,
  };
}
/** Umbral de pantalla: la misma proximidad funciona con cualquier cámara. */
export function alignRect(
  moving: Rect,
  targets: Rect[],
  zoom: number,
): { correction: Point; guides: AlignmentGuide[] } {
  const correction = { x: 0, y: 0 },
    guides: AlignmentGuide[] = [];
  const matches: { axis: 'x' | 'y'; target: Rect; guide: number }[] = [];
  const edges = (rect: Rect, axis: 'x' | 'y'): number[] => {
    const size = axis === 'x' ? rect.width : rect.height;
    return [rect[axis], rect[axis] + size / 2, rect[axis] + size];
  };
  for (const axis of ['x', 'y'] as const) {
    const other = axis === 'x' ? 'y' : 'x',
      size = axis === 'x' ? 'height' : 'width';
    const candidates = targets
      .flatMap((target) => {
        const match = snapAxis(edges(moving, axis), edges(target, axis), 5 / Math.max(0.01, zoom));
        if (!match) return [];
        const distance = Math.max(
          0,
          target[other] - moving[other] - moving[size],
          moving[other] - target[other] - target[size],
        );
        return [{ target, ...match, distance }];
      })
      .sort(
        (a, b) =>
          Math.abs(a.offset) + a.distance * 0.02 - (Math.abs(b.offset) + b.distance * 0.02) ||
          a.distance - b.distance ||
          a.target[other] - b.target[other],
      );
    const match = candidates[0];
    if (!match) continue;
    correction[axis] = -match.offset;
    matches.push({ axis, target: match.target, guide: match.guide });
  }
  // Dibujar contra la geometría ya ajustada en ambos ejes, y solo contra la
  // referencia elegida: no prolongar la guía hasta todos los objetos coincidentes.
  for (const { axis, target, guide } of matches) {
    const other = axis === 'x' ? 'y' : 'x',
      size = axis === 'x' ? 'height' : 'width';
    const start = moving[other] + correction[other];
    guides.push({
      axis,
      position: guide,
      from: Math.min(start, target[other]),
      to: Math.max(start + moving[size], target[other] + target[size]),
      markers: [start + moving[size] / 2, target[other] + target[size] / 2],
    });
  }
  return { correction, guides };
}
