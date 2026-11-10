import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

export async function googleFontFiles(page: Page, ready: Promise<void> = Promise.resolve()) {
  // El archivo del fixture se decodifica de verdad, solo en memoria; no simula una fuente cargada.
  const path =
    process.platform === 'win32'
      ? 'C:/Windows/Fonts/arial.ttf'
      : process.platform === 'darwin'
        ? '/System/Library/Fonts/Supplemental/Arial.ttf'
        : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const bytes = await readFile(path);
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({
      contentType: 'font/ttf',
      body: bytes,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.route('https://fonts.googleapis.com/css2?*', async (route) => {
    await ready;
    const requested = new URL(route.request().url()).searchParams.get('family')!;
    const family = requested.split(':')[0]!;
    const weight = requested.split('@')[1]!.split(',').at(-1)!;
    const style = requested.includes(':ital,') ? 'italic' : 'normal';
    return route.fulfill({
      contentType: 'text/css',
      headers: { 'access-control-allow-origin': '*' },
      body: `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; src: url(https://fonts.gstatic.com/fixture-${weight}.ttf) format('truetype'); }`,
    });
  });
}
