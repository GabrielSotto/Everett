import type { Context } from '../app/context';
import { arrangementUnits } from '../domain/arrangement';
import { canOrderMaterials, type MaterialOrder } from '../domain/material-order';
import { arrangeSelection, arrangementMarkup, bindArrangementSpacing } from './canvas-arrangement';
import { frameCanvas } from './canvas-frame';
import { target } from './dom';
import { icon } from './icons';
import { bindDismiss } from './popover';
import { openGraphicPicker } from '../features/canvas/graphic-picker';
import { openSketchLibrary, closeSketchLibrary, sketchLibraryOpen } from './sketch-library';
import { selectedLayoutTarget } from '../domain/layout-guides';
import { openLayoutGuideEditor } from './layout-guide-editor';
import { html } from './dom';

/** Creación, organización y vista tienen entradas propias en la cabecera. */
export class CanvasActions {
  private graphics: ReturnType<typeof openGraphicPicker> | null = null;
  private open = false;
  private page: 'view' | 'arrange' = 'view';
  private painted: string | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private render: () => void,
    settings: (page: 'preferences' | 'shortcuts') => void,
    signal: AbortSignal,
  ) {
    bindArrangementSpacing(root, ctx, () => this.close(), signal);
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
          case 'canvas-graphics': {
            if (this.graphics) this.graphics.close();
            else this.showGraphics(signal);
            break;
          }
          case 'canvas-wireframes': {
            this.graphics?.close(false);
            const wasOpen = sketchLibraryOpen();
            this.close(false);
            if (wasOpen) closeSketchLibrary();
            else {
              ctx.ui.shell.profile = ctx.ui.shell.status = ctx.ui.shell.surfaceMenu = false;
              ctx.ui.shell.searchOpen = false;
              this.render();
              openSketchLibrary(ctx, signal);
            }
            break;
          }
          case 'canvas-view':
          case 'canvas-organize': {
            this.graphics?.close(false);
            closeSketchLibrary();
            const page = button.dataset.action === 'canvas-organize' ? 'arrange' : 'view';
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
          case 'selection-arrange':
            if (!button.closest('.canvas-actions')) return;
            this.close();
            arrangeSelection(ctx, button.dataset.arrangement);
            this.trigger()?.focus({ preventScroll: true });
            break;
          case 'selection-order': {
            const order = button.dataset.order as MaterialOrder;
            if (!['front', 'forward', 'backward', 'back'].includes(order)) return;
            const nodes = [...ctx.ui.canvas.selections];
            this.close();
            ctx.act(
              { type: 'nodes.order', world: ctx.world().id, nodes, order },
              'ordenar materiales',
              'C08-LAYER-01',
            );
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
          case 'layout-guides-toggle':
          case 'layout-snap-toggle': {
            const key =
              button.dataset.action === 'layout-guides-toggle'
                ? 'canvasLayoutGuides'
                : 'canvasLayoutSnap';
            ctx.ui.shell[key] = !ctx.ui.shell[key];
            ctx.persist();
            this.render();
            ctx.render();
            root.querySelector<HTMLElement>(`[data-action=${button.dataset.action}]`)?.focus();
            break;
          }
          case 'layout-guides-edit': {
            const target = selectedLayoutTarget(ctx.world(), ctx.ui.canvas.selections);
            this.close(false);
            if (target) openLayoutGuideEditor(ctx, target, this.trigger()!, signal);
            break;
          }
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
          return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          const action =
            event.target.closest<HTMLElement>('.canvas-actions-trigger')?.dataset.action;
          if (action === 'canvas-graphics') {
            if (!this.graphics) this.showGraphics(signal);
            else
              document
                .querySelector<HTMLElement>(
                  '.graphic-picker .graphic-flows button,.graphic-picker [data-graphic]',
                )
                ?.focus();
            return;
          }
          this.graphics?.close(false);
          if (action === 'canvas-wireframes') {
            this.close(false);
            if (!sketchLibraryOpen()) openSketchLibrary(ctx, signal);
            return;
          }
          closeSketchLibrary();
          const requested = action === 'canvas-organize' ? 'arrange' : 'view';
          if (!this.open || (action && requested !== this.page)) {
            this.open = true;
            this.page = requested;
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
  private showGraphics(signal: AbortSignal) {
    closeSketchLibrary();
    const shell = this.ctx.ui.shell;
    shell.profile = shell.status = shell.surfaceMenu = shell.searchOpen = false;
    shell.search = '';
    this.close(false);
    this.graphics = openGraphicPicker(
      this.ctx,
      () => this.root.querySelector('[data-action=canvas-graphics]'),
      signal,
      () => {
        this.graphics = null;
      },
    );
  }
  private trigger(): HTMLElement | null {
    return this.root.querySelector(
      `[data-action=${this.page === 'arrange' ? 'canvas-organize' : 'canvas-view'}]`,
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
    this.graphics?.close(false);
    closeSketchLibrary();
    this.open = false;
    this.painted = null;
  }
  position(): void {
    this.graphics?.position();
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
      this.graphics?.close(false);
      closeSketchLibrary();
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
        page: 'graphics',
        action: 'canvas-graphics',
        label: 'Gráficos',
        name: 'Gráficos explicativos',
        glyph: 'visual-graphic',
      },
      {
        page: 'arrange',
        action: 'canvas-organize',
        label: 'Alinear',
        name: 'Alinear selección',
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
      this.page === 'arrange'
        ? `${arrangementMarkup(this.ctx)}<hr><div class="arrangement-layers" role="group" aria-label="Orden de capas"><span class="arrangement-label">Capas</span>${(['front', 'forward', 'backward', 'back'] as const).map((order) => `<button type="button" role="menuitem" data-action="selection-order" data-order="${order}" ${canOrderMaterials(this.ctx.world().nodes, this.ctx.ui.canvas.selections, order) ? '' : 'disabled'}>${{ front: 'Traer al frente', forward: 'Avanzar una capa', backward: 'Retroceder una capa', back: 'Enviar al fondo' }[order]}</button>`).join('')}</div>`
        : `<button type="button" role="menuitem" data-action="actions-fit" data-selection="true" ${units.length ? '' : 'disabled'}>Ajustar a la selección</button><button type="button" role="menuitem" data-action="actions-fit" ${this.ctx.world().nodes.some((node) => !node.owner) || this.ctx.world().zones.length ? '' : 'disabled'}>Ajustar al contenido</button><hr>${check('canvas-guides-toggle', 'Guías y ajuste automático', shell.canvasAlignmentGuides)}<hr><strong class="canvas-menu-title">Retículas de layout</strong>${check('layout-guides-toggle', 'Mostrar retículas' + (this.ctx.ui.shortcuts.layoutGuides ? `<kbd>${html(this.ctx.ui.shortcuts.layoutGuides)}</kbd>` : ''), shell.canvasLayoutGuides)}${check('layout-snap-toggle', 'Ajustar a las retículas', shell.canvasLayoutSnap)}<button type="button" role="menuitem" data-action="layout-guides-edit" ${selectedLayoutTarget(this.ctx.world(), this.ctx.ui.canvas.selections) ? '' : 'disabled'}>Configurar retícula de selección…</button><hr>${check('canvas-grid-toggle', 'Fondo cuadriculado', shell.canvasBackground === 'grid')}${check('canvas-dock-toggle', 'Dock vertical', shell.canvasDockOrientation === 'vertical')}<hr><button type="button" role="menuitem" data-action="actions-preferences">Preferencias de Canvas</button><button type="button" role="menuitem" data-action="actions-shortcuts">Atajos de Canvas</button>`;
    return `<div class="canvas-actions" role="toolbar" aria-label="Creación, organización y vista de Canvas">${menus.map((menu) => `<button type="button" class="canvas-actions-trigger" data-action="${menu.action}" aria-label="${menu.name}" data-tip="${menu.name}" aria-haspopup="${menu.page === 'wireframes' || menu.page === 'graphics' ? 'dialog' : 'menu'}" aria-expanded="${menu.page === 'wireframes' ? sketchLibraryOpen() : menu.page === 'graphics' ? !!this.graphics : this.open && this.page === menu.page}" aria-controls="canvas-${menu.page}-menu">${icon(menu.glyph, 16)}<span>${menu.label}</span>${icon('down', 10)}</button>`).join('')}${this.open ? `<div class="canvas-actions-pop ${this.page === 'arrange' ? 'arrangement-menu' : ''}" id="canvas-${this.page}-menu" role="menu" aria-label="${current.name}">${this.page === 'arrange' ? '' : `<strong class="canvas-menu-title">${current.label}</strong>`}${content}</div>` : ''}</div>`;
  }
}
