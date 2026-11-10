import type { CanvasText } from '../../domain/canvas-text';
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
  mirror.textContent = data.text + '\u200b';
  document.body.append(mirror);
  const rect = mirror.getBoundingClientRect();
  mirror.remove();
  return {
    width: data.sizing === 'auto' ? Math.max(4, Math.ceil(rect.width) + 1) : Math.max(4, width),
    height: Math.max(4, Math.ceil(rect.height)),
  };
}
