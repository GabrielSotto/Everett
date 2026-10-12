import type { Context } from '../../app/context';
import { materialRoute, materialTitle, type Point } from '../../domain/model';
import { html, target, value, preserveFocus } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { composer, bindComposer } from '../../ui/composer';
import { bound } from '../../spatial/math';
import { bindDismiss } from '../../ui/popover';
import { trace, type Intent } from '../../app/diagnostics/trace';
import { bindPointerCancellation } from '../../ui/pointer-cancellation';
import type { ChatUi } from './state';
import { conversation, conversationDraft } from '../../domain/conversations';
import { ConversationHeader, participantsMarkup } from './history';
import { motion, reducedMotion } from '../../ui/motion';
import { composerDraft } from '../../ui/composer';
export class CanvasChat {
  private abort = new AbortController();
  private people = false;
  private actionsOpen = false;
  private presentation: ChatUi['chatMode'] = 'closed';
  private animation: Animation | null = null;
  private header: ConversationHeader;
  private drag: {
    start: Point;
    origin: Point;
    raw: Point;
    mode: ChatUi['chatMode'];
    intent: Intent;
  } | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private layoutChanged: () => void,
  ) {
    this.header = new ConversationHeader(ctx, () => this.render(), root, this.abort.signal);
    bindComposer(root, this.abort.signal, ctx);
    bindDismiss(
      this.abort.signal,
      () => this.actionsOpen,
      (source) => {
        this.actionsOpen = false;
        this.renderActions();
        if (source === 'keyboard')
          root.querySelector<HTMLElement>('[data-action=chat-actions]')?.focus();
      },
      '.chat-composer-menu,[data-action=chat-actions]',
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (!(event.target instanceof Element) || !event.target.closest('.chat-composer-menu'))
          return;
        const buttons = [
          ...root.querySelectorAll<HTMLElement>('.chat-composer-menu [role=menuitem]'),
        ];
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const index = buttons.indexOf(document.activeElement as HTMLElement);
        buttons[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        ]?.focus();
      },
      { signal: this.abort.signal },
    );
    bindDismiss(
      this.abort.signal,
      () => ctx.ui.chat.chatMode === 'quick' && !this.drag,
      (source) => this.close(source === 'keyboard'),
      '.canvas-chat,[data-action=chat-open],.dictation-consent,.zone-inspector,.proposal,[data-zone]',
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
      '[data-action=chat-people],#add-person,.chat-composer-menu',
    );
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const u = ctx.ui;
        if (t.closest('.chat-composer-menu')) {
          this.actionsOpen = false;
          this.renderActions();
        }
        switch (t.dataset.action) {
          case 'chat-actions':
            this.actionsOpen = !this.actionsOpen;
            this.renderActions();
            root.querySelector<HTMLElement>('.chat-composer-menu [role=menuitem]')?.focus();
            break;
          case 'chat-ref-selection': {
            const id = u.canvas.selection;
            if (id && !this.draft().materials.includes(id)) this.draft().materials.push(id);
            this.render();
            break;
          }
          case 'chat-session':
            ctx.go({ kind: 'surface', world: ctx.world().id, surface: 'session', entity: null });
            break;
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
            this.close(true);
            break;
          case 'chat-dock':
            u.chat.chatMode = 'docked';
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
            .converse(w.id, 'chat', text, materials, conversation(w, ctx.ui).id)
            .catch((error) => ctx.fail(error, 'canvas.chat'));
        }
        if (e.target.id === 'add-person') {
          e.preventDefault();
          ctx.act(
            {
              type: 'participant',
              world: w.id,
              name: value(root, '#person-name'),
              conversation: conversation(w, ctx.ui).id,
            },
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
          e.target.closest('button,input')
        )
          return;
        e.preventDefault();
        const panel = root.querySelector<HTMLElement>('.canvas-chat');
        if (!panel) return;
        const r = panel.getBoundingClientRect();
        const mode = ctx.ui.chat.chatMode;
        ctx.ui.chat.chatMode = 'quick';
        ctx.ui.chat.chatPosition = { x: r.x, y: r.y };
        const intent = trace.intent('arrastrar chat', 'DRAG-01');
        this.drag = {
          start: { x: e.clientX, y: e.clientY },
          origin: { x: r.x, y: r.y },
          raw: { x: r.x, y: r.y },
          mode,
          intent,
        };
        panel.classList.remove('docked');
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
    bindPointerCancellation(root, this.abort.signal, () => {
      if (!this.drag) return;
      ctx.ui.chat.chatPosition = this.drag.origin;
      ctx.ui.chat.chatMode = this.drag.mode;
      this.drag = null;
      root.classList.remove('dock-preview');
      this.render();
    });
    window.addEventListener('resize', () => this.render(), { signal: this.abort.signal });
    this.render();
  }
  private draft(): { text: string; materials: string[] } {
    return conversationDraft(this.ctx.world(), this.ctx.ui);
  }
  private close(restoreFocus: boolean): void {
    this.ctx.ui.chat.chatMode = 'closed';
    this.render();
    this.ctx.persist();
    if (restoreFocus)
      this.root.parentElement
        ?.querySelector<HTMLButtonElement>('[data-action="chat-open"]')
        ?.focus({ preventScroll: true });
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
      source = ctx.world(),
      w = {
        ...source,
        chat: conversation(source, u).messages,
        participants: conversation(source, u).participants,
      },
      restore = preserveFocus(this.root),
      draft = this.draft();
    const previous = this.root.querySelector<HTMLElement>('.canvas-chat')?.getBoundingClientRect();
    const changedPresentation = this.presentation !== u.chat.chatMode;
    this.presentation = u.chat.chatMode;
    this.animation?.cancel();
    if (u.chat.chatMode === 'closed') {
      this.root.innerHTML = '';
      this.layoutChanged();
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
    this.root.innerHTML = `<section class="canvas-chat ${u.chat.chatMode} ${u.chat.chatCompact ? 'compact' : ''}" style="${u.chat.chatMode === 'quick' ? `left:${p.x}px;top:${p.y}px` : ''}" aria-label="Chat del Canvas"><header class="chat-handle"><span class="chat-grip">${icon('grip', 14)}</span>${this.header.markup()}<div>${u.chat.chatMode === 'docked' ? '' : btn('chat-dock', 'dock', 'Anclar chat')}${btn('chat-compact', u.chat.chatCompact ? 'chevron-up' : 'down', u.chat.chatCompact ? 'Desplegar chat' : 'Contraer chat', `aria-expanded="${!u.chat.chatCompact}"`)}${btn('chat-close', 'close', 'Cerrar chat')}</div></header>${participantsMarkup(w.participants)}${u.chat.chatMode === 'docked' ? `<nav class="chat-tabs">${btn('chat-tab', 'conversation', 'Conversación', 'data-tab="chat"', !comments)}${btn('chat-tab', 'annotation', 'Comentarios', 'data-tab="comments"', comments)}</nav>` : ''}${this.people ? `<form id="add-person"><input id="person-name" aria-label="Nombre del participante" placeholder="Nombre"><button class="icon-button" type="submit" aria-label="Agregar persona">${icon('plus')}</button></form>` : ''}<div class="chat-scroll">${
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
                    return `<button class="chat-reference" data-action="chat-ref-open" data-id="${id}">${icon('note', 12)}${html(materialTitle(w, id))}</button>`;
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
                    return `<span class="chat-reference">${icon('note', 12)}${html(materialTitle(w, id))}${btn('chat-ref-remove', 'close', 'Quitar referencia', `data-id="${id}"`)}</span>`;
                  })
                  .join('')}</div>`
              : ''
          }${composer('canvas-chat-composer', 'Escribí un mensaje…', false, '', composerDraft(ctx, 'canvas-chat-composer'), true)}</div>`
    }</section>`;
    const panel = this.root.querySelector<HTMLElement>('.canvas-chat');
    if (changedPresentation && previous && panel && !reducedMotion()) {
      const next = panel.getBoundingClientRect();
      this.animation = panel.animate(
        [
          {
            transform: `translate(${previous.x - next.x}px,${previous.y - next.y}px)`,
            opacity: 0.75,
          },
          { transform: 'none', opacity: 1 },
        ],
        { duration: motion.panelOpenMs, easing: motion.panelEase },
      );
    }
    this.layoutChanged();
    this.renderActions();
    const ta = this.root.querySelector<HTMLTextAreaElement>('#canvas-chat-composer-input');
    if (ta) ta.value = draft.text;
    restore();
    const scroll = this.root.querySelector('.chat-scroll');
    if (scroll && !comments) scroll.scrollTop = scroll.scrollHeight;
  }
  private renderActions(): void {
    this.root.querySelector('.chat-composer-menu')?.remove();
    const trigger = this.root.querySelector<HTMLElement>('[data-action=chat-actions]');
    trigger?.setAttribute('aria-expanded', String(this.actionsOpen));
    if (!this.actionsOpen || !trigger) return;
    const item = (action: string, symbol: string, label: string) =>
      `<button type="button" role="menuitem" data-action="${action}">${icon(symbol, 16)}<span>${label}</span></button>`;
    trigger
      .closest('form')
      ?.insertAdjacentHTML(
        'beforeend',
        `<div class="chat-composer-menu" role="menu" aria-label="Acciones de conversación">${item('mention', 'at', 'Mencionar')}${this.ctx.ui.chat.chatMode === 'docked' ? item('chat-people', 'user', 'Agregar personas') : ''}${this.ctx.ui.canvas.selection ? item('chat-ref-selection', 'note', 'Referenciar material seleccionado') : ''}${item('chat-session', 'session', 'Ver en Sessions')}</div>`,
      );
    const menu = this.root.querySelector<HTMLElement>('.chat-composer-menu')!;
    const origin = trigger.getBoundingClientRect();
    menu.style.left = Math.max(12, Math.min(innerWidth - menu.offsetWidth - 12, origin.x)) + 'px';
    menu.style.top =
      Math.max(
        70,
        Math.min(innerHeight - menu.offsetHeight - 12, origin.top - menu.offsetHeight - 10),
      ) + 'px';
  }
  dispose(): void {
    this.animation?.cancel();
    this.abort.abort();
    this.root.innerHTML = '';
  }
}
