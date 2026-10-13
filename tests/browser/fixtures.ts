import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';
import { installControlProbe, type ControlUse } from './control-probe';

export const test = base.extend<{ runtimeErrors: string[]; controls: ControlUse[] }>({
  controls: async ({ page }, use) => {
    const controls: ControlUse[] = [];
    await page.exposeFunction('__everettControlsCapture', (entry: ControlUse) => {
      controls.push(entry);
      if (controls.length > 1024) controls.shift();
    });
    await page.addInitScript(installControlProbe);
    await use(controls);
  },
  runtimeErrors: [
    async ({ page, controls }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      try {
        // El HTML autónomo incluye bytes de imágenes y el worker PDF. Conservar el
        // cuerpo realmente cargado evita la expulsión de la caché CDP de 10 MiB.
        const network = await page.context().newCDPSession(page);
        await network.send('Network.enable', {
          maxTotalBufferSize: 64 * 1024 * 1024,
          maxResourceBufferSize: 32 * 1024 * 1024,
        });
        let documentRequest: string | null = null;
        network.on('Network.responseReceived', (event) => {
          if (event.type === 'Document') documentRequest = event.requestId;
        });
        const baseURL = testInfo.project.use.baseURL;
        if (!baseURL) throw new Error('Falta la URL de la prueba.');
        const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8')) as {
          sha256: string;
          buildId: string;
        };
        const url = new URL(baseURL);
        url.searchParams.set('seed', '42');
        url.hash = '';
        const response = await page.goto(url.href);
        expect(response?.ok()).toBe(true);
        if (!response) throw new Error('La navegación no recibió el HTML.');
        if (!documentRequest) throw new Error('CDP no registró el documento cargado.');
        const loaded = await network.send('Network.getResponseBody', {
          requestId: documentRequest,
        });
        const hash = createHash('sha256')
          .update(Buffer.from(loaded.body, loaded.base64Encoded ? 'base64' : 'utf8'))
          .digest('hex');
        expect(hash, 'El documento cargado debe coincidir con el HTML del manifiesto').toBe(
          manifest.sha256,
        );
        testInfo.annotations.push({ type: 'artifact-sha256', description: hash });
        await expect(page.locator('meta[name="everett-build"]')).toHaveAttribute(
          'content',
          manifest.buildId,
        );
        await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
        await use(errors);
      } finally {
        if (!page.isClosed()) {
          const logs = await page.evaluate(() => window.EverettDebug?.logs() ?? []);
          await testInfo.attach('everett-trace', {
            body: JSON.stringify(logs, null, 2),
            contentType: 'application/json',
          });
          errors.push(
            ...logs
              .filter((entry) => entry.level === 'error')
              .map((entry) => JSON.stringify(entry)),
          );
        }
        await testInfo.attach('controls-used', {
          body: JSON.stringify(controls),
          contentType: 'application/json',
        });
        await testInfo.attach('runtime-errors', {
          body: JSON.stringify(errors, null, 2),
          contentType: 'application/json',
        });
        expect(
          errors,
          'La aplicación debe completar el recorrido sin errores de ejecución',
        ).toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
