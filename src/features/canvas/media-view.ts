import type { Context } from '../../app/context';
import { html, type View } from '../../ui/dom';
import { nodeTitle } from '../../domain/model';
import { pdfReader } from '../../platform/pdf-preview';
import { WebReader } from './web-reader';

/** Visor local: Alt entrega la rueda a la navegación espacial de Everett. */
export class MediaView implements View {
  private abort = new AbortController();
  private url: string | null = null;
  private disposed = false;
  private releasePdf: (() => void) | null = null;
  private materialKey: string | null = null;
  private reader: WebReader | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    const unsubscribe = ctx.store.subscribe((change) => {
      if (
        change.command.type === 'node.link-preview' ||
        change.command.type === 'node.resolve-link'
      )
        this.render();
    });
    this.abort.signal.addEventListener('abort', unsubscribe, { once: true });
    root.addEventListener(
      'click',
      (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-action=link-preview-retry]')
            : null;
        if (button?.dataset.id) ctx.previews.refresh(ctx.world().id, button.dataset.id);
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  render(): void {
    const route = this.ctx.store.get().route;
    if (route.kind !== 'material') return;
    const node = this.ctx.world().nodes.find((n) => n.id === route.entity);
    if (!node) return;
    const d = node.data;
    const key =
      node.id +
      ('asset' in d ? d.asset : d.kind === 'link' ? d.url + JSON.stringify(d.metadata) : d.kind);
    if (key === this.materialKey) {
      const title = this.root.querySelector('h1');
      if (title) title.textContent = nodeTitle(this.ctx.world(), node);
      return;
    }
    if (d.kind === 'link' && this.reader) {
      this.materialKey = key;
      this.reader.update(d.metadata);
      const title = this.root.querySelector('h1');
      if (title) title.textContent = nodeTitle(this.ctx.world(), node);
      return;
    }
    this.materialKey = key;
    this.reader?.dispose();
    this.reader = null;
    this.releasePdf?.();
    this.releasePdf = null;
    this.root.innerHTML = `<section class="media-view ${d.kind === 'link' ? 'web-content-view' : ''}"><h1>${html(nodeTitle(this.ctx.world(), node))}</h1>${d.kind === 'link' ? '<div class="web-reader"></div>' : '<div class="media-loading" role="status">Recuperando archivo…</div>'}${'source' in d && d.source ? `<a class="media-source" href="${html(d.source)}" target="_blank" rel="noopener noreferrer">${html(new URL(d.source).hostname)} · Origen</a>` : ''}</section>`;
    if (d.kind === 'link')
      this.reader = new WebReader(
        this.root.querySelector('.web-reader')!,
        this.ctx,
        node.id,
        d.url,
        d.metadata,
      );
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
            if (media instanceof HTMLVideoElement) {
              media.controls = true;
              media.preload = 'auto';
              if (d.preview) media.poster = d.preview;
            } else media.alt = d.title;
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
    this.reader?.dispose();
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
