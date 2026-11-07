import type { Context } from '../app/context';
import type { Point } from '../domain/model';
import type { LibraryChoice } from '../features/canvas/library/render';
import { compileLibrary } from '../features/canvas/library/compile';
import { libraryBounds } from '../domain/sketch-library';
import { libraryPieceMarkup } from '../features/canvas/library/piece-markup';

export interface LibraryDrop {
  point: Point;
  grab: Point;
}
/** El mismo elemento se inserta por clic o se arrastra sin activar ambos gestos. */
export function bindLibraryDrag(
  panel: HTMLElement,
  ctx: Context,
  signal: AbortSignal,
  choiceFor: (element: Element) => LibraryChoice | null,
  drop: (choice: LibraryChoice, location: LibraryDrop) => void,
): void {
  let pending: {
    choice: LibraryChoice;
    pointer: number;
    x: number;
    y: number;
    grabX: number;
    grabY: number;
    ghost: HTMLElement | null;
  } | null = null;
  let suppressClick = false;
  const cancel = () => {
    if (pending?.ghost) suppressClick = true;
    pending?.ghost?.remove();
    pending = null;
  };
  panel.addEventListener(
    'pointerdown',
    (event) => {
      suppressClick = false;
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const choice = choiceFor(event.target);
      if (!choice) return;
      const source = event.target.closest<HTMLElement>('[data-library-add]')!;
      const rect = source.getBoundingClientRect();
      pending = {
        choice,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        grabX: (event.clientX - rect.left) / rect.width,
        grabY: (event.clientY - rect.top) / rect.height,
        ghost: null,
      };
      source.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  panel.addEventListener(
    'pointermove',
    (event) => {
      const current = pending;
      if (!current || current.pointer !== event.pointerId) return;
      if (!current.ghost && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5)
        return;
      event.preventDefault();
      if (!current.ghost) {
        const ghost = document.createElement('div');
        ghost.className = 'library-drag-preview';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = current.choice.width + 'px';
        ghost.textContent = current.choice.entry.name;
        document.body.append(ghost);
        current.ghost = ghost;
        void compileLibrary(current.choice)
          .then((composition) => {
            if (current !== pending || signal.aborted) return;
            const bounds = libraryBounds(composition);
            ghost.style.width = bounds.width + 'px';
            ghost.style.height = bounds.height + 'px';
            ghost.innerHTML = composition.parts
              .map(
                (part) =>
                  `<div style="position:absolute;left:${part.x - bounds.x}px;top:${part.y - bounds.y}px;width:${part.width}px;height:${part.height}px">${libraryPieceMarkup(part.content)}</div>`,
              )
              .join('');
            ghost.dataset.ready = 'true';
          })
          .catch(() => {
            if (current === pending) ghost.textContent = current.choice.entry.name;
          });
      }
      current.ghost.style.left = event.clientX + 'px';
      current.ghost.style.top = event.clientY + 'px';
      current.ghost.style.transform = `scale(${ctx.currentCamera().z}) translate(${-current.grabX * 100}%,${-current.grabY * 100}%)`;
    },
    { signal, passive: false },
  );
  panel.addEventListener(
    'pointerup',
    (event) => {
      if (!pending || pending.pointer !== event.pointerId) return;
      const current = pending;
      const wasDragged = !!current.ghost;
      cancel();
      if (!wasDragged) return;
      event.preventDefault();
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (
        hit?.closest('.canvas-stage') &&
        !hit.closest('.canvas-chat,.canvas-context-layer,.canvas-dock-host')
      )
        drop(current.choice, {
          point: { x: event.clientX, y: event.clientY },
          grab: { x: current.grabX, y: current.grabY },
        });
    },
    { signal },
  );
  panel.addEventListener(
    'click',
    (event) => {
      if (suppressClick && event.detail) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    { signal, capture: true },
  );
  panel.addEventListener('lostpointercapture', cancel, { signal });
  panel.addEventListener('pointercancel', cancel, { signal });
  window.addEventListener('blur', cancel, { signal });
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && pending) {
        cancel();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { signal, capture: true },
  );
  signal.addEventListener('abort', cancel, { once: true });
}
