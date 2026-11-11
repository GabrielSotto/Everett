import type { Link } from './model';

/** El sentido de las puntas es un estilo; invertir los extremos no crea otro cable. */
export function sameConnection(
  a: Pick<Link, 'from' | 'to' | 'fromAnchor' | 'toAnchor' | 'detail'>,
  b: Pick<Link, 'from' | 'to' | 'fromAnchor' | 'toAnchor' | 'detail'>,
): boolean {
  if (a.detail || b.detail)
    return (
      !!a.detail &&
      !!b.detail &&
      a.from === b.from &&
      a.to === b.to &&
      a.fromAnchor === b.fromAnchor &&
      a.detail.x === b.detail.x &&
      a.detail.y === b.detail.y
    );
  return (
    (a.from === b.from &&
      a.to === b.to &&
      a.fromAnchor === b.fromAnchor &&
      a.toAnchor === b.toAnchor) ||
    (a.from === b.to &&
      a.to === b.from &&
      a.fromAnchor === b.toAnchor &&
      a.toAnchor === b.fromAnchor)
  );
}
