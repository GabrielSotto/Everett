import type { Context } from '../../app/context';
import { type View } from '../../ui/dom';
import { nodeTitle } from '../../domain/model';
import { pdfReader } from '../../platform/pdf-preview';
import { WebReader } from './web-reader';
import { mediaToolbar } from './media-toolbar';
import { ImageInspector } from './image-inspector';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

/** Visor local: Alt entrega la rueda a la navegación espacial de Everett. */
export class MediaView implements View {
  private abort = new AbortController();
  private url: string | null = null;
  private disposed = false;
  private releasePdf: (() => void) | null = null;
  private materialKey: string | null = null;
  private reader: WebReader | null = null;
  private inspector: ImageInspector | null = null;
  private images: string[] = [];
  private imageId: string | null = null;
  private galleryFocus: number | null = null;
  back(): boolean {
    return this.reader?.back() ?? false;
  }
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    const route = ctx.store.get().route;
    if (route.kind === 'material') {
      const selected = new Set(
        ctx.ui.canvasContexts[route.world]?.selections ?? ctx.ui.canvas.selections,
      );
      this.images = ctx
        .world()
        .nodes.filter((n) => !n.owner && n.data.kind === 'image' && selected.has(n.id))
        .map((n) => n.id);
      if (!this.images.includes(route.entity)) this.images = [];
      this.imageId = route.entity;
    }
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
        const gallery =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('[data-gallery]')
            : null;
        if (gallery) {
          this.showImage(Number(gallery.dataset.gallery));
          return;
        }
        if (event.target instanceof Element && event.target.closest('[data-media-back]')) {
          this.ctx.back();
          return;
        }
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-action=link-preview-retry]')
            : null;
        if (button?.dataset.id) ctx.previews.refresh(ctx.world().id, button.dataset.id);
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          this.images.length < 2 ||
          !['ArrowLeft', 'ArrowRight'].includes(event.key) ||
          (event.target instanceof Element && event.target.closest('.image-stage'))
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        this.showImage(event.key === 'ArrowRight' ? 1 : -1);
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  private showImage(direction: number): void {
    this.galleryFocus = direction;
    const index = this.images.indexOf(this.imageId ?? '');
    this.imageId =
      this.images[(index + direction + this.images.length) % this.images.length] ?? null;
    this.render();
  }
  render(): void {
    const route = this.ctx.store.get().route;
    if (route.kind !== 'material') return;
    const node = this.ctx
      .world()
      .nodes.find((n) => n.id === (this.images.length > 1 ? this.imageId : route.entity));
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
      return;
    }
    this.materialKey = key;
    this.reader?.dispose();
    this.reader = null;
    this.inspector?.dispose();
    this.inspector = null;
    this.releasePdf?.();
    this.releasePdf = null;
    this.root.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.root.innerHTML = `<section class="media-view ${d.kind === 'link' ? 'web-content-view' : ''} ${d.kind === 'video' || (d.kind === 'link' && d.metadata?.embed) ? 'video-content-view' : ''}">${d.kind === 'link' ? '<div class="web-reader"></div>' : mediaToolbar(nodeTitle(this.ctx.world(), node), 'source' in d ? d.source : undefined) + '<div class="media-loading" role="status">Recuperando archivo…</div>'}</section>`;
    if (d.kind === 'image' && this.images.length > 1) {
      const nav = document.createElement('nav');
      nav.className = 'image-gallery';
      nav.setAttribute('aria-label', 'Imágenes seleccionadas');
      nav.innerHTML = `<button type="button" data-gallery="-1" aria-label="Imagen anterior">${icon('chevron-left', 18)}</button><span aria-live="polite">${this.images.indexOf(node.id) + 1} / ${this.images.length} · ${html(nodeTitle(this.ctx.world(), node))}</span><button type="button" data-gallery="1" aria-label="Imagen siguiente">${icon('chevron', 18)}</button>`;
      this.root.querySelector('.media-view')!.append(nav);
      if (this.galleryFocus !== null) {
        nav
          .querySelector<HTMLButtonElement>(`[data-gallery="${this.galleryFocus}"]`)
          ?.focus({ preventScroll: true });
        this.galleryFocus = null;
      }
    }
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
          if (this.disposed || key !== this.materialKey) return;
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
              media.autoplay = false;
              media.playsInline = true;
              if (d.preview) media.poster = d.preview;
            } else media.alt = d.title;
            if (media instanceof HTMLImageElement) {
              await media.decode();
              if (this.disposed || key !== this.materialKey) return;
              this.inspector = new ImageInspector(
                host as HTMLElement,
                media,
                () => this.ctx.ui.spatialModifier,
              );
            } else {
              host.className = 'native-video-stage';
              host.replaceChildren(media);
            }
          }
        })
        .catch(() => {
          if (this.disposed || key !== this.materialKey) return;
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
    this.inspector?.dispose();
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
