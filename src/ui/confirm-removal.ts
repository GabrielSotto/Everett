import { html } from './dom';
import { reducedMotion } from './motion';

/** El diálogo nativo aporta modalidad, foco retenido y fondo inerte dentro de la página. */
export function confirmRemoval(
  root: HTMLElement,
  message: string,
  remove: () => void,
  signal?: AbortSignal,
  keyboard = false,
): void {
  if (root.querySelector('.removal-dialog')) return;
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'removal-dialog t-modal';
  if (keyboard) {
    dialog.dataset.instant = 'true';
    dialog.classList.add('is-open');
  }
  dialog.setAttribute('aria-labelledby', 'removal-title');
  dialog.setAttribute('aria-describedby', 'removal-description');
  dialog.innerHTML = `<h2 id="removal-title">¿Eliminar del Canvas?</h2><p id="removal-description">${html(message)} Podés deshacerlo.</p><div class="removal-actions"><button type="button" data-choice="cancel" autofocus>Cancelar</button><button type="button" data-choice="remove">Eliminar</button></div>`;
  let closing = false;
  const cleanup = () => {
    dialog.close();
    dialog.remove();
    signal?.removeEventListener('abort', cleanup);
    if (previous instanceof HTMLElement && previous.isConnected)
      previous.focus({ preventScroll: true });
  };
  const close = (confirmed: boolean, keyboardAction = false) => {
    if (closing) return;
    closing = true;
    if (keyboardAction) dialog.dataset.instant = 'true';
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    const reduced = keyboard || keyboardAction || reducedMotion();
    const duration = reduced
      ? 0
      : parseFloat(getComputedStyle(dialog).getPropertyValue('--modal-close-dur'));
    setTimeout(
      () => {
        cleanup();
        if (confirmed && !signal?.aborted) remove();
      },
      Number.isFinite(duration) ? duration : 150,
    );
  };
  dialog.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-choice]') : null;
    if (button) close(button.dataset.choice === 'remove', event.detail === 0);
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close(false, true);
  });
  dialog.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button')];
    if (event.shiftKey && document.activeElement === buttons[0]) {
      event.preventDefault();
      buttons.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
      event.preventDefault();
      buttons[0]?.focus();
    }
  });
  signal?.addEventListener('abort', cleanup, { once: true });
  root.append(dialog);
  dialog.showModal();
  requestAnimationFrame(() => {
    if (!closing && dialog.isConnected) dialog.classList.add('is-open');
  });
}
