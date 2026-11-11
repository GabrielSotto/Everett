import type { Anchor, Point, Rect } from './model';
import { linkPath } from './geometry';

export type LabelPlacement = 'start' | 'center' | 'end';
export function validLabelPlacement(value: unknown): value is LabelPlacement {
  return value === 'start' || value === 'center' || value === 'end';
}
/** Distancia sobre el trazo. En conexiones cortas los tres sitios convergen en el centro. */
export function labelDistance(length: number, placement: LabelPlacement = 'center'): number {
  const inset = Math.min(length / 2, 64);
  return placement === 'start' ? inset : placement === 'end' ? length - inset : length / 2;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
/** Elegir un tramo legible del cable sin puntos ni rutas editables. */
export function labelPosition(
  middle: Point,
  size: { width: number; height: number },
  obstacles: readonly Rect[],
): Point {
  const candidates = [
    middle,
    ...obstacles.flatMap((r) => [
      { x: middle.x, y: r.y - size.height / 2 - 6 },
      { x: middle.x, y: r.y + r.height + size.height / 2 + 6 },
      { x: r.x - size.width / 2 - 6, y: middle.y },
      { x: r.x + r.width + size.width / 2 + 6, y: middle.y },
    ]),
  ];
  return (
    candidates
      .sort(
        (a, b) =>
          Math.hypot(a.x - middle.x, a.y - middle.y) - Math.hypot(b.x - middle.x, b.y - middle.y),
      )
      .find(
        (p) =>
          !obstacles.some((r) =>
            overlaps({ x: p.x - size.width / 2, y: p.y - size.height / 2, ...size }, r),
          ),
      ) ?? middle
  );
}
export function labeledPath(
  from: Point,
  to: Point,
  a: Anchor,
  b: Anchor,
  center: Point,
  original: Point,
  fromAngle = 0,
  toAngle = 0,
): string {
  if (Math.hypot(center.x - original.x, center.y - original.y) < 1)
    return linkPath(from, to, a, b, fromAngle, toAngle);
  const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
  const incoming: Anchor = horizontal
    ? to.x >= from.x
      ? 'west'
      : 'east'
    : to.y >= from.y
      ? 'north'
      : 'south';
  const outgoing: Anchor = { north: 'south', south: 'north', west: 'east', east: 'west' }[
    incoming
  ] as Anchor;
  const first = linkPath(from, center, a, incoming, fromAngle);
  const second = linkPath(center, to, outgoing, b, 0, toAngle);
  return first + second.slice(second.indexOf(' C'));
}
