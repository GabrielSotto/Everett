import type { Point, Rect } from './model';
/** Intervalos prohibidos sobre un eje: encuentra el hueco cercano sin probar cada par de materiales. */
function clearCoordinate(value: number, intervals: [number, number][]): number {
  intervals.sort((a, b) => a[0] - b[0]);
  let lo = Infinity,
    hi = -Infinity;
  const nearest = () => (value - lo <= hi - value ? lo : hi);
  for (const [start, end] of intervals) {
    if (start >= hi) {
      if (value > lo && value < hi) return nearest();
      if (start >= value) return value;
      lo = start;
      hi = end;
    } else hi = Math.max(hi, end);
  }
  return value > lo && value < hi ? nearest() : value;
}
export function clearOrigin(
  base: Point,
  size: Pick<Rect, 'width' | 'height'>,
  occupied: readonly Rect[],
  gap: number,
  verticalOnly = false,
): Point {
  const xs: [number, number][] = [],
    ys: [number, number][] = [];
  for (const r of occupied) {
    const left = r.x - size.width - gap,
      right = r.x + r.width + gap,
      top = r.y - size.height - gap,
      bottom = r.y + r.height + gap;
    if (base.y > top && base.y < bottom) xs.push([left, right]);
    if (base.x > left && base.x < right) ys.push([top, bottom]);
  }
  const y = clearCoordinate(base.y, ys);
  if (verticalOnly) return { x: base.x, y };
  const x = clearCoordinate(base.x, xs);
  return Math.abs(x - base.x) <= Math.abs(y - base.y) ? { x, y: base.y } : { x: base.x, y };
}
