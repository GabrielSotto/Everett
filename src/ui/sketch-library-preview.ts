import type { LibraryComposition } from '../domain/sketch-library';
import { libraryPieceMarkup } from '../features/canvas/library/piece-markup';

/** Encuadrar la tinta, no el ancho vacío reservado por el catálogo de revisión. */
export function paintLibraryPreview(
  host: HTMLElement,
  composition: LibraryComposition,
  maximumHeight: number,
  basic: boolean,
): void {
  // El fondo de conversión conserva la superficie del catálogo al insertar.
  // En una miniatura no debe reducir un botón o icono a un punto en una hoja vacía.
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
  artwork.style.setProperty('--preview-line', Math.max(1, 2 / scale) + 'px');
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
    // Los rellenos de tinta (puntos, pistas y separadores) también necesitan
    // contraste en miniatura. Los fondos claros y las transparencias se conservan.
    artwork.querySelectorAll<HTMLElement>('[data-library-piece]').forEach((piece) => {
      const channels = getComputedStyle(piece)
        .backgroundColor.match(/[\d.]+/g)
        ?.map(Number);
      const rect = piece.getBoundingClientRect();
      if (
        channels &&
        channels.length >= 3 &&
        (channels[3] ?? 1) === 1 &&
        (Math.max(...channels.slice(0, 3)) < 215 ||
          (Math.max(...channels.slice(0, 3)) < 245 && rect.width / rect.height > 4))
      ) {
        piece.style.backgroundColor = '#526171';
        if (rect.width < 2) piece.style.minWidth = 2 / scale + 'px';
        if (rect.height < 2) piece.style.minHeight = 2 / scale + 'px';
      }
    });
  }
  host.dataset.ready = 'true';
}
