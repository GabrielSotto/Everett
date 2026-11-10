import { around, centerOf, rotateVector } from './rotation';
import type { Point, Rect, Material, Anchor, Shape } from './model';

export const minimumDrawSize = 4;
export function drawRect(start: Point, end: Point, minimum = minimumDrawSize): Rect {
  const width = Math.max(minimum, Math.abs(end.x - start.x));
  const height = Math.max(minimum, Math.abs(end.y - start.y));
  return {
    x: end.x < start.x ? start.x - width : start.x,
    y: end.y < start.y ? start.y - height : start.y,
    width,
    height,
  };
}
export function shapeVertices(shape: Shape): Point[] {
  if (shape === 'triangle')
    return [
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  if (shape === 'star') {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 0.5 : 0.22;
      return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
    });
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y)),
      maxY = Math.max(...points.map((p) => p.y));
    return points.map((p) => ({
      x: (p.x - minX) / (maxX - minX),
      y: (p.y - minY) / (maxY - minY),
    }));
  }
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
}
export function anchorPoint(material: Material, anchor: Anchor): Point {
  return around(unrotatedAnchor(material, anchor), centerOf(material), material.rotation ?? 0);
}
export function unrotatedAnchor(material: Material, anchor: Anchor): Point {
  if (material.data.kind === 'drawing') {
    const horizontal = anchor === 'west' || anchor === 'east';
    const direction = anchor === 'west' || anchor === 'north' ? -1 : 1;
    const points = material.data.points;
    const edge = Math.max(...points.map((p) => (horizontal ? p.x : p.y) * direction));
    const center = (horizontal ? material.height : material.width) / 2;
    const point = points
      .filter((p) => Math.abs((horizontal ? p.x : p.y) * direction - edge) < 0.01)
      .reduce((best, p) =>
        Math.abs((horizontal ? p.y : p.x) - center) <
        Math.abs((horizontal ? best.y : best.x) - center)
          ? p
          : best,
      );
    return { x: material.x + point.x, y: material.y + point.y };
  }
  let x = anchor === 'west' ? 0 : anchor === 'east' ? 1 : 0.5;
  const y = anchor === 'north' ? 0 : anchor === 'south' ? 1 : 0.5;
  if (material.data.kind === 'shape' && ['triangle', 'star'].includes(material.data.shape)) {
    const vertices = shapeVertices(material.data.shape);
    const horizontal = anchor === 'west' || anchor === 'east';
    const intersections: number[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i]!,
        b = vertices[(i + 1) % vertices.length]!;
      const start = horizontal ? a.y : a.x,
        end = horizontal ? b.y : b.x;
      if (start === end || 0.5 < Math.min(start, end) || 0.5 > Math.max(start, end)) continue;
      const t = (0.5 - start) / (end - start);
      intersections.push(
        (horizontal ? a.x : a.y) + t * ((horizontal ? b.x : b.y) - (horizontal ? a.x : a.y)),
      );
    }
    const value =
      anchor === 'west' || anchor === 'north'
        ? Math.min(...intersections)
        : Math.max(...intersections);
    return {
      x: material.x + (horizontal ? value : 0.5) * material.width,
      y: material.y + (horizontal ? 0.5 : value) * material.height,
    };
  }
  return { x: material.x + x * material.width, y: material.y + y * material.height };
}
export function linkPath(
  from: Point,
  to: Point,
  fromAnchor: Anchor,
  toAnchor: Anchor,
  fromAngle = 0,
  toAngle = 0,
): string {
  const normals: Record<Anchor, Point> = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
  };
  const length = Math.max(28, Math.min(160, Math.hypot(to.x - from.x, to.y - from.y) * 0.42));
  const a = rotateVector(normals[fromAnchor], fromAngle),
    b = rotateVector(normals[toAnchor], toAngle);
  return `M ${from.x} ${from.y} C ${from.x + a.x * length} ${from.y + a.y * length} ${to.x + b.x * length} ${to.y + b.y * length} ${to.x} ${to.y}`;
}
