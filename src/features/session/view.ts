import type { Context } from '../../app/context';
import { html, target, value, preserveFocus, type View } from '../../ui/dom';
import { btn } from '../../ui/icons';
import { composer, bindComposer } from '../../ui/composer';
import { slot, tools, slotToggle, bindSlot } from '../../ui/slot';
export class SessionView implements View {
  private abort = new AbortController();
  private draft = '';
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    bindComposer(root, this.abort.signal, ctx);
    bindSlot(root, ctx, this.abort.signal);
    root.addEventListener(
      'input',
      (e) => {
        if (e.target instanceof HTMLTextAreaElement && e.target.id === 'session-composer-input')
          this.draft = e.target.value;
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'submit',
      (e) => {
        if (e.target instanceof HTMLFormElement && e.target.id === 'session-composer') {
          e.preventDefault();
          const text = value(root, '#session-composer-input');
          const ta = root.querySelector<HTMLTextAreaElement>('#session-composer-input');
          if (ta) ta.value = '';
          this.draft = '';
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
            .converse(ctx.world().id, 'messages', text)
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
          m = w.messages.find((m) => m.id === t.dataset.id);
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
  render(): void {
    const w = this.ctx.world(),
      restore = preserveFocus(this.root);
    this.root.innerHTML = `<div class="session-layout"><div class="session-actions">${slotToggle(this.ctx)}</div><div class="conversation ${w.messages.length ? 'has-messages' : 'empty-conversation'}"><div class="conversation-stream">${w.messages.length ? w.messages.map((m) => `<article class="message ${m.role}">${m.role === 'agent' ? '<div class="message-author">' + html(m.name) + '</div>' : ''}<div class="message-text">${html(m.text).replace(/(@[\wáéíóú]+)/g, '<span class="mention">$1</span>')}</div>${m.plan ? `<div class="plan">${m.plan.map((t) => `<p>${html(t)}</p>`).join('')}<div>${btn('plan-board', 'board', 'Enviar tareas a Board', `data-id="${m.id}"`)}${btn('message-doc', 'docs', 'Guardar en Docs', `data-id="${m.id}"`)}</div></div>` : ''}</article>`).join('') : '<h1>¿Por dónde seguimos?</h1>'}</div><div class="session-compose">${tools(this.ctx)}${composer('session-composer', 'Escribí lo que tenés en mente…', true)}</div></div>${slot(this.ctx, false)}</div>`;
    const draftInput = this.root.querySelector<HTMLTextAreaElement>('#session-composer-input');
    if (draftInput) draftInput.value = this.draft;
    restore();
    const stream = this.root.querySelector('.conversation-stream');
    if (stream && w.messages.length) stream.scrollTop = stream.scrollHeight;
  }
  dispose(): void {
    this.abort.abort();
  }
}
