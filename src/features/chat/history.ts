import type { Context } from '../../app/context';
import { conversation } from '../../domain/conversations';
import { html, target } from '../../ui/dom';
import { btn } from '../../ui/icons';
import { bindDismiss } from '../../ui/popover';

export function participantsMarkup(names: readonly string[]): string {
  const namesText = html(
    names
      .map((name, index) =>
        names.filter((other) => other === name).length > 1
          ? `${name} (${index === 0 ? 'iniciador' : index === 1 ? 'agente' : 'participante'})`
          : name,
      )
      .join(' · '),
  );
  return `<div class="conversation-participants" role="group" aria-label="Participantes" title="${namesText}" tabindex="0">${namesText}</div>`;
}

/** El historial comparte identidad y conserva el composer visible. */
export class ConversationHeader {
  private open = false;
  private search = '';
  private editing = false;
  private pendingName: { world: string; id: string; name: string } | null = null;
  constructor(
    private ctx: Context,
    private render: () => void,
    root: HTMLElement,
    signal: AbortSignal,
  ) {
    bindDismiss(
      signal,
      () => this.open && !this.editing,
      (source) => {
        this.open = false;
        this.render();
        if (source === 'keyboard')
          root.querySelector<HTMLElement>('[data-action=conversation-history]')?.focus();
      },
      '.conversation-history,.conversation-head',
    );
    root.addEventListener(
      'click',
      (event) => {
        const button = target(event),
          world = ctx.world();
        this.commitName();
        switch (button?.dataset.action) {
          case 'conversation-history':
            this.open = !this.open;
            this.render();
            break;
          case 'conversation-clear':
            this.search = '';
            this.render();
            root.querySelector<HTMLInputElement>('#conversation-search')?.focus();
            break;
          case 'conversation-name':
            this.editing = true;
            this.render();
            root.querySelector<HTMLInputElement>('#conversation-name')?.select();
            break;
          case 'conversation-new':
            if (
              ctx.act(
                { type: 'conversation.create', world: world.id, origin: this.origin() },
                'crear conversación',
                'C08-CHAT-08',
              )
            ) {
              const thread = ctx.world().conversations.at(-1);
              if (thread) ctx.ui.conversations[world.id] = thread.id;
              this.open = false;
              this.search = '';
              this.render();
              ctx.persist();
            }
            break;
          case 'conversation-select':
            if (button?.dataset.id) ctx.ui.conversations[world.id] = button.dataset.id;
            this.open = false;
            this.render();
            ctx.persist();
            break;
        }
      },
      { signal },
    );
    // Confirmar después del clic conserva su destino aunque el render reemplace el campo.
    root.addEventListener(
      'focusout',
      (event) => {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.id === 'conversation-name' &&
          this.editing
        ) {
          this.pendingName = {
            world: ctx.world().id,
            id: conversation(ctx.world(), ctx.ui).id,
            name: event.target.value,
          };
          this.editing = false;
        }
      },
      { signal },
    );
    window.addEventListener('click', () => this.commitName(), { signal });
    window.addEventListener(
      'keyup',
      (event) => {
        if (event.key === 'Tab') this.commitName();
      },
      { signal },
    );
    root.addEventListener(
      'input',
      (event) => {
        if (event.target instanceof HTMLInputElement && event.target.id === 'conversation-search') {
          this.search = event.target.value;
          this.render();
        }
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        if (
          event.target.id === 'conversation-name' &&
          (event.key === 'Enter' || event.key === 'Escape')
        ) {
          event.preventDefault();
          event.stopPropagation();
          const name = event.target.value;
          this.editing = false;
          if (event.key === 'Enter' && name.trim())
            ctx.act(
              {
                type: 'conversation.rename',
                world: ctx.world().id,
                id: conversation(ctx.world(), ctx.ui).id,
                name,
              },
              'renombrar conversación',
              'C08-CHAT-10',
            );
          this.render();
          root.querySelector<HTMLElement>('[data-action=conversation-name]')?.focus();
        }
        if (event.target.id === 'conversation-search' && event.key === 'Escape') {
          event.stopPropagation();
          this.open = false;
          this.render();
          root.querySelector<HTMLElement>('[data-action=conversation-history]')?.focus();
        }
      },
      { signal },
    );
  }
  private commitName(): void {
    const pending = this.pendingName;
    this.pendingName = null;
    if (!pending) return;
    if (pending.name.trim())
      this.ctx.act(
        { type: 'conversation.rename', ...pending },
        'renombrar conversación',
        'C08-CHAT-10',
      );
    this.render();
  }
  private origin(): 'canvas' | 'session' {
    const route = this.ctx.store.get().route;
    return route.kind === 'surface' && route.surface === 'session' ? 'session' : 'canvas';
  }
  markup(): string {
    const world = this.ctx.world(),
      active = conversation(world, this.ctx.ui);
    const results = world.conversations.filter((c) =>
      c.name.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()),
    );
    return `<div class="conversation-head">${this.editing ? `<input id="conversation-name" aria-label="Nombre de conversación" value="${html(active.name)}">` : `<button type="button" class="conversation-name" data-action="conversation-name" title="${html(active.name)}" aria-label="Renombrar ${html(active.name)}">${html(active.name)}</button>`}${btn('conversation-history', this.open ? 'chevron-up' : 'down', 'Historial de conversaciones', `aria-expanded="${this.open}"`)}${btn('conversation-new', 'plus', 'Nueva conversación')}</div>${this.open ? `<section class="conversation-history" aria-label="Historial de conversaciones"><div class="history-search"><input id="conversation-search" type="search" aria-label="Buscar conversación" value="${html(this.search)}" placeholder="Buscar conversación…">${this.search ? btn('conversation-clear', 'close', 'Limpiar búsqueda') : ''}</div><div class="history-results">${results.length ? results.map((c) => `<button type="button" data-action="conversation-select" data-id="${c.id}" class="${c.id === active.id ? 'active' : ''}" title="${html(c.name)}" aria-label="${html(c.name)}" ${c.id === active.id ? 'aria-current="true"' : ''}>${html(c.name)}</button>`).join('') : '<p>Sin resultados</p>'}</div></section>` : ''}`;
  }
}
