import { createHash, randomUUID } from 'node:crypto';
import { globSync, readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const suppliedUrl = process.env.EVERETT_TEST_URL;
if (!suppliedUrl)
  throw new Error('Falta EVERETT_TEST_URL con una URL HTTP(S) admitida del artefacto a evaluar.');
const baseURL = new URL(suppliedUrl);
if (!['http:', 'https:'].includes(baseURL.protocol))
  throw new Error('EVERETT_TEST_URL debe utilizar HTTP(S).');
const runId = process.env.EVERETT_BROWSER_RUN_ID ?? randomUUID();
if (!/^[a-f0-9-]{36}$/i.test(runId)) throw new Error('Identificador de ejecución inválido.');
process.env.EVERETT_BROWSER_RUN_ID = runId;
const packageInfo = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const manifest = JSON.parse(readFileSync('dist/build-manifest.json', 'utf8')) as { sha256: string };
const sourceHashes = [
  ...globSync('tests/browser/**/*.ts'),
  'playwright.config.ts',
  'package.json',
  'package-lock.json',
]
  .sort()
  .map((path) => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  outputDir: `output/browser/${runId}/artifacts`,
  snapshotPathTemplate: `output/browser/${runId}/comparator-controls/{testFilePath}/{arg}{ext}`,
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
    ['json', { outputFile: `output/browser/${runId}/results.json` }],
    ['html', { outputFolder: `output/browser/${runId}/report`, open: 'never' }],
  ],
  use: {
    baseURL: baseURL.href,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    locale: 'es-AR',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
});
