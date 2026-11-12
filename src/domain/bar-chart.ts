export interface BarDatum {
  label: string;
  value: number | null;
}
export interface BarChart {
  kind: 'bars';
  title: string;
  rows: readonly BarDatum[];
}
export function validBarRows(value: unknown): value is BarDatum[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) =>
        row &&
        typeof row.label === 'string' &&
        row.label.trim().length > 0 &&
        (row.value === null || Number.isFinite(row.value)),
    )
  );
}
/** Normalizar antes de restar evita desbordar con extremos finitos de signos opuestos. */
export function barScale(rows: readonly BarDatum[]) {
  let min = 0,
    max = 0;
  for (const row of rows) {
    min = Math.min(min, row.value ?? 0);
    max = Math.max(max, row.value ?? 0);
  }
  const unit = Math.max(-min, max) || 1;
  const low = min / unit,
    span = max / unit - low || 1;
  const position = (value: number) => (value / unit - low) / span;
  return { min, max, zero: position(0), position };
}
