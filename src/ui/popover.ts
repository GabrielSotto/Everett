/** Escape cierra el panel antes de alcanzar el manejador de navegación. */
export function bindDismiss(
  signal: AbortSignal,
  isOpen: () => boolean,
  close: () => void,
  inside: string,
): void {
  document.addEventListener(
    'click',
    (event) => {
      if (!isOpen()) return;
      // Un control puede reemplazar su DOM antes de ejecutar este listener.
      // composedPath conserva la pertenencia original durante el gesto.
      if (
        event
          .composedPath()
          .some((node) => node instanceof Element && (node.matches(inside) || node.closest(inside)))
      )
        return;
      close();
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !isOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    },
    { capture: true, signal },
  );
}
