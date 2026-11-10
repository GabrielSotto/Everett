import type { Material, NodeData, Point } from './model';
import { around, centerOf, rotatedPose } from './rotation';
type Drawing = Extract<NodeData, { kind: 'drawing' }>;
export type FreeArrow = Material & { data: Drawing & { arrow: 'straight' | 'curve' } };
export type ArrowHandle = 'start' | 'bend' | 'end';
export const isArrow = (n: Material): n is FreeArrow => n.data.kind === 'drawing' && !!n.data.arrow;
export const validArrowPoints = (kind: unknown, n: number) =>
  kind === undefined || ((kind === 'straight' || kind === 'curve') && n === 3);
export const arrowTool = (s: string): s is 'straight-arrow' | 'curved-arrow' =>
  s === 'straight-arrow' || s === 'curved-arrow';
const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export function arrowGeometry(points: readonly Point[], thickness: number) {
  const [a, m, b] = points as [Point, Point, Point];
  const q = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
  const angle = Math.atan2(b.y - q.y, b.x - q.x);
  const head = Math.min(Math.max(9, thickness * 3.3), Math.hypot(a.x - b.x, a.y - b.y) * 0.42);
  const tips = [-0.49, 0.49].map((s) => ({
    x: b.x - head * Math.cos(angle + s),
    y: b.y - head * Math.sin(angle + s),
  }));
  const p = (v: Point) => v.x + ' ' + v.y;
  const path = 'M' + p(a) + ' Q' + p(q) + ' ' + p(b);
  const ends = 'M' + p(tips[0]!) + ' L' + p(b) + ' ' + p(tips[1]!);
  // Incluye los extremos reales de la cuadrática y los dos brazos de la punta.
  const limits = [a, b, ...tips];
  for (const k of ['x', 'y'] as const) {
    const t = (a[k] - q[k]) / (a[k] - 2 * q[k] + b[k]);
    if (t > 0 && t < 1)
      limits.push({
        x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * q.x + t * t * b.x,
        y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * q.y + t * t * b.y,
      });
  }
  const pad = thickness / 2 + 1;
  const x = Math.min(...limits.map((p) => p.x)) - pad,
    y = Math.min(...limits.map((p) => p.y)) - pad;
  return {
    path,
    ends,
    rect: {
      x,
      y,
      width: Math.max(4, Math.max(...limits.map((p) => p.x)) + pad - x),
      height: Math.max(4, Math.max(...limits.map((p) => p.y)) + pad - y),
    },
  };
}
function located(data: FreeArrow['data'], points: Point[]) {
  const rect = arrowGeometry(points, data.thickness).rect;
  return {
    ...rect,
    data: { ...data, points: points.map((p) => ({ x: p.x - rect.x, y: p.y - rect.y })) },
  };
}
export function createArrow(
  id: string,
  a: Point,
  b: Point,
  curve: boolean,
  color: string,
  thickness: number,
): FreeArrow {
  const m = mid(a, b);
  if (curve) {
    m.x += (b.y - a.y) * 0.22;
    m.y -= (b.x - a.x) * 0.22;
  }
  return {
    id,
    owner: null,
    ...located(
      {
        kind: 'drawing',
        arrow: curve ? 'curve' : 'straight',
        title: curve ? 'Flecha curva' : 'Flecha recta',
        points: [],
        color,
        thickness,
      },
      [a, m, b],
    ),
  };
}
function relocalize(n: FreeArrow, data: FreeArrow['data'], points: Point[]) {
  const next = located(data, points);
  const { x, y } = rotatedPose(next, centerOf(n), n.rotation ?? 0);
  return { ...next, x, y };
}
export function editArrow(n: FreeArrow, h: ArrowHandle, worldPoint: Point): FreeArrow {
  const p = around(worldPoint, centerOf(n), -(n.rotation ?? 0));
  const [a, m, b] = n.data.points.map((v) => ({ x: v.x + n.x, y: v.y + n.y })) as [
    Point,
    Point,
    Point,
  ];
  const start = h === 'start' ? p : a,
    end = h === 'end' ? p : b;
  if (Math.hypot(end.x - start.x, end.y - start.y) < 1) return n;
  const center = mid(start, end),
    old = mid(a, b);
  const bend = h === 'bend' ? p : { x: center.x + m.x - old.x, y: center.y + m.y - old.y };
  const straight = Math.hypot(bend.x - center.x, bend.y - center.y) < 0.75;
  return {
    ...n,
    ...relocalize(n, { ...n.data, arrow: straight ? 'straight' : 'curve' }, [
      start,
      straight ? center : bend,
      end,
    ]),
  };
}
export function restrokeArrow(n: FreeArrow, thickness: number) {
  return relocalize(
    n,
    { ...n.data, thickness },
    n.data.points.map((p) => ({ x: p.x + n.x, y: p.y + n.y })),
  );
}
