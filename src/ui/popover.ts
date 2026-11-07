/** Escape cierra el panel antes de alcanzar el manejador de navegación. */
export function bindDismiss(
  signal: AbortSignal,
  isOpen: () => boolean,
  close: (source: 'keyboard' | 'pointer') => void,
  inside: string,
): void {
  const outside = (event: Event) =>
    !event
      .composedPath()
      .some((node) => node instanceof Element && (node.matches(inside) || node.closest(inside)));
  // Los controles desactivados no emiten click. Cerramos en pointerdown solo
  // en ese caso, para no retirar antes de tiempo los controles que sí actúan.
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (
        isOpen() &&
        event.target instanceof Element &&
        event.target.closest('button:disabled, input:disabled, select:disabled') &&
        outside(event)
      )
        close('pointer');
    },
    { capture: true, signal },
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!isOpen()) return;
      // Un control puede reemplazar su DOM antes de ejecutar este listener.
      // composedPath conserva la pertenencia original durante el gesto.
      if (!outside(event)) return;
      close('pointer');
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !isOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close('keyboard');
    },
    { capture: true, signal },
  );
}
