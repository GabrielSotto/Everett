import type { Point, Rect } from './model';

export type OrientedRect = Rect & { rotation?: number | undefined };
export const centerOf = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
export const validRotation = (value: unknown) =>
  value === undefined ||
  (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360);
export const angleOf = (p: Point, center: Point) =>
  (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
export function normalizedAngle(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}
export function rotateVector(p: Point, degrees: number): Point {
  const rad = ((degrees % 360) * Math.PI) / 180,
    c = Math.cos(rad),
    s = Math.sin(rad);
  return { x: c * p.x - s * p.y, y: s * p.x + c * p.y };
}
export function around(p: Point, pivot: Point, degrees: number): Point {
  if (!degrees) return p;
  const d = rotateVector({ x: p.x - pivot.x, y: p.y - pivot.y }, degrees);
  return { x: pivot.x + d.x, y: pivot.y + d.y };
}
export function rotatedPose(rect: OrientedRect, pivot: Point, degrees: number) {
  const center = around(centerOf(rect), pivot, degrees);
  return {
    x: center.x - rect.width / 2,
    y: center.y - rect.height / 2,
    rotation: normalizedAngle((rect.rotation ?? 0) + degrees),
  };
}
export function visualBounds(r: OrientedRect): Rect {
  if (!r.rotation) return { x: r.x, y: r.y, width: r.width, height: r.height };
  const a = rotateVector({ x: 1, y: 0 }, r.rotation);
  const width = Math.abs(a.x) * r.width + Math.abs(a.y) * r.height;
  const height = Math.abs(a.y) * r.width + Math.abs(a.x) * r.height;
  const c = centerOf(r);
  return { x: c.x - width / 2, y: c.y - height / 2, width, height };
}
// La proyección sobre los cuatro ejes excluye las esquinas vacías del límite visible.
export function rectsCross(a: OrientedRect, b: OrientedRect) {
  if (!a.rotation && !b.rotation)
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  const ac = centerOf(a),
    bc = centerOf(b);
  const ax = rotateVector({ x: 1, y: 0 }, a.rotation ?? 0),
    ay = { x: -ax.y, y: ax.x };
  const bx = rotateVector({ x: 1, y: 0 }, b.rotation ?? 0),
    by = { x: -bx.y, y: bx.x };
  const dot = (p: Point, q: Point) => p.x * q.x + p.y * q.y;
  return [ax, ay, bx, by].every(
    (axis) =>
      2 * Math.abs(dot({ x: ac.x - bc.x, y: ac.y - bc.y }, axis)) <
      a.width * Math.abs(dot(ax, axis)) +
        a.height * Math.abs(dot(ay, axis)) +
        b.width * Math.abs(dot(bx, axis)) +
        b.height * Math.abs(dot(by, axis)),
  );
}
export function placeResized(origin: OrientedRect, rect: Rect): Rect {
  if (!origin.rotation) return rect;
  const c = around(centerOf(rect), centerOf(origin), origin.rotation);
  return { ...rect, x: c.x - rect.width / 2, y: c.y - rect.height / 2 };
}
