import type { Context } from '../app/context';
import { arrangementUnits } from '../domain/arrangement';
import { arrangeSelection, arrangementMarkup } from './canvas-arrangement';
import { frameCanvas } from './canvas-frame';
import { target } from './dom';
import { icon } from './icons';
import { bindDismiss } from './popover';

/** Acciones y ajustes del Canvas, junto a su ubicación en la cabecera. */
export class CanvasActions {
  private open = false;
  private page: 'home' | 'arrange' = 'home';
  private painted = false;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private render: () => void,
    settings: (page: 'preferences' | 'shortcuts') => void,
    signal: AbortSignal,
  ) {
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
          case 'canvas-actions':
            this.open = !this.open;
            this.page = 'home';
            ctx.ui.shell.profile = ctx.ui.shell.status = ctx.ui.shell.surfaceMenu = false;
            ctx.ui.shell.searchOpen = false;
            ctx.ui.shell.search = '';
            this.render();
            if (this.open) this.focus();
            break;
          case 'actions-arrange':
            this.page = 'arrange';
            this.render();
            this.focus();
            break;
          case 'actions-back':
            this.page = 'home';
            this.render();
            this.focus();
            break;
          case 'selection-arrange':
            if (!button.closest('.canvas-actions')) return;
            this.close();
            arrangeSelection(ctx, button.dataset.arrangement);
            this.trigger()?.focus({ preventScroll: true });
            break;
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
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          if (!this.open) {
            this.open = true;
            this.page = 'home';
            this.render();
          }
          const items = this.items(),
            current = items.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : current < 0
                  ? event.key === 'ArrowUp'
                    ? items.length - 1
                    : 0
                  : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
          items[next]?.scrollIntoView({ block: 'nearest' });
        } else if (
          event.key === 'ArrowRight' &&
          event.target.dataset.action === 'actions-arrange'
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.target.click();
        } else if (event.key === 'ArrowLeft' && this.page === 'arrange') {
          event.preventDefault();
          event.stopPropagation();
          this.page = 'home';
          this.render();
          this.focus();
        } else if (event.key === 'Tab' && this.open) {
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
    return this.root.querySelector('[data-action=canvas-actions]');
  }
  private items(): HTMLButtonElement[] {
    return [
      ...this.root.querySelectorAll<HTMLButtonElement>('.canvas-actions-pop button:not(:disabled)'),
    ];
  }
  private focus(): void {
    this.items()[0]?.focus({ preventScroll: true });
  }
  private close(focus = true): void {
    this.open = false;
    this.render();
    if (focus) this.trigger()?.focus({ preventScroll: true });
  }
  dismiss(): void {
    this.open = false;
    this.page = 'home';
  }
  position(): void {
    const menu = this.root.querySelector<HTMLElement>('.canvas-actions-pop'),
      rect = this.trigger()?.getBoundingClientRect();
    if (!menu || !rect) {
      this.painted = false;
      return;
    }
    if (this.painted) menu.style.animation = 'none';
    this.painted = true;
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
    return `<div class="canvas-actions"><button type="button" class="canvas-actions-trigger" data-action="canvas-actions" aria-label="Acciones y ajustes de Canvas" aria-haspopup="menu" aria-expanded="${this.open}" aria-controls="canvas-actions-menu">${icon('canvas', 16)}<span>Canvas</span>${icon('down', 10)}</button>${this.open ? `<div class="canvas-actions-pop" id="canvas-actions-menu" role="menu" aria-label="Acciones y ajustes de Canvas">${this.page === 'arrange' ? `<button type="button" role="menuitem" class="canvas-actions-back" data-action="actions-back">${icon('chevron-left', 16)}Alinear y distribuir</button>${arrangementMarkup(this.ctx)}` : `<small class="canvas-actions-heading">Selección</small><button type="button" role="menuitem" data-action="actions-arrange" ${units.length < 2 ? 'disabled' : ''}>Alinear y distribuir ${icon('chevron', 12)}</button><button type="button" role="menuitem" data-action="actions-fit" data-selection="true" ${units.length ? '' : 'disabled'}>Ajustar a la selección</button><button type="button" role="menuitem" data-action="actions-fit" ${this.ctx.world().nodes.some((node) => !node.owner) || this.ctx.world().zones.length ? '' : 'disabled'}>Ajustar al contenido</button><hr><small class="canvas-actions-heading">Ajustes</small>${check('canvas-guides-toggle', 'Guías y ajuste automático', shell.canvasAlignmentGuides)}${check('canvas-grid-toggle', 'Fondo cuadriculado', shell.canvasBackground === 'grid')}${check('canvas-dock-toggle', 'Dock vertical', shell.canvasDockOrientation === 'vertical')}<hr><button type="button" role="menuitem" data-action="actions-preferences">Preferencias de Canvas</button><button type="button" role="menuitem" data-action="actions-shortcuts">Atajos de Canvas</button>`}</div>` : ''}</div>`;
  }
}
