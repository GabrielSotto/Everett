import DOMPurify from 'dompurify';
import type { Context } from '../../app/context';
import type { LinkPreview } from '../../domain/model';
import { linkUrl, providerPlayer, retainLinkPreview } from '../../domain/link-previews';
import { html } from '../../ui/dom';
import { mediaToolbar } from './media-toolbar';
import { WheelIntent } from '../../spatial/wheel-intent';

export function safeArticle(source: string): string {
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(source, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'iframe',
      'form',
      'style',
      'video',
      'audio',
      'object',
      'embed',
      'input',
      'button',
      'link',
    ],
    FORBID_ATTR: ['style', 'srcset'],
    ALLOW_DATA_ATTR: false,
  });
  for (const image of template.content.querySelectorAll('img'))
    if (
      !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(
        image.getAttribute('src') ?? '',
      )
    )
      image.replaceWith(document.createTextNode(image.alt || 'Ilustración no disponible'));
  for (const anchor of template.content.querySelectorAll('a')) {
    if (!linkUrl(anchor.getAttribute('href') ?? '')) anchor.removeAttribute('href');
    anchor.removeAttribute('target');
  }
  return template.innerHTML;
}

/** Consulta local y navegación de enlaces dentro del mismo contexto espacial. */
export class WebReader {
  private abort = new AbortController();
  private stack: { url: string; metadata: LinkPreview | undefined }[] = [];
  private serial = 0;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private playerAbort: AbortController | null = null;
  constructor(
    private host: HTMLElement,
    private ctx: Context,
    private id: string,
    url: string,
    metadata: LinkPreview | undefined,
  ) {
    this.stack.push({ url, metadata });
    host.addEventListener(
      'click',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const action = target?.closest<HTMLElement>('[data-reader-action]')?.dataset.readerAction;
        if (target?.closest('[data-media-back]')) {
          event.stopPropagation();
          this.ctx.back();
        } else if (action === 'retry') {
          this.save();
          if (this.stack.length === 1) this.ctx.previews.refresh(this.ctx.world().id, this.id);
          else void this.navigate(this.stack.at(-1)!.url, true);
        } else if (target?.closest('.reader-content a[href]')) {
          const anchor = target.closest<HTMLAnchorElement>('a[href]')!;
          const url = linkUrl(anchor.href);
          if (!url) return;
          event.preventDefault();
          const current = new URL(this.stack.at(-1)!.url),
            destination = new URL(url);
          if (
            current.origin + current.pathname + current.search ===
              destination.origin + destination.pathname + destination.search &&
            destination.hash
          ) {
            this.host
              .querySelector<HTMLElement>('.reader-content')
              ?.querySelectorAll<HTMLElement>('[id]')
              .forEach((element) => {
                let fragment = destination.hash.slice(1);
                try {
                  fragment = decodeURIComponent(fragment);
                } catch {
                  // Conservar el fragmento literal si su escape no es válido.
                }
                if (element.id === fragment) element.scrollIntoView({ block: 'start' });
              });
          } else void this.navigate(url);
        }
      },
      { signal: this.abort.signal },
    );
    host.addEventListener(
      'scroll',
      () => {
        if (this.scrollTimer) clearTimeout(this.scrollTimer);
        this.scrollTimer = setTimeout(() => {
          this.scrollTimer = null;
          this.save();
        }, 180);
      },
      { capture: true, signal: this.abort.signal },
    );
    void this.paint();
  }
  back(): boolean {
    if (this.stack.length <= 1) return false;
    this.save();
    this.stack.pop();
    void this.paint();
    return true;
  }
  update(metadata: LinkPreview | undefined): void {
    this.stack[0]!.metadata = metadata;
    if (this.stack.length === 1 && metadata?.status === 'loading') {
      const status = this.host.querySelector('.reader-update-status');
      if (status) status.textContent = 'Recuperando lectura…';
      const refresh = this.host.querySelector<HTMLButtonElement>('[data-reader-action=retry]');
      if (refresh) refresh.disabled = true;
    }
    if (this.stack.length === 1 && metadata?.status !== 'loading') {
      this.save();
      void this.paint();
    }
  }
  private key(): string {
    return this.ctx.world().id + ':' + this.id + ':' + this.stack.at(-1)!.url;
  }
  private save(): void {
    const scroll = this.host.querySelector<HTMLElement>('.reader-scroll');
    if (scroll) {
      this.ctx.ui.readerPositions ??= {};
      this.ctx.ui.readerPositions[this.key()] = scroll.scrollTop;
      this.ctx.persist();
    }
  }
  private async navigate(url: string, replace = false): Promise<void> {
    this.save();
    const previous = replace ? this.stack.at(-1)?.metadata : undefined;
    const loading: LinkPreview = {
      ...previous,
      status: 'loading',
      checkedAt: Date.now(),
      resolvedUrl: url,
    };
    if (!replace) this.stack.push({ url, metadata: loading });
    else this.stack.at(-1)!.metadata = loading;
    void this.paint();
    const serial = this.serial;
    const metadata = await this.ctx.previews.read(url, replace);
    if (this.abort.signal.aborted || serial !== this.serial) return;
    this.stack[this.stack.length - 1] = { url, metadata: retainLinkPreview(previous, metadata) };
    await this.paint();
  }
  private async paint(): Promise<void> {
    this.playerAbort?.abort();
    this.playerAbort = null;
    const serial = ++this.serial;
    const { url, metadata } = this.stack.at(-1)!;
    const status =
      metadata?.status === 'loading'
        ? 'Recuperando lectura…'
        : metadata?.status === 'error' || (metadata?.readerProblem && metadata.readerAsset)
          ? metadata.readerAsset
            ? 'No se pudo actualizar. Se conserva la última lectura guardada. Podés reintentar.'
            : 'No se pudo recuperar el contenido. Podés reintentar.'
          : '';
    const toolbar =
      mediaToolbar(metadata?.title?.trim() || new URL(url).hostname, url) +
      `<p class="reader-update-status" role="status">${html(status)}${status && metadata?.status !== 'loading' ? ' <button type="button" data-reader-action="retry">Reintentar lectura</button>' : ''}</p>`;
    this.host.innerHTML =
      toolbar +
      '<div class="reader-scroll"><p class="reader-message" role="status">Recuperando contenido…</p></div>';
    const scroll = this.host.querySelector<HTMLElement>('.reader-scroll')!;
    if (metadata?.embed) {
      this.host.closest('.media-view')?.classList.add('video-content-view');
      scroll.innerHTML = `<div class="provider-video" data-provider="${metadata.embed.provider}"><div class="provider-mount"></div><p class="provider-status" role="status"></p></div>`;
      this.play();
      return;
    }
    if (metadata?.readerAsset) {
      try {
        const blob = await this.ctx.storage!.asset(metadata.readerAsset);
        if (blob.size > 4 * 1024 * 1024) throw new Error('Lectura demasiado grande');
        const data = JSON.parse(await blob.text()) as {
          html?: unknown;
          title?: unknown;
          byline?: unknown;
          capturedAt?: unknown;
        };
        if (this.abort.signal.aborted || serial !== this.serial) return;
        if (
          typeof data.html !== 'string' ||
          typeof data.capturedAt !== 'number' ||
          !Number.isFinite(data.capturedAt)
        )
          throw new Error('Lectura no disponible');
        scroll.innerHTML = `<div class="reader-capture">Lectura guardada · ${html(new Date(data.capturedAt).toLocaleDateString('es-AR'))}${typeof data.byline === 'string' && data.byline ? ' · ' + html(data.byline) : ''}${metadata.readerProblem ? ' · Se conserva la última lectura disponible' : ''}</div><article class="reader-content"><h2>${html((typeof data.title === 'string' && data.title.trim()) || metadata.readerTitle?.trim() || metadata.title?.trim() || new URL(url).hostname)}</h2>${safeArticle(data.html)}</article>`;
        requestAnimationFrame(() => {
          if (!this.abort.signal.aborted)
            scroll.scrollTop = this.ctx.ui.readerPositions?.[this.key()] ?? 0;
        });
        return;
      } catch {
        if (this.abort.signal.aborted || serial !== this.serial) return;
      }
    }
    scroll.innerHTML = `<div class="reader-message"><h2>${html(metadata?.title?.trim() || new URL(url).hostname)}</h2><p>${metadata?.status === 'loading' ? 'Preparando contenido…' : metadata?.readerProblem === 'not-article' ? 'Esta página es un índice o una aplicación. No se pudo preparar una lectura de artículo.' : 'No se pudo recuperar una lectura de esta página.'}</p>${metadata?.status === 'loading' ? '' : '<button type="button" data-reader-action="retry">Reintentar lectura</button>'}</div>`;
  }
  private play(): void {
    const embed = this.stack.at(-1)?.metadata?.embed;
    if (!embed) return;
    const host = this.host.querySelector('.provider-video');
    if (!host || host.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    this.playerAbort?.abort();
    this.playerAbort = new AbortController();
    const signal = this.playerAbort.signal;
    frame.title = `Reproductor de ${embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}`;
    frame.src =
      providerPlayer(embed) + (providerPlayer(embed).includes('?') ? '&' : '?') + 'autoplay=1';
    frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener(
      'load',
      () => {
        if (embed.provider === 'youtube') {
          frame.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening', id: this.id }),
            'https://www.youtube-nocookie.com',
          );
          frame.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'] }),
            'https://www.youtube-nocookie.com',
          );
        }
      },
      { signal },
    );
    window.addEventListener(
      'message',
      (event) => {
        if (
          event.source !== frame.contentWindow ||
          !['https://www.youtube-nocookie.com', 'https://player.vimeo.com'].includes(event.origin)
        )
          return;
        try {
          const value = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (value?.event === 'onError' || value?.event === 'error') {
            const status = host.querySelector('.provider-status');
            if (status)
              status.textContent =
                'El proveedor no permite reproducir este video aquí. El enlace al original sigue disponible.';
          }
        } catch {
          /* Ignorar mensajes ajenos al protocolo del reproductor. */
        }
      },
      { signal },
    );
    // La rueda no cruza el límite de origen del iframe. Su desplazamiento nativo
    // sí puede encadenarse: un contenedor con plano fijo recoge ese gesto sin
    // interceptar clics ni reemplazar los controles oficiales del proveedor.
    const bridge = document.createElement('div');
    bridge.className = 'provider-wheel-bridge';
    const track = document.createElement('div');
    track.className = 'provider-wheel-track';
    track.append(frame);
    bridge.append(track);
    host.querySelector('.provider-mount')?.replaceWith(bridge);
    bridge.scrollTop = 512;
    let previous = bridge.scrollTop;
    const intent = new WheelIntent();
    intent.lock(440);
    bridge.addEventListener(
      'scroll',
      () => {
        const current = bridge.scrollTop;
        const delta = current - previous;
        previous = current;
        if (intent.consume(delta) === 'leave') this.ctx.back();
      },
      { signal },
    );
  }
  dispose(): void {
    this.save();
    this.abort.abort();
    this.playerAbort?.abort();
    this.serial++;
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.host.querySelectorAll('iframe').forEach((frame) => frame.remove());
  }
}
