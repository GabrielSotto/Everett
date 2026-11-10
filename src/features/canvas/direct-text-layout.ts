import type { CanvasText } from '../../domain/canvas-text';
import type { Rect } from '../../domain/model';
import { googleFamily } from '../../domain/note-fonts';
import { html } from '../../ui/dom';
import { fontFamilyCss } from './note-colors';

export function textFontAttributes(data: CanvasText): string {
  return `data-note-font="${html(googleFamily(data.font) ?? '')}" data-note-weight="${data.weight}" data-note-italic="${data.italic}"`;
}
export function textStyle(data: CanvasText, ink?: { color: string; textShadow: string }): string {
  return `font-family:${fontFamilyCss(data.font)};font-size:${data.size}px;font-weight:${data.weight};font-style:${data.italic ? 'italic' : 'normal'};text-align:${data.align};color:${data.color ?? ink?.color ?? 'var(--text)'};text-shadow:${!data.color && ink ? ink.textShadow : 'none'}`;
}
/** The mirror uses the same line boxes as the painted text, independent of camera scale. */
export function textBounds(data: CanvasText, width: number) {
  const mirror = document.createElement('div');
  mirror.className = 'canvas-text-run direct-text-measure';
  mirror.style.cssText = textStyle(data);
  mirror.style.width = data.sizing === 'auto' ? 'max-content' : Math.max(4, width) + 'px';
  // El ancho mínimo intrínseco incluye el grafema indivisible más ancho (también emoji).
  mirror.style.minWidth = 'min-content';
  mirror.textContent = data.text + '\u200b';
  document.body.append(mirror);
  const rect = mirror.getBoundingClientRect();
  mirror.remove();
  return {
    width: Math.max(4, Math.ceil(rect.width) + (data.sizing === 'auto' ? 1 : 0)),
    height: Math.max(4, Math.ceil(rect.height)),
  };
}

export function resizeText(data: CanvasText, origin: Rect, handle: string, dx: number, dy: number) {
  const left = handle.includes('w'),
    top = handle.includes('n');
  const horizontal = dx * (left ? -1 : 1),
    vertical = dy * (top ? -1 : 1);
  const edge = handle === 'w' || handle === 'e';
  // Proyectar el gesto sobre la diagonal mantiene fijo el extremo opuesto.
  const ratio =
    1 +
    (horizontal * origin.width + vertical * origin.height) /
      (origin.width ** 2 + origin.height ** 2);
  const size = edge
    ? data.size
    : Math.max(8, Math.min(200, Math.round(data.size * ratio * 10) / 10));
  const sizing = edge ? 'wrap' : data.sizing;
  const bounds = textBounds(
    { ...data, size, sizing },
    edge ? origin.width + horizontal : (origin.width * size) / data.size,
  );
  return {
    rect: {
      ...bounds,
      x: left ? origin.x + origin.width - bounds.width : origin.x,
      y: top ? origin.y + origin.height - bounds.height : origin.y,
    },
    textStyle: { size, sizing },
  };
}
