import type { Rect } from './model';

export interface Dimension {
  axis: 'x' | 'y';
  label: 'Horizontal' | 'Vertical' | 'Izquierda' | 'Derecha' | 'Arriba' | 'Abajo';
  from: number;
  to: number;
  at: number;
}
export interface Measurement {
  kind: 'Distancia' | 'Solapamiento' | 'Márgenes' | 'Coinciden';
  dimensions: Dimension[];
}

const tolerance = 1e-6;
const numbers = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
export const dimensionText = (d: Pick<Dimension, 'from' | 'to'>) =>
  numbers.format(Math.abs(d.to - d.from)) + ' px';

/** Las cotas se calculan en unidades del Canvas sobre los límites visuales de cada pieza. */
export function measureBounds(a: Rect, b: Rect): Measurement {
  const right = (r: Rect) => r.x + r.width,
    bottom = (r: Rect) => r.y + r.height;
  const contains = (outer: Rect, inner: Rect) =>
    outer.x <= inner.x + tolerance &&
    outer.y <= inner.y + tolerance &&
    right(outer) >= right(inner) - tolerance &&
    bottom(outer) >= bottom(inner) - tolerance;
  const insideA = contains(a, b),
    insideB = contains(b, a);
  if (insideA && insideB) return { kind: 'Coinciden', dimensions: [] };
  if (insideA || insideB) {
    const outer = insideA ? a : b,
      inner = insideA ? b : a,
      x = inner.x + inner.width / 2,
      y = inner.y + inner.height / 2;
    return {
      kind: 'Márgenes',
      dimensions: [
        { axis: 'x', label: 'Izquierda', from: outer.x, to: inner.x, at: y },
        { axis: 'x', label: 'Derecha', from: right(inner), to: right(outer), at: y },
        { axis: 'y', label: 'Arriba', from: outer.y, to: inner.y, at: x },
        { axis: 'y', label: 'Abajo', from: bottom(inner), to: bottom(outer), at: x },
      ],
    };
  }
  const x1 = Math.min(right(a), right(b)),
    x2 = Math.max(a.x, b.x);
  const y1 = Math.min(bottom(a), bottom(b)),
    y2 = Math.max(a.y, b.y);
  const separateX = x2 >= x1 - tolerance,
    separateY = y2 >= y1 - tolerance;
  const horizontal: Dimension = {
    axis: 'x',
    label: 'Horizontal',
    from: x1,
    to: x2,
    at: separateY ? (a.y < b.y ? bottom(a) : a.y) : (y1 + y2) / 2,
  };
  const vertical: Dimension = {
    axis: 'y',
    label: 'Vertical',
    from: y1,
    to: y2,
    at: separateX ? (a.x < b.x ? b.x : right(b)) : (x1 + x2) / 2,
  };
  if (!separateX && !separateY) return { kind: 'Solapamiento', dimensions: [horizontal, vertical] };
  return {
    kind: 'Distancia',
    dimensions: [...(separateX ? [horizontal] : []), ...(separateY ? [vertical] : [])],
  };
}
