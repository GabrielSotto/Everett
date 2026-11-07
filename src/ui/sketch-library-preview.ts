import type { LibraryComposition } from '../domain/sketch-library';
import { libraryPieceMarkup } from '../features/canvas/library/piece-markup';
import { librarySymbol } from '../features/canvas/library/symbols';

/** Encuadrar la tinta, no el ancho vacío reservado por el catálogo de revisión. */
export function paintLibraryPreview(
  host: HTMLElement,
  composition: LibraryComposition,
  maximumHeight: number,
  basic: boolean,
): void {
  // Máscara se reconoce por la convención de círculo parcialmente rayado.
  // El símbolo identifica la entrada; no añade una pieza decorativa al Canvas.
  if (host.dataset.thumbnail === 'mask') {
    const glyph = document.createElement('span');
    glyph.className = 'library-mask-symbol';
    glyph.style.maskImage = `url("${librarySymbol('circle-half')}")`;
    host.replaceChildren(glyph);
    host.dataset.ready = 'true';
    return;
  }
  // Encuadrar la tinta sin que un fondo auxiliar altere su peso en la miniatura.
  const parts = composition.parts.filter(
    (part, index) => basic || index !== 0 || !part.name.startsWith('Fondo · '),
  );
  const bounds = parts.map((part) => {
    const piece = part.content.piece!;
    const width = part.width * (piece.ink?.width ?? 1);
    const height = part.height * (piece.ink?.height ?? 1);
    const [top, right, bottom, left] = piece.clip ?? [0, 0, 0, 0];
    return {
      left: part.x + (width * left) / 100,
      top: part.y + (height * top) / 100,
      right: part.x + width * (1 - right / 100),
      bottom: part.y + height * (1 - bottom / 100),
    };
  });
  const left = Math.min(...bounds.map((part) => part.left));
  const top = Math.min(...bounds.map((part) => part.top));
  const width = Math.max(...bounds.map((part) => part.right)) - left;
  const height = Math.max(...bounds.map((part) => part.bottom)) - top;
  const availableWidth = Math.max(1, host.clientWidth - 24);
  const scale = Math.min(1.5, availableWidth / width, (maximumHeight - 24) / height);
  host.classList.toggle('library-basic-preview', basic);
  const artwork = document.createElement('span');
  artwork.className = 'library-preview-artwork';
  artwork.style.width = width + 'px';
  artwork.style.height = height + 'px';
  artwork.style.transform = `translate(-50%,-50%) scale(${scale})`;
  artwork.style.setProperty('--preview-text-line', Math.max(5, 2 / scale) + 'px');
  artwork.setAttribute('aria-hidden', 'true');
  artwork.innerHTML = parts
    .map(
      (part) =>
        `<span class="library-preview-part" style="left:${part.x - left}px;top:${part.y - top}px;width:${part.width}px;height:${part.height}px">${libraryPieceMarkup(part.content)}</span>`,
    )
    .join('');
  host.replaceChildren(artwork);
  artwork.querySelectorAll<HTMLElement>('.library-text-bar').forEach((bar) => {
    const channels =
      bar.style.backgroundColor
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number) ?? [];
    const light = !basic && channels.length === 3 && Math.min(...channels) > 215;
    bar.style.backgroundColor = light ? '#d9e0e8' : '#526171';
  });
  if (!basic) {
    // Al reducir una composición, sus líneas de 1 px dejan de ser reconocibles.
    // Reforzar únicamente tinta neutra de la miniatura; conservar fondos y tonos de estado.
    const pale = (color: string) => {
      const channels = color.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3 || (channels[3] ?? 1) < 1) return false;
      const min = Math.min(...channels.slice(0, 3)),
        max = Math.max(...channels.slice(0, 3));
      return min >= 140 && max < 240 && max - min < 40;
    };
    artwork.querySelectorAll<HTMLElement>('[data-library-piece]').forEach((piece) => {
      const style = getComputedStyle(piece);
      for (const edge of ['top', 'right', 'bottom', 'left']) {
        const width = parseFloat(style.getPropertyValue(`border-${edge}-width`));
        if (width > 0 && pale(style.getPropertyValue(`border-${edge}-color`))) {
          piece.style.setProperty(`border-${edge}-color`, '#526171');
          piece.style.setProperty(`border-${edge}-width`, Math.max(width, 1 / scale) + 'px');
        }
      }
      if (
        Math.min(parseFloat(style.width), parseFloat(style.height)) < 12 &&
        pale(style.backgroundColor)
      )
        piece.style.backgroundColor = '#526171';
    });
  }
  if (basic) {
    // Bordes CSS y trazos SVG deben pesar lo mismo en pantalla, cualquiera sea
    // su tamaño original. Medir la transformación completa incluye el viewBox.
    artwork.querySelectorAll<SVGPathElement>('svg path').forEach((path) => {
      const matrix = path.getScreenCTM();
      if (matrix && getComputedStyle(path).stroke !== 'none')
        path.style.strokeWidth = 2 / Math.hypot(matrix.a, matrix.b) + 'px';
    });
    // Los rellenos de tinta (puntos, pistas y separadores) también necesitan
    // contraste en miniatura. Los fondos claros y las transparencias se conservan.
    artwork.querySelectorAll<HTMLElement>('[data-library-piece]').forEach((piece) => {
      const computed = getComputedStyle(piece);
      for (const edge of ['top', 'right', 'bottom', 'left'])
        if (parseFloat(computed.getPropertyValue(`border-${edge}-width`)) > 0)
          piece.style.setProperty(`border-${edge}-width`, 2 / scale + 'px');
      const channels = computed.backgroundColor.match(/[\d.]+/g)?.map(Number);
      const rect = piece.getBoundingClientRect();
      if (
        channels &&
        channels.length >= 3 &&
        (channels[3] ?? 1) === 1 &&
        (Math.max(...channels.slice(0, 3)) < 215 ||
          (Math.max(...channels.slice(0, 3)) < 245 && rect.width / rect.height > 4))
      ) {
        piece.style.backgroundColor = '#526171';
        if (rect.height / rect.width > 4 && rect.width / scale < 12) {
          piece.style.width = piece.style.minWidth = 2 / scale + 'px';
          piece.style.left = (rect.width - 2) / scale / 2 + 'px';
        }
        if (rect.width / rect.height > 4 && rect.height / scale < 12) {
          piece.style.height = piece.style.minHeight = 2 / scale + 'px';
          piece.style.top = (rect.height - 2) / scale / 2 + 'px';
        }
      }
    });
  }
  host.dataset.ready = 'true';
}
