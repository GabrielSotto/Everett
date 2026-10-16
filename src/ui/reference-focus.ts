import type { Context } from '../app/context';
import { routeKey } from '../domain/model';
const focused = new WeakMap<HTMLElement, string>();

/** Abrir el origen conserva el mismo editor y selecciona el fragmento vigente. */
export function focusReference(root: HTMLElement, ctx: Context): void {
  const route = ctx.store.get().route;
  if (route.kind !== 'surface' || !route.fragment) return;
  const key = routeKey(route);
  if (focused.get(root) === key) return;
  focused.set(root, key);
  const anchor = ctx.world().referenceAnchors?.find((a) => a.id === route.fragment);
  if (anchor?.status !== 'attached' || anchor.source !== route.entity) {
    const message = document.createElement('p');
    message.className = 'fragment-notice';
    message.setAttribute('role', 'status');
    message.textContent =
      'El fragmento ya no está disponible. Estás viendo su documento de origen.';
    root.prepend(message);
    return;
  }
  const input = root.querySelector<HTMLTextAreaElement>('#doc-body, #code-editor');
  if (!input) return;
  input.focus({ preventScroll: true });
  input.setSelectionRange(anchor.start, anchor.end);
  const line = input.value.slice(0, anchor.start).split('\n').length - 1;
  const height = parseFloat(getComputedStyle(input).lineHeight) || 22;
  if (input.id === 'code-editor')
    input.scrollTop = Math.max(0, line * height - input.clientHeight / 3);
  else root.querySelector('.document-scroll')?.scrollTo({ top: Math.max(0, line * height - 100) });
}
