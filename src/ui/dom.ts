export const html = (x: unknown): string =>
  String(x ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
export function target(e: Event): HTMLElement | null {
  return e.target instanceof Element ? e.target.closest<HTMLElement>('[data-action]') : null;
}
export function value(root: ParentNode, selector: string): string {
  return root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)?.value ?? '';
}
export function editable(target: EventTarget | null): boolean {
  return (
    target instanceof Element && !!target.closest('input,textarea,select,[contenteditable=true]')
  );
}
export function preserveFocus(root: HTMLElement): () => void {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement) || !root.contains(focused) || !focused.id) return () => {};
  const id = focused.id;
  const selection =
    focused instanceof HTMLTextAreaElement || focused instanceof HTMLInputElement
      ? { start: focused.selectionStart, end: focused.selectionEnd }
      : null;
  return () => {
    const next = document.getElementById(id);
    next?.focus({ preventScroll: true });
    if (selection && (next instanceof HTMLTextAreaElement || next instanceof HTMLInputElement))
      try {
        next.setSelectionRange(selection.start, selection.end);
      } catch {
        /* Los campos de fecha y número no admiten selección de texto. */
      }
  };
}
export interface View {
  back?(): boolean;
  closeTransient?(): boolean;
  render(): void;
  dispose(): void;
}
