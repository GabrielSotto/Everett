import type { Context } from '../../app/context';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { publicationNameError } from '../../domain/local-content';

export function publishLocalMaterial(
  root: HTMLElement,
  ctx: Context,
  id: string,
  signal: AbortSignal,
): void {
  const node = ctx.world().nodes.find((node) => node.id === id);
  if (node?.data.kind !== 'local' || node.owner || node.data.content.kind === 'agent') return;
  const kind = node.data.content.kind;
  const surface = kind === 'document' ? 'Docs' : kind === 'file' ? 'Code' : 'Board';
  const dialog = document.createElement('dialog');
  dialog.className = 'copy-publish-dialog';
  dialog.setAttribute('aria-label', `Crear en ${surface}`);
  dialog.innerHTML = `<form><button type="button" class="icon-button copy-publish-close" aria-label="Cerrar">${icon('close', 16)}</button><h2>Crear en ${surface}</h2><p>La pieza de Canvas representará el nuevo ${kind === 'document' ? 'documento' : kind === 'file' ? 'archivo' : 'elemento'}. El original se conserva.</p><label>${kind === 'file' ? 'Ruta del archivo en Code' : 'Nombre'}<input name="name" aria-label="${kind === 'file' ? 'Ruta del archivo en Code' : 'Nombre del nuevo elemento'}" value="${html(node.data.title)}" required></label><p class="copy-publish-error" role="alert"></p><button type="submit">Crear en ${surface}</button></form>`;
  root.append(dialog);
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  dialog.addEventListener(
    'keydown',
    (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    },
    { signal },
  );
  dialog.querySelector('.copy-publish-close')!.addEventListener('click', close, { signal });
  dialog.addEventListener(
    'click',
    (event) => {
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          close();
      }
    },
    { signal },
  );
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.querySelector('form')!.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const name = dialog.querySelector('input')!.value;
      const nameError = publicationNameError(ctx.world(), kind, name);
      if (nameError) {
        dialog.querySelector('.copy-publish-error')!.textContent = nameError;
        dialog.querySelector('input')!.focus();
        return;
      }
      if (
        ctx.act(
          { type: 'node.publish', world: ctx.world().id, id, name },
          'incorporar copia a su superficie',
          'C08-MAT-08',
        )
      ) {
        close();
        ctx.notice(`Creado en ${surface}. La pieza de Canvas representa el nuevo elemento.`);
      } else
        dialog.querySelector('.copy-publish-error')!.textContent =
          'No se pudo crear el elemento. Revisá el nombre y volvé a intentar.';
    },
    { signal },
  );
  signal.addEventListener('abort', () => dialog.remove(), { once: true });
  dialog.showModal();
  dialog.querySelector('input')!.select();
}
