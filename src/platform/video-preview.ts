/** Fotograma real del archivo local; no inicia reproducción ni modifica el reproductor visible. */
export async function videoPreview(blob: Blob, signal?: AbortSignal): Promise<string> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(blob);
  const lifetime = new AbortController();
  const abort = (): void => lifetime.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(
    () => lifetime.abort(new Error('No se pudo cargar un fotograma del video')),
    10000,
  );
  const wait = (event: 'loadeddata' | 'seeked'): Promise<void> =>
    new Promise((resolve, reject) => {
      if (lifetime.signal.aborted) {
        reject(lifetime.signal.reason);
        return;
      }
      const cleanup = (): void => {
        video.removeEventListener(event, ready);
        video.removeEventListener('error', failed);
        lifetime.signal.removeEventListener('abort', cancelled);
      };
      const ready = (): void => {
        cleanup();
        resolve();
      };
      const failed = (): void => {
        cleanup();
        reject(new Error('El navegador no puede decodificar este video'));
      };
      const cancelled = (): void => {
        cleanup();
        reject(lifetime.signal.reason);
      };
      video.addEventListener(event, ready, { once: true });
      video.addEventListener('error', failed, { once: true });
      lifetime.signal.addEventListener('abort', cancelled, { once: true });
    });
  try {
    if (signal?.aborted) abort();
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const loaded = wait('loadeddata');
    video.src = url;
    await loaded;
    const time = Number.isFinite(video.duration) ? Math.min(0.05, video.duration / 2) : 0.05;
    if (time > 0) {
      const sought = wait('seeked');
      video.currentTime = time;
      await sought;
    }
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 640 / video.videoWidth, 360 / video.videoHeight);
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
    canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    clearTimeout(timeout);
    lifetime.abort();
    signal?.removeEventListener('abort', abort);
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
