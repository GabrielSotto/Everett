export interface ControlUse {
  action: string;
  trusted: boolean;
  visible: boolean;
}
declare global {
  interface Window {
    __everettControlsCapture: (use: ControlUse) => Promise<void>;
  }
}
/** Registra la entrada antes de que un control reconstruya su DOM. No modifica la aplicación. */
export function installControlProbe(): void {
  for (const type of ['click', 'change', 'keydown'])
    document.addEventListener(
      type,
      (event) => {
        const spacing = event.target instanceof HTMLInputElement && !!event.target.dataset.spacing;
        const submenu =
          event instanceof KeyboardEvent &&
          event.key === 'ArrowRight' &&
          event.target instanceof HTMLElement &&
          event.target.dataset.action === 'layer-list';
        if (
          type !== 'click' &&
          !submenu &&
          (!spacing ||
            !event.target.validity.valid ||
            !event.target.value.trim() ||
            (event instanceof KeyboardEvent && event.key !== 'Enter'))
        )
          return;
        const control = event
          .composedPath()
          .find(
            (node): node is HTMLElement | SVGElement =>
              (node instanceof HTMLElement || node instanceof SVGElement) &&
              (!!node.dataset.action || (type !== 'click' && !!node.dataset.spacing)),
          );
        if (!control) return;
        let opaque = true;
        for (let ancestor: Element | null = control; ancestor; ancestor = ancestor.parentElement) {
          if (Number(getComputedStyle(ancestor).opacity) === 0) {
            opaque = false;
            break;
          }
        }
        const rect = control.getBoundingClientRect(),
          style = getComputedStyle(control);
        // Un cable horizontal o vertical tiene un bbox sin área, pero su trazo sí
        // recibe clics. No confundirlo con un SVG oculto o una geometría vacía.
        const strokeHit =
          control instanceof SVGGeometryElement &&
          style.pointerEvents !== 'none' &&
          parseFloat(style.strokeWidth) > 0 &&
          control.getTotalLength() > 0;
        void window
          .__everettControlsCapture({
            action: control.dataset.action ?? 'selection-spacing',
            trusted: event.isTrusted,
            visible:
              opaque &&
              control.getClientRects().length > 0 &&
              ((rect.width > 0 && rect.height > 0) ||
                (strokeHit && (rect.width > 0 || rect.height > 0))) &&
              style.display !== 'none' &&
              style.visibility !== 'hidden',
          })
          .catch(() => undefined);
      },
      { capture: true },
    );
}
