export interface DiffRow {
  before: string | null;
  after: string | null;
  type: 'equal' | 'insert' | 'remove';
}
/** La alineación por líneas limita el trabajo cuadrático en archivos grandes. */
export function compareLines(before: string, after: string): DiffRow[] {
  const a = before.split('\n'),
    b = after.split('\n');
  if (a.length * b.length > 1000000)
    return [
      ...a.map((line) => ({ before: line, after: null, type: 'remove' as const })),
      ...b.map((line) => ({ before: null, after: line, type: 'insert' as const })),
    ];
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i]![j] = a[i] === b[j] ? 1 + dp[i + 1]![j + 1]! : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const rows: DiffRow[] = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ before: a[i]!, after: b[j]!, type: 'equal' });
      i++;
      j++;
    } else if (j < b.length && (i === a.length || dp[i]![j + 1]! >= dp[i + 1]![j]!)) {
      rows.push({ before: null, after: b[j]!, type: 'insert' });
      j++;
    } else {
      rows.push({ before: a[i]!, after: null, type: 'remove' });
      i++;
    }
  }
  return rows;
}
