import Panzoom, { type PanzoomObject } from '@panzoom/panzoom/dist/panzoom.es.js';
import { icon } from '../../ui/icons';
import { spatialHint, spatialWheel } from '../../domain/spatial-shortcut';

/** Panzoom conserva el punto bajo el cursor y administra paneo, punteros y pinch. */
export class ImageInspector {
  private panzoom: PanzoomObject | null = null;
  private resize: ResizeObserver;
  private abort = new AbortController();
  private angle = 0;
  private fit = 1;
  constructor(
    private host: HTMLElement,
    image: HTMLImageElement,
    private modifier: () => unknown = () => 'Alt',
  ) {
    host.className = 'image-inspector';
    host.innerHTML = `<div class="image-stage" tabindex="0" aria-label="Imagen: rueda para ampliar, arrastrar para desplazar; ${spatialHint(modifier())} para volver"><div class="image-plane"></div></div><nav class="image-tools" aria-label="Vista de imagen"><button type="button" data-image="out" aria-label="Alejar imagen">−</button><output aria-label="Zoom de imagen">100 %</output><button type="button" data-image="in" aria-label="Acercar imagen">+</button><button type="button" data-image="fit" title="Mostrar la imagen completa">Ajustar a la vista</button><button type="button" data-image="actual">100 %</button><button type="button" data-image="rotate" aria-label="Rotar imagen">${icon('restore', 16)}</button></nav>`;
    const stage = host.querySelector<HTMLElement>('.image-stage')!;
    const plane = host.querySelector<HTMLElement>('.image-plane')!;
    image.draggable = false;
    plane.append(image);
    const fit = () => {
      const rotated = this.angle % 180 !== 0;
      const w = rotated ? image.naturalHeight : image.naturalWidth;
      const h = rotated ? image.naturalWidth : image.naturalHeight;
      this.fit = Math.min(
        1,
        Math.max(1, stage.clientWidth - 32) / w,
        Math.max(1, stage.clientHeight - 32) / h,
      );
      plane.style.width = w * this.fit + 'px';
      plane.style.height = h * this.fit + 'px';
      image.style.width = image.naturalWidth * this.fit + 'px';
      image.style.height = image.naturalHeight * this.fit + 'px';
      image.style.transform = `translate(-50%, -50%) rotate(${this.angle}deg)`;
      const scale = Math.min(
        (stage.clientWidth - 32) / (w * this.fit),
        (stage.clientHeight - 32) / (h * this.fit),
      );
      this.panzoom?.setOptions({
        startScale: scale,
        maxScale: Math.max(16, 2 / this.fit, scale * 4),
      });
      this.panzoom?.reset({ animate: false });
      this.label();
    };
    fit();
    this.panzoom = Panzoom(plane, {
      canvas: true,
      minScale: Math.min(1, this.fit),
      maxScale: Math.max(
        16,
        2 / this.fit,
        Math.min(
          (stage.clientWidth - 32) / plane.clientWidth,
          (stage.clientHeight - 32) / plane.clientHeight,
        ) * 4,
      ),
      startScale: Math.min(
        (stage.clientWidth - 32) / plane.clientWidth,
        (stage.clientHeight - 32) / plane.clientHeight,
      ),
      animate: false,
      step: 0.1,
    });
    plane.addEventListener('panzoomchange', () => this.label(), { signal: this.abort.signal });
    stage.addEventListener(
      'wheel',
      (event) => {
        if (spatialWheel(event, this.modifier())) return;
        event.stopPropagation();
        this.panzoom?.zoomWithWheel(event);
      },
      { passive: false, signal: this.abort.signal },
    );
    host.addEventListener(
      'click',
      (event) => {
        const action =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-image]')?.dataset.image
            : null;
        if (action === 'in') this.panzoom?.zoomIn({ animate: false });
        if (action === 'out') this.panzoom?.zoomOut({ animate: false });
        if (action === 'actual') this.panzoom?.zoom(1 / this.fit, { animate: false });
        if (action === 'fit') this.panzoom?.reset({ animate: false });
        if (action === 'rotate') {
          this.angle = (this.angle + 90) % 360;
          fit();
        }
      },
      { signal: this.abort.signal },
    );
    stage.addEventListener(
      'keydown',
      (event) => {
        if (
          !['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === '+' || event.key === '=') this.panzoom?.zoomIn({ animate: false });
        else if (event.key === '-') this.panzoom?.zoomOut({ animate: false });
        else if (event.key === '0') this.panzoom?.reset({ animate: false });
        else
          this.panzoom?.pan(
            event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0,
            event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0,
            { relative: true },
          );
      },
      { signal: this.abort.signal },
    );
    this.resize = new ResizeObserver(fit);
    this.resize.observe(stage);
  }
  private label(): void {
    const output = this.host.querySelector('output');
    if (output)
      output.textContent = Math.round(this.fit * (this.panzoom?.getScale() ?? 1) * 100) + ' %';
  }
  dispose(): void {
    this.abort.abort();
    this.resize.disconnect();
    this.panzoom?.destroy();
  }
}
