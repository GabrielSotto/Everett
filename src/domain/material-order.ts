export type MaterialOrder = 'front' | 'forward' | 'backward' | 'back';

/** Orden estable de fondo a frente; una selección avanza sin invertir sus miembros. */
export function orderMaterials<T extends { id: string }>(
  items: readonly T[],
  ids: readonly string[],
  order: MaterialOrder,
): T[] {
  const selected = new Set(ids);
  if (order === 'front' || order === 'back') {
    const moved = items.filter((item) => selected.has(item.id)),
      rest = items.filter((item) => !selected.has(item.id));
    return order === 'front' ? [...rest, ...moved] : [...moved, ...rest];
  }
  const result = [...items];
  if (order === 'forward') {
    for (let i = result.length - 2; i >= 0; i--)
      if (selected.has(result[i]!.id) && !selected.has(result[i + 1]!.id))
        [result[i], result[i + 1]] = [result[i + 1]!, result[i]!];
  } else {
    for (let i = 1; i < result.length; i++)
      if (selected.has(result[i]!.id) && !selected.has(result[i - 1]!.id))
        [result[i], result[i - 1]] = [result[i - 1]!, result[i]!];
  }
  return result;
}
