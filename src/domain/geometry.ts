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
  let x = anchor === 'west' ? 0 : anchor === 'east' ? 1 : 0.5;
  const y = anchor === 'north' ? 0 : anchor === 'south' ? 1 : 0.5;
  if (
    material.data.kind === 'shape' &&
    material.data.shape === 'triangle' &&
    (anchor === 'west' || anchor === 'east')
  )
    x = anchor === 'west' ? 0.25 : 0.75;
  return { x: material.x + x * material.width, y: material.y + y * material.height };
}
export function linkPath(from: Point, to: Point, fromAnchor: Anchor, toAnchor: Anchor): string {
  const normals: Record<Anchor, Point> = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
  };
  const length = Math.max(28, Math.min(160, Math.hypot(to.x - from.x, to.y - from.y) * 0.42));
  const a = normals[fromAnchor],
    b = normals[toAnchor];
  return `M ${from.x} ${from.y} C ${from.x + a.x * length} ${from.y + a.y * length} ${to.x + b.x * length} ${to.y + b.y * length} ${to.x} ${to.y}`;
}
