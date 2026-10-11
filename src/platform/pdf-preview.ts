import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSource from 'pdfjs-dist/build/pdf.worker.mjs';
/** Primera página real; el worker queda incluido en el HTML y se libera al terminar. */
export async function pdfPreview(file: Blob): Promise<{ preview: string; ratio: number }> {
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  GlobalWorkerOptions.workerSrc = url;
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
  });
  try {
    const pdf = await task.promise,
      page = await pdf.getPage(1),
      base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1, 480 / base.width) });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la portada del PDF');
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return { preview: canvas.toDataURL('image/png'), ratio: base.width / base.height };
  } finally {
    await task.destroy();
    URL.revokeObjectURL(url);
  }
}

export async function pdfReader(
  file: Blob,
  host: HTMLElement,
  signal: AbortSignal,
): Promise<() => void> {
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  GlobalWorkerOptions.workerSrc = url;
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
  });
  try {
    const pdf = await task.promise;
    if (signal.aborted) {
      await task.destroy();
      URL.revokeObjectURL(url);
      return () => {};
    }
    host.className = 'pdf-reader';
    host.innerHTML =
      '<nav><button type="button" data-page="previous">Anterior</button><span role="status"></span><button type="button" data-page="next">Siguiente</button></nav><canvas aria-label="Página del PDF"></canvas>';
    const canvas = host.querySelector('canvas')!,
      context = canvas.getContext('2d')!;
    let pageNumber = 1,
      rendering = false;
    const draw = async (): Promise<void> => {
      rendering = true;
      host
        .querySelectorAll<HTMLButtonElement>('button')
        .forEach((button) => (button.disabled = true));
      try {
        const page = await pdf.getPage(pageNumber),
          base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1000 / base.width) });
        if (signal.aborted) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        host.querySelector('[role=status]')!.textContent =
          `Página ${pageNumber} de ${pdf.numPages}`;
      } finally {
        rendering = false;
        if (!signal.aborted) {
          host.querySelector<HTMLButtonElement>('[data-page=previous]')!.disabled =
            pageNumber === 1;
          host.querySelector<HTMLButtonElement>('[data-page=next]')!.disabled =
            pageNumber === pdf.numPages;
        }
      }
    };
    await draw();
    host.addEventListener(
      'click',
      (event) => {
        if (!(event.target instanceof HTMLButtonElement) || !event.target.dataset.page || rendering)
          return;
        pageNumber += event.target.dataset.page === 'next' ? 1 : -1;
        void draw().catch(() => {
          if (!signal.aborted)
            host.querySelector('[role=status]')!.textContent =
              'No se pudo mostrar esta página. Probá otra página o volvé a entrar.';
        });
      },
      { signal },
    );
    return () => {
      void task.destroy();
      URL.revokeObjectURL(url);
    };
  } catch (error) {
    await task.destroy();
    URL.revokeObjectURL(url);
    throw error;
  }
}
