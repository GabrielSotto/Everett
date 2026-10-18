import type { Context } from '../app/context';
import { canvasCameraTuning } from '../spatial/tuning';
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
      this.ctx.notice('Ingresá un zoom entre 1 % y 600 %.');
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
    const world = this.ctx.world(),
      ids = this.ctx.ui.canvas.selections;
    const items = [
      ...world.nodes.filter((n) => !n.owner && (!selection || ids.includes(n.id))),
      ...(!selection ? world.zones : []),
    ];
    if (!items.length) return;
    const minX = Math.min(...items.map((n) => n.x)),
      minY = Math.min(...items.map((n) => n.y));
    const maxX = Math.max(...items.map((n) => n.x + n.width)),
      maxY = Math.max(...items.map((n) => n.y + n.height));
    const chat = document
      .querySelector('.canvas-chat.docked:not(.compact)')
      ?.getBoundingClientRect();
    const left = chat?.right ?? 0,
      width = innerWidth - left,
      height = innerHeight - 59;
    const z = Math.max(
      canvasCameraTuning.minimumZoom,
      Math.min(
        1,
        (width - 96) / Math.max(1, maxX - minX),
        (height - 160) / Math.max(1, maxY - minY),
      ),
    );
    this.close();
    const camera = { x: left / 2 - ((minX + maxX) / 2) * z, y: -28 - ((minY + maxY) / 2) * z, z };
    this.ctx.camera?.set(camera, true);
    this.ctx.act({ type: 'camera', camera }, 'encuadrar Canvas', 'C08-ZOOM-01');
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
    return `<div class="canvas-zoom"><button type="button" data-action="canvas-zoom" aria-label="Zoom de Canvas: ${percent} %" aria-haspopup="dialog" aria-expanded="${this.open}"><span data-zoom-value>${percent} %</span>${icon('down', 10)}</button>${this.open ? `<div class="popover zoom-pop" role="dialog" aria-label="Zoom de Canvas"><form id="canvas-zoom-form" novalidate><label for="canvas-zoom-percent">Zoom</label><div><input id="canvas-zoom-percent" inputmode="decimal" type="number" min="1" max="600" value="${percent}" aria-label="Porcentaje de zoom"><span>%</span><button type="submit" class="icon-button" aria-label="Aplicar zoom">${icon('check', 16)}</button></div><small>1 % – 600 %</small></form><div class="zoom-presets">${[10, 25, 50, 100, 200].map((value) => `<button type="button" data-action="zoom-preset" data-value="${value}">${value} %</button>`).join('')}</div><button type="button" data-action="zoom-fit">Ajustar al contenido</button><button type="button" data-action="zoom-fit" data-selection="true" ${this.ctx.ui.canvas.selections.length ? '' : 'disabled'}>Ajustar a la selección</button></div>` : ''}</div>`;
  }
}
