import type { Context } from '../app/context';
import { arrangementUnits } from '../domain/arrangement';
import { arrangeSelection, arrangementMarkup, spacingValue } from './canvas-arrangement';
import { frameCanvas } from './canvas-frame';
import { target } from './dom';
import { icon } from './icons';
import { bindDismiss } from './popover';
import { wireframePalette, addWireframe, bindWireframeDrag } from './canvas-wireframes';

/** Creación, organización y vista tienen entradas propias en la cabecera. */
export class CanvasActions {
  private open = false;
  private page: 'view' | 'arrange' | 'wireframes' = 'view';
  private painted: string | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private render: () => void,
    settings: (page: 'preferences' | 'shortcuts') => void,
    signal: AbortSignal,
  ) {
    bindWireframeDrag(root, ctx, signal, () => this.close(false));
    bindDismiss(
      signal,
      () => this.open,
      (source) => this.close(source === 'keyboard'),
      '.canvas-actions',
    );
    window.addEventListener('resize', () => this.position(), { signal });
    document.addEventListener(
      'contextmenu',
      () => {
        if (this.open) this.close(false);
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        const button = target(event);
        if (!button || button.hasAttribute('disabled')) return;
        switch (button.dataset.action) {
          case 'canvas-view':
          case 'canvas-organize':
          case 'canvas-wireframes': {
            const page =
              button.dataset.action === 'canvas-wireframes'
                ? 'wireframes'
                : button.dataset.action === 'canvas-organize'
                  ? 'arrange'
                  : 'view';
            this.open = !this.open || this.page !== page;
            this.page = page;
            ctx.ui.shell.profile = ctx.ui.shell.status = ctx.ui.shell.surfaceMenu = false;
            ctx.ui.shell.searchOpen = false;
            ctx.ui.shell.search = '';
            this.render();
            if (this.open) this.focus();
            else this.trigger()?.focus({ preventScroll: true });
            break;
          }
          case 'wireframe-add':
            this.close(false);
            addWireframe(ctx, button.dataset.kind);
            break;
          case 'selection-arrange':
            if (!button.closest('.canvas-actions')) return;
            this.close();
            arrangeSelection(ctx, button.dataset.arrangement);
            this.trigger()?.focus({ preventScroll: true });
            break;
          case 'selection-spacing': {
            const spacing = spacingValue(button);
            if (spacing === undefined) break;
            this.close();
            arrangeSelection(ctx, button.dataset.arrangement, spacing);
            break;
          }
          case 'actions-fit':
            this.close();
            frameCanvas(ctx, button.dataset.selection === 'true');
            break;
          case 'canvas-guides-toggle':
            ctx.ui.shell.canvasAlignmentGuides = !ctx.ui.shell.canvasAlignmentGuides;
            ctx.persist();
            this.render();
            ctx.render();
            root.querySelector<HTMLElement>('[data-action=canvas-guides-toggle]')?.focus();
            break;
          case 'actions-preferences':
          case 'actions-shortcuts':
            this.open = false;
            settings(button.dataset.action === 'actions-shortcuts' ? 'shortcuts' : 'preferences');
            break;
        }
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (!(event.target instanceof HTMLElement) || !event.target.closest('.canvas-actions'))
          return;
        if (event.target instanceof HTMLInputElement) {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            event.target.closest('label')?.querySelector<HTMLButtonElement>('button')?.click();
          }
          return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          const action =
            event.target.closest<HTMLElement>('.canvas-actions-trigger')?.dataset.action;
          const requested =
            action === 'canvas-wireframes'
              ? 'wireframes'
              : action === 'canvas-organize'
                ? 'arrange'
                : 'view';
          if (!this.open || (action && requested !== this.page)) {
            this.open = true;
            this.page = requested;
            this.render();
          }
          const items = this.items(),
            current = items.indexOf(document.activeElement as HTMLButtonElement);
          let next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : current < 0
                  ? event.key === 'ArrowUp'
                    ? items.length - 1
                    : 0
                  : (current +
                      (event.key === 'ArrowDown' ? 1 : -1) * (this.page === 'wireframes' ? 3 : 1) +
                      items.length) %
                    items.length;
          if (
            this.page === 'wireframes' &&
            current >= 0 &&
            ['ArrowDown', 'ArrowUp'].includes(event.key)
          ) {
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const origin = items[current]!.getBoundingClientRect();
            const candidates = items.map((item, index) => ({
              index,
              rect: item.getBoundingClientRect(),
            }));
            const following = candidates.filter(({ rect }) => (rect.y - origin.y) * direction > 1);
            const row = following.length
              ? Math.min(...following.map(({ rect }) => (rect.y - origin.y) * direction))
              : 0;
            const targetY = following.length
              ? origin.y + row * direction
              : direction > 0
                ? Math.min(...candidates.map(({ rect }) => rect.y))
                : Math.max(...candidates.map(({ rect }) => rect.y));
            next = candidates
              .filter(({ rect }) => Math.abs(rect.y - targetY) < 1)
              .sort((a, b) => Math.abs(a.rect.x - origin.x) - Math.abs(b.rect.x - origin.x))[0]!
              .index;
          }
          items[next]?.focus();
          items[next]?.scrollIntoView({ block: 'nearest' });
        } else if (
          ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
          event.target.closest('.canvas-actions-trigger')
        ) {
          event.preventDefault();
          event.stopPropagation();
          const triggers = [...this.root.querySelectorAll<HTMLElement>('.canvas-actions-trigger')];
          const current = triggers.indexOf(
            event.target.closest<HTMLElement>('.canvas-actions-trigger')!,
          );
          triggers[
            (current + (event.key === 'ArrowRight' ? 1 : -1) + triggers.length) % triggers.length
          ]?.focus();
        } else if (
          ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
          this.page === 'wireframes' &&
          this.open
        ) {
          event.preventDefault();
          event.stopPropagation();
          const items = this.items();
          const current = items.indexOf(document.activeElement as HTMLButtonElement);
          items[
            (current + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
          ]?.focus();
        } else if (event.key === 'Tab' && this.open) {
          if (this.page === 'arrange' && event.target.closest('.canvas-actions-pop')) {
            const fields = [
              ...this.root.querySelectorAll<HTMLElement>(
                '.canvas-actions-pop button:not(:disabled),.canvas-actions-pop input:not(:disabled)',
              ),
            ];
            const index = fields.indexOf(event.target);
            if ((event.shiftKey && index > 0) || (!event.shiftKey && index < fields.length - 1)) {
              event.stopPropagation();
              return;
            }
          }
          event.preventDefault();
          const controls = [
            ...this.root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([inert])'),
          ].filter((item) => item.getClientRects().length && !item.closest('.canvas-actions-pop'));
          const next = event.shiftKey
            ? this.trigger()
            : controls[controls.indexOf(this.trigger()!) + 1];
          const action = next?.dataset.action;
          this.close();
          if (action) this.root.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
        } else if (
          this.open &&
          !((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
        )
          event.stopPropagation();
      },
      { signal },
    );
  }
  private trigger(): HTMLElement | null {
    return this.root.querySelector(
      `[data-action=${this.page === 'wireframes' ? 'canvas-wireframes' : this.page === 'arrange' ? 'canvas-organize' : 'canvas-view'}]`,
    );
  }
  private items(): HTMLButtonElement[] {
    return [
      ...this.root.querySelectorAll<HTMLButtonElement>('.canvas-actions-pop button:not(:disabled)'),
    ];
  }
  private focus(): void {
    (this.items()[0] ?? this.trigger())?.focus({ preventScroll: true });
  }
  private close(focus = true): void {
    this.open = false;
    this.render();
    if (focus) this.trigger()?.focus({ preventScroll: true });
  }
  dismiss(): void {
    this.open = false;
    this.painted = null;
  }
  position(): void {
    const menu = this.root.querySelector<HTMLElement>('.canvas-actions-pop'),
      rect = this.trigger()?.getBoundingClientRect();
    if (!menu || !rect) {
      this.painted = null;
      return;
    }
    if (this.painted === this.page) menu.style.animation = 'none';
    this.painted = this.page;
    menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, rect.left)) + 'px';
    menu.style.top = rect.bottom + 8 + 'px';
    menu.style.maxHeight = Math.max(80, innerHeight - rect.bottom - 16) + 'px';
  }
  markup(): string {
    const route = this.ctx.store.get().route;
    if (route.kind !== 'surface' || route.surface !== 'canvas') {
      this.open = false;
      return '';
    }
    const shell = this.ctx.ui.shell,
      units = arrangementUnits(this.ctx.world(), this.ctx.ui.canvas.selections);
    const check = (action: string, name: string, checked: boolean): string =>
      `<button type="button" role="menuitemcheckbox" aria-checked="${checked}" data-action="${action}"><span class="canvas-action-check">${checked ? icon('check', 14) : ''}</span>${name}</button>`;
    const menus = [
      {
        page: 'wireframes',
        action: 'canvas-wireframes',
        label: 'Bosquejos',
        name: 'Bosquejos',
        glyph: 'sketch',
      },
      {
        page: 'arrange',
        action: 'canvas-organize',
        label: 'Organizar',
        name: 'Organizar selección',
        glyph: 'arrange-left',
      },
      {
        page: 'view',
        action: 'canvas-view',
        label: 'Vista',
        name: 'Vista y ajustes de Canvas',
        glyph: 'canvas',
      },
    ] as const;
    const current = menus.find((menu) => menu.page === this.page)!;
    const content =
      this.page === 'wireframes'
        ? wireframePalette()
        : this.page === 'arrange'
          ? arrangementMarkup(this.ctx)
          : `<button type="button" role="menuitem" data-action="actions-fit" data-selection="true" ${units.length ? '' : 'disabled'}>Ajustar a la selección</button><button type="button" role="menuitem" data-action="actions-fit" ${this.ctx.world().nodes.some((node) => !node.owner) || this.ctx.world().zones.length ? '' : 'disabled'}>Ajustar al contenido</button><hr>${check('canvas-guides-toggle', 'Guías y ajuste automático', shell.canvasAlignmentGuides)}${check('canvas-grid-toggle', 'Fondo cuadriculado', shell.canvasBackground === 'grid')}${check('canvas-dock-toggle', 'Dock vertical', shell.canvasDockOrientation === 'vertical')}<hr><button type="button" role="menuitem" data-action="actions-preferences">Preferencias de Canvas</button><button type="button" role="menuitem" data-action="actions-shortcuts">Atajos de Canvas</button>`;
    return `<div class="canvas-actions" role="toolbar" aria-label="Creación, organización y vista de Canvas">${menus.map((menu) => `<button type="button" class="canvas-actions-trigger" data-action="${menu.action}" aria-label="${menu.name}" data-tip="${menu.name}" aria-haspopup="menu" aria-expanded="${this.open && this.page === menu.page}" aria-controls="canvas-${menu.page}-menu">${icon(menu.glyph, 16)}<span>${menu.label}</span>${icon('down', 10)}</button>`).join('')}${this.open ? `<div class="canvas-actions-pop ${this.page === 'arrange' ? 'arrangement-menu' : ''}" id="canvas-${this.page}-menu" role="menu" aria-label="${current.name}"><strong class="canvas-menu-title">${current.label}</strong>${content}</div>` : ''}</div>`;
  }
}
