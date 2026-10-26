import type { Rect, Point } from './model';
import { snapAxis } from '../vendor/snap-axis';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  from: number;
  to: number;
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
  const edges = (rect: Rect, axis: 'x' | 'y'): number[] => {
    const size = axis === 'x' ? rect.width : rect.height;
    return [rect[axis], rect[axis] + size / 2, rect[axis] + size];
  };
  for (const axis of ['x', 'y'] as const) {
    const stops = targets.flatMap((target) => edges(target, axis));
    const match = snapAxis(edges(moving, axis), stops, 5 / Math.max(0.01, zoom));
    if (!match) continue;
    correction[axis] = -match.offset;
    const other = axis === 'x' ? 'y' : 'x',
      size = axis === 'x' ? 'height' : 'width';
    const aligned = targets.filter((target) =>
      edges(target, axis).some((value) => Math.abs(value - match.guide) < 0.001),
    );
    guides.push({
      axis,
      position: match.guide,
      from: Math.min(moving[other], ...aligned.map((target) => target[other])),
      to: Math.max(
        moving[other] + moving[size],
        ...aligned.map((target) => target[other] + target[size]),
      ),
    });
  }
  return { correction, guides };
}
