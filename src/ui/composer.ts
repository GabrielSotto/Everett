import type { Context } from '../app/context';
import { bindDictation } from '../platform/dictation';
import { html } from './dom';
import { btn, icon } from './icons';
import { conversation, conversationDraft } from '../domain/conversations';
export interface ComposerDraft {
  key: string;
  value: string;
}

export function composer(
  id: string,
  placeholder: string,
  tools = false,
  context = '',
  draft?: ComposerDraft,
  canvasActions = false,
): string {
  return `<form class="composer" id="${id}"${draft ? ` data-draft-key="${html(draft.key)}"` : ''}><textarea id="${id}-input" rows="1" aria-label="${html(placeholder)}" placeholder="${html(placeholder)}">${html(draft?.value ?? '')}</textarea><div class="composer-bottom"><div>${canvasActions ? btn('chat-actions', 'plus', 'Más acciones de conversación', 'aria-haspopup="menu" aria-expanded="false"') : (tools ? btn('tools', 'plus', 'Herramientas') : '') + btn('mention', 'at', 'Mencionar')}${context ? `<span class="context-chip">${icon('docs', 12)}${html(context)}</span>` : ''}</div><div class="composer-send">${btn('dictate', 'mic', 'Dictar', 'aria-pressed="false"')}<button class="send" type="submit" aria-label="Enviar" data-tip="Enviar">${icon('up', 17)}</button></div></div></form>`;
}

export function composerDraft(ctx: Context, id: string, entity = ''): ComposerDraft {
  if (id === 'session-composer' || id === 'canvas-chat-composer')
    return {
      key: JSON.stringify([ctx.ui.userId, ctx.world().id, conversation(ctx.world(), ctx.ui).id]),
      value: conversationDraft(ctx.world(), ctx.ui).text,
    };
  const key = JSON.stringify([ctx.world().id, id, entity]);
  return { key, value: ctx.ui.composerDrafts[key] ?? '' };
}

export function contextualComposer(
  ctx: Context,
  id: string,
  placeholder: string,
  tools = false,
  context = '',
  entity = '',
): string {
  return composer(id, placeholder, tools, context, composerDraft(ctx, id, entity));
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
        const key = e.target.closest<HTMLFormElement>('form')?.dataset.draftKey;
        if (ctx && key) {
          ctx.ui.composerDrafts[key] = e.target.value;
          if (
            e.target.id === 'session-composer-input' ||
            e.target.id === 'canvas-chat-composer-input'
          )
            conversationDraft(ctx.world(), ctx.ui).text = e.target.value;
        }
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
    (t) => ({
      id: t.id,
      value: t.value,
      height: t.style.height,
      key: t.closest<HTMLFormElement>('form')?.dataset.draftKey,
    }),
  );
  return () => {
    for (const draft of drafts) {
      const field = root.querySelector<HTMLTextAreaElement>('#' + CSS.escape(draft.id));
      if (field && field.closest<HTMLFormElement>('form')?.dataset.draftKey === draft.key) {
        field.value = draft.value;
        field.style.height = draft.height;
      }
    }
    root.querySelectorAll<HTMLTextAreaElement>('.composer textarea').forEach((field) => {
      field.style.height = 'auto';
      field.style.height = Math.min(130, field.scrollHeight) + 'px';
    });
  };
}
