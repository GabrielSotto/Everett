import type { Material, Point, Link } from './model';
import { anchorPoint, linkPath } from './geometry';
import { around, centerOf } from './rotation';

export function validDetail(p: unknown): p is Point {
  if (!p || typeof p !== 'object') return false;
  const { x, y } = p as Point;
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1;
}
// El punto vive en la imagen visible (object-fit: contain), no en sus bandas vacías.
function imageRect(n: Material) {
  const r = n.data.kind === 'image' ? n.data.ratio : n.width / n.height;
  const width = Math.min(n.width, n.height * r),
    height = width / r;
  return { x: n.x + (n.width - width) / 2, y: n.y + (n.height - height) / 2, width, height };
}
export function imageDetailAt(n: Material, point: Point): Point | null {
  const b = imageRect(n),
    p = around(point, centerOf(n), -(n.rotation ?? 0));
  const result = { x: (p.x - b.x) / b.width, y: (p.y - b.y) / b.height };
  return validDetail(result) ? result : null;
}
export function detailPoint(n: Material, fraction: Point): Point {
  const b = imageRect(n);
  return around(
    { x: b.x + fraction.x * b.width, y: b.y + fraction.y * b.height },
    centerOf(n),
    n.rotation ?? 0,
  );
}
export function cableGeometry(
  l: Link,
  a: Material,
  b: Material,
  drag?: { end: 'from' | 'to'; point: Point },
) {
  let from = drag?.end === 'from' ? drag.point : anchorPoint(a, l.fromAnchor);
  const to =
    drag?.end === 'to'
      ? drag.point
      : l.detail
        ? detailPoint(b, l.detail)
        : anchorPoint(b, l.toAnchor);
  if (l.detail && a.data.kind === 'text' && drag?.end !== 'from') {
    const dx = to.x - from.x,
      dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length) {
      const inset = Math.min(8 / length, 0.25);
      from = { x: from.x + dx * inset, y: from.y + dy * inset };
    }
  }
  const path =
    l.detail || l.path === 'straight'
      ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
      : linkPath(from, to, l.fromAnchor, l.toAnchor, a.rotation, b.rotation);
  return { from, to, path };
}
