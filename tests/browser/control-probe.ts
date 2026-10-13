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
  document.addEventListener(
    'click',
    (event) => {
      const control = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && !!node.dataset.action);
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
      void window
        .__everettControlsCapture({
          action: control.dataset.action!,
          trusted: event.isTrusted,
          visible:
            opaque &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden',
        })
        .catch(() => undefined);
    },
    { capture: true },
  );
}
