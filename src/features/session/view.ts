import type { Context } from '../../app/context';
import { html, target, value, preserveFocus, type View } from '../../ui/dom';
import { btn } from '../../ui/icons';
import { contextualComposer, bindComposer, preserveComposerDrafts } from '../../ui/composer';
import { slot, tools, slotToggle, bindSlot } from '../../ui/slot';
import { conversation, conversationDraft } from '../../domain/conversations';
import { ConversationHeader, participantsMarkup } from '../chat/history';
import { materialRoute, nodeTitle } from '../../domain/model';
export class SessionView implements View {
  private abort = new AbortController();
  private header: ConversationHeader;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.header = new ConversationHeader(ctx, () => this.render(), root, this.abort.signal);
    bindComposer(root, this.abort.signal, ctx);
    bindSlot(root, ctx, this.abort.signal);
    root.addEventListener(
      'submit',
      (e) => {
        if (e.target instanceof HTMLFormElement && e.target.id === 'session-composer') {
          e.preventDefault();
          const text = value(root, '#session-composer-input');
          const ta = root.querySelector<HTMLTextAreaElement>('#session-composer-input');
          if (ta) {
            ta.value = '';
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }

          if (/preview|terminal|browser|navegador|im[aá]gen|archivos|repo/i.test(text)) {
            ctx.ui.auxiliary.slot = /terminal/i.test(text)
              ? 'terminal'
              : /browser|navegador/i.test(text)
                ? 'browser'
                : /im[aá]gen/i.test(text)
                  ? 'images'
                  : /repo|archivos/i.test(text)
                    ? 'files'
                    : 'preview';
          }
          if (ctx.ui.auxiliary.slot) ctx.ui.auxiliary.lastSlot = ctx.ui.auxiliary.slot;
          void ctx.service
            .converse(
              ctx.world().id,
              'messages',
              text,
              conversationDraft(ctx.world(), ctx.ui).materials.splice(0),
              conversation(ctx.world(), ctx.ui).id,
            )
            .catch((error) => ctx.fail(error, 'session.send'));
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const w = ctx.world(),
          m = conversation(w, ctx.ui).messages.find((m) => m.id === t.dataset.id);
        if (t.dataset.action === 'session-ref-open') {
          const destination = materialRoute(ctx.store.get(), w.id, t.dataset.id ?? '');
          if (destination) ctx.go(destination, t.getBoundingClientRect());
        }
        if (t.dataset.action === 'session-ref-remove') {
          const draft = conversationDraft(w, ctx.ui);
          draft.materials = draft.materials.filter((id) => id !== t.dataset.id);
          this.render();
          ctx.persist();
        }
        if (t.dataset.action === 'plan-board' && m?.plan) {
          m.plan.forEach((title) => {
            if (!ctx.world().tasks.some((task) => task.title === title))
              ctx.act(
                { type: 'task.create', world: w.id, title, origin: 'session' },
                'derivar tareas',
                'SESSION-03',
              );
          });
          ctx.notice('Tareas disponibles en Board.');
        }
        if (t.dataset.action === 'message-doc' && m) {
          ctx.act(
            { type: 'document.create', world: w.id, sheet: false },
            'guardar respuesta',
            'SESSION-03',
          );
          const doc = ctx.world().docs.at(-1);
          if (doc)
            ctx.act(
              {
                type: 'document.edit',
                world: w.id,
                id: doc.id,
                title: 'Notas de Session',
                body: m.text + (m.plan ? '\n\n' + m.plan.join('\n') : ''),
              },
              'guardar respuesta',
              'SESSION-03',
            );
        }
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  private references(ids: readonly string[], draft = false): string {
    const w = this.ctx.world();
    return ids
      .map((id) => {
        const n = w.nodes.find((n) => n.id === id);
        return (
          '<span class="chat-reference"><button type="button" data-action="session-ref-open" data-id="' +
          html(id) +
          '">' +
          html(n ? nodeTitle(w, n) : 'Material no disponible') +
          '</button>' +
          (draft
            ? btn('session-ref-remove', 'close', 'Quitar referencia', 'data-id="' + html(id) + '"')
            : '') +
          '</span>'
        );
      })
      .join('');
  }
  render(): void {
    const source = this.ctx.world(),
      w = { ...source, messages: conversation(source, this.ctx.ui).messages },
      restore = preserveFocus(this.root),
      restoreDraft = preserveComposerDrafts(this.root);
    this.root.innerHTML = `<div class="session-layout"><div class="session-actions">${slotToggle(this.ctx)}</div><div class="conversation ${w.messages.length ? 'has-messages' : 'empty-conversation'}"><header class="session-conversation-header">${this.header.markup()}${participantsMarkup(conversation(source, this.ctx.ui).participants)}</header><div class="conversation-stream">${w.messages.length ? w.messages.map((m) => `<article class="message ${m.role}">${m.role === 'agent' ? '<div class="message-author">' + html(m.name) + '</div>' : ''}<div class="message-text">${html(m.text).replace(/(@[\wáéíóú]+)/g, '<span class="mention">$1</span>')}</div>${this.references(m.materialIds ?? [])}${m.plan ? `<div class="plan">${m.plan.map((t) => `<p>${html(t)}</p>`).join('')}<div>${btn('plan-board', 'board', 'Enviar tareas a Board', `data-id="${m.id}"`)}${btn('message-doc', 'docs', 'Guardar en Docs', `data-id="${m.id}"`)}</div></div>` : ''}</article>`).join('') : '<h1>¿Por dónde seguimos?</h1>'}</div><div class="session-compose"><div class="session-draft-references">${this.references(conversationDraft(source, this.ctx.ui).materials, true)}</div>${tools(this.ctx)}${contextualComposer(this.ctx, 'session-composer', 'Escribí lo que tenés en mente…', true)}</div></div>${slot(this.ctx, false)}</div>`;
    restoreDraft();
    restore();
    const stream = this.root.querySelector('.conversation-stream');
    if (stream && w.messages.length) stream.scrollTop = stream.scrollHeight;
  }
  dispose(): void {
    this.abort.abort();
  }
}
