import { createHash } from 'node:crypto';
import { globSync, readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const suppliedUrl = process.env.EVERETT_TEST_URL;
if (!suppliedUrl)
  throw new Error('Falta EVERETT_TEST_URL con una URL HTTP(S) admitida del artefacto a evaluar.');
const baseURL = new URL(suppliedUrl);
if (!['http:', 'https:'].includes(baseURL.protocol))
  throw new Error('EVERETT_TEST_URL debe utilizar HTTP(S).');
const runId = process.env.EVERETT_BROWSER_RUN_ID;
if (!runId) throw new Error('Ejecutá el navegador mediante npm run test:browser.');
if (!/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(runId))
  throw new Error('Identificador de ejecución inválido.');
process.env.EVERETT_BROWSER_RUN_ID = runId;
const packageInfo = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const manifest = JSON.parse(readFileSync('dist/build-manifest.json', 'utf8')) as { sha256: string };
const sourceHashes = [
  ...globSync('tests/browser/**/*.ts'),
  'playwright.config.ts',
  'scripts/test-browser.mjs',
  'scripts/artifact-evidence.mjs',
  'scripts/canvas-contracts.mjs',
  'scripts/browser-evidence.mjs',
  'docs/iteraciones/0.8.md',
  'scripts/output-runs.mjs',
  'scripts/run-process.mjs',
  'package.json',
  'package-lock.json',
]
  .sort()
  .map((path) => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  outputDir: `output/pruebas/navegador/${runId}/artifacts`,
  snapshotPathTemplate: `output/pruebas/navegador/${runId}/comparator-controls/{testFilePath}/{arg}{ext}`,
  updateSnapshots: 'none',
  metadata: {
    runId,
    target: baseURL.href,
    version: packageInfo.version,
    artifactSha256: manifest.sha256,
    sourceHashes,
  },
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: `output/pruebas/navegador/${runId}/results.json` }],
    ['html', { outputFolder: `output/pruebas/navegador/${runId}/report`, open: 'never' }],
  ],
  use: {
    baseURL: baseURL.href,
    browserName: 'chromium',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    viewport: { width: 1440, height: 900 },
    locale: 'es-AR',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
});
