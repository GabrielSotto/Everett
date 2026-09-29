import type { Point, Rect, Camera } from '../domain/model';
import { focusTuning } from './tuning';
export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(n, Math.max(min, max)));
export function bound(
  p: Point,
  size: {
    width: number;
    height: number;
  },
  rect: Rect,
  inset = 12,
): Point {
  return {
    x: clamp(p.x, rect.x + inset, rect.x + rect.width - size.width - inset),
    y: clamp(p.y, rect.y + inset, rect.y + rect.height - size.height - inset),
  };
}
export function toWorld(p: Point, c: Camera, r: Rect): Point {
  return { x: (p.x - r.x - r.width / 2 - c.x) / c.z, y: (p.y - r.y - r.height / 2 - c.y) / c.z };
}
export const gravityGain = (travel: number): number => {
  const t = clamp(travel / focusTuning.escapeTravelPx, 0, 1);
  return focusTuning.minimumGain + (1 - focusTuning.minimumGain) * t * t * (3 - 2 * t);
};
export function focus(
  items: (Point & {
    id: string;
  })[],
  c: Camera,
  current: string | null,
  hysteresis = 50,
): string | null {
  let nearest: string | null = null,
    best = Infinity,
    currentDistance = Infinity;
  for (const i of items) {
    const d = Math.hypot(i.x * c.z + c.x, i.y * c.z + c.y);
    if (d < best) {
      best = d;
      nearest = i.id;
    }
    if (i.id === current) currentDistance = d;
  }
  return current && currentDistance - best < hysteresis ? current : nearest;
}
