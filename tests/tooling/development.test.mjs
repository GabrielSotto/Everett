import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  developmentIdentity,
  verifyDevelopment,
  verifyServedDevelopment,
} from '../../scripts/development-evidence.mjs';
import { removeOutput } from '../../scripts/output-runs.mjs';
import { pdfFixture } from '../browser/canvas-fixtures.ts';

test(
  'DEV-01: servidor de fuentes con CSS en caliente, recarga de código, recuperación y servicio local',
  { timeout: 45000 },
  async () => {
    const root = process.cwd();
    await mkdir(resolve(root, 'output'), { recursive: true });
    const fixture = await mkdtemp(resolve(root, 'output/development-test-'));
    const require = createRequire(resolve(root, 'package.json'));
    const { developmentConfig, developmentPlugin } = await import(
      pathToFileURL(resolve(root, 'scripts/development.mjs')).href
    );
    const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
    const { chromium, expect } = require('@playwright/test');
    let server, browser;
    try {
      for (const path of [
        'src',
        'design/wireframe-library',
        'scripts',
        'index.html',
        'package.json',
        'package-lock.json',
        'bun.lock',
        'tsconfig.json',
        'vite.config.mjs',
      ])
        await cp(resolve(root, path), resolve(fixture, path), { recursive: true });
      const config = await developmentConfig(fixture);
      assert.equal(config.server.host, '127.0.0.1');
      assert.equal(config.server.port, 4173);
      assert.equal(config.server.strictPort, true);
      server = await createServer({
        ...config,
        configFile: false,
        logLevel: 'silent',
        server: {
          ...config.server,
          port: 0,
          fs: { allow: [root, fixture] },
          watch: { ...config.server.watch, ignored: ['**/node_modules/**'] },
        },
        plugins: [
          developmentPlugin(fixture, {
            extract: async (url) => ({
              status: 'ready',
              title: 'Página real controlada',
              resolvedUrl: url,
              checkedAt: 123,
            }),
          }),
        ],
      });
      await server.listen();
      const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
      const html = await (await fetch(url)).text();
      assert.match(html, /\/src\/development\.ts/);
      assert.match(html, /\/@vite\/client/);
      assert.doesNotMatch(html, /\{\{BUILD_ID\}\}|EVERETT_SCRIPT/);
      await assert.rejects(readFile(resolve(fixture, 'dist/build-manifest.json')), /ENOENT/);
      const identity = await developmentIdentity(fixture);
      assert.ok(
        identity.sourceHashes.some((entry) => entry.path === 'design/wireframe-library/samples.js'),
      );
      await verifyServedDevelopment(url, identity);
      const duplicate = await createServer({
        ...config,
        configFile: false,
        logLevel: 'silent',
        server: { ...config.server, port: server.httpServer.address().port },
      });
      try {
        await assert.rejects(duplicate.listen(), /already in use/);
      } finally {
        await duplicate.close();
      }
      const api = new URL('/api/link-preview', url);
      assert.equal(
        (
          await fetch(api, {
            method: 'POST',
            headers: { origin: 'https://otro.example', 'content-type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.org' }),
          })
        ).status,
        403,
      );
      const response = await fetch(api, {
        method: 'POST',
        headers: { origin: new URL(url).origin, 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.org' }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).title, 'Página real controlada');
      browser = await chromium.launch();
      const page = await browser.newPage();
      const failures = [];
      page.on('pageerror', (error) => failures.push(error.message));
      await page.goto(url + '?seed=42#scout/canvas');
      await expect(page.locator('.material[data-node="note-b"]')).toBeVisible();
      await page.locator('.material[data-node="note-b"]').dblclick();
      await page
        .getByRole('textbox', { name: 'Título de la nota', exact: true })
        .fill('Nota conservada durante desarrollo');
      await page
        .getByRole('textbox', { name: 'Contenido de la nota', exact: true })
        .fill('Trabajo que no debe perderse');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Quick Chat', exact: true }).click();
      const draft = page.getByRole('textbox', { name: 'Escribí un mensaje…', exact: true });
      await draft.fill('Borrador conservado');
      const before = await page.evaluate(() => ({
        time: performance.timeOrigin,
        snapshot: window.EverettDebug.snapshot(),
      }));
      const cssPath = resolve(fixture, 'src/styles/main.css');
      const css = await readFile(cssPath, 'utf8');
      await writeFile(cssPath, css + '\nbody { --development-probe: updated; }\n');
      await expect
        .poll(() =>
          page.evaluate(() =>
            getComputedStyle(document.body).getPropertyValue('--development-probe').trim(),
          ),
        )
        .toBe('updated');
      assert.equal(await page.evaluate(() => performance.timeOrigin), before.time);
      await expect(draft).toHaveValue('Borrador conservado');
      assert.deepEqual(
        await page.evaluate(() => window.EverettDebug.snapshot().state),
        before.snapshot.state,
      );
      await assert.rejects(verifyDevelopment(fixture, identity), /cambiaron/);
      await assert.rejects(verifyServedDevelopment(url, identity), /fuentes evaluadas/);
      const entryPath = resolve(fixture, 'src/development.ts');
      const entry = await readFile(entryPath, 'utf8');
      await writeFile(
        entryPath,
        entry + '\ndocument.documentElement.dataset.developmentProbe = "updated";\n',
      );
      await expect(page.locator('html')).toHaveAttribute('data-development-probe', 'updated');
      await expect.poll(() => page.evaluate(() => window.__everettReady)).toBe(true);
      assert.notEqual(await page.evaluate(() => performance.timeOrigin), before.time);
      await expect(page.locator('.material[data-node="note-b"] h3')).toHaveText(
        'Nota conservada durante desarrollo',
      );
      await expect(draft).toHaveValue('Borrador conservado');
      const after = await page.evaluate(() => window.EverettDebug.snapshot());
      assert.deepEqual(after.camera, before.snapshot.camera);
      assert.deepEqual(after.state.worlds, before.snapshot.state.worlds);
      const validEntry = await readFile(entryPath, 'utf8');
      const lastTime = await page.evaluate(() => performance.timeOrigin);
      await writeFile(entryPath, validEntry + '\nconst invalid = ;\n');
      await expect(page.locator('vite-error-overlay')).toBeVisible();
      assert.equal(await page.evaluate(() => performance.timeOrigin), lastTime);
      await expect(draft).toHaveValue('Borrador conservado');
      await writeFile(entryPath, validEntry.replace('"updated"', '"recovered"'));
      await expect(page.locator('html')).toHaveAttribute('data-development-probe', 'recovered');
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
      await expect(draft).toHaveValue('Borrador conservado');
      await page.getByRole('button', { name: 'Incorporar materiales', exact: true }).click();
      await page.locator('#canvas-file-import').setInputFiles({
        name: 'Desarrollo.pdf',
        mimeType: 'application/pdf',
        buffer: pdfFixture(),
      });
      await expect(page.locator('.material.pdf img')).toBeVisible();
      await page.locator('.material.pdf').dblclick();
      await expect(page.locator('.pdf-reader [role=status]')).toHaveText('Página 1 de 2');
      assert.deepEqual(failures, []);
    } finally {
      await browser?.close();
      await server?.close();
      await removeOutput(root, fixture);
    }
  },
);
