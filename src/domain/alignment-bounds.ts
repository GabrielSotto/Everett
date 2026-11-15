import type { Point, Rect } from './model';
import { around, visualBounds, type OrientedRect } from './rotation';
import { corners, type Polygon } from './frame-clipping';

export interface SnapBounds extends Rect {
  /** Vértices relativos a la caja. Se trasladan con ella durante el arrastre. */
  outline?: Point[];
}

function boundsOf(points: Polygon): Rect {
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function snapBounds(pose: OrientedRect, visible?: Polygon): SnapBounds {
  if (!visible && !pose.rotation) return visualBounds(pose);
  const shape = visible ?? corners(pose),
    box = boundsOf(shape);
  const rectangular =
    shape.length === 4 &&
    shape.every(
      (p) =>
        (p.x === box.x || p.x === box.x + box.width) &&
        (p.y === box.y || p.y === box.y + box.height),
    );
  if (rectangular) return box;
  return { ...box, outline: shape.map((p) => ({ x: p.x - box.x, y: p.y - box.y })) };
}

export function boundsInFrame(box: SnapBounds, pivot: Point, degrees: number): Rect {
  const points = box.outline?.map((p) => ({ x: box.x + p.x, y: box.y + p.y })) ?? corners(box);
  return boundsOf(points.map((p) => around(p, pivot, -degrees)));
}
