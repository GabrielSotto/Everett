import type { Context } from '../app/context';
import {
  canvasDefaults,
  shortcutNames,
  shortcutCombination,
  shortcutConflict,
} from '../domain/shortcuts';
import { html, target } from './dom';
import { btn } from './icons';
export class CanvasShortcuts {
  private page: 'config' | 'canvas' = 'config';
  private conflict: { action: string; combination: string; other: string } | null = null;
  constructor(
    private ctx: Context,
    private render: () => void,
    root: HTMLElement,
    signal: AbortSignal,
  ) {
    root.addEventListener(
      'click',
      (event) => {
        const button = target(event),
          action = button?.dataset.id ?? '';
        switch (button?.dataset.action) {
          case 'settings-back':
            this.page = 'config';
            this.conflict = null;
            this.render();
            root.querySelector<HTMLElement>('[data-action=settings-shortcuts]')?.focus();
            break;
          case 'settings-shortcuts':
            this.page = 'canvas';
            this.render();
            break;
          case 'shortcut-reset':
            this.set(action, canvasDefaults[action] ?? '');
            break;
          case 'shortcut-clear':
            ctx.ui.shortcuts[action] = '';
            this.conflict = null;
            this.render();
            ctx.persist();
            break;
          case 'shortcuts-reset':
            ctx.ui.shortcuts = { ...canvasDefaults };
            this.conflict = null;
            this.render();
            ctx.persist();
            break;
          case 'shortcut-reassign':
            if (this.conflict && this.conflict.other !== 'global') {
              ctx.ui.shortcuts[this.conflict.other] = '';
              ctx.ui.shortcuts[this.conflict.action] = this.conflict.combination;
              this.conflict = null;
              this.render();
              ctx.persist();
            }
            break;
          case 'shortcut-conflict-cancel':
            this.conflict = null;
            this.render();
            break;
        }
      },
      { signal },
    );
    root.addEventListener(
      'change',
      (event) => {
        const field = event.target;
        if (!(field instanceof HTMLSelectElement) || field.id !== 'canvas-dock-orientation') return;
        if (field.value !== 'horizontal' && field.value !== 'vertical') return;
        ctx.ui.shell.canvasDockOrientation = field.value;
        ctx.persist();
        ctx.render();
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          !(event.target instanceof HTMLInputElement) ||
          !event.target.dataset.shortcut ||
          event.key === 'Tab'
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const combination =
          event.key === 'Backspace' || event.key === 'Delete' ? '' : shortcutCombination(event);
        if (combination || !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key))
          this.set(event.target.dataset.shortcut, combination);
      },
      { signal },
    );
  }
  private set(action: string, combination: string): void {
    const other = shortcutConflict(this.ctx.ui.shortcuts, action, combination);
    if (other) this.conflict = { action, combination, other };
    else {
      this.ctx.ui.shortcuts[action] = combination;
      this.conflict = null;
      this.ctx.persist();
    }
    this.render();
  }
  markup(): string {
    if (this.page === 'config')
      return `<div class="settings-preference"><span id="surface-menu-setting-label">Mostrar botón de Superficies<small>Acceso alternativo en la barra superior.</small></span><button id="surface-menu-setting" type="button" class="settings-switch" role="switch" aria-label="Mostrar botón de Superficies" aria-checked="${this.ctx.ui.shell.showSurfaceMenu === true}" data-action="surface-toggle"><span></span></button></div><label class="settings-preference" for="canvas-dock-orientation"><span>Orientación del dock de Canvas</span><select id="canvas-dock-orientation" aria-label="Orientación del dock de Canvas"><option value="horizontal" ${this.ctx.ui.shell.canvasDockOrientation !== 'vertical' ? 'selected' : ''}>Horizontal</option><option value="vertical" ${this.ctx.ui.shell.canvasDockOrientation === 'vertical' ? 'selected' : ''}>Vertical</option></select></label><button type="button" data-action="settings-shortcuts">Atajos</button>`;
    return `<section class="canvas-shortcuts" aria-label="Atajos de Canvas">${btn('settings-back', 'chevron-left', 'Volver a Configuración')}<h3>Atajos · Canvas</h3><p>Seleccioná un campo y pulsá la combinación. Se guarda automáticamente.</p>${Object.keys(
      canvasDefaults,
    )
      .map(
        (action) =>
          `<div class="shortcut-row"><label for="shortcut-${action}">${shortcutNames[action]}</label><div class="shortcut-key"><input id="shortcut-${action}" data-shortcut="${action}" aria-label="Atajo de ${shortcutNames[action]}" value="${html(this.ctx.ui.shortcuts[action] ?? '')}" placeholder="Sin asignar" readonly>${this.ctx.ui.shortcuts[action] ? btn('shortcut-clear', 'close', 'Quitar atajo de ' + shortcutNames[action], `data-id="${action}"`) : ''}</div>${btn('shortcut-reset', 'restore', 'Restaurar atajo de ' + shortcutNames[action], `data-id="${action}" ${this.ctx.ui.shortcuts[action] === canvasDefaults[action] ? 'disabled' : ''}`)}</div>`,
      )
      .join(
        '',
      )}<button type="button" data-action="shortcuts-reset">Restaurar todos</button>${this.conflict ? `<div class="shortcut-conflict" role="alert"><p>${html(this.conflict.combination)} ya está asignado a ${this.conflict.other === 'global' ? 'una acción global' : shortcutNames[this.conflict.other]}.</p>${this.conflict.other !== 'global' ? '<button type="button" data-action="shortcut-reassign">Reasignar y quitar el anterior</button>' : ''}<button type="button" data-action="shortcut-conflict-cancel">Cancelar</button></div>` : ''}</section>`;
  }
  get editing(): boolean {
    return this.page === 'canvas';
  }
}
