import type { Context } from '../app/context';
import { frameCanvas } from './canvas-frame';
import { bindDismiss } from './popover';
import { icon } from './icons';
import { target } from './dom';

/** Control de cámara en la cabecera; no participa del historial de materiales. */
export class CanvasZoom {
  private open = false;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private render: () => void,
    signal: AbortSignal,
  ) {
    bindDismiss(
      signal,
      () => this.open,
      (source) => this.close(source === 'keyboard'),
      '.canvas-zoom,.zoom-pop',
    );
    root.addEventListener(
      'click',
      (event) => {
        const button = target(event);
        if (button?.dataset.action === 'canvas-zoom') {
          this.open = !this.open;
          ctx.ui.shell.profile = ctx.ui.shell.status = ctx.ui.shell.surfaceMenu = false;
          this.render();
          if (this.open) root.querySelector<HTMLInputElement>('#canvas-zoom-percent')?.select();
        } else if (button?.dataset.action === 'zoom-preset') this.set(Number(button.dataset.value));
        else if (button?.dataset.action === 'zoom-fit')
          this.fit(button.dataset.selection === 'true');
      },
      { signal },
    );
    root.addEventListener(
      'submit',
      (event) => {
        if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'canvas-zoom-form')
          return;
        event.preventDefault();
        event.stopPropagation();
        const input = event.target.querySelector<HTMLInputElement>('input')!;
        if (!this.set(input.value.trim() ? Number(input.value) : NaN)) {
          input.setAttribute('aria-invalid', 'true');
          event.target.querySelector('.zoom-error')!.textContent =
            'Ingresá un valor entre 1 % y 600 %.';
          input.focus();
        }
      },
      { signal },
    );
  }
  private close(focus = true): void {
    this.open = false;
    this.render();
    if (focus) this.root.querySelector<HTMLElement>('[data-action=canvas-zoom]')?.focus();
  }
  private set(percent: number): boolean {
    if (!Number.isFinite(percent) || percent < 1 || percent > 600) {
      return false;
    }
    const camera = this.ctx.currentCamera(),
      z = percent / 100,
      ratio = z / camera.z;
    this.close();
    const destination = { x: camera.x * ratio, y: camera.y * ratio, z };
    // La elección numérica confirma y guarda exactamente la escala pedida.
    this.ctx.camera?.set(destination, true);
    this.ctx.act({ type: 'camera', camera: destination }, 'elegir zoom de Canvas', 'C08-ZOOM-01');
    return true;
  }
  private fit(selection: boolean): void {
    this.close();
    frameCanvas(this.ctx, selection);
  }

  refresh(): void {
    const label = this.root.querySelector('[data-zoom-value]');
    const percent = Math.round(this.ctx.currentCamera().z * 100);
    if (label) label.textContent = percent + ' %';
    this.root
      .querySelector('[data-action=canvas-zoom]')
      ?.setAttribute('aria-label', `Zoom de Canvas: ${percent} %`);
  }
  markup(): string {
    const route = this.ctx.store.get().route;
    if (route.kind !== 'surface' || route.surface !== 'canvas') {
      this.open = false;
      return '';
    }
    const percent = Math.round(this.ctx.currentCamera().z * 100);
    return `<div class="canvas-zoom"><button type="button" data-action="canvas-zoom" aria-label="Zoom de Canvas: ${percent} %" aria-haspopup="dialog" aria-expanded="${this.open}"><span data-zoom-value>${percent} %</span>${icon('down', 10)}</button>${this.open ? `<div class="popover zoom-pop" role="dialog" aria-label="Zoom de Canvas"><form id="canvas-zoom-form" novalidate><label for="canvas-zoom-percent">Zoom</label><div><input id="canvas-zoom-percent" inputmode="decimal" type="number" min="1" max="600" value="${percent}" aria-label="Porcentaje de zoom"><span>%</span><button type="submit" class="icon-button" aria-label="Aplicar zoom">${icon('check', 16)}</button></div><small>1 % – 600 %</small><small class="zoom-error" role="status"></small></form><div class="zoom-presets">${[10, 25, 50, 100, 200].map((value) => `<button type="button" data-action="zoom-preset" data-value="${value}">${value} %</button>`).join('')}</div><button type="button" data-action="zoom-fit">Ajustar al contenido</button><button type="button" data-action="zoom-fit" data-selection="true" ${this.ctx.ui.canvas.selections.length ? '' : 'disabled'}>Ajustar a la selección</button></div>` : ''}</div>`;
  }
}
