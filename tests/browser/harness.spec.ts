import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect } from './fixtures';

test('UI-HARNESS-01: el comparador visual detecta la desaparición deliberada de controles', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Perfil de Gabi', exact: true }).click();
  await page.mouse.move(10, 70);
  await expect(page.getByRole('tooltip')).toHaveText('');
  const panel = page.locator('.profile-pop');
  const baseline = await panel.screenshot({ animations: 'disabled' });
  const name = 'control-del-comparador.png';
  const path = testInfo.snapshotPath(name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, baseline);
  await testInfo.attach('control-visible', { body: baseline, contentType: 'image/png' });
  expect(await panel.screenshot({ animations: 'disabled' })).toMatchSnapshot(name, {
    maxDiffPixels: 0,
  });
  const fault = await page.addStyleTag({
    content: '.profile-field { visibility: hidden !important; }',
  });
  try {
    const hidden = await panel.screenshot({ animations: 'disabled' });
    await testInfo.attach('controles-ocultos-intencionalmente', {
      body: hidden,
      contentType: 'image/png',
    });
    expect(hidden).not.toMatchSnapshot(name, { maxDiffPixels: 0 });
  } finally {
    await fault.evaluate((element: HTMLStyleElement) => element.remove());
  }
  expect(await panel.screenshot({ animations: 'disabled' })).toMatchSnapshot(name, {
    maxDiffPixels: 0,
  });
});
