import type { Context } from '../app/context';
import { bindDictation } from '../platform/dictation';
import { html } from './dom';
import { btn, icon } from './icons';
export function composer(id: string, placeholder: string, tools = false, context = ''): string {
  return `<form class="composer" id="${id}"><textarea id="${id}-input" rows="1" aria-label="${html(placeholder)}" placeholder="${html(placeholder)}"></textarea><div class="composer-bottom"><div>${tools ? btn('tools', 'plus', 'Herramientas') : ''}${btn('mention', 'at', 'Mencionar')}${context ? `<span class="context-chip">${icon('docs', 12)}${html(context)}</span>` : ''}</div><div class="composer-send">${btn('dictate', 'mic', 'Dictar', 'aria-pressed="false"')}<button class="send" type="submit" aria-label="Enviar" data-tip="Enviar">${icon('up', 17)}</button></div></div></form>`;
}
export function bindComposer(root: HTMLElement, signal: AbortSignal, ctx?: Context): void {
  bindDictation(root, signal, ctx);
  root.addEventListener(
    'keydown',
    (e) => {
      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.isComposing &&
        e.target instanceof HTMLTextAreaElement &&
        e.target.closest('.composer')
      ) {
        e.preventDefault();
        e.target.closest('form')?.requestSubmit();
      }
    },
    { signal },
  );
  root.addEventListener(
    'input',
    (e) => {
      if (e.target instanceof HTMLTextAreaElement && e.target.closest('.composer')) {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(130, e.target.scrollHeight) + 'px';
      }
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (e) => {
      const t = e.target instanceof Element ? e.target.closest('[data-action=mention]') : null;
      if (t) {
        const input = t.closest('form')?.querySelector('textarea');
        if (input) {
          input.setRangeText('@', input.selectionStart, input.selectionEnd, 'end');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      }
    },
    { signal },
  );
}
/** Conserva borradores al actualizar la vista y descarta el texto ya enviado. */
export function preserveComposerDrafts(root: HTMLElement): () => void {
  const drafts = Array.from(root.querySelectorAll<HTMLTextAreaElement>('.composer textarea')).map(
    (t) => ({ id: t.id, value: t.value, height: t.style.height }),
  );
  return () => {
    for (const draft of drafts) {
      const field = root.querySelector<HTMLTextAreaElement>('#' + CSS.escape(draft.id));
      if (field) {
        field.value = draft.value;
        field.style.height = draft.height;
      }
    }
  };
}
