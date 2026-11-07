import type { WireframeContent } from '../../../domain/wireframes';
import { html } from '../../../ui/dom';
import { librarySymbol } from './symbols';

export function libraryPieceMarkup(content: WireframeContent): string {
  const piece = content.piece!;
  const style: Record<string, string> = { ...piece.style };
  if (piece.ink) {
    style.width = piece.ink.width * 100 + '%';
    style.height = piece.ink.height * 100 + '%';
  }
  if (content.appearance) {
    style.backgroundColor = content.appearance.fill;
    style.color = content.appearance.text;
    for (const edge of ['Top', 'Right', 'Bottom', 'Left'])
      style[`border${edge}Color`] = content.appearance.stroke;
    style.borderRadius = content.appearance.radius + 'px';
  }
  if (piece.rotation) style.transform = `rotate(${piece.rotation}deg)`;
  if (piece.clip) style.clipPath = `inset(${piece.clip.map((n) => n + '%').join(' ')})`;
  const css = Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${value}`)
    .join(';');
  const text = content.type === 'table' ? '' : content.text;
  const body = piece.symbol
    ? `<span class="library-symbol" style="mask-image:url('${html(librarySymbol(piece.symbol))}')"></span>`
    : piece.paths
      ? `<svg viewBox="${html(piece.viewBox ?? '0 0 220 100')}" preserveAspectRatio="none">${piece.paths.map((path) => `<path d="${html(path.d)}" fill="${html(content.appearance?.fill ?? path.fill)}" stroke="${html(content.appearance?.stroke ?? path.stroke)}" stroke-width="${path.width}"/>`).join('')}</svg>`
      : text
        ? content.placeholder
          ? `<span class="library-text-bar" style="background:${html(piece.placeholderColor ?? '#c6cbd1')}" aria-label="Texto simulado"></span>`
          : html(text)
        : '';
  return `<div class="library-piece wireframe-body ${text ? 'library-text' : ''}" data-library-piece style="${html(css)}">${body}</div>`;
}
