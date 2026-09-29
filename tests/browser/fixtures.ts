import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      try {
        await use(errors);
      } finally {
        if (!page.isClosed()) {
          const logs = await page.evaluate(() => window.EverettDebug?.logs() ?? []);
          await testInfo.attach('everett-trace', {
            body: JSON.stringify(logs, null, 2),
            contentType: 'application/json',
          });
        }
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

test.beforeEach(async ({ request, page, baseURL }, testInfo) => {
  if (!baseURL) throw new Error('Falta la URL de la prueba.');
  const manifest = JSON.parse(await readFile('dist/build-manifest.json', 'utf8')) as {
    sha256: string;
    buildId: string;
    version: string;
  };
  const response = await request.get(baseURL);
  expect(response.ok()).toBe(true);
  const hash = createHash('sha256')
    .update(await response.body())
    .digest('hex');
  expect(hash, 'La URL debe servir exactamente el HTML identificado por el build local').toBe(
    manifest.sha256,
  );
  testInfo.annotations.push({ type: 'artifact-sha256', description: hash });
  const url = new URL(baseURL);
  url.searchParams.set('seed', '42');
  url.hash = '';
  await page.goto(url.href);
  await expect(page.locator('meta[name="everett-build"]')).toHaveAttribute(
    'content',
    manifest.buildId,
  );
  await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
});

export { expect };
