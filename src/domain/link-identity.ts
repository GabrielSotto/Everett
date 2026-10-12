import type { Link } from './model';

/** Los cables no tienen flecha: invertir los extremos conserva la misma conexión. */
export function sameConnection(
  a: Pick<Link, 'from' | 'to' | 'fromAnchor' | 'toAnchor'>,
  b: Pick<Link, 'from' | 'to' | 'fromAnchor' | 'toAnchor'>,
): boolean {
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
