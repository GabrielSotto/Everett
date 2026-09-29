/** Interrumpir la captura descarta el gesto; soltar normalmente conserva su confirmación. */
export function bindPointerCancellation(
  root: HTMLElement,
  signal: AbortSignal,
  cancel: () => void,
): void {
  let capture: { element: Element; id: number } | null = null;
  const interrupt = (): void => {
    const active = capture;
    capture = null;
    if (!active) return;
    if (active.element.hasPointerCapture(active.id))
      active.element.releasePointerCapture(active.id);
    cancel();
  };
  root.addEventListener(
    'gotpointercapture',
    (event) => {
      if (event.target instanceof Element) capture = { element: event.target, id: event.pointerId };
    },
    { signal },
  );
  root.addEventListener(
    'pointerup',
    () => {
      capture = null;
    },
    { capture: true, signal },
  );
  root.addEventListener('pointercancel', interrupt, { signal });
  root.addEventListener('lostpointercapture', interrupt, { signal });
  window.addEventListener('blur', interrupt, { signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) interrupt();
    },
    { signal },
  );
}
