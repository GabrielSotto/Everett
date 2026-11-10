import { arrowGeometry, isArrow, type FreeArrow, type ArrowHandle } from '../../domain/free-arrow';
import type { Material } from '../../domain/model';
import { html } from '../../ui/dom';

export function arrowArt(n: FreeArrow) {
  const { path, ends } = arrowGeometry(n.data.points, n.data.thickness);
  return `<svg class="drawing-art arrow-art" viewBox="0 0 ${n.width} ${n.height}" aria-hidden="true" style="--drawing-thickness:${n.data.thickness}px"><path class="arrow-hit" d="${path} ${ends}"/><path class="arrow-ink" d="${path} ${ends}" fill="none" stroke="${html(n.data.color)}" stroke-width="${n.data.thickness}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const handles = [
  ['start', 'Mover comienzo'],
  ['bend', 'Ajustar curva'],
  ['end', 'Mover punta'],
] as const;
export function arrowHandles(n: FreeArrow) {
  return handles
    .map(
      ([h, label], i) =>
        `<button type="button" class="resize-handle arrow-handle" data-arrow-handle="${h}" data-id="${html(n.id)}" style="left:${n.data.points[i]!.x}px;top:${n.data.points[i]!.y}px" aria-label="${label}" title="${label}"></button>`,
    )
    .join('');
}
export function arrowHandlePoint(n: Material, h: ArrowHandle) {
  if (!isArrow(n)) return null;
  const p = n.data.points[handles.findIndex(([k]) => k === h)];
  return p ? { x: n.x + p.x, y: n.y + p.y } : null;
}
