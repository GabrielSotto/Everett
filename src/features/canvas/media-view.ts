import type { Context } from '../../app/context';
import { html, type View } from '../../ui/dom';
import { nodeTitle } from '../../domain/model';
import { pdfReader } from '../../platform/pdf-preview';

/** Visor local: Alt entrega la rueda a la navegación espacial de Everett. */
export class MediaView implements View {
  private abort = new AbortController();
  private url: string | null = null;
  private disposed = false;
  private releasePdf: (() => void) | null = null;
  private materialKey: string | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.render();
  }
  render(): void {
    const route = this.ctx.store.get().route;
    if (route.kind !== 'material') return;
    const node = this.ctx.world().nodes.find((n) => n.id === route.entity);
    if (!node) return;
    const d = node.data;
    const key = node.id + ('asset' in d ? d.asset : d.kind === 'link' ? d.url : d.kind);
    if (key === this.materialKey) {
      const title = this.root.querySelector('h1');
      if (title) title.textContent = nodeTitle(this.ctx.world(), node);
      return;
    }
    this.materialKey = key;
    this.releasePdf?.();
    this.releasePdf = null;
    this.root.innerHTML = `<section class="media-view"><h1>${html(nodeTitle(this.ctx.world(), node))}</h1>${d.kind === 'link' ? `<a href="${html(d.url)}" target="_blank" rel="noopener noreferrer">${html(d.url)} · Abrir enlace</a>` : '<div class="media-loading" role="status">Recuperando archivo…</div>'}</section>`;
    if (d.kind === 'image' || d.kind === 'video' || d.kind === 'pdf') {
      void this.ctx.storage
        ?.asset(d.asset)
        .then(async (blob) => {
          if (this.disposed) return;
          if (this.url) URL.revokeObjectURL(this.url);
          this.url = URL.createObjectURL(blob);
          const host = this.root.querySelector('.media-loading');
          if (!host) return;
          if (d.kind === 'pdf') {
            this.releasePdf = await pdfReader(blob, host as HTMLElement, this.abort.signal);
          } else {
            const media = document.createElement(d.kind === 'video' ? 'video' : 'img');
            media.src = this.url;
            if (media instanceof HTMLVideoElement) media.controls = true;
            else media.alt = d.title;
            host.replaceWith(media);
          }
        })
        .catch(() => {
          const host = this.root.querySelector('.media-loading');
          if (host) {
            host.textContent = 'No se pudo recuperar el archivo. ';
            const retry = document.createElement('button');
            retry.textContent = 'Reintentar';
            retry.addEventListener(
              'click',
              () => {
                this.materialKey = null;
                this.render();
              },
              { signal: this.abort.signal },
            );
            host.append(retry);
          }
        });
    }
  }
  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    this.releasePdf?.();
    this.root.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    this.root.querySelectorAll('img').forEach((image) => image.removeAttribute('src'));
    if (this.url) URL.revokeObjectURL(this.url);
  }
}
