import type { Context } from '../app/context';
import {
  canvasDefaults,
  shortcutNames,
  shortcutCombination,
  shortcutConflict,
} from '../domain/shortcuts';
import { html, target } from './dom';
export class CanvasShortcuts {
  private page: 'config' | 'shortcuts' | 'canvas' = 'config';
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
          case 'settings-shortcuts':
            this.page = 'shortcuts';
            this.render();
            break;
          case 'settings-canvas':
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
      return '<button type="button" data-action="settings-shortcuts">Atajos</button>';
    if (this.page === 'shortcuts')
      return '<h3>Atajos</h3><button type="button" data-action="settings-canvas">Canvas</button>';
    return `<section class="canvas-shortcuts" aria-label="Atajos de Canvas"><h3>Atajos · Canvas</h3><p>Seleccioná un campo y pulsá la combinación. Se guarda automáticamente.</p>${Object.keys(
      canvasDefaults,
    )
      .map(
        (action) =>
          `<div class="shortcut-row"><label for="shortcut-${action}">${shortcutNames[action]}</label><input id="shortcut-${action}" data-shortcut="${action}" aria-label="Atajo de ${shortcutNames[action]}" value="${html(this.ctx.ui.shortcuts[action] ?? '')}" readonly><button type="button" data-action="shortcut-clear" data-id="${action}" aria-label="Quitar atajo de ${shortcutNames[action]}">Quitar</button><button type="button" data-action="shortcut-reset" data-id="${action}" aria-label="Restaurar atajo de ${shortcutNames[action]}">Restaurar</button></div>`,
      )
      .join(
        '',
      )}<button type="button" data-action="shortcuts-reset">Restaurar todos</button>${this.conflict ? `<div class="shortcut-conflict" role="alert"><p>${html(this.conflict.combination)} ya está asignado a ${this.conflict.other === 'global' ? 'una acción global' : shortcutNames[this.conflict.other]}.</p>${this.conflict.other !== 'global' ? '<button type="button" data-action="shortcut-reassign">Reasignar y quitar el anterior</button>' : ''}<button type="button" data-action="shortcut-conflict-cancel">Cancelar</button></div>` : ''}</section>`;
  }
}
