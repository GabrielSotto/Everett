import type { Context } from './context';
import type { LinkPreview, NodeData } from '../domain/model';
import { linkUrl, validLinkPreview, retainLinkPreview } from '../domain/link-previews';
import { inspectMedia } from '../platform/media-file';

interface Resolution {
  metadata: LinkPreview;
  media?: Extract<NodeData, { kind: 'image' | 'video' | 'pdf' }>;
}
interface Download {
  kind: 'image' | 'video';
  mime: string;
  data: string;
}
interface ReaderPayload {
  html: string;
  title: string;
  byline: string;
  text: string;
  capturedAt: number;
}

function payload(
  value: unknown,
  source: string,
): {
  metadata: LinkPreview;
  image?: { mime: string; data: string };
  file?: Download;
  reader?: ReaderPayload;
} {
  if (!value || typeof value !== 'object') throw new Error('Respuesta inválida');
  const data = value as Record<string, unknown>;
  const metadata: Record<string, unknown> = {
    status: data.status,
    checkedAt: data.checkedAt,
    resolvedUrl:
      typeof data.resolvedUrl === 'string' && linkUrl(data.resolvedUrl) ? data.resolvedUrl : source,
  };
  for (const key of ['title', 'description', 'siteName', 'problem', 'embed'])
    if (data[key] !== undefined) metadata[key] = data[key];
  if (!validLinkPreview(metadata) || metadata.status === 'loading')
    throw new Error('Respuesta inválida');
  let file: Download | undefined;
  let reader: ReaderPayload | undefined;
  if (data.file !== undefined) {
    const f = data.file as Partial<Download>;
    if (
      !f ||
      !['image', 'video'].includes(f.kind ?? '') ||
      typeof f.mime !== 'string' ||
      ![
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
      ].includes(f.mime) ||
      typeof f.data !== 'string' ||
      f.data.length > 45 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(f.data) ||
      !f.mime.startsWith(f.kind + '/')
    )
      throw new Error('Archivo remoto inválido');
    file = f as Download;
  }
  if (data.reader !== undefined) {
    const r = data.reader as Partial<ReaderPayload> & { problem?: string };
    if (r?.problem && typeof r.problem === 'string')
      (metadata as LinkPreview).readerProblem = r.problem.slice(0, 80);
    else {
      if (
        !r ||
        typeof r.html !== 'string' ||
        r.html.length > 3 * 1024 * 1024 ||
        typeof r.title !== 'string' ||
        r.title.length > 512 ||
        typeof r.text !== 'string' ||
        r.text.length > 2048 ||
        typeof r.byline !== 'string' ||
        r.byline.length > 256 ||
        typeof r.capturedAt !== 'number' ||
        !Number.isFinite(r.capturedAt)
      )
        throw new Error('Lectura inválida');
      reader = r as ReaderPayload;
    }
  }
  if (data.image === undefined)
    return { metadata, ...(file ? { file } : {}), ...(reader ? { reader } : {}) };
  if (!data.image || typeof data.image !== 'object') throw new Error('Portada inválida');
  const image = data.image as Record<string, unknown>;
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(String(image.mime)) ||
    typeof image.data !== 'string' ||
    image.data.length > 3 * 1024 * 1024 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
  )
    throw new Error('Portada inválida');
  return {
    metadata,
    image: { mime: String(image.mime), data: image.data },
    ...(file ? { file } : {}),
    ...(reader ? { reader } : {}),
  };
}

