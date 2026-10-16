import type { Reference, ReferenceAnchor, World, WorldSnapshot } from './model';

export function referenceSource(world: WorldSnapshot, ref: Reference): string | null {
  return ref.kind === 'document'
    ? (world.docs.find((d) => d.id === ref.id)?.body ?? null)
    : ref.kind === 'file'
      ? (world.files.find((f) => f.id === ref.id)?.text ?? null)
      : null;
}
export function referenceExcerpt(world: WorldSnapshot, ref: Reference): string | null {
  if (!ref.fragment) return referenceSource(world, ref);
  const anchor = world.referenceAnchors?.find((a) => a.id === ref.fragment);
  return anchor?.status === 'attached'
    ? (referenceSource(world, ref)?.slice(anchor.start, anchor.end) ?? null)
    : null;
}

/** Un cambio antes del fragmento desplaza sus límites; una sustitución total lo invalida. */
export function rebaseAnchor(anchor: ReferenceAnchor, before: string, after: string): void {
  if (before === after) return;
  if (anchor.status === 'missing') {
    const at = after.indexOf(anchor.quote);
    if (at >= 0 && after.indexOf(anchor.quote, at + 1) < 0) {
      anchor.start = at;
      anchor.end = at + anchor.quote.length;
      anchor.status = 'attached';
    }
    return;
  }
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let tail = 0;
  while (
    tail < before.length - start &&
    tail < after.length - start &&
    before.at(-1 - tail) === after.at(-1 - tail)
  )
    tail++;
  const oldEnd = before.length - tail;
  const newEnd = after.length - tail;
  const delta = after.length - before.length;
  if (oldEnd <= anchor.start) {
    anchor.start += delta;
    anchor.end += delta;
  } else if (start >= anchor.end) return;
  else if (start <= anchor.start && oldEnd >= anchor.end) {
    anchor.status = 'missing';
    return;
  } else {
    anchor.start = start < anchor.start ? newEnd : anchor.start;
    anchor.end = oldEnd > anchor.end ? start : anchor.end + delta;
  }
  if (anchor.end <= anchor.start) anchor.status = 'missing';
  else anchor.quote = after.slice(anchor.start, anchor.end);
}
export function rebaseReferences(before: WorldSnapshot, after: World): void {
  for (const anchor of after.referenceAnchors ?? []) {
    const previous = before.referenceAnchors?.find((a) => a.id === anchor.id);
    if (!previous) continue;
    const ref: Reference = { kind: anchor.kind, id: anchor.source };
    const oldText = referenceSource(before, ref),
      newText = referenceSource(after, ref);
    if (
      anchor.quote !== previous.quote &&
      anchor.status === 'attached' &&
      newText?.slice(anchor.start, anchor.end) === anchor.quote
    )
      continue;
    if (oldText !== null && newText !== null) rebaseAnchor(anchor, oldText, newText);
    else anchor.status = 'missing';
  }
}
