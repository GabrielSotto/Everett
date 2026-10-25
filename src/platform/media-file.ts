import { videoPreview } from './video-preview';

/** Inspección común de archivos locales y descargados, con cancelación y plazo finito. */
export async function inspectMedia(
  blob: Blob,
  signal?: AbortSignal,
): Promise<{ ratio: number; preview?: string; duration?: number }> {
  const url = URL.createObjectURL(blob);
  const media = blob.type.startsWith('image/') ? new Image() : document.createElement('video');
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10000);
  const combined = signal ? AbortSignal.any([signal, abort.signal]) : abort.signal;
  try {
    await new Promise<void>((resolve, reject) => {
      const fail = (): void => reject(new Error('Formato no disponible o archivo incompleto'));
      combined.addEventListener('abort', fail, { once: true });
      if (combined.aborted) {
        fail();
        return;
      }
      media.addEventListener(
        media instanceof HTMLVideoElement ? 'loadedmetadata' : 'load',
        () => {
          combined.removeEventListener('abort', fail);
          resolve();
        },
        { once: true },
      );
      media.addEventListener(
        'error',
        () => {
          combined.removeEventListener('abort', fail);
          fail();
        },
        { once: true },
      );
      media.src = url;
    });
    const ratio =
      media instanceof HTMLVideoElement
        ? media.videoWidth / media.videoHeight
        : media.naturalWidth / media.naturalHeight;
    if (!Number.isFinite(ratio) || ratio <= 0) throw new Error('Dimensiones no disponibles');
    if (media instanceof HTMLVideoElement) {
      const duration = Number.isFinite(media.duration) ? media.duration : undefined;
      const preview = await videoPreview(blob, signal ?? abort.signal).catch(() => undefined);
      return {
        ratio,
        ...(duration !== undefined ? { duration } : {}),
        ...(preview ? { preview } : {}),
      };
    }
    return { ratio };
  } finally {
    clearTimeout(timer);
    media.removeAttribute('src');
    if (media instanceof HTMLVideoElement) media.load();
    URL.revokeObjectURL(url);
  }
}