async function readPayload(response: Response): Promise<unknown> {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Servicio no disponible');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Respuesta vacía');
  const decoder = new TextDecoder();
  let bytes = 0,
    text = '';
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 48 * 1024 * 1024) throw new Error('Respuesta demasiado grande');
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** Servicio de previews, independiente del procesamiento simulado de agentes. */
export class LinkPreviewService {
  private readonly abort = new AbortController();
  private readonly unsubscribe: () => void;
  private readonly jobs = new Set<string>();
  private readonly cache = new Map<string, Promise<Resolution>>();
  private queue: (() => Promise<void>)[] = [];
  private active = 0;
  constructor(private ctx: Context) {
    this.unsubscribe = ctx.store.subscribe((change) => {
      if (
        [
          'node.create',
          'node.duplicate',
          'canvas.undo',
          'canvas.redo',
          'assignment.finish',
        ].includes(change.command.type)
      )
        queueMicrotask(() => this.resume());
    });
  }
  resume(): void {
    if (this.abort.signal.aborted) return;
    // Reutilizar también las previews persistidas, sin volver a descargar al pegar la misma URL.
    for (const world of this.ctx.store.get().worlds)
      for (const node of world.nodes)
        if (
          node.data.kind === 'link' &&
          node.data.metadata?.status === 'ready' &&
          (node.data.metadata.readerAsset ||
            node.data.metadata.readerProblem ||
            node.data.metadata.embed) &&
          this.cache.size < 64 &&
          !this.cache.has(node.data.url)
        )
          this.cache.set(
            node.data.url,
            Promise.resolve({ metadata: structuredClone(node.data.metadata) }),
          );
    for (const world of this.ctx.store.get().worlds)
      for (const node of world.nodes)
        if (
          node.data.kind === 'link' &&
          (!node.data.metadata ||
            node.data.metadata.status === 'loading' ||
            (node.data.metadata.status === 'ready' &&
              !node.data.metadata.readerAsset &&
              !node.data.metadata.readerProblem &&
              !node.data.metadata.embed) ||
            (node.data.metadata.problem === 'service-unavailable' && location.protocol !== 'file:'))
        )
          this.refresh(world.id, node.id, false);
  }
  refresh(world: string, id: string, force = true): void {
    const key = world + ':' + id;
    if (this.abort.signal.aborted || this.jobs.has(key)) return;
    const material = this.ctx.store
      .get()
      .worlds.find((w) => w.id === world)
      ?.nodes.find((n) => n.id === id);
    if (material?.data.kind !== 'link') return;
    const url = material.data.url;
    const safe = new URL(url);
    safe.username = safe.password = '';
    this.jobs.add(key);
    this.ctx.act(
      {
        type: 'node.link-preview',
        world,
        id,
        url,
        metadata: {
          ...material.data.metadata,
          status: 'loading',
          checkedAt: Date.now(),
          resolvedUrl: safe.href,
        },
      },
      'preparar vista previa',
      'C08-URL-01',
      'service',
    );
    this.queue.push(async () => {
      try {
        const target = this.ctx.store
          .get()
          .worlds.find((w) => w.id === world)
          ?.nodes.find((n) => n.id === id);
        if (target?.data.kind !== 'link' || target.data.url !== url) return;
        let pending = !force ? this.cache.get(url) : undefined;
        if (!pending) {
          pending = this.request(url, force);
          this.cache.delete(url);
          this.cache.set(url, pending);
          if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value!);
        }
        const result = await pending;
        const current = this.ctx.store
          .get()
          .worlds.find((w) => w.id === world)
          ?.nodes.find((n) => n.id === id);
        if (
          !this.abort.signal.aborted &&
          current?.data.kind === 'link' &&
          current.data.url === url
        ) {
          if (result.media) {
            this.ctx.act(
              { type: 'node.resolve-link', world, id, url, data: result.media },
              'incorporar archivo desde enlace',
              'C08-WEB-01',
              'service',
            );
            return;
          }
          this.ctx.act(
            {
              type: 'node.link-preview',
              world,
              id,
              url,
              metadata: retainLinkPreview(current.data.metadata, result.metadata),
            },
            'conservar vista previa',
            'C08-URL-01',
            'service',
          );
        }
      } finally {
        this.jobs.delete(key);
      }
    });
    this.pump();
  }
  private pump(): void {
    while (!this.abort.signal.aborted && this.active < 2 && this.queue.length) {
      const task = this.queue.shift()!;
      this.active++;
      void task().finally(() => {
        this.active--;
        this.pump();
      });
    }
  }
  async read(url: string, refresh = false): Promise<LinkPreview> {
    return (await this.request(url, refresh)).metadata;
  }
  private async request(url: string, refresh: boolean): Promise<Resolution> {
    const safe = new URL(url);
    safe.username = safe.password = '';
    const failed = (problem: string): Resolution => ({
      metadata: {
        status: 'error',
        problem,
        checkedAt: Date.now(),
        resolvedUrl: safe.href,
      },
    });
    if (!linkUrl(url)) return failed('invalid-url');
    if (!['http:', 'https:'].includes(location.protocol)) return failed('service-unavailable');
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 90000);
    try {
      const response = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, refresh }),
        signal: AbortSignal.any([this.abort.signal, timeout.signal]),
        credentials: 'omit',
      });
      const result = payload(await readPayload(response), url);
      if (
        !result.reader &&
        !result.metadata.embed &&
        !result.file &&
        !result.metadata.readerProblem
      )
        result.metadata.readerProblem = 'not-readable';
      if (result.file) {
        const blob = new Blob([Uint8Array.from(atob(result.file.data), (c) => c.charCodeAt(0))], {
          type: result.file.mime,
        });
        if (blob.size > (result.file.kind === 'image' ? 12 : 32) * 1024 * 1024)
          return failed('too-large');
        let inspected;
        try {
          inspected = await inspectMedia(blob, this.abort.signal);
        } catch {
          return failed('unsupported-media');
        }
        const asset = 'asset-' + crypto.randomUUID();
        try {
          if (!this.ctx.storage) throw new Error('Guardado no disponible');
          await this.ctx.storage.putAsset(asset, blob);
        } catch {
          return failed('storage-failed');
        }
        let name =
          new URL(url).pathname.split('/').filter(Boolean).at(-1) ||
          (result.file.kind === 'image' ? 'Imagen' : 'Video');
        try {
          name = decodeURIComponent(name);
        } catch {
          // Una secuencia porcentual inválida no impide conservar el archivo descargado.
        }
        return {
          metadata: result.metadata,
          media: {
            kind: result.file.kind,
            title: name.slice(0, 512),
            asset,
            mime: result.file.mime,
            ...inspected,
            source: url,
          },
        };
      }
      if (result.reader) {
        try {
          if (!this.ctx.storage) throw new Error('Guardado no disponible');
          const asset = 'reader-' + crypto.randomUUID();
          await this.ctx.storage.putAsset(
            asset,
            new Blob([JSON.stringify({ ...result.reader, source: url })], {
              type: 'application/json',
            }),
          );
          result.metadata.readerAsset = asset;
          result.metadata.readerTitle = result.reader.title;
          result.metadata.readerText = result.reader.text;
        } catch {
          return failed('storage-failed');
        }
      }
      if (result.image) {
        const bytes = Uint8Array.from(atob(result.image.data), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: result.image.mime });
        try {
          const bitmap = await createImageBitmap(blob);
          bitmap.close();
        } catch {
          return { metadata: { ...result.metadata, problem: 'image-unavailable' } };
        }
        const asset = 'link-preview-' + crypto.randomUUID();
        try {
          if (!this.ctx.storage) throw new Error('Guardado no disponible');
          await this.ctx.storage.putAsset(asset, blob);
          result.metadata.imageAsset = asset;
        } catch {
          return { metadata: { ...result.metadata, status: 'error', problem: 'storage-failed' } };
        }
      }
      return { metadata: result.metadata };
    } catch {
      return failed('fetch-failed');
    } finally {
      clearTimeout(timer);
    }
  }
  dispose(): void {
    this.abort.abort();
    this.unsubscribe();
    this.queue = [];
    this.jobs.clear();
    this.cache.clear();
  }
}
