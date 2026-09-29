import type { Context } from '../../app/context';
import { materialRoute, nodeTitle, type Point } from '../../domain/model';
import { html, target, value, preserveFocus } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { composer, bindComposer } from '../../ui/composer';
import { bound } from '../../spatial/math';
import { bindDismiss } from '../../ui/popover';
import { trace, type Intent } from '../../app/diagnostics/trace';
export class CanvasChat {
  private abort = new AbortController();
  private people = false;
  private drag: {
    start: Point;
    origin: Point;
    raw: Point;
    intent: Intent;
  } | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    bindComposer(root, this.abort.signal, ctx);
    bindDismiss(
      this.abort.signal,
      () => ctx.ui.chat.chatMode === 'quick' && !this.drag,
      () => {
        ctx.ui.chat.chatMode = 'closed';
        this.render();
      },
      '.canvas-chat,[data-action=chat-open],.dictation-consent',
    );
    root.addEventListener(
      'input',
      (e) => {
        if (e.target instanceof HTMLTextAreaElement && e.target.id === 'canvas-chat-composer-input')
          this.draft().text = e.target.value;
      },
      { signal: this.abort.signal },
    );
    bindDismiss(
      this.abort.signal,
      () => this.people,
      () => {
        this.people = false;
        this.render();
      },
      '[data-action=chat-people],#add-person',
    );
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const u = ctx.ui;
        switch (t.dataset.action) {
          case 'chat-ref-remove':
            this.draft().materials = this.draft().materials.filter((id) => id !== t.dataset.id);
            this.render();
            break;
          case 'chat-ref-open': {
            const destination = materialRoute(ctx.store.get(), ctx.world().id, t.dataset.id ?? '');
            if (destination) ctx.go(destination, t.getBoundingClientRect());
            break;
          }
          case 'chat-close':
            u.chat.chatMode = 'closed';
            this.render();
            break;
          case 'chat-dock':
            u.chat.chatMode = 'docked';
            u.chat.chatCompact = false;
            this.render();
            break;
          case 'chat-undock':
            u.chat.chatMode = 'quick';
            u.chat.chatPosition = { x: 325, y: 150 };
            this.render();
            break;
          case 'chat-room':
            u.chat.chatMode = u.chat.chatMode === 'room' ? 'quick' : 'room';
            u.chat.chatCompact = false;
            this.render();
            break;
          case 'chat-compact':
            u.chat.chatCompact = !u.chat.chatCompact;
            this.render();
            break;
          case 'chat-people':
            this.people = !this.people;
            this.render();
            break;
          case 'chat-tab':
            u.chat.chatTab = t.dataset.tab === 'comments' ? 'comments' : 'chat';
            this.render();
            break;
          case 'comment-resolve':
            ctx.act(
              { type: 'comment.resolve', world: ctx.world().id, id: t.dataset.id ?? '' },
              'cerrar comentario',
              'COMMENT-01',
            );
            break;
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'submit',
      (e) => {
        if (!(e.target instanceof HTMLFormElement)) return;
        const w = ctx.world();
        if (e.target.id === 'canvas-chat-composer') {
          e.preventDefault();
          const text = value(root, '#canvas-chat-composer-input');
          const input = root.querySelector<HTMLTextAreaElement>('#canvas-chat-composer-input');
          if (input) input.value = '';
          const materials = [...this.draft().materials];
          this.draft().text = '';
          this.draft().materials = [];
          void ctx.service
            .converse(w.id, 'chat', text, materials)
            .catch((error) => ctx.fail(error, 'canvas.chat'));
        }
        if (e.target.id === 'add-person') {
          e.preventDefault();
          ctx.act(
            { type: 'participant', world: w.id, name: value(root, '#person-name') },
            'agregar participante',
            'CHAT-02',
          );
          this.people = false;
          this.render();
        }
        if (e.target.dataset.reply) {
          e.preventDefault();
          ctx.act(
            {
              type: 'comment.reply',
              world: w.id,
              id: e.target.dataset.reply,
              text: e.target.querySelector('input')?.value ?? '',
            },
            'responder comentario',
            'COMMENT-01',
          );
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'pointerdown',
      (e) => {
        if (
          !(e.target instanceof Element) ||
          !e.target.closest('.chat-handle') ||
          e.target.closest('button')
        )
          return;
        e.preventDefault();
        const panel = root.querySelector<HTMLElement>('.canvas-chat');
        if (!panel) return;
        const r = panel.getBoundingClientRect();
        ctx.ui.chat.chatMode = 'quick';
        ctx.ui.chat.chatPosition = { x: r.x, y: r.y };
        const intent = trace.intent('arrastrar chat', 'DRAG-01');
        this.drag = {
          start: { x: e.clientX, y: e.clientY },
          origin: { x: r.x, y: r.y },
          raw: { x: r.x, y: r.y },
          intent,
        };
        panel.classList.remove('docked', 'room');
        panel.classList.add('quick');
        panel.style.width = '310px';
        panel.style.height = ctx.ui.chat.chatCompact ? '48px' : '340px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = r.x + 'px';
        panel.style.top = r.y + 'px';
        root.setPointerCapture(e.pointerId);
        trace.add('drag.started', { component: 'chat', from: { x: r.x, y: r.y } }, intent);
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'pointermove',
      (e) => {
        if (!this.drag) return;
        e.preventDefault();
        this.drag.raw = {
          x: this.drag.origin.x + e.clientX - this.drag.start.x,
          y: this.drag.origin.y + e.clientY - this.drag.start.y,
        };
        const size = {
            width: Math.min(310, innerWidth - 24),
            height: ctx.ui.chat.chatCompact ? 48 : Math.min(340, innerHeight - 90),
          },
          p = bound(this.drag.raw, size, {
            x: 0,
            y: 59,
            width: innerWidth,
            height: innerHeight - 59,
          });
        ctx.ui.chat.chatPosition = p;
        const panel = root.querySelector<HTMLElement>('.canvas-chat');
        if (panel) {
          panel.style.left = p.x + 'px';
          panel.style.top = p.y + 'px';
        }
        root.classList.toggle('dock-preview', this.drag.raw.x < 55);
      },
      { signal: this.abort.signal },
    );
    const release = () => {
      if (!this.drag) return;
      const d = this.drag;
      this.drag = null;
      root.classList.remove('dock-preview');
      if (d.raw.x < 55) {
        ctx.ui.chat.chatMode = 'docked';
        ctx.ui.chat.chatCompact = false;
      }
      trace.add(
        'drag.finished',
        {
          component: 'chat',
          to: ctx.ui.chat.chatPosition,
          mode: ctx.ui.chat.chatMode,
          clamped: d.raw.x !== ctx.ui.chat.chatPosition.x || d.raw.y !== ctx.ui.chat.chatPosition.y,
        },
        d.intent,
      );
      this.render();
    };
    root.addEventListener('pointerup', release, { signal: this.abort.signal });
    root.addEventListener('pointercancel', release, { signal: this.abort.signal });
    window.addEventListener('resize', () => this.render(), { signal: this.abort.signal });
    this.render();
  }
  private draft(): { text: string; materials: string[] } {
    return (this.ctx.ui.chat.chatDrafts[this.ctx.world().id] ??= { text: '', materials: [] });
  }
  reference(id: string): void {
    const w = this.ctx.world(),
      node = w.nodes.find((n) => n.id === id && !n.owner);
    if (!node || this.ctx.ui.chat.chatMode !== 'docked') return;
    const draft = this.draft();
    if (!draft.materials.includes(id)) draft.materials.push(id);
    this.ctx.ui.chat.chatTab = 'chat';
    this.render();
    trace.add(
      'chat.reference.added',
      { world: w.id, node: id, ownershipChanged: false },
      trace.intent('referenciar material', 'CHAT-REF-07'),
    );
  }
  render(): void {
    const { ctx } = this,
      u = ctx.ui,
      w = ctx.world(),
      restore = preserveFocus(this.root),
      draft = this.draft();
    if (u.chat.chatMode === 'closed') {
      this.root.innerHTML = '';
      return;
    }
    const p = bound(
      u.chat.chatPosition,
      {
        width: Math.min(310, innerWidth - 24),
        height: u.chat.chatCompact ? 48 : Math.min(340, innerHeight - 90),
      },
      { x: 0, y: 59, width: innerWidth, height: innerHeight - 59 },
    );
    u.chat.chatPosition = p;
    const comments = u.chat.chatMode === 'docked' && u.chat.chatTab === 'comments';
    this.root.innerHTML = `<section class="canvas-chat ${u.chat.chatMode} ${u.chat.chatCompact ? 'compact' : ''}" style="${u.chat.chatMode === 'quick' ? `left:${p.x}px;top:${p.y}px` : ''}" aria-label="Chat del Canvas"><header class="chat-handle"><span class="chat-grip">${icon('grip', 14)}</span><span class="chat-presence">${w.participants.length > 1 ? w.participants.length + ' personas' : 'Eve'}</span><div>${btn('chat-people', 'user', 'Agregar personas')}${u.chat.chatMode === 'docked' ? btn('chat-undock', 'dock', 'Desacoplar chat') : btn('chat-dock', 'dock', 'Anclar chat')}${btn('chat-room', 'expand', 'Room')}${btn('chat-compact', 'down', 'Contraer chat')}${btn('chat-close', 'close', 'Cerrar chat')}</div></header>${u.chat.chatMode === 'docked' ? `<nav class="chat-tabs">${btn('chat-tab', 'session', 'Conversación', 'data-tab="chat"', !comments)}${btn('chat-tab', 'comment', 'Comentarios', 'data-tab="comments"', comments)}</nav>` : ''}${this.people ? `<form id="add-person"><input id="person-name" aria-label="Nombre del participante" placeholder="Nombre"><button class="icon-button" type="submit" aria-label="Agregar persona">${icon('plus')}</button></form>` : ''}<div class="chat-scroll">${
      comments
        ? w.comments
            .map(
              (c) =>
                `<article class="comment-thread ${c.resolved ? 'resolved' : ''}"><div><strong>${html(c.author)}</strong>${btn('comment-resolve', 'check', c.resolved ? 'Reabrir comentario' : 'Resolver comentario', `data-id="${c.id}"`, c.resolved)}</div><p>${html(c.text)}</p>${c.replies.map((reply) => `<p class="reply">${html(reply)}</p>`).join('')}<form data-reply="${c.id}"><input aria-label="Responder comentario" placeholder="Responder…"><button class="icon-button" type="submit" aria-label="Enviar respuesta">${icon('up', 15)}</button></form></article>`,
            )
            .join('')
        : w.chat
            .map(
              (m) =>
                `<article class="chat-message ${m.role}"><strong>${html(m.name)}</strong><p>${html(m.text)}</p>${(
                  m.materialIds ?? []
                )
                  .map((id) => {
                    const n = w.nodes.find((n) => n.id === id);
                    return `<button class="chat-reference" data-action="chat-ref-open" data-id="${id}">${icon('note', 12)}${html(n ? nodeTitle(w, n) || 'Sin título' : 'Material no disponible')}</button>`;
                  })
                  .join('')}</article>`,
            )
            .join('')
    }</div>${
      comments
        ? ''
        : `<div class="chat-draft-area">${
            draft.materials.length
              ? `<div class="chat-reference-list">${draft.materials
                  .map((id) => {
                    const n = w.nodes.find((n) => n.id === id);
                    return `<span class="chat-reference">${icon('note', 12)}${html(n ? nodeTitle(w, n) || 'Sin título' : 'Material no disponible')}${btn('chat-ref-remove', 'close', 'Quitar referencia', `data-id="${id}"`)}</span>`;
                  })
                  .join('')}</div>`
              : ''
          }${composer('canvas-chat-composer', 'Escribí un mensaje…')}</div>`
    }</section>`;
    const ta = this.root.querySelector<HTMLTextAreaElement>('#canvas-chat-composer-input');
    if (ta) ta.value = draft.text;
    restore();
    const scroll = this.root.querySelector('.chat-scroll');
    if (scroll && !comments) scroll.scrollTop = scroll.scrollHeight;
  }
  dispose(): void {
    this.abort.abort();
    this.root.innerHTML = '';
  }
}
