import type { Page, BrowserContext } from '@playwright/test';
import type { State } from '../../src/domain/model';
import type { Ui } from '../../src/app/ui-state';

/** Datos de entrada reproducibles; nunca modifica el DOM para simular el resultado. */
export function pdfFixture(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...['Primera pagina real', 'Segunda pagina real'].map((text) => {
      const stream = `BT /F1 18 Tf 25 350 Td (${text}) Tj ET`;
      return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    }),
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(text));
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(text);
  text +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n')
      .join('');
  text += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(text);
}

export async function videoFixture(context: BrowserContext, duration = 250): Promise<Buffer> {
  const generator = await context.newPage();
  try {
    const bytes = await generator.evaluate(async (duration) => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const draw = canvas.getContext('2d')!;
      draw.fillStyle = '#6675bf';
      draw.fillRect(0, 0, 160, 90);
      const stream = canvas.captureStream(20),
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }),
        chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
      recorder.start();
      let frame = 0;
      const redraw = setInterval(() => {
        draw.fillStyle = ++frame % 2 ? '#6675bf' : '#8b77b2';
        draw.fillRect(0, 0, 160, 90);
      }, 45);
      await new Promise((resolve) => setTimeout(resolve, duration));
      clearInterval(redraw);
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())];
    }, duration);
    return Buffer.from(bytes);
  } finally {
    await generator.close();
  }
}

export async function storedFixture(page: Page, state: State, ui: Ui): Promise<void> {
  // Cerrar el contexto vivo antes de sustituir su entrada durable. Su último
  // guardado termina antes de esta transacción y no pisa el fixture en pagehide.
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })),
  );
  await page.evaluate(
    async ({ state, ui }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('everett-canvas', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const { worlds, seq, ...personal } = state;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['worlds', 'personal'], 'readwrite');
        tx.objectStore('worlds').put({ schema: 1, worlds, seq }, 'shared');
        tx.objectStore('personal').put({ schema: 1, state: personal, ui }, 'local-user');
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { state, ui },
  );
}
