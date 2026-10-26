import type { Context } from '../app/context';
import {
  canvasDefaults,
  shortcutNames,
  shortcutCombination,
  shortcutConflict,
} from '../domain/shortcuts';
import { html, target } from './dom';
import { btn } from './icons';
import { spatialHint, spatialModifier, spatialModifiers } from '../domain/spatial-shortcut';
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
          case 'spatial-shortcut-reset':
            ctx.ui.spatialModifier = 'Alt';
            ctx.persist();
            this.render();
            break;
          case 'canvas-dock-toggle':
          case 'canvas-grid-toggle':
          case 'canvas-motion-toggle':
            if (button.dataset.action === 'canvas-dock-toggle')
              ctx.ui.shell.canvasDockOrientation =
                ctx.ui.shell.canvasDockOrientation === 'vertical' ? 'horizontal' : 'vertical';
            else if (button.dataset.action === 'canvas-grid-toggle')
              ctx.ui.shell.canvasBackground =
                ctx.ui.shell.canvasBackground === 'grid' ? 'dots' : 'grid';
            else ctx.ui.shell.canvasReducedMotion = !ctx.ui.shell.canvasReducedMotion;
            ctx.persist();
            this.render();
            ctx.render();
            root.querySelector<HTMLElement>(`[data-action="${button.dataset.action}"]`)?.focus();
            break;
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
            ctx.ui.spatialModifier = 'Alt';
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
        if (event.target instanceof HTMLInputElement && event.target.id === 'shortcut-spatial') {
          if (event.key === 'Tab' || event.key === 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          if (spatialModifiers.includes(event.key as ReturnType<typeof spatialModifier>)) {
            ctx.ui.spatialModifier = spatialModifier(event.key);
            event.target.value = spatialHint(ctx.ui.spatialModifier);
            ctx.persist();
          }
          return;
        }
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
    if (this.page === 'config') {
      return '<button type="button" data-action="settings-shortcuts">Atajos</button>';
    }
    return this.shortcutMarkup();
  }
  open(): void {
    this.page = 'canvas';
    this.conflict = null;
  }
  preferences(): string {
    const setting = (
      name: string,
      description: string,
      checked: boolean,
      action: string,
      id = '',
    ): string =>
      `<div class="settings-preference"><span>${name}<small>${description}</small></span><button ${id ? `id="${id}"` : ''} type="button" class="settings-switch" role="switch" aria-label="${name}" aria-checked="${checked}" data-action="${action}"><span></span></button></div>`;
    const shell = this.ctx.ui.shell;
    return (
      setting(
        'Mostrar botón de Superficies',
        'Acceso alternativo en la barra superior.',
        shell.showSurfaceMenu,
        'surface-toggle',
        'surface-menu-setting',
      ) +
      setting(
        'Guías y ajuste automático',
        'Alinea bordes y centros al arrastrar. Ctrl o Meta lo suspende durante el gesto.',
        shell.canvasAlignmentGuides,
        'canvas-guides-toggle',
      ) +
      setting(
        'Dock vertical',
        'Apagado: disposición horizontal.',
        shell.canvasDockOrientation === 'vertical',
        'canvas-dock-toggle',
      ) +
      setting(
        'Fondo cuadriculado',
        'Apagado: fondo de puntos en Canvas.',
        shell.canvasBackground === 'grid',
        'canvas-grid-toggle',
      ) +
      setting(
        'Reducir animaciones de Canvas',
        'Reduce las animaciones de paneles y del dock. Respeta también el ajuste del sistema.',
        shell.canvasReducedMotion,
        'canvas-motion-toggle',
      )
    );
  }
  private shortcutMarkup(): string {
    return `<section class="canvas-shortcuts" aria-label="Atajos de Canvas">${btn('settings-back', 'chevron-left', 'Volver a Configuración')}<h3>Atajos</h3><p>Seleccioná un campo y pulsá la tecla o combinación. Se guarda automáticamente.</p><h4>Navegación espacial</h4><div class="shortcut-row"><label for="shortcut-spatial">Navegar con la rueda</label><div class="shortcut-key"><input id="shortcut-spatial" aria-label="Modificador de navegación espacial" aria-describedby="spatial-shortcut-help" value="${spatialHint(this.ctx.ui.spatialModifier)}" readonly></div>${btn('spatial-shortcut-reset', 'restore', 'Restaurar Alt para navegación espacial')}</div><p id="spatial-shortcut-help">Alt por defecto. Podés elegir Alt, Ctrl, Mayús o Meta. Sin esa tecla, la rueda conserva la acción de cada visor.</p><h4>Canvas</h4>${Object.keys(
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
