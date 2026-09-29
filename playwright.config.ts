import { randomUUID } from 'node:crypto';
import { defineConfig } from '@playwright/test';

const suppliedUrl = process.env.EVERETT_TEST_URL;
if (!suppliedUrl)
  throw new Error('Falta EVERETT_TEST_URL con una URL HTTP(S) admitida del artefacto a evaluar.');
const baseURL = new URL(suppliedUrl);
if (!['http:', 'https:'].includes(baseURL.protocol))
  throw new Error('EVERETT_TEST_URL debe utilizar HTTP(S).');
const runId = randomUUID();

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  outputDir: `output/browser/${runId}/artifacts`,
  metadata: { runId, target: baseURL.href },
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
